import { useEffect, useRef, useCallback, useState } from 'react';
import { useRealtimeContext } from '../context/RealtimeProvider';
import { OptimisticUpdate } from '../lib/websocket';

// Types for hook options
interface UseRealtimeOptions {
  enabled?: boolean;
  priority?: 'high' | 'medium' | 'low';
  throttle?: number;
  debounce?: number;
  onError?: (error: Error) => void;
}

interface UseRealtimeSubscriptionOptions extends UseRealtimeOptions {
  autoResubscribe?: boolean;
}

interface UseOptimisticUpdateOptions {
  timeout?: number;
  onConfirm?: () => void;
  onRollback?: () => void;
  onTimeout?: () => void;
}

// Main useRealtime hook
export function useRealtime() {
  const context = useRealtimeContext();
  
  return {
    ...context,
    
    // Convenience methods
    subscribe: useCallback((
      eventType: string,
      callback: (data: unknown) => void,
      options?: UseRealtimeSubscriptionOptions
    ) => {
      if (!context.client || !options?.enabled !== false) return null;
      
      return context.client.subscribe(eventType, callback, {
        priority: options?.priority,
        throttle: options?.throttle,
        debounce: options?.debounce
      });
    }, [context.client]),
    
    send: useCallback(async (
      eventType: string,
      data: unknown,
      options?: { priority?: 'high' | 'medium' | 'low' }
    ) => {
      if (!context.client) {
        throw new Error('Client not available');
      }
      
      return context.client.send(eventType, data, options);
    }, [context.client])
  };
}

// Hook for subscribing to specific events
export function useRealtimeSubscription<T = unknown>(
  eventType: string,
  callback: (data: T) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const { client, isConnected } = useRealtimeContext();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Update refs when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  // Subscribe/unsubscribe logic
  useEffect(() => {
    if (!client || options.enabled === false) {
      return;
    }

    // Subscribe when client is available and connection is established (if autoResubscribe is true)
    if (isConnected || !options.autoResubscribe) {
      const wrappedCallback = (data: unknown) => {
        try {
          callbackRef.current(data as T);
        } catch (error) {
          optionsRef.current.onError?.(error instanceof Error ? error : new Error('Callback error'));
        }
      };

      const id = client.subscribe(eventType, wrappedCallback, {
        priority: options.priority,
        throttle: options.throttle,
        debounce: options.debounce
      });

      setSubscriptionId(id);
      setIsSubscribed(true);

      return () => {
        if (id) {
          client.unsubscribe(id);
          setSubscriptionId(null);
          setIsSubscribed(false);
        }
      };
    }
  }, [client, eventType, isConnected, options.enabled, options.autoResubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionId && client) {
        client.unsubscribe(subscriptionId);
      }
    };
  }, []);

  return {
    isSubscribed,
    subscriptionId,
    resubscribe: useCallback(() => {
      if (subscriptionId && client) {
        client.unsubscribe(subscriptionId);
        setSubscriptionId(null);
        setIsSubscribed(false);
      }
      // The effect will handle resubscription
    }, [client, subscriptionId])
  };
}

// Hook for sending messages with optimistic updates
export function useRealtimeSender<T = unknown>() {
  const { client } = useRealtimeContext();
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const send = useCallback(async (
    eventType: string,
    data: T,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      optimistic?: {
        id: string;
        rollback: () => void;
        timeout?: number;
      };
    }
  ) => {
    if (!client) {
      throw new Error('Client not available');
    }

    setIsSending(true);
    setLastError(null);

    try {
      await client.send(eventType, data, options);
    } catch (error) {
      const sendError = error instanceof Error ? error : new Error('Send failed');
      setLastError(sendError);
      throw sendError;
    } finally {
      setIsSending(false);
    }
  }, [client]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    send,
    isSending,
    lastError,
    clearError
  };
}

