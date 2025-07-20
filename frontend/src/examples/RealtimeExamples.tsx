'use client';

import React, { useState, useCallback } from 'react';
import { RealtimeProvider } from '../context/RealtimeProvider';
import { 
  useRealtime, 
  useJobUpdates, 
  useDriverLocations, 
  useOptimisticJobUpdate,
  useRealtimeDashboard 
} from '../hooks/useRealtime';
import { RealtimeMonitor, RealtimeStatusIndicator } from '../components/realtime/RealtimeMonitor';
import ConnectionStatus from '../components/realtime/ConnectionStatus';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Example 1: Basic Job Updates Dashboard
export function JobUpdatesDashboard() {
  const [jobUpdates, setJobUpdates] = useState<Array<{
    jobId: string;
    status: string;
    timestamp: string;
  }>>([]);

  // Subscribe to job updates with throttling
  useJobUpdates(
    useCallback((data) => {
      setJobUpdates(prev => [
        { ...data, timestamp: new Date().toISOString() },
        ...prev.slice(0, 19) // Keep last 20 updates
      ]);
    }, []),
    { 
      enabled: true, 
      throttle: 1000, // Throttle to max 1 update per second
      autoResubscribe: true 
    }
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Job Updates</h2>
        <RealtimeStatusIndicator />
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {jobUpdates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No job updates yet...</p>
        ) : (
          jobUpdates.map((update, index) => (
            <div key={`${update.jobId}-${index}`} className="flex justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">Job {update.jobId}</span>
                <span className="ml-2 text-sm text-gray-600">→ {update.status}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(update.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// Example 2: Driver Location Tracking with Map Integration
export function DriverLocationTracker() {
  const [driverLocations, setDriverLocations] = useState<Map<string, {
    latitude: number;
    longitude: number;
    timestamp: string;
  }>>(new Map());

  useDriverLocations(
    useCallback((data) => {
      setDriverLocations(prev => {
        const newMap = new Map(prev);
        newMap.set(data.driverId, {
          ...data.location,
          timestamp: new Date().toISOString()
        });
        return newMap;
      });
    }, []),
    {
      enabled: true,
      throttle: 2000, // Update positions max every 2 seconds
      priority: 'high'
    }
  );

  const driversArray = Array.from(driverLocations.entries());

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Driver Locations</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {driversArray.length} drivers tracking
          </span>
          <RealtimeStatusIndicator />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driversArray.map(([driverId, location]) => (
          <div key={driverId} className="p-4 border rounded-lg">
            <div className="font-medium mb-2">Driver {driverId}</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Lat: {location.latitude.toFixed(6)}</div>
              <div>Lng: {location.longitude.toFixed(6)}</div>
              <div>Updated: {new Date(location.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>

      {driversArray.length === 0 && (
        <p className="text-gray-500 text-center py-8">No drivers currently tracking...</p>
      )}
    </Card>
  );
}

// Example 3: Optimistic Updates for Job Management
export function OptimisticJobManager() {
  const [jobs, setJobs] = useState<Array<{
    id: string;
    status: 'pending' | 'assigned' | 'in_progress' | 'completed';
    driverId?: string;
    isOptimistic?: boolean;
  }>>([
    { id: 'job-1', status: 'pending' },
    { id: 'job-2', status: 'assigned', driverId: 'driver-1' },
    { id: 'job-3', status: 'in_progress', driverId: 'driver-2' }
  ]);

  const { updateJobStatus, hasPendingUpdate } = useOptimisticJobUpdate();

  const handleStatusUpdate = async (jobId: string, newStatus: 'pending' | 'assigned' | 'in_progress' | 'completed') => {
    const currentJob = jobs.find(j => j.id === jobId);
    if (!currentJob) return;

    // Optimistically update UI
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: newStatus, isOptimistic: true }
        : job
    ));

    try {
      await updateJobStatus(jobId, newStatus, currentJob);
      
      // Confirm optimistic update
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, isOptimistic: false }
          : job
      ));
    } catch (error) {
      console.error('Failed to update job status:', error);
      
      // Rollback on error
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...currentJob }
          : job
      ));
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Job Management</h2>
        <RealtimeStatusIndicator />
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div 
            key={job.id} 
            className={`p-4 border rounded-lg ${
              job.isOptimistic ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{job.id}</span>
                {job.driverId && (
                  <span className="ml-2 text-sm text-gray-600">
                    (Driver: {job.driverId})
                  </span>
                )}
                {hasPendingUpdate(job.id) && (
                  <span className="ml-2 text-xs text-yellow-600 font-medium">
                    Updating...
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  job.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
                
                <select
                  value={job.status}
                  onChange={(e) => handleStatusUpdate(job.id, e.target.value as any)}
                  disabled={hasPendingUpdate(job.id)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Example 4: Comprehensive Dashboard
export function ComprehensiveDashboard() {
  const dashboardData = useRealtimeDashboard({
    jobs: true,
    drivers: true,
    locations: true,
    throttleMs: 1000
  });

  const { clearUpdates } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header with connection status and monitoring */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logistics Dashboard</h1>
        <div className="flex items-center gap-4">
          <ConnectionStatus showDetails={true} />
          <Button onClick={clearUpdates} variant="ghost" size="sm">
            Clear Updates
          </Button>
        </div>
      </div>

      {/* Real-time Monitor */}
      <RealtimeMonitor showAdvanced={true} />

      {/* Dashboard Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JobUpdatesDashboard />
        <DriverLocationTracker />
      </div>

      <OptimisticJobManager />

      {/* Recent Updates Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Job Updates</h4>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData.updates.jobs.length}
            </div>
            <div className="text-sm text-gray-600">Recent updates</div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Driver Updates</h4>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.updates.drivers.length}
            </div>
            <div className="text-sm text-gray-600">Status changes</div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Location Updates</h4>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardData.updates.locations.length}
            </div>
            <div className="text-sm text-gray-600">Position updates</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Example App with Provider
export function RealtimeExampleApp() {
  return (
    <RealtimeProvider
      url={process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'}
      autoConnect={true}
      companyId="example-company"
      userId="example-user"
      userType="dispatcher"
      onConnectionStateChange={(state) => {
        console.log('Connection state changed:', state);
      }}
      onError={(error) => {
        console.error('Realtime error:', error);
      }}
    >
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ComprehensiveDashboard />
        </div>
      </div>
    </RealtimeProvider>
  );
}