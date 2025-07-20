/**
 * Custom hook for screen reader optimization of dynamic job status changes
 * Provides intelligent filtering and batching of status announcements
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { 
  announceJobStatus, 
  announceDriverStatus, 
  announceRouteUpdate,
  announceToLiveRegion,
} from '@/lib/accessibility/live-regions';
import { 
  formatJobForScreenReader, 
  formatDriverForScreenReader,
  formatRouteForScreenReader,
  createStatusMessage,
  optimizeForScreenReader,
} from '@/lib/accessibility/screen-reader';
import { ACCESSIBILITY_CONFIG } from '@/lib/accessibility';

/**
 * Job status change interface
 */
export interface JobStatusChange {
  jobId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: number;
  driverName?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  location?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Driver status change interface
 */
export interface DriverStatusChange {
  driverId: string;
  driverName: string;
  previousStatus: string;
  newStatus: string;
  timestamp: number;
  location?: string;
  currentJob?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Route update interface
 */
export interface RouteUpdateChange {
  routeId: string;
  driverName?: string;
  updateType: 'eta' | 'delay' | 'reroute' | 'traffic' | 'completed';
  timestamp: number;
  details: {
    origin?: string;
    destination?: string;
    eta?: string;
    delay?: string;
    reason?: string;
  };
}

/**
 * Announcement configuration
 */
export interface AnnouncementConfig {
  enableJobStatusAnnouncements: boolean;
  enableDriverStatusAnnouncements: boolean;
  enableRouteUpdateAnnouncements: boolean;
  batchingEnabled: boolean;
  batchingDelay: number;
  priorityFiltering: boolean;
  locationBasedFiltering: boolean;
  userPreferences: {
    verbosity: 'minimal' | 'normal' | 'detailed';
    priorityThreshold: 'all' | 'normal' | 'high' | 'urgent';
    announcementTypes: string[];
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AnnouncementConfig = {
  enableJobStatusAnnouncements: true,
  enableDriverStatusAnnouncements: true,
  enableRouteUpdateAnnouncements: true,
  batchingEnabled: true,
  batchingDelay: 2000,
  priorityFiltering: true,
  locationBasedFiltering: false,
  userPreferences: {
    verbosity: 'normal',
    priorityThreshold: 'normal',
    announcementTypes: ['status', 'assignment', 'completion', 'delay'],
  },
};

/**
 * Hook state interface
 */
interface HookState {
  pendingJobAnnouncements: JobStatusChange[];
  pendingDriverAnnouncements: DriverStatusChange[];
  pendingRouteAnnouncements: RouteUpdateChange[];
  lastAnnouncementTime: number;
  batchingTimer: number | null;
  announcementHistory: Array<{
    type: 'job' | 'driver' | 'route';
    message: string;
    timestamp: number;
  }>;
}

/**
 * Job status announcements hook
 */
export function useJobStatusAnnouncements(
  config: Partial<AnnouncementConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const stateRef = useRef<HookState>({
    pendingJobAnnouncements: [],
    pendingDriverAnnouncements: [],
    pendingRouteAnnouncements: [],
    lastAnnouncementTime: 0,
    batchingTimer: null,
    announcementHistory: [],
  });

  // Cleanup batching timer on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current.batchingTimer) {
        clearTimeout(stateRef.current.batchingTimer);
      }
    };
  }, []);

  /**
   * Process pending announcements
   */
  const processPendingAnnouncements = useCallback(() => {
    const state = stateRef.current;
    
    if (
      state.pendingJobAnnouncements.length === 0 &&
      state.pendingDriverAnnouncements.length === 0 &&
      state.pendingRouteAnnouncements.length === 0
    ) {
      return;
    }

    // Process job status changes
    if (state.pendingJobAnnouncements.length > 0) {
      processJobAnnouncements(state.pendingJobAnnouncements);
      state.pendingJobAnnouncements = [];
    }

    // Process driver status changes
    if (state.pendingDriverAnnouncements.length > 0) {
      processDriverAnnouncements(state.pendingDriverAnnouncements);
      state.pendingDriverAnnouncements = [];
    }

    // Process route updates
    if (state.pendingRouteAnnouncements.length > 0) {
      processRouteAnnouncements(state.pendingRouteAnnouncements);
      state.pendingRouteAnnouncements = [];
    }

    state.lastAnnouncementTime = Date.now();
    state.batchingTimer = null;
  }, [mergedConfig]);

