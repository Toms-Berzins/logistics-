import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DriverMap from './DriverMap';
import useDriverTracking from '../hooks/useDriverTracking';

// Types
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface IDriverLocation {
  driverId: string;
  companyId: string;
  location: GeoPoint;
  metadata: {
    batteryLevel: number;
    provider: 'GPS' | 'NETWORK' | 'PASSIVE';
    satellites?: number;
    hdop?: number;
    pdop?: number;
  };
  isOnline: boolean;
  lastSeen: Date;
  currentZoneId?: string;
  currentJobId?: string;
  status: 'available' | 'busy' | 'offline' | 'break';
  heading?: number;
  speed?: number;
}

interface IGeofenceEvent {
  driverId: string;
  zoneId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: GeoPoint;
  timestamp: Date;
}

interface TrackingDashboardProps {
  companyId: string;
  initialCenter?: GeoPoint;
  userRole?: 'admin' | 'dispatcher' | 'driver';
  driverId?: string; // For driver view
}

const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  companyId,
  initialCenter = { latitude: 40.7128, longitude: -74.0060 },
  userRole = 'dispatcher',
  driverId
}) => {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<'all' | 'zone' | 'driver'>('all');
  const [mapCenter, setMapCenter] = useState<GeoPoint>(initialCenter);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [eventFilter, setEventFilter] = useState<'all' | 'enter' | 'exit' | 'dwell'>('all');
  
  const queryClient = useQueryClient();

  // Socket.io connection with driver tracking
  const {
    isConnected,
    connectionStatus,
    drivers,
    geofenceEvents,
    trackDriver,
    trackZone: _trackZone,
    findNearbyDrivers,
    registerDispatcher,
    getDriverLocation: _getDriverLocation,
    clearEvents,
    sendLocationUpdate,
    updateDriverStatus
  } = useDriverTracking({
    companyId,
    onLocationUpdate: (update) => {
      console.log('Location update received:', update);
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onGeofenceEvent: (event) => {
      console.log('Geofence event:', event);
      // Could trigger notifications here
    },
    onConnectionChange: (status) => {
      console.log('Connection status changed:', status);
    }
  });

  // Fetch driver performance metrics
  const { data: _driverMetrics = [], isLoading: _metricsLoading } = useQuery({
    queryKey: ['driver-metrics', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/driver-metrics?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch driver metrics');
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  // Fetch zone analytics
  const { data: _zoneAnalytics = [], isLoading: _analyticsLoading } = useQuery({
    queryKey: ['zone-analytics', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/zone-activity?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch zone analytics');
      return response.json();
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });

  // Handle driver selection
  const handleDriverClick = useCallback((driver: IDriverLocation) => {
    setSelectedDriver(driver.driverId);
    setMapCenter(driver.location);
    
    // Track this specific driver
    trackDriver(driver.driverId);
  }, [trackDriver]);

  // Handle geofence event
  const handleGeofenceEvent = useCallback((event: IGeofenceEvent) => {
    // Could show notifications, update alerts, etc.
    console.log('Geofence event in dashboard:', event);
  }, []);

  // Find nearby drivers to a location
  const _handleFindNearby = useCallback((location: GeoPoint) => {
    findNearbyDrivers(location, 2000); // 2km radius
  }, [findNearbyDrivers]);

  // Register dispatcher on connection
  React.useEffect(() => {
    if (isConnected && userRole === 'dispatcher') {
      registerDispatcher(`dispatcher_${Date.now()}`, selectedZone ? [selectedZone] : []);
    }
  }, [isConnected, userRole, registerDispatcher, selectedZone]);

  // Filtered events based on selected filter
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return geofenceEvents;
    return geofenceEvents.filter(event => event.eventType === eventFilter);
  }, [geofenceEvents, eventFilter]);

  // Driver statistics
  const driverStats = useMemo(() => {
    const driverArray = Array.from(drivers.values());
    return {
      total: driverArray.length,
      online: driverArray.filter(d => d.isOnline).length,
      available: driverArray.filter(d => d.status === 'available').length,
      busy: driverArray.filter(d => d.status === 'busy').length,
      onBreak: driverArray.filter(d => d.status === 'break').length
    };
  }, [drivers]);

  // For driver view - send location updates
  const _handleLocationUpdate = useCallback((location: GeoPoint, metadata: unknown) => {
    if (userRole === 'driver' && driverId) {
      sendLocationUpdate(driverId, location, metadata);
    }
  }, [userRole, driverId, sendLocationUpdate]);

  // For driver view - update status
  const handleStatusUpdate = useCallback((status: 'available' | 'busy' | 'break', jobId?: string) => {
    if (userRole === 'driver' && driverId) {
      updateDriverStatus(driverId, status, jobId);
    }
  }, [userRole, driverId, updateDriverStatus]);

  return (
    <div className="tracking-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Driver Tracking Dashboard</h1>
        <div className="connection-indicator">
          <span className={`status-dot ${connectionStatus}`}></span>
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="control-group">
          <label>Tracking Mode:</label>
          <select 
            value={trackingMode} 
            onChange={(e) => setTrackingMode(e.target.value as 'all' | 'zone' | 'driver')}
          >
            <option value="all">All Drivers</option>
            <option value="zone">By Zone</option>
            <option value="driver">Single Driver</option>
          </select>
        </div>

        {trackingMode === 'driver' && (
          <div className="control-group">
            <label>Driver ID:</label>
            <input
              type="text"
              value={selectedDriver || ''}
              onChange={(e) => setSelectedDriver(e.target.value)}
              placeholder="Enter driver ID"
            />
          </div>
        )}

        {trackingMode === 'zone' && (
          <div className="control-group">
            <label>Zone ID:</label>
            <input
              type="text"
              value={selectedZone || ''}
              onChange={(e) => setSelectedZone(e.target.value)}
              placeholder="Enter zone ID"
            />
          </div>
        )}

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showGeofences}
              onChange={(e) => setShowGeofences(e.target.checked)}
            />
            Show Geofences
          </label>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showEvents}
              onChange={(e) => setShowEvents(e.target.checked)}
            />
            Show Events
          </label>
        </div>

        <button onClick={clearEvents} className="btn-clear">
          Clear Events
        </button>
      </div>

      {/* Statistics */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Drivers</h3>
          <span className="stat-value">{driverStats.total}</span>
        </div>
        <div className="stat-card">
          <h3>Online</h3>
          <span className="stat-value online">{driverStats.online}</span>
        </div>
        <div className="stat-card">
          <h3>Available</h3>
          <span className="stat-value available">{driverStats.available}</span>
        </div>
        <div className="stat-card">
          <h3>Busy</h3>
          <span className="stat-value busy">{driverStats.busy}</span>
        </div>
        <div className="stat-card">
          <h3>On Break</h3>
          <span className="stat-value break">{driverStats.onBreak}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Map */}
        <div className="map-container">
          <DriverMap
            companyId={companyId}
            initialCenter={mapCenter}
            initialZoom={12}
            showGeofences={showGeofences}
            trackingMode={trackingMode}
            targetZoneId={selectedZone}
            targetDriverId={selectedDriver}
            onDriverClick={handleDriverClick}
            onGeofenceEvent={handleGeofenceEvent}
          />
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          {/* Events */}
          {showEvents && (
            <div className="events-section">
              <div className="section-header">
                <h3>Recent Events</h3>
                <select 
                  value={eventFilter} 
                  onChange={(e) => setEventFilter(e.target.value as 'all' | 'enter' | 'exit' | 'dwell')}
                >
                  <option value="all">All Events</option>
                  <option value="enter">Entry</option>
                  <option value="exit">Exit</option>
                  <option value="dwell">Dwell</option>
                </select>
              </div>
              
              <div className="events-list">
                {filteredEvents.slice(-20).reverse().map((event, index) => (
                  <div key={index} className={`event-item ${event.eventType}`}>
                    <div className="event-header">
                      <span className="event-type">{event.eventType.toUpperCase()}</span>
                      <span className="event-time">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="event-details">
                      <span>Driver: {event.driverId}</span>
                      <span>Zone: {event.zoneId}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Driver List */}
          <div className="drivers-section">
            <h3>Active Drivers</h3>
            <div className="drivers-list">
              {Array.from(drivers.values())
                .filter(driver => driver.isOnline)
                .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                .map(driver => (
                  <div 
                    key={driver.driverId} 
                    className={`driver-item ${driver.status} ${selectedDriver === driver.driverId ? 'selected' : ''}`}
                    onClick={() => handleDriverClick(driver)}
                  >
                    <div className="driver-header">
                      <span className="driver-id">{driver.driverId}</span>
                      <span className={`driver-status ${driver.status}`}>
                        {driver.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="driver-details">
                      <span>Battery: {driver.metadata.batteryLevel}%</span>
                      <span>Last: {new Date(driver.lastSeen).toLocaleTimeString()}</span>
                    </div>
                    {driver.currentZoneId && (
                      <div className="driver-zone">Zone: {driver.currentZoneId}</div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Driver Controls (for driver view) */}
          {userRole === 'driver' && driverId && (
            <div className="driver-controls">
              <h3>Driver Controls</h3>
              <div className="status-controls">
                <button 
                  className="btn-status available"
                  onClick={() => handleStatusUpdate('available')}
                >
                  Available
                </button>
                <button 
                  className="btn-status busy"
                  onClick={() => handleStatusUpdate('busy')}
                >
                  Busy
                </button>
                <button 
                  className="btn-status break"
                  onClick={() => handleStatusUpdate('break')}
                >
                  On Break
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .tracking-dashboard {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f9fafb;
        }

        .dashboard-header {
          background: white;
          padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6b7280;
        }

        .status-dot.connected {
          background: #22c55e;
        }

        .status-dot.connecting {
          background: #f59e0b;
          animation: pulse 2s infinite;
        }

        .dashboard-controls {
          background: white;
          padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .control-group select,
        .control-group input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .btn-clear {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-clear:hover {
          background: #dc2626;
        }

        .dashboard-stats {
          background: white;
          padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 24px;
        }

        .stat-card {
          text-align: center;
          min-width: 100px;
        }

        .stat-card h3 {
          margin: 0 0 8px 0;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .stat-value.online {
          color: #22c55e;
        }

        .stat-value.available {
          color: #22c55e;
        }

        .stat-value.busy {
          color: #f59e0b;
        }

        .stat-value.break {
          color: #3b82f6;
        }

        .dashboard-content {
          flex: 1;
          display: flex;
          gap: 16px;
          padding: 16px;
        }

        .map-container {
          flex: 1;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .side-panel {
          width: 320px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .events-section,
        .drivers-section,
        .driver-controls {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .events-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .event-item {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #f9fafb;
          border-left: 4px solid #6b7280;
        }

        .event-item.enter {
          background: #dcfce7;
          border-left-color: #22c55e;
        }

        .event-item.exit {
          background: #fef3c7;
          border-left-color: #f59e0b;
        }

        .event-item.dwell {
          background: #dbeafe;
          border-left-color: #3b82f6;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .event-type {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .event-time {
          font-size: 12px;
          color: #6b7280;
        }

        .event-details {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }

        .drivers-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .driver-item {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #f9fafb;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .driver-item:hover {
          background: #f3f4f6;
        }

        .driver-item.selected {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .driver-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .driver-id {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .driver-status {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 12px;
          color: white;
        }

        .driver-status.available {
          background: #22c55e;
        }

        .driver-status.busy {
          background: #f59e0b;
        }

        .driver-status.break {
          background: #3b82f6;
        }

        .driver-status.offline {
          background: #6b7280;
        }

        .driver-details {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }

        .driver-zone {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .status-controls {
          display: flex;
          gap: 8px;
        }

        .btn-status {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .btn-status.available {
          background: #22c55e;
        }

        .btn-status.busy {
          background: #f59e0b;
        }

        .btn-status.break {
          background: #3b82f6;
        }

        .btn-status:hover {
          opacity: 0.9;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TrackingDashboard;