// Hook for managing optimistic updates
export function useOptimisticUpdate<T = unknown>(
  id: string,
  options: UseOptimisticUpdateOptions = {}
) {
  const { client } = useRealtimeContext();
  const [update, setUpdate] = useState<OptimisticUpdate<T> | null>(null);
  const [isPending, setIsPending] = useState(false);

  const create = useCallback((
    data: T,
    rollback: () => void,
    confirm: () => void
  ) => {
    if (!client) {
      throw new Error('Client not available');
    }

    const wrappedRollback = () => {
      try {
        rollback();
        setIsPending(false);
        options.onRollback?.();
      } catch (error) {
        console.error('Error during optimistic update rollback:', error);
      }
    };

    const wrappedConfirm = () => {
      try {
        confirm();
        setIsPending(false);
        options.onConfirm?.();
      } catch (error) {
        console.error('Error during optimistic update confirm:', error);
      }
    };

    const optimisticUpdate = client.createOptimisticUpdate(
      id,
      data,
      wrappedRollback,
      wrappedConfirm,
      options.timeout
    );

    setUpdate(optimisticUpdate);
    setIsPending(true);

    // Set up timeout handler
    if (options.timeout) {
      setTimeout(() => {
        if (client.getPendingOptimisticUpdates().some(u => u.id === id)) {
          options.onTimeout?.();
        }
      }, options.timeout);
    }

    return optimisticUpdate;
  }, [client, id, options]);

  const confirm = useCallback(() => {
    if (!client) return false;
    
    const result = client.confirmOptimisticUpdate(id);
    if (result) {
      setIsPending(false);
      setUpdate(null);
    }
    return result;
  }, [client, id]);

  const rollback = useCallback(() => {
    if (!client) return false;
    
    const result = client.rollbackOptimisticUpdate(id);
    if (result) {
      setIsPending(false);
      setUpdate(null);
    }
    return result;
  }, [client, id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPending && client) {
        client.rollbackOptimisticUpdate(id);
      }
    };
  }, []);

  return {
    create,
    confirm,
    rollback,
    update,
    isPending
  };
}

// Specialized hooks for common use cases

// Job-related hooks
export function useJobUpdates(
  callback: (data: { jobId: string; status: string; driverId?: string }) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  return useRealtimeSubscription('job:status_update', callback, {
    throttle: 500, // Throttle job updates to prevent UI flooding
    ...options
  });
}

export function useJobAssignments(
  callback: (data: { jobId: string; driverId: string }) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  return useRealtimeSubscription('job:assigned', callback, options);
}

// Driver-related hooks
export function useDriverLocations(
  callback: (data: { driverId: string; location: { latitude: number; longitude: number } }) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  return useRealtimeSubscription('driver:location_update', callback, {
    throttle: 1000, // Throttle location updates to improve performance
    ...options
  });
}

export function useDriverAvailability(
  callback: (data: { driverId: string; isAvailable: boolean }) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  return useRealtimeSubscription('driver:availability_change', callback, options);
}

export function useDriverStatus(
  callback: (data: { driverId: string; status: 'online' | 'offline' }) => void,
  options: UseRealtimeSubscriptionOptions = {}
) {
  return useRealtimeSubscription('driver:status_change', callback, options);
}

// Optimistic update hooks for common operations
export function useOptimisticJobUpdate() {
  const { send } = useRealtimeSender();
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, unknown>>(new Map());

  const updateJobStatus = useCallback(async (
    jobId: string,
    newStatus: string,
    currentJobData: unknown
  ) => {
    const updateId = `job_status_${jobId}`;
    
    // Store current state for rollback
    setPendingUpdates(prev => new Map(prev.set(jobId, currentJobData)));

    const rollback = () => {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
      // Emit rollback event for UI to handle
    };

    try {
      await send('job:update_status', { jobId, status: newStatus }, {
        optimistic: {
          id: updateId,
          rollback,
          timeout: 10000
        }
      });
      
      // Remove from pending on successful send
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
      
    } catch (error) {
      rollback();
      throw error;
    }
  }, [send]);

  return {
    updateJobStatus,
    pendingUpdates: Array.from(pendingUpdates.keys()),
    hasPendingUpdate: (jobId: string) => pendingUpdates.has(jobId)
  };
}

// Multi-subscription hook for dashboard-like components
export function useRealtimeDashboard(subscriptions: {
  jobs?: boolean;
  drivers?: boolean;
  locations?: boolean;
  throttleMs?: number;
}) {
  const [jobUpdates, setJobUpdates] = useState<unknown[]>([]);
  const [driverUpdates, setDriverUpdates] = useState<unknown[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<unknown[]>([]);

  const jobSubscription = useJobUpdates(
    useCallback((data) => {
      setJobUpdates(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 updates
    }, []),
    { enabled: subscriptions.jobs, throttle: subscriptions.throttleMs }
  );

  const driverSubscription = useDriverStatus(
    useCallback((data) => {
      setDriverUpdates(prev => [data, ...prev.slice(0, 99)]);
    }, []),
    { enabled: subscriptions.drivers, throttle: subscriptions.throttleMs }
  );

  const locationSubscription = useDriverLocations(
    useCallback((data) => {
      setLocationUpdates(prev => [data, ...prev.slice(0, 99)]);
    }, []),
    { enabled: subscriptions.locations, throttle: subscriptions.throttleMs }
  );

  const clearUpdates = useCallback(() => {
    setJobUpdates([]);
    setDriverUpdates([]);
    setLocationUpdates([]);
  }, []);

  return {
    updates: {
      jobs: jobUpdates,
      drivers: driverUpdates,
      locations: locationUpdates
    },
    subscriptions: {
      jobs: jobSubscription,
      drivers: driverSubscription,
      locations: locationSubscription
    },
    clearUpdates
  };
}