  /**
   * Process job status announcements
   */
  const processJobAnnouncements = useCallback((changes: JobStatusChange[]) => {
    if (!mergedConfig.enableJobStatusAnnouncements) return;

    // Group by job ID and take the latest change
    const latestChanges = new Map<string, JobStatusChange>();
    changes.forEach((change) => {
      const existing = latestChanges.get(change.jobId);
      if (!existing || change.timestamp > existing.timestamp) {
        latestChanges.set(change.jobId, change);
      }
    });

    // Filter and announce
    Array.from(latestChanges.values())
      .filter((change) => shouldAnnounceJobChange(change))
      .forEach((change) => {
        const priority = getJobAnnouncementPriority(change);
        const message = createJobStatusMessage(change);
        
        announceJobStatus(
          change.jobId,
          change.newStatus,
          change.driverName,
          priority
        );

        // Add to history
        stateRef.current.announcementHistory.push({
          type: 'job',
          message,
          timestamp: change.timestamp,
        });
      });
  }, [mergedConfig]);

  /**
   * Process driver status announcements
   */
  const processDriverAnnouncements = useCallback((changes: DriverStatusChange[]) => {
    if (!mergedConfig.enableDriverStatusAnnouncements) return;

    // Group by driver ID and take the latest change
    const latestChanges = new Map<string, DriverStatusChange>();
    changes.forEach((change) => {
      const existing = latestChanges.get(change.driverId);
      if (!existing || change.timestamp > existing.timestamp) {
        latestChanges.set(change.driverId, change);
      }
    });

    // Filter and announce
    Array.from(latestChanges.values())
      .filter((change) => shouldAnnounceDriverChange(change))
      .forEach((change) => {
        const priority = getDriverAnnouncementPriority(change);
        const message = createDriverStatusMessage(change);
        
        announceDriverStatus(
          change.driverName,
          change.newStatus,
          change.location,
          priority
        );

        // Add to history
        stateRef.current.announcementHistory.push({
          type: 'driver',
          message,
          timestamp: change.timestamp,
        });
      });
  }, [mergedConfig]);

  /**
   * Process route update announcements
   */
  const processRouteAnnouncements = useCallback((changes: RouteUpdateChange[]) => {
    if (!mergedConfig.enableRouteUpdateAnnouncements) return;

    // Group by route ID and take the latest change
    const latestChanges = new Map<string, RouteUpdateChange>();
    changes.forEach((change) => {
      const existing = latestChanges.get(change.routeId);
      if (!existing || change.timestamp > existing.timestamp) {
        latestChanges.set(change.routeId, change);
      }
    });

    // Filter and announce
    Array.from(latestChanges.values())
      .filter((change) => shouldAnnounceRouteChange(change))
      .forEach((change) => {
        const priority = getRouteAnnouncementPriority(change);
        const message = createRouteUpdateMessage(change);
        
        announceRouteUpdate(
          {
            driver: change.driverName,
            origin: change.details.origin,
            destination: change.details.destination,
            eta: change.details.eta,
            delay: change.details.delay,
          },
          priority
        );

        // Add to history
        stateRef.current.announcementHistory.push({
          type: 'route',
          message,
          timestamp: change.timestamp,
        });
      });
  }, [mergedConfig]);

  /**
   * Determine if job change should be announced
   */
  const shouldAnnounceJobChange = useCallback((change: JobStatusChange): boolean => {
    const { userPreferences, priorityFiltering } = mergedConfig;

    // Check priority threshold
    if (priorityFiltering && userPreferences.priorityThreshold !== 'all') {
      const priorityOrder = ['low', 'normal', 'high', 'urgent'];
      const changePriorityIndex = priorityOrder.indexOf(change.priority || 'normal');
      const thresholdIndex = priorityOrder.indexOf(userPreferences.priorityThreshold);
      
      if (changePriorityIndex < thresholdIndex) {
        return false;
      }
    }

    // Check announcement types
    const announcementType = getJobAnnouncementType(change);
    if (!userPreferences.announcementTypes.includes(announcementType)) {
      return false;
    }

    // Check for significant status changes
    return isSignificantJobStatusChange(change.previousStatus, change.newStatus);
  }, [mergedConfig]);

  /**
   * Determine if driver change should be announced
   */
  const shouldAnnounceDriverChange = useCallback((change: DriverStatusChange): boolean => {
    const { userPreferences } = mergedConfig;

    // Check announcement types
    const announcementType = getDriverAnnouncementType(change);
    if (!userPreferences.announcementTypes.includes(announcementType)) {
      return false;
    }

    // Check for significant status changes
    return isSignificantDriverStatusChange(change.previousStatus, change.newStatus);
  }, [mergedConfig]);

  /**
   * Determine if route change should be announced
   */
  const shouldAnnounceRouteChange = useCallback((change: RouteUpdateChange): boolean => {
    const { userPreferences } = mergedConfig;

    // Always announce delays
    if (change.updateType === 'delay') {
      return true;
    }

    // Check announcement types
    if (!userPreferences.announcementTypes.includes(change.updateType)) {
      return false;
    }

    return true;
  }, [mergedConfig]);

