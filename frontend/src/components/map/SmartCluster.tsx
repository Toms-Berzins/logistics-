'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { DriverLocation, DriverStatus } from '../../hooks/useDriverTracking';
import { 
  DriverIntentPrediction, 
  ClusterMetrics, 
  driverIntentPredictor, 
  getIntentColor, 
  getIntentIcon 
} from '../../utils/driverIntentML';

interface SmartClusterProps {
  map: mapboxgl.Map | null;
  driverLocations: Map<string, DriverLocation>;
  driverStatuses: Map<string, DriverStatus>;
  zoom: number;
  onClusterClick?: (driverIds: string[], bounds: mapboxgl.LngLatBounds) => void;
  onDriverClick?: (driver: DriverLocation) => void;
  className?: string;
}

interface ClusterData {
  id: string;
  center: [number, number];
  drivers: DriverLocation[];
  predictions: DriverIntentPrediction[];
  metrics: ClusterMetrics;
  bounds: mapboxgl.LngLatBounds;
}

export const SmartCluster: React.FC<SmartClusterProps> = ({
  map,
  driverLocations,
  driverStatuses,
  zoom,
  onClusterClick,
  onDriverClick,
  className = '',
}) => {
  const clustersRef = useRef<Map<string, ClusterData>>(new Map());
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterDistance = useMemo(() => {
    // Cluster distance based on zoom level
    if (zoom >= 15) return 50; // Tight clustering at high zoom
    if (zoom >= 12) return 100; // Medium clustering
    if (zoom >= 10) return 200; // Loose clustering
    return 300; // Very loose clustering at low zoom
  }, [zoom]);

  // Calculate clusters using spatial clustering algorithm
  const calculateClusters = useCallback((): ClusterData[] => {
    const drivers = Array.from(driverLocations.values());
    if (drivers.length === 0) return [];

    // Simple spatial clustering based on distance
    const clusters: ClusterData[] = [];
    const processed = new Set<string>();

    drivers.forEach(driver => {
      if (processed.has(driver.driverId)) return;

      const clusterDrivers = [driver];
      processed.add(driver.driverId);

      // Find nearby drivers
      drivers.forEach(otherDriver => {
        if (processed.has(otherDriver.driverId)) return;

        const distance = calculateDistance(
          driver.latitude,
          driver.longitude,
          otherDriver.latitude,
          otherDriver.longitude
        );

        // Convert distance to pixels based on zoom level
        const pixelDistance = distance * (40075016.686 * Math.abs(Math.cos(driver.latitude * Math.PI / 180)) / Math.pow(2, zoom + 8));

        if (pixelDistance < clusterDistance) {
          clusterDrivers.push(otherDriver);
          processed.add(otherDriver.driverId);
        }
      });

      // Calculate cluster center
      const centerLat = clusterDrivers.reduce((sum, d) => sum + d.latitude, 0) / clusterDrivers.length;
      const centerLng = clusterDrivers.reduce((sum, d) => sum + d.longitude, 0) / clusterDrivers.length;

      // Generate predictions for all drivers in cluster
      const predictions = clusterDrivers.map(d => {
        const status = driverStatuses.get(d.driverId);
        // Update ML model with current data
        driverIntentPredictor.updateDriverData(d.driverId, d, status);
        // Get prediction
        return driverIntentPredictor.predictIntent(d.driverId, d, status);
      });

      // Calculate cluster metrics
      const metrics = driverIntentPredictor.calculateClusterMetrics(predictions);

      // Create bounds for cluster
      const bounds = new mapboxgl.LngLatBounds();
      clusterDrivers.forEach(d => bounds.extend([d.longitude, d.latitude]));

      clusters.push({
        id: `cluster_${centerLat}_${centerLng}`,
        center: [centerLng, centerLat],
        drivers: clusterDrivers,
        predictions,
        metrics,
        bounds,
      });
    });

    return clusters;
  }, [driverLocations, driverStatuses, zoom, clusterDistance]);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Create cluster marker element
  const createClusterMarker = useCallback((cluster: ClusterData): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'smart-cluster-marker';
    
    const size = cluster.drivers.length === 1 ? 40 : Math.min(60, 40 + cluster.drivers.length * 2);
    const dominantColor = getIntentColor(cluster.metrics.dominantIntent);
    const dominantIcon = getIntentIcon(cluster.metrics.dominantIntent);

    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(135deg, ${dominantColor}, ${adjustBrightness(dominantColor, -20)});
    `;

    if (cluster.drivers.length === 1) {
      // Single driver marker
      const driver = cluster.drivers[0];
      const prediction = cluster.predictions[0];
      
      el.innerHTML = `
        <div style="font-size: 16px; line-height: 1;">${dominantIcon}</div>
        <div style="font-size: 8px; margin-top: -2px; opacity: 0.9;">
          ${Math.round(prediction.confidence * 100)}%
        </div>
      `;

      // Add pulsing animation for high confidence available drivers
      if (prediction.intent === 'available' && prediction.confidence > 0.8) {
        el.style.animation = 'smart-cluster-pulse 2s infinite';
      }

      // Add direction indicator if driver has heading
      if (driver.heading !== undefined) {
        const arrow = document.createElement('div');
        arrow.style.cssText = `
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(${driver.heading}deg);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 12px solid ${dominantColor};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        `;
        el.appendChild(arrow);
      }
    } else {
      // Cluster marker
      el.innerHTML = `
        <div style="font-size: 16px; line-height: 1; margin-bottom: 1px;">${cluster.drivers.length}</div>
        <div style="font-size: 10px; opacity: 0.9; display: flex; gap: 1px;">
          ${cluster.metrics.availableCount > 0 ? `<span>${getIntentIcon('available')}${cluster.metrics.availableCount}</span>` : ''}
          ${cluster.metrics.busyCount > 0 ? `<span>${getIntentIcon('busy')}${cluster.metrics.busyCount}</span>` : ''}
          ${cluster.metrics.enRouteCount > 0 ? `<span>${getIntentIcon('en_route')}${cluster.metrics.enRouteCount}</span>` : ''}
        </div>
      `;

      // Add bounce animation for clusters with mixed intents
      const intentVariety = [
        cluster.metrics.availableCount,
        cluster.metrics.busyCount,
        cluster.metrics.enRouteCount,
        cluster.metrics.returningCount
      ].filter(count => count > 0).length;

      if (intentVariety > 2) {
        el.style.animation = 'smart-cluster-bounce 3s infinite';
      }
    }

    // Add hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
      el.style.zIndex = '1000';
      el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });

    // Add click handler
    el.addEventListener('click', () => {
      if (cluster.drivers.length === 1 && onDriverClick) {
        onDriverClick(cluster.drivers[0]);
      } else if (onClusterClick) {
        onClusterClick(cluster.drivers.map(d => d.driverId), cluster.bounds);
      }
    });

    return el;
  }, [onClusterClick, onDriverClick]);

  // Create cluster popup content
  const createClusterPopup = useCallback((cluster: ClusterData): string => {
    const { metrics, predictions } = cluster;
    
    return `
      <div style="padding: 12px; min-width: 200px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${getIntentColor(metrics.dominantIntent)};
            margin-right: 8px;
          "></div>
          <strong>Cluster: ${cluster.drivers.length} driver${cluster.drivers.length > 1 ? 's' : ''}</strong>
        </div>
        
        <div style="font-size: 13px; margin-bottom: 8px;">
          <div style="color: #666; margin-bottom: 4px;">Dominant Intent: 
            <span style="color: ${getIntentColor(metrics.dominantIntent)}; font-weight: bold;">
              ${metrics.dominantIntent.replace('_', ' ')}
            </span>
          </div>
          <div style="color: #666; margin-bottom: 4px;">
            Avg Confidence: ${Math.round(metrics.avgConfidence * 100)}%
          </div>
        </div>

        <div style="font-size: 12px; color: #666;">
          ${metrics.availableCount > 0 ? `<div>🟢 Available: ${metrics.availableCount}</div>` : ''}
          ${metrics.busyCount > 0 ? `<div>🟡 Busy: ${metrics.busyCount}</div>` : ''}
          ${metrics.enRouteCount > 0 ? `<div>🟣 En Route: ${metrics.enRouteCount}</div>` : ''}
          ${metrics.returningCount > 0 ? `<div>🔵 Returning: ${metrics.returningCount}</div>` : ''}
          ${metrics.offlineCount > 0 ? `<div>🔴 Offline: ${metrics.offlineCount}</div>` : ''}
        </div>

        ${cluster.drivers.length <= 3 ? `
          <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
            ${predictions.map(pred => `
              <div style="font-size: 11px; color: #666; margin-bottom: 2px;">
                Driver ${pred.driverId}: ${pred.intent} (${Math.round(pred.confidence * 100)}%)
                ${pred.estimatedTimeToNextAction ? ` - ~${pred.estimatedTimeToNextAction}min` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }, []);

  // Update clusters and markers
  const updateClusters = useCallback(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Calculate new clusters
    const clusters = calculateClusters();
    clustersRef.current.clear();

    // Create markers for clusters
    clusters.forEach(cluster => {
      const element = createClusterMarker(cluster);
      
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(createClusterPopup(cluster));

      const marker = new mapboxgl.Marker(element)
        .setLngLat(cluster.center)
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set(cluster.id, marker);
      clustersRef.current.set(cluster.id, cluster);
    });
  }, [map, calculateClusters, createClusterMarker, createClusterPopup]);

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes smart-cluster-pulse {
        0% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      
      @keyframes smart-cluster-bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-4px); }
        60% { transform: translateY(-2px); }
      }
      
      .smart-cluster-marker:hover {
        z-index: 1000 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update clusters when data changes
  useEffect(() => {
    updateClusters();
  }, [updateClusters]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      clustersRef.current.clear();
    };
  }, []);

  return (
    <div className={`smart-cluster ${className}`}>
      {/* Voice accessibility announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {clustersRef.current.size > 0 && (
          `Map showing ${Array.from(clustersRef.current.values()).reduce((total, cluster) => total + cluster.drivers.length, 0)} drivers in ${clustersRef.current.size} cluster${clustersRef.current.size > 1 ? 's' : ''}`
        )}
      </div>
    </div>
  );
};

// Utility function to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export default SmartCluster;