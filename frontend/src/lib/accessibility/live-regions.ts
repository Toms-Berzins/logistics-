/**
 * Live regions manager for real-time announcements
 * Optimized for logistics status updates and job changes
 */

import { ACCESSIBILITY_CONFIG } from './index';

interface LiveRegionMessage {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
  category: 'status' | 'job' | 'driver' | 'route' | 'system' | 'error';
  processed: boolean;
}

interface LiveRegionState {
  regions: Map<string, HTMLElement>;
  messageQueue: LiveRegionMessage[];
  isProcessing: boolean;
  lastAnnouncement: number;
  throttleTimers: Map<string, number>;
  messageHistory: LiveRegionMessage[];
}

const liveRegionState: LiveRegionState = {
  regions: new Map(),
  messageQueue: [],
  isProcessing: false,
  lastAnnouncement: 0,
  throttleTimers: new Map(),
  messageHistory: [],
};

/**
 * Initialize live regions for the logistics platform
 */
export function initializeLiveRegions(): void {
  if (typeof window === 'undefined') return;
  
  // Create dedicated live regions for different types of content
  createLiveRegion('polite', 'General announcements and status updates');
  createLiveRegion('assertive', 'Urgent alerts and critical updates');
  createLiveRegion('status', 'Job and driver status changes', 'polite');
  createLiveRegion('navigation', 'Navigation and context changes', 'polite');
  
  // Start processing message queue
  startMessageProcessor();
  
  // Set up cleanup
  setupCleanup();
}

/**
 * Create a live region element
 */
function createLiveRegion(
  name: string, 
  description: string, 
  politeness: 'polite' | 'assertive' = 'polite'
): HTMLElement {
  const region = document.createElement('div');
  region.id = `live-region-${name}`;
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('aria-label', description);
  region.className = 'sr-only';
  
  // Add to DOM
  document.body.appendChild(region);
  
  // Store reference
  liveRegionState.regions.set(name, region);
  
  return region;
}

/**
 * Announce a message to screen readers
 */
export function announceToLiveRegion(
  message: string,
  options: {
    priority?: 'polite' | 'assertive';
    category?: 'status' | 'job' | 'driver' | 'route' | 'system' | 'error';
    throttle?: boolean;
    immediate?: boolean;
  } = {}
): void {
  const {
    priority = 'polite',
    category = 'system',
    throttle = true,
    immediate = false,
  } = options;
  
  // Generate unique message ID
  const messageId = generateMessageId(message, category);
  
  // Check for throttling
  if (throttle && isThrottled(messageId, category)) {
    return;
  }
  
  // Create message object
  const liveMessage: LiveRegionMessage = {
    id: messageId,
    message: sanitizeMessage(message),
    priority,
    timestamp: Date.now(),
    category,
    processed: false,
  };
  
  // Add to queue or process immediately
  if (immediate || priority === 'assertive') {
    processMessage(liveMessage);
  } else {
    liveRegionState.messageQueue.push(liveMessage);
  }
  
  // Update throttle tracking
  if (throttle) {
    updateThrottleTracking(messageId, category);
  }
}

/**
 * Announce job status changes
 */
export function announceJobStatus(
  jobId: string,
  status: string,
  driverName?: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  let message = `Job ${jobId} status updated to ${status}`;
  
  if (driverName) {
    message += ` for driver ${driverName}`;
  }
  
  announceToLiveRegion(message, {
    priority,
    category: 'job',
    throttle: true,
  });
}

/**
 * Announce driver status changes
 */
export function announceDriverStatus(
  driverName: string,
  status: string,
  location?: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  let message = `Driver ${driverName} is now ${status}`;
  
  if (location) {
    message += ` at ${location}`;
  }
  
  announceToLiveRegion(message, {
    priority,
    category: 'driver',
    throttle: true,
  });
}

/**
 * Announce route updates
 */
export function announceRouteUpdate(
  routeInfo: {
    driver?: string;
    origin?: string;
    destination?: string;
    eta?: string;
    delay?: string;
  },
  priority: 'polite' | 'assertive' = 'polite'
): void {
  let message = 'Route updated';
  
  if (routeInfo.driver) {
    message = `Route for ${routeInfo.driver} updated`;
  }
  
  if (routeInfo.delay) {
    message += `. Delay of ${routeInfo.delay}`;
    priority = 'assertive';
  } else if (routeInfo.eta) {
    message += `. New ETA: ${routeInfo.eta}`;
  }
  
  announceToLiveRegion(message, {
    priority,
    category: 'route',
    throttle: true,
  });
}

/**
 * Announce navigation changes
 */
export function announceNavigation(
  pageName: string,
  context?: string
): void {
  let message = `Navigated to ${pageName}`;
  
  if (context) {
    message += ` in ${context}`;
  }
  
  announceToLiveRegion(message, {
    priority: 'polite',
    category: 'system',
    throttle: false,
  });
}

/**
 * Announce errors
 */
export function announceError(
  errorMessage: string,
  context?: string
): void {
  let message = `Error: ${errorMessage}`;
  
  if (context) {
    message = `Error in ${context}: ${errorMessage}`;
  }
  
  announceToLiveRegion(message, {
    priority: 'assertive',
    category: 'error',
    throttle: false,
    immediate: true,
  });
}

/**
 * Process a single message
 */
