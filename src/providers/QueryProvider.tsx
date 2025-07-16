import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Cache time: Data remains in cache for 10 minutes after becoming unused
      cacheTime: 10 * 60 * 1000,
      
      // Retry failed requests 3 times
      retry: 3,
      
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      
      // Background refetch interval (disabled by default, enabled per query)
      refetchInterval: false,
      
      // Background refetch interval in focus (disabled by default)
      refetchIntervalInBackground: false,
      
      // Suspend if no data and query is not loading
      suspense: false,
      
      // Use error boundary for errors
      useErrorBoundary: false,
      
      // Enable query cancellation
      enabled: true,
      
      // Network mode
      networkMode: 'online',
      
      // Placeholder data
      placeholderData: undefined,
      
      // Select data transformation
      select: undefined,
      
      // Structure sharing
      structuralSharing: true,
      
      // Optimize for frequent updates
      notifyOnChangeProps: 'tracked'
    },
    mutations: {
      // Retry failed mutations 2 times
      retry: 2,
      
      // Retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Use error boundary for mutation errors
      useErrorBoundary: false,
      
      // Network mode
      networkMode: 'online'
    }
  }
});

// Custom hooks for location tracking queries
export const useLocationTrackingQueries = () => {
  return {
    // Driver locations query key factory
    driverLocationsKey: (companyId: string, filters?: Record<string, unknown>) => [
      'drivers',
      'locations',
      companyId,
      filters
    ],
    
    // Geofence zones query key factory
    geofenceZonesKey: (companyId: string) => [
      'geofence',
      'zones',
      companyId
    ],
    
    // Driver metrics query key factory
    driverMetricsKey: (companyId: string, timeRange?: string) => [
      'analytics',
      'driver-metrics',
      companyId,
      timeRange
    ] as const,
    
    // Zone analytics query key factory
    zoneAnalyticsKey: (companyId: string, timeRange?: string) => [
      'analytics',
      'zone-activity',
      companyId,
      timeRange
    ],
    
    // Real-time events query key factory
    realtimeEventsKey: (companyId: string, eventType?: string) => [
      'events',
      'realtime',
      companyId,
      eventType
    ]
  };
};

// Utility functions for query invalidation
export const useQueryInvalidation = () => {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate all driver-related queries
    invalidateDriverQueries: (companyId: string) => {
      queryClient.invalidateQueries({ queryKey: ['drivers', companyId] });
    },
    
    // Invalidate specific driver location
    invalidateDriverLocation: (driverId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ['drivers', 'locations'], 
        predicate: (query) => {
          return query.queryKey.includes(driverId);
        }
      });
    },
    
    // Invalidate geofence queries
    invalidateGeofenceQueries: (companyId: string) => {
      queryClient.invalidateQueries({ queryKey: ['geofence', companyId] });
    },
    
    // Invalidate analytics queries
    invalidateAnalyticsQueries: (companyId: string) => {
      queryClient.invalidateQueries({ queryKey: ['analytics', companyId] });
    },
    
    // Invalidate all queries for a company
    invalidateCompanyQueries: (companyId: string) => {
      queryClient.invalidateQueries({ queryKey: [companyId] });
    },
    
    // Remove specific driver from cache
    removeDriverFromCache: (driverId: string) => {
      queryClient.removeQueries({ 
        queryKey: ['drivers', 'locations'], 
        predicate: (query) => {
          return query.queryKey.includes(driverId);
        }
      });
    },
    
    // Update driver location in cache
    updateDriverLocationInCache: (companyId: string, driverId: string, newLocation: unknown) => {
      queryClient.setQueryData(['drivers', 'locations', companyId], (oldData: unknown) => {
        if (!oldData) return oldData;
        
        const drivers = oldData as Array<{ driverId: string; [key: string]: unknown }>;
        return drivers.map((driver) => 
          driver.driverId === driverId 
            ? { ...driver, ...newLocation as object, lastSeen: new Date() }
            : driver
        );
      });
    },
    
    // Add new geofence event to cache
    addGeofenceEventToCache: (companyId: string, event: unknown) => {
      queryClient.setQueryData(['events', 'realtime', companyId], (oldData: unknown) => {
        if (!oldData) return [event];
        const events = oldData as Array<unknown>;
        return [...events.slice(-99), event]; // Keep last 100 events
      });
    }
  };
};

// Query client configuration for location tracking
export const configureLocationTrackingQueries = () => {
  // Set up query defaults for location tracking
  queryClient.setQueryDefaults(['drivers', 'locations'], {
    staleTime: 10 * 1000, // 10 seconds for location data
    cacheTime: 60 * 1000, // 1 minute cache
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  // Set up query defaults for geofence zones
  queryClient.setQueryDefaults(['geofence', 'zones'], {
    staleTime: 5 * 60 * 1000, // 5 minutes for geofence data
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    refetchInterval: false, // Don't auto-refetch zones
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Set up query defaults for analytics
  queryClient.setQueryDefaults(['analytics'], {
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  // Set up query defaults for real-time events
  queryClient.setQueryDefaults(['events', 'realtime'], {
    staleTime: 0, // Always stale for real-time events
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: false, // Handled by Socket.io
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
};

interface QueryProviderProps {
  children: React.ReactNode;
}

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Configure location tracking queries on mount
  React.useEffect(() => {
    configureLocationTrackingQueries();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Development tools */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginRight: '20px',
              marginBottom: '20px'
            }
          }}
        />
      )}
    </QueryClientProvider>
  );
};

// Export the query client for external use
export { queryClient };
export default QueryProvider;