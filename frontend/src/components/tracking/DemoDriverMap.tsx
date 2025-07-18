'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui';

interface DemoDriver {
  id: string;
  name: string;
  status: 'active' | 'busy' | 'offline';
  location: { lat: number; lng: number; address: string };
  lastUpdate: Date;
  speed: number;
  batteryLevel: number;
}

interface DemoDriverMapProps {
  companyId: string;
  height?: string;
  className?: string;
  onDriverSelect?: (driver: DemoDriver) => void;
}

export const DemoDriverMap: React.FC<DemoDriverMapProps> = ({
  height = '400px',
  className = '',
  onDriverSelect,
}) => {
  const [drivers, setDrivers] = useState<DemoDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Initialize demo drivers
  useEffect(() => {
    const demoDrivers: DemoDriver[] = [
      {
        id: 'DRV001',
        name: 'John Martinez',
        status: 'active',
        location: { lat: 40.7128, lng: -74.0060, address: 'Manhattan, NY' },
        lastUpdate: new Date(),
        speed: 0,
        batteryLevel: 87,
      },
      {
        id: 'DRV002',
        name: 'Sarah Johnson',
        status: 'busy',
        location: { lat: 40.7589, lng: -73.9851, address: 'Times Square, NY' },
        lastUpdate: new Date(),
        speed: 25,
        batteryLevel: 62,
      },
      {
        id: 'DRV003',
        name: 'Mike Chen',
        status: 'active',
        location: { lat: 40.7505, lng: -73.9934, address: 'Central Park, NY' },
        lastUpdate: new Date(),
        speed: 15,
        batteryLevel: 94,
      },
      {
        id: 'DRV004',
        name: 'Emma Rodriguez',
        status: 'offline',
        location: { lat: 40.7282, lng: -73.7949, address: 'Queens, NY' },
        lastUpdate: new Date(Date.now() - 300000), // 5 minutes ago
        speed: 0,
        batteryLevel: 23,
      },
    ];

    setDrivers(demoDrivers);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(driver => ({
        ...driver,
        lastUpdate: new Date(),
        speed: driver.status === 'busy' ? Math.random() * 40 : 0,
        location: {
          ...driver.location,
          lat: driver.location.lat + (Math.random() - 0.5) * 0.001,
          lng: driver.location.lng + (Math.random() - 0.5) * 0.001,
        },
        batteryLevel: Math.max(10, driver.batteryLevel - Math.random() * 0.5),
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    busy: drivers.filter(d => d.status === 'busy').length,
    offline: drivers.filter(d => d.status === 'offline').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'busy': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className={`demo-driver-map relative ${className}`} style={{ height }}>
      {/* Demo Map Background */}
      <div className="w-full h-full bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 rounded-lg overflow-hidden relative">
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10"
             style={{
               backgroundImage: `
                 linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
               `,
               backgroundSize: '50px 50px'
             }}>
        </div>

        {/* Demo Map Label */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <Card padding="sm" className="bg-white/90 backdrop-blur-sm shadow-lg">
            <div className="text-center">
              <div className="text-2xl mb-1">🗺️</div>
              <div className="text-sm font-medium text-gray-700">Demo Map View</div>
              <div className="text-xs text-gray-500">Simulated NYC Area</div>
            </div>
          </Card>
        </div>

        {/* Driver Markers */}
        {drivers.map((driver, index) => (
          <div
            key={driver.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110"
            style={{
              left: `${25 + index * 15}%`,
              top: `${30 + index * 10}%`,
              zIndex: selectedDriver === driver.id ? 30 : 10,
            }}
            onClick={() => {
              setSelectedDriver(driver.id);
              onDriverSelect?.(driver);
            }}
          >
            {/* Driver Marker */}
            <div className={`w-12 h-12 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-lg ${
              selectedDriver === driver.id ? 'ring-4 ring-blue-400' : ''
            } ${
              driver.status === 'active' ? 'bg-green-500' :
              driver.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {getStatusIcon(driver.status)}
            </div>

            {/* Speed indicator for busy drivers */}
            {driver.status === 'busy' && driver.speed > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {Math.round(driver.speed)}
              </div>
            )}

            {/* Driver Popup */}
            {selectedDriver === driver.id && (
              <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(driver.status)}`}></div>
                    <span className="font-semibold text-gray-900">{driver.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDriver(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div>ID: {driver.id}</div>
                  <div>Status: <span className="capitalize font-medium">{driver.status}</span></div>
                  <div>Location: {driver.location.address}</div>
                  <div>Speed: {Math.round(driver.speed)} mph</div>
                  <div>Battery: {Math.round(driver.batteryLevel)}%</div>
                  <div>Updated: {driver.lastUpdate.toLocaleTimeString()}</div>
                </div>

                <button className="w-full mt-3 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
                  Track Driver
                </button>
              </div>
            )}
          </div>
        ))}

        {/* NYC Landmarks (Demo) */}
        <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 text-2xl" title="Central Park">🌳</div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 text-2xl" title="Times Square">🏢</div>
        <div className="absolute bottom-1/3 right-1/4 transform translate-x-1/2 text-2xl" title="Brooklyn Bridge">🌉</div>
        <div className="absolute top-1/3 right-1/4 transform translate-x-1/2 text-2xl" title="Statue of Liberty">🗽</div>

        {/* Statistics Panel */}
        <div className="absolute top-4 left-4 z-20">
          <Card padding="sm" className="bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Demo Mode</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">{stats.total}</div>
                  <div className="text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{stats.active}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-yellow-600">{stats.busy}</div>
                  <div className="text-gray-600">Busy</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-red-600">{stats.offline}</div>
                  <div className="text-gray-600">Offline</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Demo Features Banner */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <Card padding="sm" className="bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">Demo Features Active</div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-600">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Real-time Updates</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Driver Status</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Interactive Popups</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Live Statistics</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Click outside to deselect */}
      {selectedDriver && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
};

export default DemoDriverMap;