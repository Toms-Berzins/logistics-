import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Types
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface LocationMetadata {
  batteryLevel: number;
  provider: 'GPS' | 'NETWORK' | 'PASSIVE';
  satellites?: number;
  hdop?: number;
  pdop?: number;
}

interface IDriverLocation {
  driverId: string;
  companyId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  isOnline: boolean;
  lastSeen: Date;
  currentZoneId?: string;
  currentJobId?: string;
  status: 'available' | 'busy' | 'offline' | 'break';
  heading?: number;
  speed?: number;
}

interface IGeofenceZone {
  id: string;
  name: string;
  boundary: GeoPoint[];
  center: GeoPoint;
  radius: number;
  color: string;
  isActive: boolean;
}

interface ILocationUpdate {
  driverId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  timestamp: Date;
  zoneId?: string;
}

interface IGeofenceEvent {
  driverId: string;
  zoneId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: GeoPoint;
  timestamp: Date;
}

interface DriverMapProps {
  companyId: string;
  initialCenter?: GeoPoint;
  initialZoom?: number;
  showGeofences?: boolean;
  trackingMode?: 'all' | 'zone' | 'driver';
  targetZoneId?: string;
  targetDriverId?: string;
  onDriverClick?: (driver: IDriverLocation) => void;
  onGeofenceEvent?: (event: IGeofenceEvent) => void;
}

