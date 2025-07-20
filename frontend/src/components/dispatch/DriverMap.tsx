'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDriverTracking, DriverLocation, DriverStatus } from '../../hooks/useDriverTracking';
import { useAIRoutePrediction, RoutePrediction } from '../../hooks/useAIRoutePrediction';
import { Card, Button } from '../ui';
import ConnectionStatus from '../realtime/ConnectionStatus';
import PredictiveOverlay from '../map/PredictiveOverlay';
import SmartCluster from '../map/SmartCluster';

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
  showPredictions?: boolean;
  showHeatMap?: boolean;
  useSmartClustering?: boolean;
  onDriverClick?: (driver: DriverLocation) => void;
  onMapClick?: (coordinates: [number, number]) => void;
  onPredictionClick?: (prediction: RoutePrediction) => void;
  onClusterClick?: (driverIds: string[], bounds: mapboxgl.LngLatBounds) => void;
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
  showPredictions = true,
  showHeatMap = true,
  useSmartClustering = true,
  onDriverClick,
  onMapClick,
  onPredictionClick,
  onClusterClick,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, DriverMarker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const renderTimeoutRef = useRef<NodeJS.Timeout>();
  const lastRenderTime = useRef<number>(0);
  // const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Driver tracking hook
  const {
    isConnected,
    connectionQuality,
    driverLocations,
    driverStatuses,
    // trackDriver,
    getNearbyDrivers,
    lastError,
  } = useDriverTracking({
    companyId,
    userType,
    userId,
    autoReconnect: true,
    locationSmoothingEnabled: true,
  });

  // AI route prediction hook
  const {
    predictions,
    trafficData,
    isLoading: isPredictionLoading,
    error: predictionError,
    generatePredictions,
    generateTrafficData,
    clearPredictions,
    getBestPrediction,
  } = useAIRoutePrediction({
    enabled: showPredictions,
    updateInterval: 30000,
    confidenceThreshold: 0.6,
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

    map.on('zoom', () => {
      setCurrentZoom(map.getZoom());
    });
    
    map.on('movestart', () => {
      setIsMapMoving(true);
    });
    
    map.on('moveend', () => {
      setIsMapMoving(false);
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e.error);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [mapboxToken, initialCenter, initialZoom, showTraffic, show3D, onMapClick]);

  // Memoized driver locations for performance
  const driverLocationsList = useMemo(() => 
    Array.from(driverLocations.values()), 
    [driverLocations]
  );
  
  const driverStatusesList = useMemo(() => 
    Array.from(driverStatuses.entries()), 
    [driverStatuses]
  );
  
  // Optimized driver marker creation with canvas for large datasets
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

    // Add pulsing animation for recent updates (client-side only) - throttled
    if (typeof window !== 'undefined') {
      const updateTime = new Date(driver.timestamp).getTime();
      const now = Date.now();
      if (now - updateTime < 30000) { // Last 30 seconds
        el.style.animation = 'pulse 2s infinite';
      }
    }
    
    // Add performance attributes
    el.style.willChange = 'transform';
    el.style.contain = 'layout style paint';

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
    const timeDiff = typeof window !== 'undefined' ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 0;
    
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

  // Optimized driver marker updates with throttling and batching
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || useSmartClustering || isMapMoving) return;

    // Throttle updates to prevent excessive rendering
    const now = performance.now();
    if (now - lastRenderTime.current < 16) { // ~60fps limit
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      renderTimeoutRef.current = setTimeout(() => {
        lastRenderTime.current = performance.now();
        updateMarkersImmediate();
      }, 16);
      return;
    }
    
    lastRenderTime.current = now;
    updateMarkersImmediate();
    
    function updateMarkersImmediate() {
      if (!mapRef.current) return;
      
      const map = mapRef.current;
      const currentMarkers = markersRef.current;
      const updates: Array<() => void> = [];
      const removals: Array<() => void> = [];
      
      // Batch marker updates
      driverLocationsList.forEach((driver) => {
        const driverId = driver.driverId;
        const status = driverStatuses.get(driverId);
        const existingMarker = currentMarkers.get(driverId);

        if (existingMarker) {
          // Queue position update
          updates.push(() => {
            existingMarker.marker.setLngLat([driver.longitude, driver.latitude]);
            
            // Update popup content if needed
            existingMarker.popup.setHTML(createDriverPopup(driver, status));
          });
        } else {
          // Queue new marker creation
          updates.push(() => {
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
              onDriverClick?.(driver);
            });

            // Store marker reference
            currentMarkers.set(driverId, {
              element,
              marker,
              popup,
              driverId,
            });
          });
        }
      });

      // Queue marker removals
      currentMarkers.forEach((markerData, driverId) => {
        if (!driverLocations.has(driverId)) {
          removals.push(() => {
            markerData.marker.remove();
            currentMarkers.delete(driverId);
          });
        }
      });
      
      // Execute batched updates using requestAnimationFrame
      if (updates.length > 0 || removals.length > 0) {
        requestAnimationFrame(() => {
          // Process removals first
          removals.forEach(removal => removal());
          
          // Then process updates/additions
          updates.forEach(update => update());
          
          markersRef.current = currentMarkers;
        });
      }
    }
  }, [driverLocationsList, driverStatusesList, mapLoaded, useSmartClustering, isMapMoving, createDriverMarker, createDriverPopup, onDriverClick]);

  // Clear individual markers when switching to smart clustering
  useEffect(() => {
    if (useSmartClustering) {
      markersRef.current.forEach(marker => marker.marker.remove());
      markersRef.current.clear();
    }
  }, [useSmartClustering]);

  // Optimized auto-fit with memoized coordinates
  const driverCoordinates = useMemo(() => 
    driverLocationsList.map(driver => [driver.longitude, driver.latitude] as [number, number]), 
    [driverLocationsList]
  );
  
  const fitToDrivers = useCallback(() => {
    if (!mapRef.current || driverCoordinates.length === 0) return;

    if (driverCoordinates.length === 1) {
      // Single driver - center on them
      mapRef.current.flyTo({
        center: driverCoordinates[0],
        zoom: 14,
        duration: 1000,
      });
    } else if (driverCoordinates.length > 1) {
      // Multiple drivers - fit bounds
      const bounds = driverCoordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(driverCoordinates[0], driverCoordinates[0]));

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
        duration: 1000,
      });
    }
  }, [driverCoordinates]);

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

  // Handle prediction generation
  const handleGeneratePredictions = useCallback(async () => {
    if (!mapRef.current) return;

    const center = mapRef.current.getCenter();
    const bounds = mapRef.current.getBounds();
    
    if (!bounds) return;
    
    // Generate predictions for current view
    await generatePredictions([center.lng, center.lat], [center.lng + 0.01, center.lat + 0.01]);
    
    // Generate traffic data for current bounds
    generateTrafficData([
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()]
    ]);
  }, [generatePredictions, generateTrafficData]);

  // Handle prediction click
  const handlePredictionClick = useCallback((prediction: RoutePrediction) => {
    setSelectedPrediction(prediction.id);
    onPredictionClick?.(prediction);
  }, [onPredictionClick]);

  // Generate initial predictions when map loads
  useEffect(() => {
    if (mapLoaded && showPredictions) {
      setTimeout(() => {
        handleGeneratePredictions();
      }, 1000); // Delay to ensure map is ready
    }
  }, [mapLoaded, showPredictions, handleGeneratePredictions]);

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
      
      {/* AI Predictive Overlay */}
      {mapLoaded && (showPredictions || showHeatMap) && (
        <PredictiveOverlay
          map={mapRef.current}
          predictions={predictions}
          trafficData={trafficData}
          showHeatMap={showHeatMap}
          showPredictions={showPredictions}
          selectedPrediction={selectedPrediction}
          onPredictionClick={handlePredictionClick}
        />
      )}

      {/* Smart Driver Clustering */}
      {mapLoaded && useSmartClustering && (
        <SmartCluster
          map={mapRef.current}
          driverLocations={driverLocations}
          driverStatuses={driverStatuses}
          zoom={currentZoom}
          onClusterClick={onClusterClick}
          onDriverClick={onDriverClick}
        />
      )}
      
      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-10">
        <Card padding="sm" className="bg-white/95 backdrop-blur-sm">
          <ConnectionStatus
            isConnected={isConnected}
            connectionQuality={connectionQuality}
            lastError={lastError ? { message: lastError.message, timestamp: new Date() } : undefined}
            showDetails={false}
          />
        </Card>
      </div>
      
      {/* Driver Count & AI Status */}
      <div className="absolute top-4 right-20 z-10">
        <Card padding="sm" className="bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium text-neutral-900">
              Active Drivers: {driverLocations.size}
            </div>
            <div className="text-xs text-neutral-500">
              Online: {Array.from(driverStatuses.values()).filter(s => s.isOnline).length}
            </div>
            {showPredictions && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isPredictionLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                AI: {predictions.length} predictions
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card padding="sm" className="bg-white/95 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <Button
              onClick={fitToDrivers}
              variant="outline"
              size="sm"
              disabled={driverLocations.size === 0}
              className="text-primary-600 hover:bg-primary-50"
            >
              Fit to Drivers
            </Button>
            <Button
              onClick={() => {
                if (mapRef.current) {
                  const center = mapRef.current.getCenter();
                  handleFindNearby([center.lng, center.lat]);
                }
              }}
              variant="outline"
              size="sm"
              className="text-success-600 hover:bg-success-50"
            >
              Find Nearby
            </Button>
            {showPredictions && (
              <Button
                onClick={handleGeneratePredictions}
                variant="outline"
                size="sm"
                disabled={isPredictionLoading}
                className="text-blue-600 hover:bg-blue-50"
              >
                {isPredictionLoading ? 'Generating...' : 'AI Predictions'}
              </Button>
            )}
            {predictions.length > 0 && (
              <Button
                onClick={() => {
                  clearPredictions();
                  setSelectedPrediction(null);
                }}
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
              >
                Clear Predictions
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DriverMap;