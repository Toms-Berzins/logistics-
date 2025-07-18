'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDriverTracking, DriverLocation, DriverStatus } from '../../hooks/useDriverTracking';
import { Card, Button } from '../ui';
import { semanticColors } from '../../styles/design-tokens';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

interface InteractiveDriverMapProps {
  companyId: string;
  mapboxToken: string;
  initialCenter?: [number, number];
  height?: string;
  onDriverSelect?: (driver: DriverLocation) => void;
  showGeofences?: boolean;
  showTraffic?: boolean;
  className?: string;
}

interface DriverMarker {
  element: HTMLDivElement;
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup;
  driverId: string;
  lastUpdate: number;
}

interface MapControls {
  search: string;
  isSearching: boolean;
  selectedDriver: string | null;
  showControls: boolean;
}

export const InteractiveDriverMap: React.FC<InteractiveDriverMapProps> = ({
  companyId,
  mapboxToken,
  initialCenter = [-74.0060, 40.7128], // NYC
  height = '500px',
  onDriverSelect,
  showGeofences = false,
  showTraffic = false,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, DriverMarker>>(new Map());
  const searchControlRef = useRef<HTMLInputElement>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controls, setControls] = useState<MapControls>({
    search: '',
    isSearching: false,
    selectedDriver: null,
    showControls: true,
  });

  // Driver tracking hook
  const {
    isConnected,
    connectionQuality,
    driverLocations,
    driverStatuses,
    lastError,
  } = useDriverTracking({
    companyId,
    userType: 'dispatcher',
    userId: 'tracking-map',
    autoReconnect: true,
    locationSmoothingEnabled: true,
  });

  // Memoized driver statistics
  const driverStats = useMemo(() => {
    const total = driverLocations.size;
    const active = Array.from(driverStatuses.values()).filter(s => s.isOnline && s.isAvailable).length;
    const busy = Array.from(driverStatuses.values()).filter(s => s.isOnline && !s.isAvailable).length;
    const offline = Array.from(driverStatuses.values()).filter(s => !s.isOnline).length;
    
    return { total, active, busy, offline };
  }, [driverLocations, driverStatuses]);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    // Set loading timeout
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setError('Map loading timed out. Please try again.');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    // Check if token is valid (not a demo token)
    if (mapboxToken.includes('demo-token') || mapboxToken === 'demo') {
      setError('Please configure a valid Mapbox access token');
      setIsLoading(false);
      return;
    }

    // Basic token format validation
    if (!mapboxToken.startsWith('pk.') || mapboxToken.split('.').length !== 3) {
      setError('Invalid Mapbox token format. Token should start with "pk." and be a valid JWT.');
      setIsLoading(false);
      return;
    }

    // Check WebGL support
    if (!mapboxgl.supported()) {
      setError('WebGL is not supported on this browser');
      setIsLoading(false);
      return;
    }

    // Log token validation info for debugging
    console.log('Mapbox token validation:', {
      format: mapboxToken.startsWith('pk.') ? 'Valid' : 'Invalid',
      length: mapboxToken.length,
      structure: mapboxToken.split('.').length === 3 ? 'Valid JWT' : 'Invalid JWT'
    });

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = mapboxToken;

      // Create map with optimized settings and error handling
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: 10,
        antialias: true,
        attributionControl: false,
        logoPosition: 'bottom-right',
        preserveDrawingBuffer: true, // For screenshots
        maxZoom: 20,
        minZoom: 2,
        // Add error handling options
        failIfMajorPerformanceCaveat: false,
        transformRequest: (url, resourceType) => {
          // Add error handling for network requests
          if (resourceType === 'Style' && !url.includes('mapbox.com')) {
            return { url };
          }
          return { url };
        },
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      }), 'top-right');

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

      // Add scale control
      map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'imperial'
      }), 'bottom-left');

      // Map event handlers with better error handling
      map.once('load', () => {
        console.log('Interactive map loaded successfully');
        clearTimeout(loadingTimeout); // Clear timeout on successful load
        setMapLoaded(true);
        setIsLoading(false);
        setError(null); // Clear any previous errors

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
              'line-width': 2,
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

        // Add geofences if enabled
        if (showGeofences) {
          // Placeholder for geofence implementation
          // This would integrate with your geofencing system
        }
      });

      map.on('click', () => {
        // Handle map clicks for deselecting drivers
        setControls(prev => ({ ...prev, selectedDriver: null }));
      });

      // Enhanced error handling
      map.on('error', (e) => {
        console.error('Mapbox error:', e.error);
        clearTimeout(loadingTimeout); // Clear timeout on error
        const errorMessage = e.error?.message || 'Map failed to load properly';
        
        // Handle specific error types
        if (errorMessage.includes('token')) {
          setError('Invalid Mapbox token. Please check your configuration.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('WebGL')) {
          setError('WebGL context lost. Please refresh the page.');
        } else {
          setError(`Map error: ${errorMessage}`);
        }
        
        setIsLoading(false);
      });

      // Handle WebGL context loss
      map.on('webglcontextlost', () => {
        console.warn('WebGL context lost');
        setError('WebGL context lost. Please refresh the page.');
        setIsLoading(false);
      });

      // Handle WebGL context restore
      map.on('webglcontextrestored', () => {
        console.log('WebGL context restored');
        setError(null);
        setIsLoading(false);
      });

      // Keyboard navigation support
      map.getCanvas().addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          setControls(prev => ({ ...prev, selectedDriver: null }));
        }
      });

      mapRef.current = map;

    } catch (err) {
      console.error('Failed to initialize map:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
      
      // Handle specific initialization errors
      if (errorMessage.includes('token')) {
        setError('Invalid Mapbox token. Please verify your token is correct.');
      } else if (errorMessage.includes('WebGL')) {
        setError('WebGL not supported. Please use a modern browser.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error during map initialization. Please check your connection.');
      } else {
        setError(`Initialization error: ${errorMessage}`);
      }
      
      setIsLoading(false);
    }

    return () => {
      clearTimeout(loadingTimeout); // Cleanup timeout
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken, initialCenter, showTraffic, showGeofences]);

  // Create driver marker element with status-based styling
  const createDriverMarker = useCallback((driver: DriverLocation, status?: DriverStatus): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'driver-marker interactive-marker';
    el.tabIndex = 0; // Make keyboard accessible
    
    // Determine status and styling
    let statusClass = 'status-unknown';
    let statusIcon = '❓';
    let statusText = 'Unknown';
    
    if (status) {
      if (!status.isOnline) {
        statusClass = 'status-offline';
        statusIcon = '🔴';
        statusText = 'Offline';
      } else if (status.isAvailable) {
        statusClass = 'status-active';
        statusIcon = '🟢';
        statusText = 'Available';
      } else {
        statusClass = 'status-busy';
        statusIcon = '🟡';
        statusText = 'Busy';
      }
    }

    const size = 42;
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      position: relative;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      background: ${getStatusColor(statusClass)};
      transform-origin: center;
    `;

    el.innerHTML = `
      <span style="font-size: 18px;">${statusIcon}</span>
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
          border-bottom: 12px solid ${getStatusColor(statusClass)};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        "></div>
      ` : ''}
    `;

    // Add recent update pulsing animation
    const updateTime = new Date(driver.timestamp).getTime();
    const now = Date.now();
    if (now - updateTime < 10000) { // Last 10 seconds
      el.style.animation = 'driver-pulse 2s infinite';
    }

    // ARIA accessibility
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Driver ${driver.driverId}: ${statusText} at ${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}`);

    // Enhanced hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.3)';
      el.style.zIndex = '1000';
      el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });

    // Focus effects for keyboard navigation
    el.addEventListener('focus', () => {
      el.style.outline = `3px solid #3b82f6`;
      el.style.outlineOffset = '2px';
    });

    el.addEventListener('blur', () => {
      el.style.outline = 'none';
    });

    return el;
  }, []);

  // Create enhanced popup content
  const createDriverPopup = useCallback((driver: DriverLocation, status?: DriverStatus): string => {
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
      <div style="padding: 16px; min-width: 240px; font-family: system-ui, sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: ${statusColor};
            margin-right: 10px;
            flex-shrink: 0;
          "></div>
          <strong style="font-size: 16px; color: #111827;">Driver ${driver.driverId}</strong>
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
            Status: <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
          </div>
          <div style="font-size: 13px; color: #9ca3af;">
            Last update: ${timeText}
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 13px; color: #6b7280;">
          <div style="margin-bottom: 4px;">
            📍 Lat: ${driver.latitude.toFixed(6)}
          </div>
          <div style="margin-bottom: 4px;">
            📍 Lng: ${driver.longitude.toFixed(6)}
          </div>
          ${driver.speed !== undefined ? `
            <div style="margin-bottom: 4px;">
              🚗 Speed: ${Math.round((driver.speed || 0) * 2.237)} mph
            </div>
          ` : ''}
          ${driver.accuracy !== undefined ? `
            <div style="margin-bottom: 4px;">
              🎯 Accuracy: ${Math.round(driver.accuracy)}m
            </div>
          ` : ''}
          ${status?.batteryLevel !== undefined ? `
            <div style="margin-bottom: 4px;">
              🔋 Battery: ${status.batteryLevel}%
            </div>
          ` : ''}
        </div>

        <button style="
          width: 100%;
          margin-top: 12px;
          padding: 8px 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#2563eb'" onmouseout="this.style.backgroundColor='#3b82f6'">
          Track Driver
        </button>
      </div>
    `;
  }, []);

  // Update driver markers with smooth transitions
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Add/update markers for current drivers
    driverLocations.forEach((driver, driverId) => {
      const status = driverStatuses.get(driverId);
      const existingMarker = currentMarkers.get(driverId);

      if (existingMarker) {
        // Smooth position transition
        const currentPos = existingMarker.marker.getLngLat();
        const newPos = [driver.longitude, driver.latitude] as [number, number];
        
        // Calculate if position changed significantly
        const latDiff = Math.abs(currentPos.lat - newPos[1]);
        const lngDiff = Math.abs(currentPos.lng - newPos[0]);
        const positionChanged = latDiff > 0.0001 || lngDiff > 0.0001; // ~10 meters
        
        if (positionChanged) {
          // Animate to new position
          existingMarker.marker.setLngLat(newPos);
          
          // Update marker appearance if status changed
          const newElement = createDriverMarker(driver, status);
          existingMarker.marker.getElement().replaceWith(newElement);
          
          // Update popup content
          existingMarker.popup.setHTML(createDriverPopup(driver, status));
          
          // Add click handler to new element
          newElement.addEventListener('click', (e) => {
            e.stopPropagation();
            setControls(prev => ({ ...prev, selectedDriver: driverId }));
            onDriverSelect?.(driver);
          });

          // Add keyboard handler
          newElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setControls(prev => ({ ...prev, selectedDriver: driverId }));
              onDriverSelect?.(driver);
            }
          });

          existingMarker.element = newElement;
          existingMarker.lastUpdate = Date.now();
        }
      } else {
        // Create new marker
        const element = createDriverMarker(driver, status);
        
        const popup = new mapboxgl.Popup({
          offset: 30,
          closeButton: true,
          closeOnClick: false,
          focusAfterOpen: false,
          className: 'driver-popup',
        }).setHTML(createDriverPopup(driver, status));

        const marker = new mapboxgl.Marker(element)
          .setLngLat([driver.longitude, driver.latitude])
          .setPopup(popup)
          .addTo(map);

        // Add click handler
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          setControls(prev => ({ ...prev, selectedDriver: driverId }));
          onDriverSelect?.(driver);
        });

        // Add keyboard handler
        element.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setControls(prev => ({ ...prev, selectedDriver: driverId }));
            onDriverSelect?.(driver);
          }
        });

        // Store marker reference
        currentMarkers.set(driverId, {
          element,
          marker,
          popup,
          driverId,
          lastUpdate: Date.now(),
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
  }, [driverLocations, driverStatuses, mapLoaded, createDriverMarker, createDriverPopup, onDriverSelect]);

  // Fit map to show all drivers
  const fitToAllDrivers = useCallback(() => {
    if (!mapRef.current || driverLocations.size === 0) return;

    const coordinates: [number, number][] = Array.from(driverLocations.values())
      .map(driver => [driver.longitude, driver.latitude]);

    if (coordinates.length === 1) {
      // Single driver - center on them
      mapRef.current.flyTo({
        center: coordinates[0],
        zoom: 16,
        duration: 1500,
      });
    } else if (coordinates.length > 1) {
      // Multiple drivers - fit bounds with padding
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      mapRef.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 16,
        duration: 1500,
      });
    }
  }, [driverLocations]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !mapRef.current) return;

    setControls(prev => ({ ...prev, isSearching: true }));

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500,
          });
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setControls(prev => ({ ...prev, isSearching: false }));
    }
  }, [mapboxToken]);

  // Get status color helper
  const getStatusColor = (statusClass: string): string => {
    switch (statusClass) {
      case 'status-active': return semanticColors.driver.available;
      case 'status-busy': return semanticColors.driver.busy;
      case 'status-offline': return semanticColors.driver.offline;
      default: return '#6b7280';
    }
  };

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes driver-pulse {
        0% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 12px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      .driver-marker:hover {
        z-index: 1000 !important;
      }
      
      .driver-popup .mapboxgl-popup-content {
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      }
      
      .interactive-marker:focus {
        z-index: 1001 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`interactive-driver-map ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-center max-w-md p-6">
            <div className="text-yellow-600 text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-medium text-yellow-900 mb-2">Mapbox Configuration Required</h3>
            <p className="text-yellow-700 mb-4">{error}</p>
            
            <div className="bg-white rounded-lg p-4 text-left text-sm">
              <h4 className="font-medium text-gray-900 mb-2">Troubleshooting:</h4>
              <div className="text-gray-600 space-y-2">
                <p>If you&apos;re seeing this error with a valid token, try:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your internet connection</li>
                  <li>Verify the token is active in your Mapbox dashboard</li>
                  <li>Clear browser cache and reload</li>
                  <li>Check browser console for detailed error messages</li>
                </ul>
                
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <p className="text-blue-700 text-sm">
                    <strong>Demo Mode Available:</strong> The app can also run in demo mode without Mapbox.
                    Set <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to 
                    <code className="bg-blue-100 px-1 rounded">&quot;demo&quot;</code> to use the demo fallback.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
              >
                Retry After Token Setup
              </button>
              <button 
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  // Force re-render to retry initialization
                  setTimeout(() => {
                    if (mapRef.current) {
                      mapRef.current.remove();
                      mapRef.current = null;
                    }
                  }, 100);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`interactive-driver-map relative ${className}`} style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading interactive map...</p>
          </div>
        </div>
      )}

      {/* Map Controls Overlay */}
      {mapLoaded && controls.showControls && (
        <div className="absolute top-4 left-4 z-10">
          <Card padding="sm" className="bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="space-y-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? 'Live Tracking' : 'Offline'}
                </span>
                {connectionQuality && (
                  <span className="text-xs text-gray-500">
                    ({connectionQuality})
                  </span>
                )}
              </div>

              {/* Driver Statistics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">{driverStats.total}</div>
                  <div className="text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{driverStats.active}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-yellow-600">{driverStats.busy}</div>
                  <div className="text-gray-600">Busy</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-red-600">{driverStats.offline}</div>
                  <div className="text-gray-600">Offline</div>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <input
                  ref={searchControlRef}
                  type="text"
                  placeholder="Search location..."
                  value={controls.search}
                  onChange={(e) => setControls(prev => ({ ...prev, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(controls.search);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={controls.isSearching}
                />
                {controls.isSearching && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={fitToAllDrivers}
                  variant="outline"
                  size="sm"
                  disabled={driverLocations.size === 0}
                  className="w-full text-blue-600 hover:bg-blue-50"
                >
                  📍 Fit to All Drivers
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {lastError && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card padding="sm" className="bg-red-50 border-red-200">
            <div className="text-sm text-red-700">
              <div className="font-medium mb-1">Connection Error</div>
              <div>{lastError.message}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Accessibility Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {mapLoaded && `Interactive map loaded with ${driverLocations.size} drivers visible`}
      </div>
    </div>
  );
};

export default InteractiveDriverMap;