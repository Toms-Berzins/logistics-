export interface GeocodingRequest {
  address: string;
  bounds?: {
    northeast: GeoPoint;
    southwest: GeoPoint;
  };
  region?: string;
  language?: string;
  components?: {
    country?: string;
    postal_code?: string;
    locality?: string;
  };
}

export interface GeocodingResult {
  formattedAddress: string;
  location: GeoPoint;
  placeId?: string;
  components: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeAreaLevel1?: string;
    administrativeAreaLevel2?: string;
    country?: string;
    postalCode?: string;
  };
  geometry: {
    location: GeoPoint;
    viewport: {
      northeast: GeoPoint;
      southwest: GeoPoint;
    };
    locationType?: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
  };
  partialMatch?: boolean;
  types: string[];
}

export interface ReverseGeocodingRequest {
  location: GeoPoint;
  resultTypes?: string[];
  locationTypes?: string[];
  language?: string;
}

export interface DirectionsRequest {
  origin: GeoPoint | string;
  destination: GeoPoint | string;
  waypoints?: (GeoPoint | string)[];
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  departureTime?: Date;
  arrivalTime?: Date;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  transitMode?: 'bus' | 'subway' | 'train' | 'tram' | 'rail';
  units?: 'metric' | 'imperial';
  region?: string;
  language?: string;
}

export interface DirectionsResult {
  routes: Route[];
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_WAYPOINTS_EXCEEDED' | 'INVALID_REQUEST' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR';
  geocodedWaypoints?: GeocodingResult[];
}

export interface Route {
  bounds: {
    northeast: GeoPoint;
    southwest: GeoPoint;
  };
  copyrights: string;
  legs: RouteLeg[];
  overview_polyline: {
    points: string;
  };
  summary: string;
  warnings: string[];
  waypoint_order: number[];
  fare?: {
    currency: string;
    value: number;
  };
}

export interface RouteLeg {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  duration_in_traffic?: {
    text: string;
    value: number;
  };
  end_address: string;
  end_location: GeoPoint;
  start_address: string;
  start_location: GeoPoint;
  steps: RouteStep[];
  traffic_speed_entry: any[];
  via_waypoint: any[];
}

export interface RouteStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  end_location: GeoPoint;
  html_instructions: string;
  polyline: {
    points: string;
  };
  start_location: GeoPoint;
  travel_mode: string;
  maneuver?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface TrafficData {
  location: GeoPoint;
  trafficLevel: 'UNKNOWN' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SEVERE';
  speed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
  incidents?: TrafficIncident[];
}

export interface TrafficIncident {
  id: string;
  type: 'ACCIDENT' | 'CONSTRUCTION' | 'DISABLED_VEHICLE' | 'LANE_RESTRICTION' | 'MASS_TRANSIT' | 'MISCELLANEOUS' | 'OTHER_NEWS' | 'PLANNED_EVENT' | 'ROAD_HAZARD' | 'WEATHER';
  severity: 'LOW' | 'MINOR' | 'MODERATE' | 'SERIOUS' | 'MAJOR';
  description: string;
  location: GeoPoint;
  startTime?: Date;
  endTime?: Date;
  verified: boolean;
}

export interface StaticMapRequest {
  center: GeoPoint;
  zoom: number;
  size: {
    width: number;
    height: number;
  };
  scale?: 1 | 2;
  format?: 'png' | 'png8' | 'png32' | 'gif' | 'jpg' | 'jpg-baseline';
  maptype?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  markers?: MapMarker[];
  path?: MapPath[];
  style?: MapStyle[];
}

export interface MapMarker {
  location: GeoPoint;
  color?: string;
  size?: 'tiny' | 'mid' | 'small' | 'normal';
  label?: string;
  icon?: string;
}

export interface MapPath {
  points: GeoPoint[];
  weight?: number;
  color?: string;
  fillcolor?: string;
  geodesic?: boolean;
}

export interface MapStyle {
  feature: string;
  element: string;
  rules: {
    [key: string]: string;
  };
}

export interface DistanceMatrixRequest {
  origins: (GeoPoint | string)[];
  destinations: (GeoPoint | string)[];
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit';
  units?: 'metric' | 'imperial';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  departureTime?: Date;
  arrivalTime?: Date;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  language?: string;
  region?: string;
}

export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: DistanceMatrixRow[];
  status: 'OK' | 'INVALID_REQUEST' | 'MAX_ELEMENTS_EXCEEDED' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR';
}

export interface DistanceMatrixRow {
  elements: DistanceMatrixElement[];
}

export interface DistanceMatrixElement {
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS';
  distance?: {
    text: string;
    value: number;
  };
  duration?: {
    text: string;
    value: number;
  };
  duration_in_traffic?: {
    text: string;
    value: number;
  };
  fare?: {
    currency: string;
    value: number;
  };
}

export interface BatchGeocodingRequest {
  addresses: string[];
  batchSize?: number;
  delayMs?: number;
}

export interface BatchGeocodingResult {
  results: (GeocodingResult | null)[];
  successCount: number;
  failureCount: number;
  errors: {
    index: number;
    address: string;
    error: string;
  }[];
}

export interface MappingProvider {
  name: string;
  isAvailable: boolean;
  priority: number;
  capabilities: {
    geocoding: boolean;
    reverseGeocoding: boolean;
    directions: boolean;
    staticMaps: boolean;
    trafficData: boolean;
    distanceMatrix: boolean;
  };
  limits: {
    requestsPerSecond?: number;
    requestsPerDay?: number;
    batchSize?: number;
  };
}

export interface MappingServiceConfig {
  providers: {
    mapbox?: {
      accessToken: string;
      baseUrl?: string;
      enabled: boolean;
      priority: number;
    };
    googlemaps?: {
      apiKey: string;
      baseUrl?: string;
      enabled: boolean;
      priority: number;
    };
  };
  caching: {
    enabled: boolean;
    geocodingTtlSeconds: number;
    directionsTtlSeconds: number;
    trafficDataTtlSeconds: number;
  };
  fallback: {
    enabled: boolean;
    maxRetries: number;
    timeoutMs: number;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
  };
}