function processMessage(message: LiveRegionMessage): void {
  const regionName = getRegionForMessage(message);
  const region = liveRegionState.regions.get(regionName);
  
  if (!region) {
    console.warn(`Live region not found: ${regionName}`);
    return;
  }
  
  // Clear previous content
  region.textContent = '';
  
  // Add new message after delay to ensure it's announced
  setTimeout(() => {
    region.textContent = message.message;
    
    // Track announcement
    liveRegionState.lastAnnouncement = Date.now();
    message.processed = true;
    
    // Add to history
    liveRegionState.messageHistory.push(message);
    
    // Limit history size
    if (liveRegionState.messageHistory.length > 50) {
      liveRegionState.messageHistory.shift();
    }
    
    // Clear message after announcement to avoid repetition
    setTimeout(() => {
      if (region.textContent === message.message) {
        region.textContent = '';
      }
    }, 1000);
    
  }, ACCESSIBILITY_CONFIG.LIVE_REGION_DELAY);
}

/**
 * Start the message processing queue
 */
function startMessageProcessor(): void {
  const processQueue = () => {
    if (liveRegionState.isProcessing || liveRegionState.messageQueue.length === 0) {
      return;
    }
    
    liveRegionState.isProcessing = true;
    
    // Process messages in order, respecting timing constraints
    const message = liveRegionState.messageQueue.shift();
    if (message) {
      const timeSinceLastAnnouncement = Date.now() - liveRegionState.lastAnnouncement;
      const minDelay = message.priority === 'assertive' ? 100 : 500;
      
      if (timeSinceLastAnnouncement < minDelay) {
        // Wait before processing
        setTimeout(() => {
          processMessage(message);
          liveRegionState.isProcessing = false;
        }, minDelay - timeSinceLastAnnouncement);
      } else {
        // Process immediately
        processMessage(message);
        liveRegionState.isProcessing = false;
      }
    } else {
      liveRegionState.isProcessing = false;
    }
  };
  
  // Process queue periodically
  setInterval(processQueue, 100);
}

/**
 * Get appropriate region for message
 */
function getRegionForMessage(message: LiveRegionMessage): string {
  switch (message.category) {
    case 'status':
    case 'job':
    case 'driver':
    case 'route':
      return 'status';
    
    case 'error':
      return 'assertive';
    
    case 'system':
    default:
      return message.priority;
  }
}

/**
 * Generate unique message ID
 */
function generateMessageId(message: string, category: string): string {
  const hash = message.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `${category}-${Math.abs(hash)}`;
}

/**
 * Check if message should be throttled
 */
function isThrottled(messageId: string, category: string): boolean {
  const now = Date.now();
  const lastTime = liveRegionState.throttleTimers.get(messageId);
  
  if (!lastTime) return false;
  
  const throttleTime = getThrottleTime(category);
  return (now - lastTime) < throttleTime;
}

/**
 * Update throttle tracking
 */
function updateThrottleTracking(messageId: string, category: string): void {
  liveRegionState.throttleTimers.set(messageId, Date.now());
}

/**
 * Get throttle time for category
 */
function getThrottleTime(category: string): number {
  switch (category) {
    case 'job':
    case 'driver':
      return ACCESSIBILITY_CONFIG.JOB_STATUS_ANNOUNCEMENT_DELAY;
    
    case 'route':
      return 1000;
    
    case 'status':
      return 2000;
    
    case 'system':
      return 3000;
    
    case 'error':
      return 0; // Don't throttle errors
    
    default:
      return ACCESSIBILITY_CONFIG.NOTIFICATION_THROTTLE;
  }
}

/**
 * Sanitize message for screen readers
 */
function sanitizeMessage(message: string): string {
  // Limit message length
  if (message.length > ACCESSIBILITY_CONFIG.STATUS_MESSAGE_MAX_LENGTH) {
    message = message.substring(0, ACCESSIBILITY_CONFIG.STATUS_MESSAGE_MAX_LENGTH - 3) + '...';
  }
  
  // Remove excessive punctuation
  message = message.replace(/[.!?]{2,}/g, '.');
  
  // Normalize whitespace
  message = message.replace(/\s+/g, ' ').trim();
  
  return message;
}

/**
 * Set up cleanup for live regions
 */
function setupCleanup(): void {
  // Clean up old messages periodically
  setInterval(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    // Clean history
    liveRegionState.messageHistory = liveRegionState.messageHistory.filter(
      message => (now - message.timestamp) < maxAge
    );
    
    // Clean throttle timers
    liveRegionState.throttleTimers.forEach((timestamp, messageId) => {
      if ((now - timestamp) > maxAge) {
        liveRegionState.throttleTimers.delete(messageId);
      }
    });
  }, 60000); // Run every minute
}

/**
 * Get recent message history
 */
export function getMessageHistory(category?: string, limit: number = 10): LiveRegionMessage[] {
  let messages = liveRegionState.messageHistory;
  
  if (category) {
    messages = messages.filter(msg => msg.category === category);
  }
  
  return messages
    .slice(-limit)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Clear all live regions
 */
export function clearLiveRegions(): void {
  liveRegionState.regions.forEach(region => {
    region.textContent = '';
  });
  liveRegionState.messageQueue = [];
}

/**
 * Pause live region announcements
 */
export function pauseAnnouncements(): void {
  liveRegionState.isProcessing = true;
}

/**
 * Resume live region announcements
 */
export function resumeAnnouncements(): void {
  liveRegionState.isProcessing = false;
}

/**
 * Check if announcements are currently paused
 */
export function areAnnouncementsPaused(): boolean {
  return liveRegionState.isProcessing;
}