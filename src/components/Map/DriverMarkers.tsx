import React, { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import { DriverLocation, DriverCluster } from '../../types/driver';
import { logisticsColors } from '../../styles/tokens/colors';

interface DriverMarkersProps {
  map?: mapboxgl.Map;
  drivers: DriverLocation[];
  onDriverClick: (driver: DriverLocation) => void;
  nearestDriverId?: string;
  className?: string;
}

interface ClusterFeature {
  type: 'Feature';
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface DriverFeature {
  type: 'Feature';
  properties: {
    cluster: false;
    driver: DriverLocation;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const DriverMarkers: React.FC<DriverMarkersProps> = ({
  map,
  drivers,
  onDriverClick,
  nearestDriverId,
  className = '',
}) => {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterRef = useRef<Supercluster | null>(null);

  // Initialize supercluster
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 2,
    });

    const features: DriverFeature[] = drivers.map(driver => ({
      type: 'Feature',
      properties: {
        cluster: false,
        driver,
      },
      geometry: {
        type: 'Point',
        coordinates: [driver.lng, driver.lat],
      },
    }));

    cluster.load(features);
    clusterRef.current = cluster;
    return cluster;
  }, [drivers]);

  // Create driver marker element
  const createDriverMarker = (driver: DriverLocation): HTMLElement => {
    const el = document.createElement('div');
    const isNearest = driver.id === nearestDriverId;
    const statusColor = logisticsColors.status[driver.status];
    
    el.className = `driver-marker ${driver.status} ${isNearest ? 'nearest' : ''}`;
    el.setAttribute('data-driver-id', driver.id);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 
      `Driver ${driver.name} at ${driver.lat.toFixed(4)}, ${driver.lng.toFixed(4)}, ` +
      `status ${driver.status}, last update ${driver.lastUpdate.toLocaleTimeString()}`
    );
    
    el.innerHTML = `
      <div class="marker-container">
        <div class="marker-pulse"></div>
        <div class="marker-icon">
          <div class="vehicle-icon">
            ${getVehicleIcon(driver.vehicleType)}
          </div>
          ${driver.currentDelivery ? '<div class="delivery-indicator"></div>' : ''}
        </div>
        ${isNearest ? '<div class="nearest-glow"></div>' : ''}
      </div>
    `;

    // Add click handler
    const handleClick = (e: Event) => {
      e.stopPropagation();
      onDriverClick(driver);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDriverClick(driver);
      }
    };

    el.addEventListener('click', handleClick);
    el.addEventListener('keypress', handleKeyPress);

    return el;
  };

  // Create cluster marker element
  const createClusterMarker = (cluster: ClusterFeature): HTMLElement => {
    const el = document.createElement('div');
    const pointCount = cluster.properties.point_count;
    
    let size = 'small';
    if (pointCount >= 10) size = 'large';
    else if (pointCount >= 5) size = 'medium';
    
    el.className = `cluster-marker ${size}`;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Cluster of ${pointCount} drivers`);
    
    el.innerHTML = `
      <div class="cluster-container">
        <div class="cluster-icon">
          <span class="cluster-count">${cluster.properties.point_count_abbreviated}</span>
        </div>
      </div>
    `;

    // Add click handler to zoom in
    const handleClick = () => {
      if (!map || !clusterRef.current) return;
      
      const clusterId = cluster.properties.cluster_id;
      const zoom = clusterRef.current.getClusterExpansionZoom(clusterId);
      
      map.easeTo({
        center: cluster.geometry.coordinates as [number, number],
        zoom: Math.min(zoom, 16),
        duration: 500,
      });
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    el.addEventListener('click', handleClick);
    el.addEventListener('keypress', handleKeyPress);

    return el;
  };

  // Get vehicle icon SVG
  const getVehicleIcon = (vehicleType: string): string => {
    const iconSize = 14;
    const color = logisticsColors.vehicle[vehicleType as keyof typeof logisticsColors.vehicle] || '#6B7280';
    
    switch (vehicleType) {
      case 'truck':
        return `<svg width="${iconSize}" height="${iconSize}" fill="${color}" viewBox="0 0 24 24">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2V12l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>`;
      case 'van':
        return `<svg width="${iconSize}" height="${iconSize}" fill="${color}" viewBox="0 0 24 24">
          <path d="M19 7h-3V6c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 10H5V6h5v11zm9 0h-7V9h7v8z"/>
        </svg>`;
      case 'motorcycle':
        return `<svg width="${iconSize}" height="${iconSize}" fill="${color}" viewBox="0 0 24 24">
          <path d="M19.44 9.03L15.41 5H13v2h1.59l2.4 2.4c-.79.37-1.35 1.16-1.35 2.1 0 1.28 1.04 2.32 2.32 2.32s2.32-1.04 2.32-2.32c0-.94-.56-1.73-1.35-2.1zM7.82 6H11V4H7.82c-.48 0-.86.35-.94.82L6.17 8.5c-.08.47.26.88.75.88.41 0 .75-.34.75-.75V6zM19.5 13.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm-15 0C3.12 13.5 2 14.62 2 16s1.12 2.5 2.5 2.5S7 17.38 7 16s-1.12-2.5-2.5-2.5z"/>
        </svg>`;
      default: // car
        return `<svg width="${iconSize}" height="${iconSize}" fill="${color}" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>`;
    }
  };

  // Update markers when map or drivers change
  useEffect(() => {
    if (!map) return;

    const markers = markersRef.current;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers.clear();

    // Get current map bounds
    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    // Get clusters and points for current zoom level
    const zoom = Math.floor(map.getZoom());
    const clusters = supercluster.getClusters(bbox, zoom);

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;

      if (feature.properties.cluster) {
        // Create cluster marker
        const el = createClusterMarker(feature as ClusterFeature);
        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map);
        
        markers.set(`cluster-${feature.properties.cluster_id}`, marker);
      } else {
        // Create individual driver marker
        const driver = (feature as DriverFeature).properties.driver;
        const el = createDriverMarker(driver);
        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map);
        
        markers.set(driver.id, marker);
      }
    });

    // Update markers on map move
    const handleMapMove = () => {
      // Debounce updates
      setTimeout(() => {
        const newBounds = map.getBounds();
        const newBbox: [number, number, number, number] = [
          newBounds.getWest(),
          newBounds.getSouth(),
          newBounds.getEast(),
          newBounds.getNorth(),
        ];

        const newZoom = Math.floor(map.getZoom());
        const newClusters = supercluster.getClusters(newBbox, newZoom);

        // Update existing markers
        markers.forEach(marker => marker.remove());
        markers.clear();

        newClusters.forEach((feature) => {
          const [lng, lat] = feature.geometry.coordinates;

          if (feature.properties.cluster) {
            const el = createClusterMarker(feature as ClusterFeature);
            const marker = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(map);
            
            markers.set(`cluster-${feature.properties.cluster_id}`, marker);
          } else {
            const driver = (feature as DriverFeature).properties.driver;
            const el = createDriverMarker(driver);
            const marker = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(map);
            
            markers.set(driver.id, marker);
          }
        });
      }, 100);
    };

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      markers.forEach(marker => marker.remove());
      markers.clear();
    };
  }, [map, supercluster, onDriverClick, nearestDriverId]);

  return (
    <style jsx global>{`
      .driver-marker {
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      
      .driver-marker:hover {
        transform: scale(1.1);
      }
      
      .driver-marker:focus {
        outline: 2px solid ${logisticsColors.primary[500]};
        outline-offset: 2px;
      }
      
      .marker-container {
        position: relative;
        width: 32px;
        height: 32px;
      }
      
      .marker-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 1.5s infinite ease-in-out;
        opacity: 0.6;
      }
      
      .driver-marker.active .marker-pulse {
        background-color: ${logisticsColors.status.active.pulse};
      }
      
      .driver-marker.idle .marker-pulse {
        background-color: ${logisticsColors.status.idle.pulse};
      }
      
      .driver-marker.offline .marker-pulse {
        background-color: ${logisticsColors.status.offline.pulse};
      }
      
      .driver-marker.break .marker-pulse {
        background-color: ${logisticsColors.status.break.pulse};
      }
      
      .marker-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 1;
      }
      
      .driver-marker.active .marker-icon {
        background-color: ${logisticsColors.status.active.bg};
      }
      
      .driver-marker.idle .marker-icon {
        background-color: ${logisticsColors.status.idle.bg};
      }
      
      .driver-marker.offline .marker-icon {
        background-color: ${logisticsColors.status.offline.bg};
      }
      
      .driver-marker.break .marker-icon {
        background-color: ${logisticsColors.status.break.bg};
      }
      
      .vehicle-icon {
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .delivery-indicator {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        background-color: ${logisticsColors.semantic.warning};
        border: 1px solid white;
        border-radius: 50%;
      }
      
      .nearest-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 28px;
        height: 28px;
        border: 2px solid ${logisticsColors.primary[500]};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: glow 2s infinite ease-in-out;
      }
      
      .cluster-marker {
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      
      .cluster-marker:hover {
        transform: scale(1.1);
      }
      
      .cluster-marker:focus {
        outline: 2px solid ${logisticsColors.primary[500]};
        outline-offset: 2px;
      }
      
      .cluster-container {
        position: relative;
      }
      
      .cluster-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        color: white;
        font-weight: 600;
      }
      
      .cluster-marker.small .cluster-icon {
        width: 32px;
        height: 32px;
        background-color: ${logisticsColors.map.cluster.small};
        font-size: 12px;
      }
      
      .cluster-marker.medium .cluster-icon {
        width: 40px;
        height: 40px;
        background-color: ${logisticsColors.map.cluster.medium};
        font-size: 14px;
      }
      
      .cluster-marker.large .cluster-icon {
        width: 48px;
        height: 48px;
        background-color: ${logisticsColors.map.cluster.large};
        font-size: 16px;
      }
      
      @keyframes pulse {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.6;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 0.3;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.6;
        }
      }
      
      @keyframes glow {
        0%, 100% {
          opacity: 0.5;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.1);
        }
      }
    `}</style>
  );
};

export default DriverMarkers;