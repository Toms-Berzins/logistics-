'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDriverTracking, DriverLocation, DriverStatus } from '../../hooks/useDriverTracking';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

interface DriverMapProps {
  companyId: string;
  userId: string;
  userType: 'dispatcher' | 'admin';
  mapboxToken: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  height?: string;
  width?: string;
  showTraffic?: boolean;
  show3D?: boolean;
  onDriverClick?: (driver: DriverLocation) => void;
  onMapClick?: (coordinates: [number, number]) => void;
  className?: string;
}

interface DriverMarker {
  element: HTMLDivElement;
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup;
  driverId: string;
}

const DriverMap: React.FC<DriverMapProps> = ({
  companyId,
  userId,
  userType,
  mapboxToken,
  initialCenter = [-98.5795, 39.8283], // Center of USA
  initialZoom = 4,
  height = '100vh',
  width = '100%',
  showTraffic = false,
  show3D = false,
  onDriverClick,
  onMapClick,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, DriverMarker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Driver tracking hook
  const {
    isConnected,
    connectionQuality,
    driverLocations,
    driverStatuses,
    trackDriver,
    getNearbyDrivers,
    lastError,
  } = useDriverTracking({
    companyId,
    userType,
    userId,
    autoReconnect: true,
    locationSmoothingEnabled: true,
  });

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Create map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: initialZoom,
      antialias: true,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocate control
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    // Map event handlers
    map.on('load', () => {
      console.log('Mapbox map loaded');
      setMapLoaded(true);

      // Add traffic layer if enabled
      if (showTraffic) {
        map.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });

        map.addLayer({
          id: 'traffic',
          type: 'line',
          source: 'mapbox-traffic',
          'source-layer': 'traffic',
          paint: {
            'line-width': 1.5,
            'line-color': [
              'case',
              ['==', ['get', 'congestion'], 'low'], '#00ff00',
              ['==', ['get', 'congestion'], 'moderate'], '#ffff00',
              ['==', ['get', 'congestion'], 'heavy'], '#ff8c00',
              ['==', ['get', 'congestion'], 'severe'], '#ff0000',
              '#000000'
            ],
          },
        });
      }

      // Enable 3D buildings if requested
      if (show3D) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        });
      }
    });

    map.on('click', (e) => {
      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      onMapClick?.(coordinates);
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [mapboxToken, initialCenter, initialZoom, showTraffic, show3D, onMapClick]);

  // Create driver marker element
  const createDriverMarker = useCallback((driver: DriverLocation, status?: DriverStatus) => {
    const el = document.createElement('div');
    el.className = 'driver-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      color: white;
      position: relative;
      transition: all 0.3s ease;
    `;

    // Set color based on driver status
    let backgroundColor = '#6b7280'; // gray for unknown
    let statusText = '?';

    if (status) {
      if (!status.isOnline) {
        backgroundColor = '#ef4444'; // red for offline
        statusText = 'OFF';
      } else if (!status.isAvailable) {
        backgroundColor = '#f59e0b'; // yellow for busy
        statusText = 'BUSY';
      } else {
        backgroundColor = '#10b981'; // green for available
        statusText = 'FREE';
      }
    }

    el.style.backgroundColor = backgroundColor;
    el.innerHTML = `
      <span>${statusText}</span>
      ${driver.heading !== undefined ? `
        <div style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(${driver.heading}deg);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 12px solid ${backgroundColor};
        "></div>
      ` : ''}
    `;

    // Add pulsing animation for recent updates
    const updateTime = new Date(driver.timestamp).getTime();
    const now = Date.now();
    if (now - updateTime < 30000) { // Last 30 seconds
      el.style.animation = 'pulse 2s infinite';
    }

    // Add hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
      el.style.zIndex = '1000';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
    });

    return el;
  }, []);

  // Create popup content for driver
  const createDriverPopup = useCallback((driver: DriverLocation, status?: DriverStatus) => {
    const lastUpdate = new Date(driver.timestamp);
    const timeDiff = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    
    let timeText = '';
    if (timeDiff < 60) {
      timeText = `${timeDiff}s ago`;
    } else if (timeDiff < 3600) {
      timeText = `${Math.floor(timeDiff / 60)}m ago`;
    } else {
      timeText = `${Math.floor(timeDiff / 3600)}h ago`;
    }

    const statusColor = status?.isOnline ? (status.isAvailable ? '#10b981' : '#f59e0b') : '#ef4444';
    const statusText = status?.isOnline ? (status.isAvailable ? 'Available' : 'Busy') : 'Offline';

    return `
      <div style="padding: 12px; min-width: 200px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${statusColor};
            margin-right: 8px;
          "></div>
          <strong>Driver ${driver.driverId}</strong>
        </div>
        <div style="font-size: 14px; color: #666; margin-bottom: 4px;">
          Status: <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
        </div>
        <div style="font-size: 12px; color: #888; margin-bottom: 8px;">
          Last update: ${timeText}
        </div>
        ${driver.speed !== undefined ? `
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            Speed: ${Math.round((driver.speed || 0) * 2.237)} mph
          </div>
        ` : ''}
        ${driver.accuracy !== undefined ? `
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            Accuracy: ${Math.round(driver.accuracy)}m
          </div>
        ` : ''}
        ${status?.batteryLevel !== undefined ? `
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            Battery: ${status.batteryLevel}%
          </div>
        ` : ''}
        ${status?.connectionQuality ? `
          <div style="font-size: 12px; color: #666;">
            Signal: ${status.connectionQuality}
          </div>
        ` : ''}
      </div>
    `;
  }, []);

  // Update driver markers when locations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Add/update markers for current drivers
    driverLocations.forEach((driver, driverId) => {
      const status = driverStatuses.get(driverId);
      const existingMarker = currentMarkers.get(driverId);

      if (existingMarker) {
        // Update existing marker
        existingMarker.marker.setLngLat([driver.longitude, driver.latitude]);
        
        // Update marker appearance
        const newElement = createDriverMarker(driver, status);
        existingMarker.element.replaceWith(newElement);
        existingMarker.element = newElement;
        existingMarker.marker.setElement(newElement);
        
        // Update popup content
        existingMarker.popup.setHTML(createDriverPopup(driver, status));
        
        // Add click handler
        newElement.addEventListener('click', () => {
          setSelectedDriver(driverId);
          onDriverClick?.(driver);
        });
      } else {
        // Create new marker
        const element = createDriverMarker(driver, status);
        
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(createDriverPopup(driver, status));

        const marker = new mapboxgl.Marker(element)
          .setLngLat([driver.longitude, driver.latitude])
          .setPopup(popup)
          .addTo(map);

        // Add click handler
        element.addEventListener('click', () => {
          setSelectedDriver(driverId);
          onDriverClick?.(driver);
        });

        // Store marker reference
        currentMarkers.set(driverId, {
          element,
          marker,
          popup,
          driverId,
        });
      }
    });

    // Remove markers for drivers no longer present
    currentMarkers.forEach((markerData, driverId) => {
      if (!driverLocations.has(driverId)) {
        markerData.marker.remove();
        currentMarkers.delete(driverId);
      }
    });

    markersRef.current = currentMarkers;
  }, [driverLocations, driverStatuses, mapLoaded, createDriverMarker, createDriverPopup, onDriverClick]);

  // Auto-fit map to show all drivers
  const fitToDrivers = useCallback(() => {
    if (!mapRef.current || driverLocations.size === 0) return;

    const coordinates: [number, number][] = Array.from(driverLocations.values())
      .map(driver => [driver.longitude, driver.latitude]);

    if (coordinates.length === 1) {
      // Single driver - center on them
      mapRef.current.flyTo({
        center: coordinates[0],
        zoom: 14,
        duration: 1000,
      });
    } else if (coordinates.length > 1) {
      // Multiple drivers - fit bounds
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
      });
    }
  }, [driverLocations]);

  // Find nearby drivers around a location
  const handleFindNearby = useCallback(async (center: [number, number], radius: number = 5) => {
    try {
      const nearbyDrivers = await getNearbyDrivers(center[1], center[0], radius);
      console.log(`Found ${nearbyDrivers.length} nearby drivers`);
      
      // You could highlight these drivers or show them in a list
      // For now, just log them
      nearbyDrivers.forEach(driver => {
        console.log(`Driver ${driver.driverId} at ${driver.latitude}, ${driver.longitude}`);
      });
    } catch (error) {
      console.error('Error finding nearby drivers:', error);
    }
  }, [getNearbyDrivers]);

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      .driver-marker:hover {
        z-index: 1000 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={`relative ${className}`} style={{ height, width }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Connection Status */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Signal: {connectionQuality}
        </div>
        {lastError && (
          <div className="text-xs text-red-500 mt-1">
            Error: {lastError.message}
          </div>
        )}
      </div>
      
      {/* Driver Count */}
      <div className="absolute top-4 right-20 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-sm font-medium">
          Active Drivers: {driverLocations.size}
        </div>
        <div className="text-xs text-gray-500">
          Online: {Array.from(driverStatuses.values()).filter(s => s.isOnline).length}
        </div>
      </div>
      
      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 z-10">
        <button
          onClick={fitToDrivers}
          className="block w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded mb-2"
          disabled={driverLocations.size === 0}
        >
          Fit to Drivers
        </button>
        <button
          onClick={() => {
            if (mapRef.current) {
              const center = mapRef.current.getCenter();
              handleFindNearby([center.lng, center.lat]);
            }
          }}
          className="block w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded"
        >
          Find Nearby
        </button>
      </div>
    </div>
  );
};

export default DriverMap;