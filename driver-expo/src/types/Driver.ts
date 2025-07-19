// Driver Types for Logistics Platform

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleId?: string;
  vehicleType: 'van' | 'truck' | 'motorcycle' | 'car';
  status: 'available' | 'busy' | 'offline' | 'break';
  location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy: number;
  };
  shift: {
    startTime: string;
    endTime: string;
    isActive: boolean;
  };
  rating: number;
  totalDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  driverId: string;
  pin: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  driver: Driver | null;
  token: string | null;
  refreshToken: string | null;
  lastLoginTime: string | null;
  error: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  driver?: Driver;
  message?: string;
  expiresIn?: number;
}

export interface TokenRefreshResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  message?: string;
}

export interface AuthError extends Error {
  code: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'UNKNOWN';
  message: string;
  details?: any;
}

export interface DriverPreferences {
  notifications: {
    jobAssignments: boolean;
    emergencyAlerts: boolean;
    shiftReminders: boolean;
    locationTracking: boolean;
  };
  location: {
    highAccuracyMode: boolean;
    backgroundTracking: boolean;
    updateInterval: number; // seconds
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    mapStyle: 'standard' | 'satellite' | 'hybrid';
    units: 'metric' | 'imperial';
  };
}

export interface DriverSession {
  sessionId: string;
  driverId: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  deviceInfo: {
    platform: string;
    version: string;
    deviceId: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

// Utility types for authentication flow
export type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { driver: Driver; token: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: { token: string; refreshToken: string } }
  | { type: 'TOKEN_REFRESH_FAILURE' }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'CLEAR_ERROR' };

export interface AuthContextType {
  // State properties
  isAuthenticated: boolean;
  isLoading: boolean;
  driver: Driver | null;
  token: string | null;
  refreshToken: string | null;
  lastLoginTime: string | null;
  error: string | null;
  
  // Methods
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  clearError: () => void;
  updateDriverStatus: (status: Driver['status']) => Promise<void>;
  updateDriverLocation: (location: Driver['location']) => Promise<void>;
}