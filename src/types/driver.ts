export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface DriverLocation {
  id: string;
  companyId: string;
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'idle' | 'offline' | 'break';
  lastUpdate: Date;
  vehicleType: 'van' | 'truck' | 'car' | 'motorcycle';
  currentDelivery?: {
    orderId: string;
    customerName: string;
    address: string;
    estimatedArrival: Date;
    priority: 'high' | 'medium' | 'low';
  };
  metadata: {
    batteryLevel: number;
    speed: number;
    heading: number;
    accuracy: number;
    provider: 'GPS' | 'NETWORK' | 'PASSIVE';
  };
}

export interface DriverCluster {
  id: number;
  coordinates: [number, number];
  pointCount: number;
  drivers: DriverLocation[];
}

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'delivery' | 'warehouse' | 'restricted' | 'customer';
  coordinates: [number, number][];
  strokeColor: string;
  fillColor: string;
  isActive: boolean;
}

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface DriverMapProps {
  drivers: DriverLocation[];
  geofences: GeofenceZone[];
  viewport: MapViewport;
  onDriverClick: (driver: DriverLocation) => void;
  onViewportChange: (viewport: MapViewport) => void;
  nearestDriverId?: string;
  isLoading?: boolean;
  className?: string;
}

export interface SocketDriverUpdate {
  type: 'location' | 'status' | 'delivery';
  driverId: string;
  data: Partial<DriverLocation>;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: Date;
  reconnectAttempts: number;
  latency: number;
}