  /**
   * Schedule announcement processing
   */
  const scheduleAnnouncement = useCallback(() => {
    const state = stateRef.current;
    
    if (state.batchingTimer) {
      clearTimeout(state.batchingTimer);
    }

    if (mergedConfig.batchingEnabled) {
      state.batchingTimer = window.setTimeout(
        processPendingAnnouncements,
        mergedConfig.batchingDelay
      );
    } else {
      processPendingAnnouncements();
    }
  }, [mergedConfig, processPendingAnnouncements]);

  /**
   * Announce job status change
   */
  const announceJobStatusChange = useCallback((change: JobStatusChange) => {
    stateRef.current.pendingJobAnnouncements.push(change);
    scheduleAnnouncement();
  }, [scheduleAnnouncement]);

  /**
   * Announce driver status change
   */
  const announceDriverStatusChange = useCallback((change: DriverStatusChange) => {
    stateRef.current.pendingDriverAnnouncements.push(change);
    scheduleAnnouncement();
  }, [scheduleAnnouncement]);

  /**
   * Announce route update
   */
  const announceRouteUpdateChange = useCallback((change: RouteUpdateChange) => {
    stateRef.current.pendingRouteAnnouncements.push(change);
    scheduleAnnouncement();
  }, [scheduleAnnouncement]);

  /**
   * Get announcement history
   */
  const getAnnouncementHistory = useCallback((limit: number = 10) => {
    return stateRef.current.announcementHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  /**
   * Clear announcement history
   */
  const clearAnnouncementHistory = useCallback(() => {
    stateRef.current.announcementHistory = [];
  }, []);

  return {
    announceJobStatusChange,
    announceDriverStatusChange,
    announceRouteUpdateChange,
    getAnnouncementHistory,
    clearAnnouncementHistory,
    config: mergedConfig,
  };
}

/**
 * Helper functions
 */

function getJobAnnouncementPriority(change: JobStatusChange): 'polite' | 'assertive' {
  if (change.priority === 'urgent' || change.newStatus === 'cancelled') {
    return 'assertive';
  }
  return 'polite';
}

function getDriverAnnouncementPriority(change: DriverStatusChange): 'polite' | 'assertive' {
  if (change.newStatus === 'offline' || change.newStatus === 'emergency') {
    return 'assertive';
  }
  return 'polite';
}

function getRouteAnnouncementPriority(change: RouteUpdateChange): 'polite' | 'assertive' {
  if (change.updateType === 'delay' || change.updateType === 'traffic') {
    return 'assertive';
  }
  return 'polite';
}

function getJobAnnouncementType(change: JobStatusChange): string {
  if (change.newStatus === 'assigned') return 'assignment';
  if (change.newStatus === 'completed') return 'completion';
  if (change.newStatus === 'cancelled') return 'cancellation';
  return 'status';
}

function getDriverAnnouncementType(change: DriverStatusChange): string {
  if (change.newStatus === 'busy' && change.currentJob) return 'assignment';
  if (change.newStatus === 'available') return 'availability';
  return 'status';
}

function isSignificantJobStatusChange(previous: string, current: string): boolean {
  const significantTransitions = [
    ['pending', 'assigned'],
    ['assigned', 'in_progress'],
    ['in_progress', 'completed'],
    ['assigned', 'cancelled'],
    ['in_progress', 'cancelled'],
  ];

  return significantTransitions.some(
    ([from, to]) => previous === from && current === to
  );
}

function isSignificantDriverStatusChange(previous: string, current: string): boolean {
  const significantTransitions = [
    ['available', 'busy'],
    ['busy', 'available'],
    ['available', 'offline'],
    ['busy', 'offline'],
    ['offline', 'available'],
  ];

  return significantTransitions.some(
    ([from, to]) => previous === from && current === to
  );
}

function createJobStatusMessage(change: JobStatusChange): string {
  const baseMessage = `Job ${change.jobId} status changed from ${change.previousStatus} to ${change.newStatus}`;
  
  if (change.driverName) {
    return `${baseMessage} for driver ${change.driverName}`;
  }
  
  return baseMessage;
}

function createDriverStatusMessage(change: DriverStatusChange): string {
  let message = `Driver ${change.driverName} status changed from ${change.previousStatus} to ${change.newStatus}`;
  
  if (change.location) {
    message += ` at ${change.location}`;
  }
  
  return message;
}

function createRouteUpdateMessage(change: RouteUpdateChange): string {
  let message = `Route update: ${change.updateType}`;
  
  if (change.driverName) {
    message = `Route update for ${change.driverName}: ${change.updateType}`;
  }
  
  if (change.details.delay) {
    message += ` - ${change.details.delay} delay`;
  }
  
  if (change.details.eta) {
    message += ` - new ETA: ${change.details.eta}`;
  }
  
  return message;
}