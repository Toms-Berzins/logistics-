// Example usage of the driver location parser
import { processDriverHTML } from '../utils/parseDriverLocations';

// Your HTML content from the Active Drivers section
const sampleHTML = `
<div class="mt-6">
  <h4 class="text-md font-medium text-gray-900 mb-4">Active Drivers</h4>
  <div class="space-y-3">
    <div class="bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">🚚</div>
          <div>
            <div class="font-medium text-gray-900">John Martinez</div>
            <div class="text-sm text-gray-500">Van #101</div>
          </div>
        </div>
        <div class="text-right">
          <div class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">in transit</div>
          <div class="text-sm text-gray-500 mt-1">12 deliveries</div>
        </div>
      </div>
      <div class="mt-3 text-sm text-gray-600">
        <div>📍 123 Main St, New York, NY</div>
        <div>🛣️ Route A - Downtown</div>
        <div class="text-xs text-gray-400 mt-1">Updated: 10:29:10 AM</div>
      </div>
    </div>
    <div class="bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">🟢</div>
          <div>
            <div class="font-medium text-gray-900">Sarah Johnson</div>
            <div class="text-sm text-gray-500">Truck #205</div>
          </div>
        </div>
        <div class="text-right">
          <div class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">active</div>
          <div class="text-sm text-gray-500 mt-1">12 deliveries</div>
        </div>
      </div>
      <div class="mt-3 text-sm text-gray-600">
        <div>📍 456 Broadway, New York, NY</div>
        <div>🛣️ Route B - Midtown</div>
        <div class="text-xs text-gray-400 mt-1">Updated: 10:29:10 AM</div>
      </div>
    </div>
    <div class="bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">⚪</div>
          <div>
            <div class="font-medium text-gray-900">Mike Chen</div>
            <div class="text-sm text-gray-500">Van #103</div>
          </div>
        </div>
        <div class="text-right">
          <div class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">available</div>
          <div class="text-sm text-gray-500 mt-1">9 deliveries</div>
        </div>
      </div>
      <div class="mt-3 text-sm text-gray-600">
        <div>📍 789 Times Square, New York, NY</div>
        <div class="text-xs text-gray-400 mt-1">Updated: 10:29:10 AM</div>
      </div>
    </div>
    <div class="bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-2xl">🚚</div>
          <div>
            <div class="font-medium text-gray-900">Emma Rodriguez</div>
            <div class="text-sm text-gray-500">Truck #302</div>
          </div>
        </div>
        <div class="text-right">
          <div class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">in transit</div>
          <div class="text-sm text-gray-500 mt-1">15 deliveries</div>
        </div>
      </div>
      <div class="mt-3 text-sm text-gray-600">
        <div>📍 321 Queens Blvd, Queens, NY</div>
        <div>🛣️ Route C - Queens</div>
        <div class="text-xs text-gray-400 mt-1">Updated: 10:29:10 AM</div>
      </div>
    </div>
  </div>
</div>
`;

// Process the HTML
export function demonstrateLocationParsing() {
  const result = processDriverHTML(sampleHTML);
  
  console.log('--- Parsed Driver Data ---');
  console.log('Summary:', result.summary);
  console.log('Drivers:', result.parsedDrivers);
  
  console.log('--- Map-Ready Data ---');
  console.log('Driver Locations for map:', result.driverLocations);
  console.log('Driver Statuses for map:', result.driverStatuses);
  
  return result;
}

// Usage in a React component
export function useDriverLocationExample() {
  const result = demonstrateLocationParsing();
  
  // The driver locations are now ready to be displayed on your Mapbox map
  const mapData = {
    locations: result.driverLocations,
    statuses: result.driverStatuses,
    center: [-73.9934, 40.7505] as [number, number], // NYC center
    zoom: 11
  };
  
  return mapData;
}

// Expected output format:
// {
//   parsedDrivers: [
//     {
//       name: "John Martinez",
//       vehicle: "Van #101", 
//       status: "in transit",
//       deliveries: 12,
//       address: "123 Main St, New York, NY",
//       route: "Route A - Downtown",
//       updated: "10:29:10 AM"
//     },
//     // ... more drivers
//   ],
//   driverLocations: [
//     {
//       driverId: "driver_1",
//       latitude: 40.7505,
//       longitude: -73.9934,
//       accuracy: 10,
//       timestamp: "2025-07-19T...",
//       speed: 25,
//       heading: 180,
//       metadata: { name: "John Martinez", vehicle: "Van #101", ... }
//     },
//     // ... more locations
//   ],
//   driverStatuses: Map {
//     "driver_1" => {
//       driverId: "driver_1",
//       isOnline: true,
//       isAvailable: false, // in transit
//       batteryLevel: 85,
//       connectionQuality: "good",
//       metadata: { ... }
//     },
//     // ... more statuses
//   },
//   summary: {
//     total: 4,
//     inTransit: 2,
//     active: 1, 
//     available: 1
//   }
// }