import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapViewport } from '../../types/driver';
import { logisticsColors } from '../../styles/tokens/colors';

// Mapbox access token should be set in environment variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapBoxProps {
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onLoad?: (map: mapboxgl.Map) => void;
  onSourceData?: (e: mapboxgl.MapSourceDataEvent) => void;
  className?: string;
  style?: string;
  children?: React.ReactNode;
}

export const MapBox: React.FC<MapBoxProps> = ({
  viewport,
  onViewportChange,
  onLoad,
  onSourceData,
  className = '',
  style = 'mapbox://styles/mapbox/light-v11',
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      bearing: viewport.bearing || 0,
      pitch: viewport.pitch || 0,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    // Add navigation controls
    const nav = new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    });
    map.addControl(nav, 'top-right');

    // Add scale control
    const scale = new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric',
    });
    map.addControl(scale, 'bottom-left');

    // Add fullscreen control
    const fullscreen = new mapboxgl.FullscreenControl();
    map.addControl(fullscreen, 'top-right');

    // Map event handlers
    const handleMove = () => {
      const center = map.getCenter();
      const newViewport: MapViewport = {
        latitude: center.lat,
        longitude: center.lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
      onViewportChange(newViewport);
    };

    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.(map);
      
      // Add custom logistics styling
      map.addSource('logistics-style', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
      });

      // Customize building colors to match logistics theme
      map.setPaintProperty('building', 'fill-color', logisticsColors.neutral[200]);
      map.setPaintProperty('building', 'fill-opacity', 0.6);
    };

    const handleSourceData = (e: mapboxgl.MapSourceDataEvent) => {
      onSourceData?.(e);
    };

    // Attach event listeners
    map.on('move', handleMove);
    map.on('zoom', handleMove);
    map.on('rotate', handleMove);
    map.on('pitch', handleMove);
    map.on('load', handleLoad);
    map.on('sourcedata', handleSourceData);

    mapRef.current = map;

    // Cleanup function
    return () => {
      map.off('move', handleMove);
      map.off('zoom', handleMove);
      map.off('rotate', handleMove);
      map.off('pitch', handleMove);
      map.off('load', handleLoad);
      map.off('sourcedata', handleSourceData);
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, [style]); // Only recreate map if style changes

  // Update viewport when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentBearing = map.getBearing();
    const currentPitch = map.getPitch();

    // Only update if there's a significant difference to avoid infinite loops
    const centerChanged = Math.abs(currentCenter.lat - viewport.latitude) > 0.0001 ||
                         Math.abs(currentCenter.lng - viewport.longitude) > 0.0001;
    const zoomChanged = Math.abs(currentZoom - viewport.zoom) > 0.1;
    const bearingChanged = Math.abs(currentBearing - (viewport.bearing || 0)) > 1;
    const pitchChanged = Math.abs(currentPitch - (viewport.pitch || 0)) > 1;

    if (centerChanged || zoomChanged || bearingChanged || pitchChanged) {
      map.jumpTo({
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom,
        bearing: viewport.bearing || 0,
        pitch: viewport.pitch || 0,
      });
    }
  }, [viewport, isLoaded]);

  // Get map instance for children
  const getMap = useCallback(() => mapRef.current, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        role="region"
        aria-label="Interactive map showing driver locations"
      />
      
      {/* Custom map controls overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {/* Connection status indicator */}
        <div className="bg-white rounded-lg shadow-md p-2 flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Live Tracking</span>
        </div>
      </div>

      {/* Render children with map context */}
      {isLoaded && children && React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            map: getMap(),
            ...child.props 
          });
        }
        return child;
      })}

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapBox;