import React, { useEffect, useState, useCallback } from 'react';
import { LogisticsRole, generateDriverOfflineToken } from './clerk-setup';
import { useUser, useSession } from '@clerk/nextjs';

// Offline token management
interface OfflineTokenData {
  token: string;
  expiresAt: string;
  userId: string;
  deviceId: string;
  lastSync: string;
}

// Driver authentication state
interface DriverUser {
  id: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string;
  lastName?: string;
  privateMetadata?: {
    role?: LogisticsRole;
    driverId?: string;
    vehicleId?: string;
    territory?: string[];
  };
}

interface DriverAuthState {
  isAuthenticated: boolean;
  isOnline: boolean;
  hasValidOfflineToken: boolean;
  user: DriverUser | null;
  tokenExpiresAt?: string;
  lastSync?: string;
}

// Local storage keys
const STORAGE_KEYS = {
  OFFLINE_TOKEN: 'logistics_driver_offline_token',
  USER_DATA: 'logistics_driver_user_data',
  LAST_SYNC: 'logistics_driver_last_sync',
  DEVICE_ID: 'logistics_driver_device_id'
} as const;

// Generate unique device ID
function generateDeviceId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `driver_${timestamp}_${random}`;
}

// Get or create device ID
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

// Store offline token securely
function storeOfflineToken(tokenData: OfflineTokenData): void {
  if (typeof window === 'undefined') return;
  
  try {
    const encrypted = btoa(JSON.stringify(tokenData));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_TOKEN, encrypted);
  } catch (error) {
    console.error('Failed to store offline token:', error);
  }
}

// Retrieve offline token
function getStoredOfflineToken(): OfflineTokenData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const encrypted = localStorage.getItem(STORAGE_KEYS.OFFLINE_TOKEN);
    if (!encrypted) return null;
    
    const decrypted = atob(encrypted);
    const tokenData = JSON.parse(decrypted) as OfflineTokenData;
    
    // Check if token is expired
    if (new Date(tokenData.expiresAt) <= new Date()) {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_TOKEN);
      return null;
    }
    
    return tokenData;
  } catch (error) {
    console.error('Failed to retrieve offline token:', error);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_TOKEN);
    return null;
  }
}

// Store user data for offline use
function storeUserData(userData: DriverUser): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
}

// Get stored user data
function getStoredUserData(): DriverUser | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
}

