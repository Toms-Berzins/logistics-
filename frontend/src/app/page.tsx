'use client';

import { useState, useEffect } from 'react';
import ClientOnly from '@/components/ClientOnly';
import InteractiveDriverMap from '@/components/tracking/InteractiveDriverMap';
import DemoDriverMap from '@/components/tracking/DemoDriverMap';

// Demo data for the logistics dashboard
const DEMO_COMPANY_ID = 'demo-company-123';
const DEMO_USER_ID = 'demo-user-456';

// Driver data simulation
interface Driver {
  id: string;
  name: string;
  status: 'active' | 'in_transit' | 'available' | 'offline';
  location: { lat: number; lng: number; address: string };
  vehicle: string;
  lastUpdate: Date;
  deliveries: number;
  route?: string;
}

// Analytics data
interface AnalyticsData {
  totalDeliveries: number;
  averageDeliveryTime: number;
  routeEfficiency: number;
  fuelOptimization: number;
  customerSatisfaction: number;
  trends: {
    deliveries: number;
    efficiency: number;
    fuel: number;
    satisfaction: number;
  };
}

export default function LogisticsDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'tracking' | 'analytics'>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time data updates
  useEffect(() => {
    // Initialize demo data
    const initializeData = () => {
      const demoDrivers: Driver[] = [
        {
          id: 'drv_001',
          name: 'John Martinez',
          status: 'in_transit',
          location: { lat: 40.7128, lng: -74.0060, address: '123 Main St, New York, NY' },
          vehicle: 'Van #101',
          lastUpdate: new Date(),
          deliveries: 8,
          route: 'Route A - Downtown'
        },
        {
          id: 'drv_002',
          name: 'Sarah Johnson',
          status: 'active',
          location: { lat: 40.7589, lng: -73.9851, address: '456 Broadway, New York, NY' },
          vehicle: 'Truck #205',
          lastUpdate: new Date(),
          deliveries: 12,
          route: 'Route B - Midtown'
        },
        {
          id: 'drv_003',
          name: 'Mike Chen',
          status: 'available',
          location: { lat: 40.7505, lng: -73.9934, address: '789 Times Square, New York, NY' },
          vehicle: 'Van #103',
          lastUpdate: new Date(),
          deliveries: 5,
        },
        {
          id: 'drv_004',
          name: 'Emma Rodriguez',
          status: 'in_transit',
          location: { lat: 40.7282, lng: -73.7949, address: '321 Queens Blvd, Queens, NY' },
          vehicle: 'Truck #302',
          lastUpdate: new Date(),
          deliveries: 15,
          route: 'Route C - Queens'
        }
      ];

      const demoAnalytics: AnalyticsData = {
        totalDeliveries: 247,
        averageDeliveryTime: 28.5,
        routeEfficiency: 94.2,
        fuelOptimization: 87.1,
        customerSatisfaction: 4.8,
        trends: {
          deliveries: 12,
          efficiency: 2.3,
          fuel: 1.8,
          satisfaction: 0.2
        }
      };

      setDrivers(demoDrivers);
      setAnalytics(demoAnalytics);
      setIsLoading(false);
    };

    initializeData();

    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(driver => ({
        ...driver,
        lastUpdate: new Date(),
        deliveries: Math.random() > 0.7 ? driver.deliveries + 1 : driver.deliveries,
        location: {
          ...driver.location,
          lat: driver.location.lat + (Math.random() - 0.5) * 0.001, // Small random movement
          lng: driver.location.lng + (Math.random() - 0.5) * 0.001
        }
      })));
      
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Quick action handlers
  const handleStartTracking = () => {
    setActiveView('tracking');
    // Simulate starting tracking
    alert('🚚 Driver tracking started! All active drivers are now being monitored in real-time.');
  };

  const handleViewAnalytics = () => {
    setActiveView('analytics');
    // Simulate refreshing analytics
    alert('📊 Analytics refreshed! Latest performance metrics are now available.');
  };

  const handleManageZones = () => {
    // Simulate zone management
    alert('🗺️ Zone management opened! You can now create and edit delivery zones.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">LogiTrack</h1>
              </div>
              <nav className="ml-10 flex space-x-8">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('tracking')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeView === 'tracking'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Driver Tracking
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeView === 'analytics'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">
                  System Online • Last Update: <ClientOnly fallback="--:--:--">{lastUpdate.toLocaleTimeString()}</ClientOnly>
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Active Drivers: {drivers.filter(d => d.status === 'active' || d.status === 'in_transit').length}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <DashboardView 
            onStartTracking={handleStartTracking}
            onViewAnalytics={handleViewAnalytics}
            onManageZones={handleManageZones}
          />
        )}
        {activeView === 'tracking' && <TrackingView drivers={drivers} />}
        {activeView === 'analytics' && <AnalyticsView analytics={analytics} />}
      </main>
    </div>
  );
}

