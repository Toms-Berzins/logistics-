import React from 'react';
import { DriverMapContainer } from '../components/Dashboard/DriverMap';
import type { DriverLocation } from '../types/driver';

// Example usage of the DriverMapContainer component
const DriverMapExample: React.FC = () => {
  // Example company ID (replace with actual company ID)
  const companyId = 'company_12345';

  // Example initial viewport (New York City)
  const initialViewport = {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 12,
  };

  // Example event handlers
  const handleDriverCall = (driverId: string) => {
    console.log('Calling driver:', driverId);
    // Implement actual call functionality
    // Could integrate with Twilio, WebRTC, or phone system
  };

  const handleDriverNavigate = (driver: DriverLocation) => {
    console.log('Navigate to driver:', driver);
    // Implement navigation functionality
    // Could open Google Maps, Apple Maps, or in-app navigation
    const mapsUrl = `https://maps.google.com/?q=${driver.lat},${driver.lng}`;
    window.open(mapsUrl, '_blank');
  };

  const handleAssignDelivery = (driverId: string) => {
    console.log('Assign delivery to driver:', driverId);
    // Implement delivery assignment
    // Could open modal with available deliveries or auto-assign
  };

  return (
    <div className="w-full h-screen">
      <DriverMapContainer
        companyId={companyId}
        initialViewport={initialViewport}
        onDriverCall={handleDriverCall}
        onDriverNavigate={handleDriverNavigate}
        onAssignDelivery={handleAssignDelivery}
        className="rounded-lg border border-gray-200"
      />
    </div>
  );
};

export default DriverMapExample;

// Example of how to integrate with your existing dashboard
export const DashboardWithDriverMap: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Your existing header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>
      </header>

      {/* Main content with driver map */}
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Real-time Driver Tracking
          </h2>
          <p className="text-gray-600">
            Monitor your fleet with live location updates and delivery status
          </p>
        </div>

        {/* Driver map takes full height minus header and padding */}
        <div className="h-[calc(100vh-200px)]">
          <DriverMapExample />
        </div>
      </main>
    </div>
  );
};

// Example of mock data for development/testing
export const mockDriverData: DriverLocation[] = [
  {
    id: 'driver_001',
    companyId: 'company_12345',
    name: 'John Smith',
    lat: 40.7589,
    lng: -73.9851,
    status: 'active',
    lastUpdate: new Date(),
    vehicleType: 'van',
    currentDelivery: {
      orderId: 'order_001',
      customerName: 'ABC Company',
      address: '123 Broadway, New York, NY',
      estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
      priority: 'high',
    },
    metadata: {
      batteryLevel: 85,
      speed: 35,
      heading: 120,
      accuracy: 8,
      provider: 'GPS',
    },
  },
  {
    id: 'driver_002',
    companyId: 'company_12345',
    name: 'Sarah Johnson',
    lat: 40.7505,
    lng: -73.9934,
    status: 'idle',
    lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
    vehicleType: 'truck',
    metadata: {
      batteryLevel: 72,
      speed: 0,
      heading: 0,
      accuracy: 12,
      provider: 'GPS',
    },
  },
  {
    id: 'driver_003',
    companyId: 'company_12345',
    name: 'Mike Davis',
    lat: 40.7282,
    lng: -74.0776,
    status: 'break',
    lastUpdate: new Date(Date.now() - 15 * 60 * 1000),
    vehicleType: 'motorcycle',
    metadata: {
      batteryLevel: 45,
      speed: 0,
      heading: 180,
      accuracy: 15,
      provider: 'NETWORK',
    },
  },
  {
    id: 'driver_004',
    companyId: 'company_12345',
    name: 'Lisa Wilson',
    lat: 40.7614,
    lng: -73.9776,
    status: 'active',
    lastUpdate: new Date(),
    vehicleType: 'car',
    currentDelivery: {
      orderId: 'order_002',
      customerName: 'XYZ Corp',
      address: '456 5th Avenue, New York, NY',
      estimatedArrival: new Date(Date.now() + 15 * 60 * 1000),
      priority: 'medium',
    },
    metadata: {
      batteryLevel: 92,
      speed: 25,
      heading: 45,
      accuracy: 5,
      provider: 'GPS',
    },
  },
  {
    id: 'driver_005',
    companyId: 'company_12345',
    name: 'Alex Brown',
    lat: 40.7505,
    lng: -73.9712,
    status: 'offline',
    lastUpdate: new Date(Date.now() - 60 * 60 * 1000),
    vehicleType: 'van',
    metadata: {
      batteryLevel: 15,
      speed: 0,
      heading: 0,
      accuracy: 50,
      provider: 'PASSIVE',
    },
  },
];

// Example integration with React Query for data fetching
export const useDriverMapWithQuery = (companyId: string) => {
  // This would be your actual implementation with react-query
  // const { data: drivers, isLoading, error } = useQuery({
  //   queryKey: ['drivers', companyId],
  //   queryFn: () => fetchDrivers(companyId),
  //   refetchInterval: 30000, // Refetch every 30 seconds as backup
  // });

  return {
    drivers: mockDriverData,
    isLoading: false,
    error: null,
  };
};