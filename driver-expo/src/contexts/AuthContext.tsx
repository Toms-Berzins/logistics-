import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  Driver, 
  AuthState, 
  AuthAction, 
  AuthContextType, 
  LoginCredentials 
} from '../types/Driver';
import AuthService from '../services/AuthService';
import DriverService from '../services/DriverService';

// Initial authentication state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true, // Start with loading true for auto-login check
  driver: null,
  token: null,
  refreshToken: null,
  lastLoginTime: null,
  error: null,
};

// Auth reducer for state management
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        driver: action.payload.driver,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        lastLoginTime: new Date().toISOString(),
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        driver: null,
        token: null,
        refreshToken: null,
        error: action.payload.error,
      };

    case 'LOGOUT':
      return {
        ...initialAuthState,
        isLoading: false,
      };

    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        error: null,
      };

    case 'TOKEN_REFRESH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        driver: null,
        token: null,
        refreshToken: null,
        error: 'Session expired. Please login again.',
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  
  // Auto-login check on app start
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      
      const result = await AuthService.autoLogin();
      
      if (result.success && result.driver) {
        const token = await AuthService.getToken();
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            driver: result.driver,
            token: token || '',
            refreshToken: '', // Will be loaded by AuthService
          },
        });
        
        // Connect socket after successful auto-login
        try {
          await DriverService.connectSocket();
        } catch (error) {
          console.warn('Failed to connect socket during auto-login:', error);
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      }
    } catch (error) {
      console.error('Auto-login check failed:', error);
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const result = await AuthService.login(credentials);
      
      if (result.success && result.driver && result.token) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            driver: result.driver,
            token: result.token,
            refreshToken: result.refreshToken || '',
          },
        });
        
        // Connect socket after successful login
        try {
          await DriverService.connectSocket();
        } catch (error) {
          console.warn('Failed to connect socket after login:', error);
        }
        
        return true;
      } else {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: { error: result.message || 'Login failed' },
        });
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: error.message || 'Network error during login' },
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Disconnect socket before logout
      DriverService.disconnectSocket();
      
      await AuthService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Always disconnect socket and dispatch logout even if server call fails
      DriverService.disconnectSocket();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      const success = await AuthService.refreshToken();
      
      if (success) {
        const newToken = await AuthService.getToken();
        if (newToken) {
          dispatch({
            type: 'TOKEN_REFRESH_SUCCESS',
            payload: {
              token: newToken,
              refreshToken: '', // AuthService manages this internally
            },
          });
          return true;
        }
      }
      
      dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateDriverStatus = async (status: Driver['status']): Promise<void> => {
    if (!state.driver) return;

    try {
      // Optimistically update local state
      const updatedDriver = { ...state.driver, status };
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          driver: updatedDriver,
          token: state.token || '',
          refreshToken: state.refreshToken || '',
        },
      });

      // Send update to server
      const token = await AuthService.getToken();
      if (token) {
        await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.18.2:3001'}/api/drivers/${state.driver.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });
      }
    } catch (error) {
      console.error('Failed to update driver status:', error);
      // Revert optimistic update on error
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          driver: state.driver,
          token: state.token || '',
          refreshToken: state.refreshToken || '',
        },
      });
    }
  };

  const updateDriverLocation = async (location: Driver['location']): Promise<void> => {
    if (!state.driver) return;

    try {
      // Update local state
      const updatedDriver = { ...state.driver, location };
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          driver: updatedDriver,
          token: state.token || '',
          refreshToken: state.refreshToken || '',
        },
      });

      // Location updates are typically handled by LocationService
      // This method is for manual location updates if needed
    } catch (error) {
      console.error('Failed to update driver location:', error);
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuthToken,
    clearError,
    updateDriverStatus,
    updateDriverLocation,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}

export default AuthContext;