// Dashboard Overview Component
function DashboardView({ 
  onStartTracking, 
  onViewAnalytics, 
  onManageZones 
}: {
  onStartTracking: () => void;
  onViewAnalytics: () => void;
  onManageZones: () => void;
}) {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to LogiTrack
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Advanced Logistics Platform with Real-time Driver Tracking
          </p>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <FeatureCard
              title="Real-time Tracking"
              description="Track drivers with sub-100ms updates, geofencing alerts, and location history"
              icon="📍"
              status="Active"
            />
            <FeatureCard
              title="Zone Management"
              description="PostGIS-powered delivery zones with polygon operations and coverage analysis"
              icon="🗺️"
              status="Active"
            />
            <FeatureCard
              title="Route Analytics"
              description="Pattern recognition, traffic analysis, and optimization recommendations"
              icon="📊"
              status="Active"
            />
            <FeatureCard
              title="Mapping Services"
              description="Multi-provider abstraction with Mapbox/Google Maps failover"
              icon="🛰️"
              status="Active"
            />
            <FeatureCard
              title="Socket.io Events"
              description="Real-time communication for drivers, dispatchers, and administrators"
              icon="⚡"
              status="Active"
            />
            <FeatureCard
              title="Performance Monitoring"
              description="Redis caching, load testing, and comprehensive error handling"
              icon="🚀"
              status="Active"
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={onStartTracking}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105"
              >
                🚚 Start Driver Tracking
              </button>
              <button 
                onClick={onViewAnalytics}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105"
              >
                📊 View Analytics
              </button>
              <button 
                onClick={onManageZones}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors transform hover:scale-105"
              >
                🗺️ Manage Zones
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Driver Tracking Component
function TrackingView({ drivers }: { drivers: Driver[] }) {
  const activeCount = drivers.filter(d => d.status === 'active').length;
  const inTransitCount = drivers.filter(d => d.status === 'in_transit').length;
  const availableCount = drivers.filter(d => d.status === 'available').length;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Driver Tracking Map</h3>
              <p className="text-sm text-gray-600">Real-time driver locations and status</p>
            </div>
            {(() => {
              const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
              const hasValidToken = mapboxToken && 
                !mapboxToken.includes('demo-token') && 
                !mapboxToken.startsWith('pk.eyJ1IjoiZGVtby') &&
                mapboxToken !== 'demo' &&
                mapboxToken.startsWith('pk.') &&
                mapboxToken.split('.').length === 3;
              
              if (!hasValidToken) {
                return (
                  <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Demo Mode</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        <div className="p-6">
          <ClientOnly fallback={<MapLoadingState />}>
            {(() => {
              const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
              console.log('Page token check:', {
                token: mapboxToken.substring(0, 20) + '...',
                length: mapboxToken.length,
                startsWithPk: mapboxToken.startsWith('pk.'),
                parts: mapboxToken.split('.').length
              });
              
              const hasValidToken = mapboxToken && 
                !mapboxToken.includes('demo-token') && 
                !mapboxToken.startsWith('pk.eyJ1IjoiZGVtby') &&
                mapboxToken !== 'demo' &&
                mapboxToken.startsWith('pk.') &&
                mapboxToken.split('.').length === 3;
              
              if (hasValidToken) {
                return (
                  <InteractiveDriverMap
                    companyId={DEMO_COMPANY_ID}
                    mapboxToken={mapboxToken}
                    height="400px"
                    showTraffic={true}
                    showGeofences={false}
                    onDriverSelect={(driver) => {
                      console.log('Selected driver:', driver);
                    }}
                    className="rounded-lg shadow-sm"
                  />
                );
              } else {
                return (
                  <DemoDriverMap
                    companyId={DEMO_COMPANY_ID}
                    height="400px"
                    onDriverSelect={(driver) => {
                      console.log('Selected demo driver:', driver);
                    }}
                    className="rounded-lg shadow-sm"
                  />
                );
              }
            })()}
          </ClientOnly>

          {/* Driver Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <StatusCard title="Active Drivers" value={activeCount.toString()} color="green" />
            <StatusCard title="In Transit" value={inTransitCount.toString()} color="blue" />
            <StatusCard title="Available" value={availableCount.toString()} color="gray" />
          </div>

          {/* Driver List */}
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Active Drivers</h4>
            <div className="space-y-3">
              {drivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Component  
function AnalyticsView({ analytics }: { analytics: AnalyticsData | null }) {
  if (!analytics) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Route Analytics</h3>
          <p className="text-sm text-gray-600">Performance insights and optimization</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analytics Chart Placeholder */}
            <div className="bg-gray-50 h-64 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">📈</div>
                <h4 className="font-medium text-gray-900">Route Performance</h4>
                <p className="text-sm text-gray-600">PostGIS spatial analysis</p>
                <div className="mt-4 text-lg font-semibold text-blue-600">
                  {analytics.totalDeliveries} Total Deliveries
                </div>
              </div>
            </div>
            
            {/* Metrics */}
            <div className="space-y-4">
              <MetricCard 
                label="Average Delivery Time" 
                value={`${analytics.averageDeliveryTime} min`} 
                trend={`+${analytics.trends.deliveries}%`} 
              />
              <MetricCard 
                label="Route Efficiency" 
                value={`${analytics.routeEfficiency}%`} 
                trend={`+${analytics.trends.efficiency}%`} 
              />
              <MetricCard 
                label="Fuel Optimization" 
                value={`${analytics.fuelOptimization}%`} 
                trend={`+${analytics.trends.fuel}%`} 
              />
              <MetricCard 
                label="Customer Satisfaction" 
                value={`${analytics.customerSatisfaction}/5`} 
                trend={`+${analytics.trends.satisfaction}`} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function DriverCard({ driver }: { driver: Driver }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    in_transit: 'bg-blue-100 text-blue-800',
    available: 'bg-gray-100 text-gray-800',
    offline: 'bg-red-100 text-red-800'
  };

  const statusEmojis = {
    active: '🟢',
    in_transit: '🚚',
    available: '⚪',
    offline: '🔴'
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{statusEmojis[driver.status]}</div>
          <div>
            <div className="font-medium text-gray-900">{driver.name}</div>
            <div className="text-sm text-gray-500">{driver.vehicle}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[driver.status]}`}>
            {driver.status.replace('_', ' ')}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {driver.deliveries} deliveries
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600">
        <div>📍 {driver.location.address}</div>
        {driver.route && <div>🛣️ {driver.route}</div>}
        <div className="text-xs text-gray-400 mt-1">
          Updated: <ClientOnly fallback="--:--:--">{driver.lastUpdate.toLocaleTimeString()}</ClientOnly>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon, status }: {
  title: string;
  description: string;
  icon: string;
  status: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        {status}
      </span>
    </div>
  );
}

function StatusCard({ title, value, color }: {
  title: string;
  value: string;
  color: 'green' | 'blue' | 'gray';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}

function MetricCard({ label, value, trend }: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-xl font-semibold text-gray-900">{value}</div>
        </div>
        <div className="text-sm text-green-600 font-medium">{trend}</div>
      </div>
    </div>
  );
}

function MapLoadingState() {
  return (
    <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading driver tracking map...</p>
      </div>
    </div>
  );
}
