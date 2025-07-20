# Unified Real-time State Management System

This package provides a comprehensive real-time state management solution for the logistics application, featuring centralized WebSocket connection management, optimistic updates, and consistent loading/error state patterns.

## Architecture Overview

### Core Components

1. **ConnectionManager** - Handles WebSocket connections with automatic reconnection
2. **EventRouter** - Routes messages to component subscriptions with rate limiting
3. **OptimisticUpdatesManager** - Manages optimistic UI updates with rollback
4. **RealtimeClient** - High-level client combining all functionality
5. **RealtimeProvider** - React context provider for app-wide state

### Key Features

- ✅ Single WebSocket provider for entire application
- ✅ Event-driven message routing to component subscriptions  
- ✅ Automatic reconnection with exponential backoff
- ✅ Optimistic updates with rollback on failure
- ✅ Message queuing during disconnection periods
- ✅ Rate limiting and throttling for high-frequency updates
- ✅ Connection health monitoring with UI indicators
- ✅ Graceful degradation and error recovery

## Quick Start

### 1. Setup the Provider

Wrap your app with the RealtimeProvider:

```tsx
import { RealtimeProvider } from './context/RealtimeProvider';

function App() {
  return (
    <RealtimeProvider
      url="ws://localhost:3001"
      autoConnect={true}
      companyId="your-company-id"
      userId="current-user-id"
      userType="dispatcher"
    >
      <YourApp />
    </RealtimeProvider>
  );
}
```

### 2. Subscribe to Events

Use the provided hooks to subscribe to real-time events:

```tsx
import { useJobUpdates, useDriverLocations } from './hooks/useRealtime';

function Dashboard() {
  // Subscribe to job updates with throttling
  useJobUpdates((data) => {
    console.log('Job update:', data);
  }, { throttle: 1000 });

  // Subscribe to driver locations
  useDriverLocations((data) => {
    console.log('Driver location:', data);
  }, { throttle: 2000 });

  return <div>Dashboard content...</div>;
}
```

### 3. Send Messages with Optimistic Updates

```tsx
import { useOptimisticJobUpdate } from './hooks/useRealtime';

function JobManager() {
  const { updateJobStatus } = useOptimisticJobUpdate();

  const handleStatusChange = async (jobId: string, status: string) => {
    try {
      await updateJobStatus(jobId, status, currentJobData);
      // UI already updated optimistically
    } catch (error) {
      // Automatically rolled back on error
      console.error('Update failed:', error);
    }
  };

  return <div>Job management UI...</div>;
}
```

### 4. Monitor Connection Status

```tsx
import { ConnectionStatus, RealtimeMonitor } from './components/realtime';

function Header() {
  return (
    <div>
      <ConnectionStatus showDetails={true} />
      <RealtimeMonitor showAdvanced={true} />
    </div>
  );
}
```

## API Reference

### Hooks

#### `useRealtime()`
Main hook providing access to the realtime client and connection state.

```tsx
const {
  isConnected,
  connectionState,
  connectionQuality,
  client,
  send,
  subscribe
} = useRealtime();
```

#### `useRealtimeSubscription(eventType, callback, options)`
Subscribe to specific event types with advanced options.

```tsx
const { isSubscribed, resubscribe } = useRealtimeSubscription(
  'job:status_update',
  (data) => handleJobUpdate(data),
  {
    enabled: true,
    throttle: 1000,
    debounce: 500,
    priority: 'high',
    autoResubscribe: true
  }
);
```

#### `useOptimisticUpdate(id, options)`
Manage optimistic updates for a specific operation.

```tsx
const { create, confirm, rollback, isPending } = useOptimisticUpdate(
  'job-update-123',
  {
    timeout: 10000,
    onConfirm: () => console.log('Confirmed'),
    onRollback: () => console.log('Rolled back'),
    onTimeout: () => console.log('Timed out')
  }
);
```

### Specialized Hooks

#### Job Management
- `useJobUpdates(callback, options)` - Subscribe to job status changes
- `useJobAssignments(callback, options)` - Subscribe to job assignments
- `useOptimisticJobUpdate()` - Optimistic job operations

#### Driver Tracking
- `useDriverLocations(callback, options)` - Subscribe to location updates
- `useDriverAvailability(callback, options)` - Subscribe to availability changes
- `useDriverStatus(callback, options)` - Subscribe to online/offline status

#### Dashboard
- `useRealtimeDashboard(subscriptions)` - Multi-subscription hook for dashboards

### Components

#### `<RealtimeProvider>`
Context provider for app-wide real-time state.

**Props:**
- `url: string` - WebSocket server URL
- `autoConnect?: boolean` - Auto-connect on mount (default: true)
- `companyId?: string` - Company identifier for authentication
- `userId?: string` - User identifier for authentication  
- `userType?: 'driver' | 'dispatcher' | 'admin'` - User role
- `onConnectionStateChange?: (state) => void` - Connection state callback
- `onError?: (error) => void` - Error callback

#### `<ConnectionStatus>`
Display connection status with optional details and retry button.

**Props:**
- `showDetails?: boolean` - Show detailed stats (default: false)
- `useContext?: boolean` - Use provider context (default: true)
- `className?: string` - Additional CSS classes

#### `<RealtimeMonitor>`
Comprehensive monitoring dashboard for connection health.

**Props:**
- `showAdvanced?: boolean` - Show advanced metrics (default: false)
- `className?: string` - Additional CSS classes

#### `<RealtimeStatusIndicator>`
Compact status indicator for headers/navigation.

## Configuration Options

