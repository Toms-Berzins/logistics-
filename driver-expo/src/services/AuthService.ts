import * as SecureStore from 'expo-secure-store';
import { 
  Driver, 
  LoginCredentials, 
  LoginResponse, 
  TokenRefreshResponse, 
  AuthError,
  DriverSession 
} from '../types/Driver';

// SecureStore keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'logistics_access_token',
  REFRESH_TOKEN: 'logistics_refresh_token',
  DRIVER_DATA: 'logistics_driver_data',
  LAST_LOGIN: 'logistics_last_login',
  SESSION_ID: 'logistics_session_id',
  AUTO_LOGIN_ENABLED: 'logistics_auto_login'
} as const;

export class AuthService {
  private static instance: AuthService;
  private baseUrl: string;
  private currentDriver: Driver | null = null;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenRefreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.2:3001';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login with driver credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const startTime = Date.now();
      
      // Production API call:
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const responseTime = Date.now() - startTime;
      console.log(`Login API response time: ${responseTime}ms`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createAuthError(
          response.status === 401 ? 'INVALID_CREDENTIALS' : 'NETWORK_ERROR',
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result: LoginResponse = await response.json();
      
      if (result.success && result.token && result.driver) {
        // Store authentication data securely
        await this.storeAuthData(result.token, result.refreshToken, result.driver);
        
        // Set in-memory state
        this.accessToken = result.token;
        this.refreshTokenValue = result.refreshToken || null;
        this.currentDriver = result.driver;

        // Store last login time
        await SecureStore.setItemAsync(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
        
        // Create session
        await this.createSession(result.driver);

        console.log(`Driver ${result.driver.name} logged in successfully`);
        return result;
      } else {
        throw this.createAuthError('INVALID_CREDENTIALS', result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if ((error as any).code) {
        throw error;
      }
      
      throw this.createAuthError(
        'NETWORK_ERROR',
        'Unable to connect to authentication server. Please check your internet connection.'
      );
    }
  }


  /**
   * Auto-login using stored credentials
   */
  async autoLogin(): Promise<{ success: boolean; driver?: Driver; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Check if auto-login is enabled
      const autoLoginEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.AUTO_LOGIN_ENABLED);
      if (autoLoginEnabled !== 'true') {
        return { success: false, error: 'Auto-login disabled' };
      }

      // Get stored token and driver data
      const [storedToken, storedDriver] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.DRIVER_DATA)
      ]);

      if (!storedToken || !storedDriver) {
        await this.clearStoredAuth();
        return { success: false, error: 'No stored credentials' };
      }

      // Parse driver data
      const driver: Driver = JSON.parse(storedDriver);
      
      // Verify token with server
      const isValid = await this.verifyToken(storedToken);
      
      if (isValid) {
        // Set in-memory state
        this.accessToken = storedToken;
        this.currentDriver = driver;
        
        // Get refresh token
        this.refreshTokenValue = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        
        const responseTime = Date.now() - startTime;
        console.log(`Auto-login completed in ${responseTime}ms`);
        
        return { success: true, driver };
      } else {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return { success: true, driver: this.currentDriver! };
        } else {
          await this.clearStoredAuth();
          return { success: false, error: 'Token expired and refresh failed' };
        }
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      await this.clearStoredAuth();
      return { success: false, error: 'Auto-login failed' };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();
    const result = await this.tokenRefreshPromise;
    this.tokenRefreshPromise = null;
    
    return result;
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Production token refresh:
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: TokenRefreshResponse = await response.json();
      
      if (result.success && result.token) {
        // Update stored tokens
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, result.token);
        if (result.refreshToken) {
          await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
          this.refreshTokenValue = result.refreshToken;
        }
        
        // Update in-memory token
        this.accessToken = result.token;
        
        console.log('Token refreshed successfully');
        return true;
      } else {
        throw new Error(result.message || 'Token refresh failed');
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Logout user and clear all stored data
   */
  async logout(): Promise<void> {
    try {
      // Notify server about logout if we have a valid token
      if (this.accessToken) {
        try {
          await fetch(`${this.baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_ID)
            }),
          });
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with local logout even if server call fails
        }
      }

      // Clear all stored data
      await this.clearStoredAuth();
      
      // Clear in-memory state
      this.accessToken = null;
      this.refreshTokenValue = null;
      this.currentDriver = null;
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local state
      await this.clearStoredAuth();
      this.accessToken = null;
      this.refreshTokenValue = null;
      this.currentDriver = null;
    }
  }

  /**
   * Get current authentication token
   */
  async getToken(): Promise<string | null> {
    if (this.accessToken) {
      // Check if token needs refreshing
      const isValid = await this.verifyToken(this.accessToken);
      if (!isValid) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return null;
        }
      }
      return this.accessToken;
    }
    return null;
  }

  /**
   * Get current driver data
   */
  getCurrentDriver(): Driver | null {
    return this.currentDriver;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && this.currentDriver !== null;
  }

  /**
   * Enable/disable auto-login
   */
  async setAutoLoginEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTO_LOGIN_ENABLED, enabled.toString());
  }

  /**
   * Check if auto-login is enabled
   */
  async isAutoLoginEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.AUTO_LOGIN_ENABLED);
    return enabled === 'true';
  }

  /**
   * Get last login time
   */
  async getLastLoginTime(): Promise<Date | null> {
    const lastLogin = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_LOGIN);
    return lastLogin ? new Date(lastLogin) : null;
  }

  // Private helper methods

  private async storeAuthData(token: string, refreshToken: string | undefined, driver: Driver): Promise<void> {
    const promises = [
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token),
      SecureStore.setItemAsync(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(driver)),
      SecureStore.setItemAsync(STORAGE_KEYS.AUTO_LOGIN_ENABLED, 'true'),
    ];

    if (refreshToken) {
      promises.push(SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken));
    }

    await Promise.all(promises);
  }

  private async clearStoredAuth(): Promise<void> {
    const clearPromises = Object.values(STORAGE_KEYS).map(key =>
      SecureStore.deleteItemAsync(key).catch(() => {
        // Ignore errors for keys that don't exist
      })
    );
    
    await Promise.all(clearPromises);
  }

  private async verifyToken(token: string): Promise<boolean> {
    try {
      // Production verification:
      const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  private async createSession(driver: Driver): Promise<void> {
    try {
      const sessionId = `session_${driver.id}_${Date.now()}`;
      
      const sessionData: DriverSession = {
        sessionId,
        driverId: driver.id,
        startTime: new Date().toISOString(),
        isActive: true,
        deviceInfo: {
          platform: 'expo',
          version: '1.0.0',
          deviceId: 'device_id_placeholder' // Would get actual device ID
        }
      };

      await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_ID, sessionId);
      
      // Send session data to server
      await fetch(`${this.baseUrl}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
    } catch (error) {
      console.warn('Session creation failed:', error);
      // Don't throw - session creation is not critical for login
    }
  }

  private createAuthError(code: AuthError['code'], message: string, details?: any): AuthError {
    const error = Object.assign(new Error(message), {
      code,
      details
    }) as AuthError;
    return error;
  }
}

// Export singleton instance
export default AuthService.getInstance();