// Clear all stored auth data
function clearStoredAuthData(): void {
  if (typeof window === 'undefined') return;
  
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Driver mobile authentication hook
export function useDriverMobileAuth() {
  const { user, isLoaded: userLoaded } = useUser();
  const { session } = useSession();
  const [authState, setAuthState] = useState<DriverAuthState>({
    isAuthenticated: false,
    isOnline: navigator.onLine,
    hasValidOfflineToken: false,
    user: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is a driver - need to fetch from server for privateMetadata
  const [isDriver, setIsDriver] = useState(false);

  // Check driver role on user change
  useEffect(() => {
    if (user?.id) {
      // In a real implementation, you would call an API endpoint to check the role
      // For now, we'll assume the user is a driver if they have the necessary fields
      const checkDriverRole = async () => {
        try {
          // This would be an API call to your backend to check the user's role
          // const response = await fetch(`/api/user/${user.id}/role`);
          // const { role } = await response.json();
          // setIsDriver(role === LogisticsRole.DRIVER);
          
          // For demo purposes, setting to true
          setIsDriver(true);
        } catch (error) {
          console.error('Error checking driver role:', error);
          setIsDriver(false);
        }
      };
      checkDriverRole();
    } else {
      setIsDriver(false);
    }
  }, [user?.id]);

  // Initialize auth state
  useEffect(() => {
    if (!userLoaded) return;

    const initializeAuth = () => {
      const offlineToken = getStoredOfflineToken();
      const storedUser = getStoredUserData();
      const isOnline = navigator.onLine;

      if (user && isDriver) {
        // User is authenticated and online
        setAuthState({
          isAuthenticated: true,
          isOnline,
          hasValidOfflineToken: !!offlineToken,
          user: user as DriverUser,
          tokenExpiresAt: offlineToken?.expiresAt,
          lastSync: offlineToken?.lastSync
        });
        
        // Store user data for offline use
        storeUserData(user as DriverUser);
      } else if (offlineToken && storedUser && !isOnline) {
        // User is offline but has valid token
        setAuthState({
          isAuthenticated: true,
          isOnline: false,
          hasValidOfflineToken: true,
          user: storedUser,
          tokenExpiresAt: offlineToken.expiresAt,
          lastSync: offlineToken.lastSync
        });
      } else {
        // Not authenticated
        setAuthState({
          isAuthenticated: false,
          isOnline,
          hasValidOfflineToken: false,
          user: null
        });
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, [user, userLoaded, isDriver]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setAuthState(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      if (authState.isAuthenticated) {
        syncWithServer();
      }
    };

    const handleOffline = () => {
      setAuthState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authState.isAuthenticated]);

  // Generate offline token
  const generateOfflineToken = useCallback(async (): Promise<boolean> => {
    if (!user || !isDriver) {
      console.error('Cannot generate offline token: User is not a driver');
      return false;
    }

    try {
      const token = await generateDriverOfflineToken(user.id);
      const deviceId = getDeviceId();
      
      const tokenData: OfflineTokenData = {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        userId: user.id,
        deviceId,
        lastSync: new Date().toISOString()
      };

      storeOfflineToken(tokenData);
      storeUserData(user as DriverUser);

      setAuthState(prev => ({
        ...prev,
        hasValidOfflineToken: true,
        tokenExpiresAt: tokenData.expiresAt,
        lastSync: tokenData.lastSync
      }));

      return true;
    } catch (error) {
      console.error('Failed to generate offline token:', error);
      return false;
    }
  }, [user, isDriver]);

  // Sync with server
  const syncWithServer = useCallback(async (): Promise<boolean> => {
    if (!authState.isOnline || !authState.isAuthenticated) {
      return false;
    }

    try {
      // Fetch latest user data
      const response = await fetch('/api/driver/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': getDeviceId()
        }
      });

      if (response.ok) {
        const userData = await response.json();
        storeUserData(userData);
        
        setAuthState(prev => ({
          ...prev,
          user: userData,
          lastSync: new Date().toISOString()
        }));

        return true;
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    
    return false;
  }, [authState.isOnline, authState.isAuthenticated]);

  // Refresh offline token
  const refreshOfflineToken = useCallback(async (): Promise<boolean> => {
    if (!authState.isOnline || !user) {
      return false;
    }

    // Only refresh if token expires within 2 hours
    const tokenData = getStoredOfflineToken();
    if (tokenData) {
      const expiresAt = new Date(tokenData.expiresAt);
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      if (expiresAt > twoHoursFromNow) {
        return true; // Token is still valid for more than 2 hours
      }
    }

    return await generateOfflineToken();
  }, [authState.isOnline, user, generateOfflineToken]);

  // Sign out and clear data
  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (session) {
        await session.end();
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      clearStoredAuthData();
      setAuthState({
        isAuthenticated: false,
        isOnline: navigator.onLine,
        hasValidOfflineToken: false,
        user: null
      });
    }
  }, [session]);

  // Check if offline token needs refresh
  const needsTokenRefresh = useCallback((): boolean => {
    const tokenData = getStoredOfflineToken();
    if (!tokenData) return true;

    const expiresAt = new Date(tokenData.expiresAt);
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    return expiresAt <= twoHoursFromNow;
  }, []);

  return {
    // Auth state
    ...authState,
    isLoading,
    isDriver,
    
    // Token management
    generateOfflineToken,
    refreshOfflineToken,
    needsTokenRefresh,
    
    // Sync
    syncWithServer,
    
    // Actions
    signOut,
    
    // Utilities
    getStoredToken: getStoredOfflineToken,
    clearAuthData: clearStoredAuthData
  };
}

// API utility for offline requests
export class OfflineApiClient {
  private baseUrl: string;
  private offlineToken: OfflineTokenData | null;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.offlineToken = getStoredOfflineToken();
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const isOnline = navigator.onLine;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-ID': getDeviceId(),
      ...options.headers
    };

    // Add offline token if available and offline
    if (!isOnline && this.offlineToken) {
      (headers as Record<string, string>)['X-Offline-Mode'] = 'true';
      (headers as Record<string, string>)['X-Offline-Token'] = this.offlineToken.token;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      return response;
    } catch (error) {
      if (!isOnline) {
        // Queue request for later when online
        this.queueOfflineRequest(endpoint, options);
      }
      throw error;
    }
  }

  private queueOfflineRequest(endpoint: string, options: RequestInit): void {
    // Implementation for queueing offline requests
    // This would typically store requests in IndexedDB
    console.log('Queueing offline request:', endpoint, options);
  }
}

// Higher-order component for driver route protection
export function withDriverAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function DriverProtectedComponent(props: P) {
    const { isAuthenticated, isDriver, isLoading } = useDriverMobileAuth();

    if (isLoading) {
      return React.createElement('div', { 
        className: 'flex items-center justify-center min-h-screen' 
      }, React.createElement('div', { 
        className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' 
      }));
    }

    if (!isAuthenticated || !isDriver) {
      return React.createElement('div', { 
        className: 'flex items-center justify-center min-h-screen' 
      }, React.createElement('div', { 
        className: 'text-center' 
      }, React.createElement('h2', { 
        className: 'text-xl font-semibold text-gray-900 mb-2' 
      }, 'Driver Access Required'), React.createElement('p', { 
        className: 'text-gray-600' 
      }, 'Please sign in with your driver account to continue.')));
    }

    return React.createElement(Component, props);
  };
}