### Connection Config
```tsx
interface ConnectionConfig {
  url: string;
  autoConnect?: boolean;
  reconnectEnabled?: boolean;
  maxReconnectAttempts?: number;      // default: 10
  reconnectInterval?: number;         // default: 1000ms
  maxReconnectInterval?: number;      // default: 30000ms
  reconnectBackoffFactor?: number;    // default: 1.5
  pingInterval?: number;              // default: 5000ms
  pingTimeout?: number;               // default: 10000ms
  messageQueueSize?: number;          // default: 1000
}
```

### Subscription Options
```tsx
interface SubscriptionOptions {
  enabled?: boolean;                  // default: true
  priority?: 'high' | 'medium' | 'low'; // default: 'medium'
  throttle?: number;                  // milliseconds
  debounce?: number;                  // milliseconds
  autoResubscribe?: boolean;          // default: false
}
```

### Rate Limiting
```tsx
interface RateLimit {
  maxRequests: number;
  windowMs: number;
  burst?: number;                     // extra requests allowed
}

// Set rate limit for event type
client.setRateLimit('driver:location_update', {
  maxRequests: 100,
  windowMs: 60000,  // 1 minute
  burst: 10
});
```

## Performance Optimization

### Throttling High-Frequency Updates
```tsx
// Driver locations - throttle to max 1 update per 2 seconds
useDriverLocations(callback, { throttle: 2000 });

// Job updates - throttle to max 1 update per second  
useJobUpdates(callback, { throttle: 1000 });
```

### Message Priority
```tsx
// High priority for critical updates
useJobUpdates(callback, { priority: 'high' });

// Low priority for analytics
useAnalyticsUpdates(callback, { priority: 'low' });
```

### Conditional Subscriptions
```tsx
// Only subscribe when component is visible
const [isVisible, setIsVisible] = useState(false);

useDriverLocations(callback, { 
  enabled: isVisible,
  autoResubscribe: true 
});
```

## Error Handling

### Connection Errors
```tsx
const { lastError, clearError } = useRealtimeErrors();

useEffect(() => {
  if (lastError) {
    console.error('Connection error:', lastError.message);
    // Show user notification
    showErrorNotification(lastError.message);
  }
}, [lastError]);
```

### Optimistic Update Rollbacks
```tsx
const optimistic = useOptimisticUpdate('operation-id', {
  onRollback: () => {
    // Handle rollback - notify user, refresh data, etc.
    showWarning('Operation failed, changes reverted');
  },
  onTimeout: () => {
    // Handle timeout - operation took too long
    showWarning('Operation timed out');
  }
});
```

### Graceful Degradation
```tsx
const { isConnected } = useRealtimeConnection();

return (
  <div>
    {isConnected ? (
      <LiveDashboard />
    ) : (
      <StaticDashboard 
        message="Real-time updates unavailable. Data may be stale." 
      />
    )}
  </div>
);
```

## Testing

### Mock Provider for Tests
```tsx
import { RealtimeProvider } from './context/RealtimeProvider';

function TestWrapper({ children }) {
  return (
    <RealtimeProvider
      url="ws://mock-server"
      autoConnect={false}
    >
      {children}
    </RealtimeProvider>
  );
}
```

### Connection Simulation
```tsx
// Simulate connection states in tests
const { connect, disconnect } = useRealtimeConnection();

test('handles disconnection gracefully', async () => {
  disconnect();
  // Test offline behavior
  
  await connect();
  // Test reconnection behavior
});
```

## Performance Targets

- **Update Propagation**: <100ms from server to UI
- **Message Delivery**: 99.9% reliability 
- **UI Response Time**: <16ms for optimistic updates
- **Reconnection**: <5 seconds for network issues
- **Memory Usage**: <50MB for 1000+ active subscriptions

## Event Types

### Job Events
- `job:status_update` - Job status changes
- `job:assigned` - Job assignments  
- `job:created` - New job creation
- `job:deleted` - Job deletion
- `job:reassigned` - Job reassignments

### Driver Events  
- `driver:location_update` - Location updates
- `driver:availability_change` - Availability status
- `driver:status_change` - Online/offline status
- `driver:online` - Driver comes online
- `driver:offline` - Driver goes offline

### System Events
- `connection:state_change` - Connection state changes
- `connection:quality_change` - Connection quality changes  
- `connection:error` - Connection errors
- `rate_limit_exceeded` - Rate limit violations

## Migration Guide

### From existing useJobWebSocket
```tsx
// Before
const { isConnected, lastUpdate } = useJobWebSocket({
  onJobUpdate: handleJobUpdate
});

// After  
const { isConnected } = useRealtimeConnection();
useJobUpdates(handleJobUpdate);
```

### From existing useDriverTracking
```tsx
// Before
const { driverLocations } = useDriverTracking({
  companyId: 'company-123'
});

// After
const [locations, setLocations] = useState(new Map());
useDriverLocations((data) => {
  setLocations(prev => new Map(prev.set(data.driverId, data.location)));
});
```

## Troubleshooting

### Common Issues

1. **Connection fails to establish**
   - Check WebSocket URL is correct
   - Verify server is running and accessible
   - Check authentication tokens

2. **High memory usage**  
   - Implement subscription cleanup in useEffect
   - Use throttling for high-frequency updates
   - Limit message history in components

3. **Messages not received**
   - Check subscription is active with correct event type
   - Verify rate limiting settings
   - Check connection quality

4. **Optimistic updates not rolling back**
   - Ensure rollback function is properly implemented
   - Check timeout settings
   - Verify error handling in send operations

### Debug Mode
```tsx
// Enable debug logging
localStorage.setItem('realtime-debug', 'true');

// View connection stats
const stats = client.getStats();
console.log('Connection stats:', stats);
```