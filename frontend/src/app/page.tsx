'use client';

import { useState } from 'react';
import ClientOnly from '@/components/ClientOnly';

// Demo data for the logistics dashboard
const DEMO_COMPANY_ID = 'demo-company-123';
const DEMO_USER_ID = 'demo-user-456';

export default function LogisticsDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'tracking' | 'analytics'>('dashboard');

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
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'tracking' && <TrackingView />}
        {activeView === 'analytics' && <AnalyticsView />}
      </main>
    </div>
  );
}

// Dashboard Overview Component
function DashboardView() {
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
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Start Driver Tracking
              </button>
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                View Analytics
              </button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Manage Zones
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Driver Tracking Component
function TrackingView() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Driver Tracking Map</h3>
          <p className="text-sm text-gray-600">Real-time driver locations and status</p>
        </div>
        <div className="p-6">
          <ClientOnly fallback={<MapLoadingState />}>
            <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Interactive Driver Map
                </h4>
                <p className="text-gray-600 mb-4">
                  Mapbox-powered real-time driver tracking would appear here
                </p>
                <div className="text-sm text-gray-500">
                  <p>Features available:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Real-time driver locations</li>
                    <li>• Geofencing alerts</li>
                    <li>• Route optimization</li>
                    <li>• Traffic data integration</li>
                    <li>• Socket.io live updates</li>
                  </ul>
                </div>
              </div>
            </div>
          </ClientOnly>

          {/* Driver Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <StatusCard title="Active Drivers" value="12" color="green" />
            <StatusCard title="In Transit" value="8" color="blue" />
            <StatusCard title="Available" value="4" color="gray" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Component  
function AnalyticsView() {
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
              </div>
            </div>
            
            {/* Metrics */}
            <div className="space-y-4">
              <MetricCard label="Average Delivery Time" value="28 min" trend="+5%" />
              <MetricCard label="Route Efficiency" value="94.2%" trend="+2%" />
              <MetricCard label="Fuel Optimization" value="87.1%" trend="+1%" />
              <MetricCard label="Customer Satisfaction" value="4.8/5" trend="+0.2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
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