// Custom marker icons
const createDriverIcon = (status: string, heading?: number) => {
  const colors = {
    available: '#22c55e',
    busy: '#f59e0b',
    offline: '#6b7280',
    break: '#3b82f6'
  };

  const rotation = heading ? `rotate(${heading}deg)` : '';
  
  return divIcon({
    className: 'driver-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${colors[status as keyof typeof colors] || colors.offline};
        border: 2px solid white;
        border-radius: 50%;
        transform: ${rotation};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
      ">
        🚗
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const DriverMap: React.FC<DriverMapProps> = ({
  companyId,
  initialCenter = { latitude: 40.7128, longitude: -74.0060 },
  initialZoom = 12,
  showGeofences = true,
  trackingMode = 'all',
  targetZoneId,
  targetDriverId,
  onDriverClick,
  onGeofenceEvent
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [drivers, setDrivers] = useState<Map<string, IDriverLocation>>(new Map());
  const [geofenceEvents, setGeofenceEvents] = useState<IGeofenceEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [_selectedDriver, setSelectedDriver] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch initial driver data
  const { data: initialDrivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', companyId, trackingMode, targetZoneId, targetDriverId],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId,
        trackingMode,
        ...(targetZoneId && { zoneId: targetZoneId }),
        ...(targetDriverId && { driverId: targetDriverId })
      });
      
      const response = await fetch(`/api/drivers/locations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch driver locations');
      }
      return response.json();
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds fallback
  });

  // Fetch geofence zones
  const { data: geofenceZones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['geofence-zones', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/geofence/zones?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch geofence zones');
      }
      return response.json();
    },
    enabled: showGeofences,
    staleTime: 60000, // 1 minute
  });

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('auth_token') || 'valid-token'
      },
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);
    setConnectionStatus('connecting');

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to Socket.io server');
      setConnectionStatus('connected');
      
      // Register as dispatcher
      newSocket.emit('dispatcher:register', {
        dispatcherId: `dispatcher_${Date.now()}`,
        companyId,
        zones: targetZoneId ? [targetZoneId] : []
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.io server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
    });

    return () => {
      newSocket.close();
    };
  }, [companyId, targetZoneId]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!socket) return;

    // Location updates
    const handleLocationUpdate = (data: ILocationUpdate) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            location: data.location,
            metadata: data.metadata,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });

      // Invalidate React Query cache for real-time updates
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    };

    // Driver online/offline events
    const handleDriverOnline = (data: { driverId: string; location: GeoPoint; timestamp: Date }) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            isOnline: true,
            location: data.location,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });
    };

    const handleDriverOffline = (data: { driverId: string; timestamp: Date }) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            isOnline: false,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });
    };

    // Geofence events
    const handleGeofenceEnter = (event: IGeofenceEvent) => {
      console.log('Geofence enter:', event);
      setGeofenceEvents(prev => [...prev.slice(-49), event]); // Keep last 50 events
      onGeofenceEvent?.(event);
    };

    const handleGeofenceExit = (event: IGeofenceEvent) => {
      console.log('Geofence exit:', event);
      setGeofenceEvents(prev => [...prev.slice(-49), event]);
      onGeofenceEvent?.(event);
    };

    // Subscribe to events
    socket.on('location:update', handleLocationUpdate);
    socket.on('driver:online', handleDriverOnline);
    socket.on('driver:offline', handleDriverOffline);
    socket.on('geofence:enter', handleGeofenceEnter);
    socket.on('geofence:exit', handleGeofenceExit);

    // Track specific driver if requested
    if (targetDriverId) {
      socket.emit('dispatcher:track_driver', { driverId: targetDriverId });
    }

    // Track specific zone if requested
    if (targetZoneId) {
      socket.emit('dispatcher:track_zone', { zoneId: targetZoneId });
    }

    return () => {
      socket.off('location:update', handleLocationUpdate);
      socket.off('driver:online', handleDriverOnline);
      socket.off('driver:offline', handleDriverOffline);
      socket.off('geofence:enter', handleGeofenceEnter);
      socket.off('geofence:exit', handleGeofenceExit);
    };
  }, [socket, targetDriverId, targetZoneId, onGeofenceEvent, queryClient]);

  // Initialize drivers from API data
  useEffect(() => {
    if (initialDrivers.length > 0) {
      const driverMap = new Map();
      initialDrivers.forEach((driver: IDriverLocation) => {
        driverMap.set(driver.driverId, driver);
      });
      setDrivers(driverMap);
    }
  }, [initialDrivers]);

  // Handle driver marker click
  const handleDriverClick = useCallback((driver: IDriverLocation) => {
    setSelectedDriver(driver.driverId);
    onDriverClick?.(driver);
  }, [onDriverClick]);

  // Find nearby drivers
  const _findNearbyDrivers = useCallback(async (location: GeoPoint, radius: number = 1000) => {
    if (!socket) return;

    socket.emit('dispatcher:nearby_drivers', {
      companyId,
      location,
      radiusMeters: radius,
      limit: 20
    });
  }, [socket, companyId]);

  // Memoized driver markers
  const driverMarkers = useMemo(() => {
    return Array.from(drivers.values()).map(driver => (
      <Marker
        key={driver.driverId}
        position={[driver.location.latitude, driver.location.longitude]}
        icon={createDriverIcon(driver.status, driver.heading)}
        eventHandlers={{
          click: () => handleDriverClick(driver)
        }}
      >
        <Popup>
          <div className="driver-popup">
            <h3>Driver {driver.driverId}</h3>
            <p><strong>Status:</strong> {driver.status}</p>
            <p><strong>Online:</strong> {driver.isOnline ? 'Yes' : 'No'}</p>
            <p><strong>Battery:</strong> {driver.metadata.batteryLevel}%</p>
            <p><strong>Provider:</strong> {driver.metadata.provider}</p>
            <p><strong>Speed:</strong> {driver.speed ? `${driver.speed.toFixed(1)} km/h` : 'N/A'}</p>
            <p><strong>Heading:</strong> {driver.heading ? `${driver.heading}°` : 'N/A'}</p>
            <p><strong>Last Seen:</strong> {new Date(driver.lastSeen).toLocaleTimeString()}</p>
            {driver.currentZoneId && (
              <p><strong>Current Zone:</strong> {driver.currentZoneId}</p>
            )}
            {driver.currentJobId && (
              <p><strong>Current Job:</strong> {driver.currentJobId}</p>
            )}
          </div>
        </Popup>
      </Marker>
    ));
  }, [drivers, handleDriverClick]);

  // Memoized geofence zones
  const geofenceMarkers = useMemo(() => {
    if (!showGeofences) return null;

    return geofenceZones.map((zone: IGeofenceZone) => (
      <Circle
        key={zone.id}
        center={[zone.center.latitude, zone.center.longitude]}
        radius={zone.radius}
        pathOptions={{
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.1,
          weight: 2
        }}
      >
        <Popup>
          <div className="zone-popup">
            <h3>{zone.name}</h3>
            <p><strong>Zone ID:</strong> {zone.id}</p>
            <p><strong>Radius:</strong> {zone.radius}m</p>
            <p><strong>Active:</strong> {zone.isActive ? 'Yes' : 'No'}</p>
          </div>
        </Popup>
      </Circle>
    ));
  }, [geofenceZones, showGeofences]);

  // Loading state
  if (driversLoading || zonesLoading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="driver-map-container">
      {/* Connection status indicator */}
      <div className={`connection-status ${connectionStatus}`}>
        <span className="status-indicator"></span>
        {connectionStatus === 'connected' && 'Connected'}
        {connectionStatus === 'connecting' && 'Connecting...'}
        {connectionStatus === 'disconnected' && 'Disconnected'}
      </div>

      {/* Map statistics */}
      <div className="map-stats">
        <span>Active Drivers: {Array.from(drivers.values()).filter(d => d.isOnline).length}</span>
        <span>Total Drivers: {drivers.size}</span>
        <span>Recent Events: {geofenceEvents.length}</span>
      </div>

      {/* Map container */}
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Driver markers */}
        {driverMarkers}
        
        {/* Geofence zones */}
        {geofenceMarkers}
      </MapContainer>

      {/* Recent events panel */}
      {geofenceEvents.length > 0 && (
        <div className="events-panel">
          <h4>Recent Events</h4>
          <div className="events-list">
            {geofenceEvents.slice(-10).reverse().map((event, index) => (
              <div key={index} className={`event-item ${event.eventType}`}>
                <span className="event-type">{event.eventType}</span>
                <span className="event-driver">Driver {event.driverId}</span>
                <span className="event-zone">Zone {event.zoneId}</span>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .driver-map-container {
          position: relative;
          height: 100%;
          width: 100%;
        }

        .connection-status {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.9);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6b7280;
        }

        .connection-status.connected .status-indicator {
          background: #22c55e;
        }

        .connection-status.connecting .status-indicator {
          background: #f59e0b;
          animation: pulse 2s infinite;
        }

        .connection-status.disconnected .status-indicator {
          background: #ef4444;
        }

        .map-stats {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.9);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .map-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          background: #f9fafb;
        }

        .loading-spinner {
          font-size: 18px;
          color: #6b7280;
        }

        .events-panel {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.95);
          padding: 12px;
          border-radius: 8px;
          max-width: 300px;
          max-height: 200px;
          overflow-y: auto;
        }

        .events-panel h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .event-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          background: #f3f4f6;
        }

        .event-item.enter {
          background: #dcfce7;
          color: #166534;
        }

        .event-item.exit {
          background: #fef3c7;
          color: #92400e;
        }

        .event-item.dwell {
          background: #dbeafe;
          color: #1e40af;
        }

        .event-type {
          font-weight: 600;
          text-transform: uppercase;
        }

        .driver-popup, .zone-popup {
          font-size: 14px;
        }

        .driver-popup h3, .zone-popup h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .driver-popup p, .zone-popup p {
          margin: 4px 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default DriverMap;