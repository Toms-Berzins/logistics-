import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import MapBox from '../../Map/MapBox';
import DriverMarkers from '../../Map/DriverMarkers';
import DriverDetailPopup from './DriverDetailPopup';
import { useSocketDriverLocations } from '../../../hooks/useSocketDriverLocations';
import { DriverLocation, MapViewport, GeofenceZone } from '../../../types/driver';
import { logisticsColors } from '../../../styles/tokens/colors';

interface DriverMapContainerProps {
  companyId: string;
  initialViewport?: MapViewport;
  geofences?: GeofenceZone[];
  onDriverCall?: (driverId: string) => void;
  onDriverNavigate?: (driver: DriverLocation) => void;
  onAssignDelivery?: (driverId: string) => void;
  className?: string;
}

interface FilterOptions {
  showActive: boolean;
  showIdle: boolean;
  showOffline: boolean;
  showBreak: boolean;
  vehicleTypes: string[];
  showWithDeliveries: boolean;
  showWithoutDeliveries: boolean;
}

export const DriverMapContainer: React.FC<DriverMapContainerProps> = ({
  companyId,
  initialViewport = {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 12,
  },
  geofences = [],
  onDriverCall,
  onDriverNavigate,
  onAssignDelivery,
  className = '',
}) => {
  // State management
  const [viewport, setViewport] = useState<MapViewport>(initialViewport);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [nearestDriverId, setNearestDriverId] = useState<string>();
  const [showFilters, setShowFilters] = useState(false);
  const [showDriverList, setShowDriverList] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    showActive: true,
    showIdle: true,
    showOffline: false,
    showBreak: true,
    vehicleTypes: ['van', 'truck', 'car', 'motorcycle'],
    showWithDeliveries: true,
    showWithoutDeliveries: true,
  });

  // WebSocket connection for real-time updates
  const {
    drivers,
    connectionStatus,
    isConnected,
    subscribe,
    unsubscribe,
    requestDriverUpdate,
  } = useSocketDriverLocations({
    companyId,
    updateInterval: 10000,
    onLocationUpdate: (driver) => {
      console.log('Driver location updated:', driver.id);
    },
    onConnectionChange: (status) => {
      console.log('Connection status:', status);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Convert Map to Array and apply filters
  const filteredDrivers = useMemo(() => {
    const driverArray = Array.from(drivers.values());
    
    return driverArray.filter(driver => {
      // Status filters
      if (!filters.showActive && driver.status === 'active') return false;
      if (!filters.showIdle && driver.status === 'idle') return false;
      if (!filters.showOffline && driver.status === 'offline') return false;
      if (!filters.showBreak && driver.status === 'break') return false;
      
      // Vehicle type filters
      if (!filters.vehicleTypes.includes(driver.vehicleType)) return false;
      
      // Delivery status filters
      const hasDelivery = !!driver.currentDelivery;
      if (!filters.showWithDeliveries && hasDelivery) return false;
      if (!filters.showWithoutDeliveries && !hasDelivery) return false;
      
      return true;
    });
  }, [drivers, filters]);

  // Statistics
  const stats = useMemo(() => {
    const all = Array.from(drivers.values());
    return {
      total: all.length,
      active: all.filter(d => d.status === 'active').length,
      idle: all.filter(d => d.status === 'idle').length,
      offline: all.filter(d => d.status === 'offline').length,
      break: all.filter(d => d.status === 'break').length,
      withDeliveries: all.filter(d => d.currentDelivery).length,
    };
  }, [drivers]);

  // Find nearest driver to map center
  useEffect(() => {
    if (filteredDrivers.length === 0) {
      setNearestDriverId(undefined);
      return;
    }

    let nearest = filteredDrivers[0];
    let minDistance = calculateDistance(
      viewport.latitude, 
      viewport.longitude,
      nearest.lat,
      nearest.lng
    );

    filteredDrivers.forEach(driver => {
      const distance = calculateDistance(
        viewport.latitude,
        viewport.longitude,
        driver.lat,
        driver.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = driver;
      }
    });

    setNearestDriverId(nearest.id);
  }, [filteredDrivers, viewport.latitude, viewport.longitude]);

  // Helper function to calculate distance
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Event handlers
  const handleDriverClick = useCallback((driver: DriverLocation) => {
    setSelectedDriver(driver);
    setViewport(prev => ({
      ...prev,
      latitude: driver.lat,
      longitude: driver.lng,
    }));
  }, []);

  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    setViewport(newViewport);
  }, []);

  const handleRefresh = useCallback(() => {
    unsubscribe();
    setTimeout(subscribe, 1000);
  }, [subscribe, unsubscribe]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const formatLastUpdate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`relative w-full h-full bg-gray-100 ${className}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">
              Driver Tracking
            </h1>
            
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } ${isConnected ? 'animate-pulse' : ''}`} />
              <span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isConnected && (
                <span className="text-xs text-gray-500">
                  ({connectionStatus.latency}ms)
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{stats.active} Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>{stats.idle} Idle</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>{stats.break} Break</span>
              </div>
              <div className="text-gray-500">
                {stats.withDeliveries} with deliveries
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={!isConnected}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh driver data"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Toggle filters"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowDriverList(!showDriverList)}
              className={`p-2 rounded-lg transition-colors md:hidden ${
                showDriverList 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Toggle driver list"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-16 left-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
          <h3 className="font-medium text-gray-900 mb-3">Filter Drivers</h3>
          
          {/* Status Filters */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Status</h4>
            <div className="space-y-1">
              {[
                { key: 'showActive', label: 'Active', color: 'green' },
                { key: 'showIdle', label: 'Idle', color: 'yellow' },
                { key: 'showBreak', label: 'Break', color: 'blue' },
                { key: 'showOffline', label: 'Offline', color: 'red' },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters[key as keyof FilterOptions] as boolean}
                    onChange={(e) => handleFilterChange({ [key]: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Vehicle Type Filters */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Vehicle Types</h4>
            <div className="space-y-1">
              {['van', 'truck', 'car', 'motorcycle'].map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.vehicleTypes.includes(type)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...filters.vehicleTypes, type]
                        : filters.vehicleTypes.filter(t => t !== type);
                      handleFilterChange({ vehicleTypes: newTypes });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Filters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Delivery Status</h4>
            <div className="space-y-1">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showWithDeliveries}
                  onChange={(e) => handleFilterChange({ showWithDeliveries: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">With deliveries</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showWithoutDeliveries}
                  onChange={(e) => handleFilterChange({ showWithoutDeliveries: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Without deliveries</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="absolute inset-0 pt-16 flex">
        {/* Map */}
        <div className={`flex-1 relative ${showDriverList ? 'md:w-3/4' : 'w-full'}`}>
          <MapBox
            viewport={viewport}
            onViewportChange={handleViewportChange}
            className="w-full h-full"
          >
            <DriverMarkers
              drivers={filteredDrivers}
              onDriverClick={handleDriverClick}
              nearestDriverId={nearestDriverId}
            />
          </MapBox>

          {/* Map Overlay Stats */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 md:hidden">
            <div className="text-xs text-gray-500 mb-1">Drivers Visible</div>
            <div className="text-lg font-semibold text-gray-900">
              {filteredDrivers.length}
            </div>
          </div>

          {/* Connection Warning */}
          {!isConnected && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-sm">Connection lost. Attempting to reconnect...</span>
            </div>
          )}
        </div>

        {/* Driver List Sidebar */}
        <div className={`
          ${showDriverList ? 'block' : 'hidden'} md:block
          w-full md:w-1/4 bg-white border-l border-gray-200 overflow-hidden
          absolute md:relative right-0 top-0 bottom-0 z-20
        `}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-gray-900">
                  Drivers ({filteredDrivers.length})
                </h2>
                <button
                  onClick={() => setShowDriverList(false)}
                  className="md:hidden p-1 text-gray-500 hover:text-gray-700"
                >
                  <MapIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredDrivers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">🚛</div>
                  <p className="text-sm">No drivers match current filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredDrivers.map(driver => (
                    <div
                      key={driver.id}
                      onClick={() => handleDriverClick(driver)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedDriver?.id === driver.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: logisticsColors.status[driver.status].bg }}
                            />
                            <h3 className="text-sm font-medium text-gray-900">
                              {driver.name}
                            </h3>
                          </div>
                          
                          <div className="mt-1 text-xs text-gray-500">
                            <div className="capitalize">{driver.vehicleType}</div>
                            <div>{formatLastUpdate(driver.lastUpdate)}</div>
                          </div>

                          {driver.currentDelivery && (
                            <div className="mt-2 text-xs">
                              <div className="text-orange-600 font-medium">
                                Delivering to {driver.currentDelivery.customerName}
                              </div>
                              <div className="text-gray-500 truncate">
                                {driver.currentDelivery.address}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {driver.metadata.speed.toFixed(0)} km/h
                          </div>
                          <div className="text-xs text-gray-400">
                            {driver.metadata.batteryLevel}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Driver Detail Popup */}
      {selectedDriver && (
        <DriverDetailPopup
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onCallDriver={onDriverCall}
          onNavigateToDriver={onDriverNavigate}
          onAssignDelivery={onAssignDelivery}
        />
      )}
    </div>
  );
};

export default DriverMapContainer;