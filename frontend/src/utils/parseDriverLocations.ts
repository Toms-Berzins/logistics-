import { DriverLocation, DriverStatus } from '../hooks/useDriverTracking';

export interface ParsedDriverData {
  name: string;
  vehicle: string;
  status: 'in transit' | 'active' | 'available';
  deliveries: number;
  address: string;
  route?: string;
  updated: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

// NYC area coordinates for the sample addresses
const NYC_COORDINATES: Record<string, LocationCoordinates> = {
  '123 Main St, New York, NY': { latitude: 40.7505, longitude: -73.9934 },
  '456 Broadway, New York, NY': { latitude: 40.7580, longitude: -73.9855 },
  '789 Times Square, New York, NY': { latitude: 40.7580, longitude: -73.9855 },
  '321 Queens Blvd, Queens, NY': { latitude: 40.7282, longitude: -73.7949 }
};

export function parseDriversFromHTML(htmlContent: string): ParsedDriverData[] {
  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const drivers: ParsedDriverData[] = [];
  const driverCards = tempDiv.querySelectorAll('.bg-white.p-4.rounded-lg.border.border-gray-200');
  
  driverCards.forEach((card) => {
    try {
      // Extract driver name
      const nameElement = card.querySelector('.font-medium.text-gray-900');
      const name = nameElement?.textContent?.trim() || 'Unknown Driver';
      
      // Extract vehicle
      const vehicleElement = card.querySelector('.text-sm.text-gray-500');
      const vehicle = vehicleElement?.textContent?.trim() || 'Unknown Vehicle';
      
      // Extract status
      const statusElement = card.querySelector('.inline-block.px-2.py-1.text-xs.font-medium.rounded-full');
      const statusText = statusElement?.textContent?.trim() as 'in transit' | 'active' | 'available' || 'available';
      
      // Extract deliveries count
      const deliveriesElement = card.querySelector('.text-sm.text-gray-500.mt-1');
      const deliveriesText = deliveriesElement?.textContent?.trim() || '0 deliveries';
      const deliveries = parseInt(deliveriesText.match(/\d+/)?.[0] || '0');
      
      // Extract address
      const addressElements = card.querySelectorAll('.mt-3.text-sm.text-gray-600 > div');
      let address = 'Unknown Address';
      let route = '';
      let updated = '';
      
      addressElements.forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (text.startsWith('📍')) {
          address = text.replace('📍 ', '');
        } else if (text.startsWith('🛣️')) {
          route = text.replace('🛣️ ', '');
        } else if (text.startsWith('Updated:')) {
          updated = text.replace('Updated: ', '');
        }
      });
      
      drivers.push({
        name,
        vehicle,
        status: statusText,
        deliveries,
        address,
        route: route || undefined,
        updated: updated || 'Unknown'
      });
    } catch (error) {
      console.warn('Failed to parse driver card:', error);
    }
  });
  
  return drivers;
}

export function convertToDriverLocations(parsedDrivers: ParsedDriverData[]): DriverLocation[] {
  return parsedDrivers.map((driver, index) => {
    const coords = NYC_COORDINATES[driver.address] || {
      latitude: 40.7505 + (Math.random() - 0.5) * 0.1, // Random coordinates around NYC
      longitude: -73.9934 + (Math.random() - 0.5) * 0.1
    };
    
    const driverId = `driver_${index + 1}`;
    
    return {
      driverId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: 10,
      timestamp: new Date().toISOString(),
      speed: driver.status === 'in transit' ? Math.random() * 30 + 10 : 0, // 10-40 mph if in transit
      heading: driver.status === 'in transit' ? Math.random() * 360 : undefined,
      batteryLevel: Math.floor(Math.random() * 40) + 60, // 60-100%
      metadata: {
        name: driver.name,
        vehicle: driver.vehicle,
        deliveries: driver.deliveries,
        route: driver.route,
        lastUpdated: driver.updated
      }
    };
  });
}

export function convertToDriverStatuses(parsedDrivers: ParsedDriverData[]): Map<string, DriverStatus> {
  const statusMap = new Map<string, DriverStatus>();
  
  parsedDrivers.forEach((driver, index) => {
    const driverId = `driver_${index + 1}`;
    
    const isOnline = driver.status !== 'offline';
    const isAvailable = driver.status === 'available';
    
    statusMap.set(driverId, {
      driverId,
      isOnline,
      isAvailable,
      batteryLevel: Math.floor(Math.random() * 40) + 60,
      connectionQuality: isOnline ? 'good' : 'poor',
      lastSeen: new Date(),
      currentDeliveries: driver.deliveries,
      metadata: {
        name: driver.name,
        vehicle: driver.vehicle,
        route: driver.route
      }
    });
  });
  
  return statusMap;
}

// Main function to process HTML and return map-ready data
export function processDriverHTML(htmlContent: string) {
  const parsedDrivers = parseDriversFromHTML(htmlContent);
  const driverLocations = convertToDriverLocations(parsedDrivers);
  const driverStatuses = convertToDriverStatuses(parsedDrivers);
  
  return {
    parsedDrivers,
    driverLocations,
    driverStatuses,
    summary: {
      total: parsedDrivers.length,
      inTransit: parsedDrivers.filter(d => d.status === 'in transit').length,
      active: parsedDrivers.filter(d => d.status === 'active').length,
      available: parsedDrivers.filter(d => d.status === 'available').length
    }
  };
}

// Geocoding function to get real coordinates (requires API key)
export async function geocodeAddress(address: string): Promise<LocationCoordinates | null> {
  try {
    // This would use your mapping service (Mapbox, Google Maps, etc.)
    // For now, return NYC coordinates if not found in our static list
    const coords = NYC_COORDINATES[address];
    if (coords) return coords;
    
    // Default to NYC center if address not found
    return { latitude: 40.7505, longitude: -73.9934 };
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}