/**
 * Screen reader optimization utilities for logistics platform
 * Provides optimized content formatting and navigation patterns
 */

import { ACCESSIBILITY_CONFIG, LOGISTICS_ARIA_LABELS } from './index';

/**
 * Format job data for screen readers
 */
export function formatJobForScreenReader(job: {
  id: string;
  title?: string;
  status: string;
  priority?: string;
  assignedDriver?: string;
  pickup?: string;
  delivery?: string;
  eta?: string;
  progress?: number;
}): string {
  const parts: string[] = [];
  
  // Job identifier
  parts.push(`Job ${job.id}`);
  
  // Title if available
  if (job.title) {
    parts.push(`titled ${job.title}`);
  }
  
  // Status
  parts.push(`status ${job.status}`);
  
  // Priority
  if (job.priority && job.priority !== 'normal') {
    parts.push(`${job.priority} priority`);
  }
  
  // Driver assignment
  if (job.assignedDriver) {
    parts.push(`assigned to ${job.assignedDriver}`);
  } else {
    parts.push('unassigned');
  }
  
  // Location info
  if (job.pickup && job.delivery) {
    parts.push(`from ${job.pickup} to ${job.delivery}`);
  }
  
  // ETA
  if (job.eta) {
    parts.push(`estimated arrival ${job.eta}`);
  }
  
  // Progress
  if (job.progress !== undefined) {
    parts.push(`${job.progress}% complete`);
  }
  
  return parts.join(', ');
}

/**
 * Format driver data for screen readers
 */
export function formatDriverForScreenReader(driver: {
  id: string;
  name: string;
  status: string;
  location?: string;
  currentJob?: string;
  vehicleType?: string;
  rating?: number;
}): string {
  const parts: string[] = [];
  
  // Driver name
  parts.push(`Driver ${driver.name}`);
  
  // Status
  parts.push(`currently ${driver.status}`);
  
  // Current assignment
  if (driver.currentJob) {
    parts.push(`on job ${driver.currentJob}`);
  }
  
  // Location
  if (driver.location) {
    parts.push(`at ${driver.location}`);
  }
  
  // Vehicle info
  if (driver.vehicleType) {
    parts.push(`driving ${driver.vehicleType}`);
  }
  
  // Rating
  if (driver.rating) {
    parts.push(`rated ${driver.rating} out of 5 stars`);
  }
  
  return parts.join(', ');
}

/**
 * Format route data for screen readers
 */
export function formatRouteForScreenReader(route: {
  id: string;
  origin: string;
  destination: string;
  distance?: string;
  duration?: string;
  traffic?: string;
  stops?: number;
}): string {
  const parts: string[] = [];
  
  // Route identifier
  parts.push(`Route ${route.id}`);
  
  // Origin and destination
  parts.push(`from ${route.origin} to ${route.destination}`);
  
  // Distance and duration
  if (route.distance && route.duration) {
    parts.push(`${route.distance}, ${route.duration} travel time`);
  }
  
  // Traffic conditions
  if (route.traffic) {
    parts.push(`${route.traffic} traffic`);
  }
  
  // Stops
  if (route.stops && route.stops > 0) {
    parts.push(`${route.stops} ${route.stops === 1 ? 'stop' : 'stops'}`);
  }
  
  return parts.join(', ');
}

/**
 * Create accessible table description
 */
export function createTableDescription(
  tableType: 'jobs' | 'drivers' | 'routes',
  totalItems: number,
  visibleItems: number,
  sortColumn?: string,
  sortDirection?: 'asc' | 'desc',
  filters?: string[]
): string {
  const parts: string[] = [];
  
  // Table type and counts
  parts.push(`${tableType} table`);
  
  if (visibleItems !== totalItems) {
    parts.push(`showing ${visibleItems} of ${totalItems} ${tableType}`);
  } else {
    parts.push(`${totalItems} ${tableType}`);
  }
  
  // Sorting info
  if (sortColumn && sortDirection) {
    const direction = sortDirection === 'asc' ? 'ascending' : 'descending';
    parts.push(`sorted by ${sortColumn} in ${direction} order`);
  }
  
  // Filter info
  if (filters && filters.length > 0) {
    parts.push(`filtered by ${filters.join(', ')}`);
  }
  
  return parts.join(', ');
}

/**
 * Create accessible form field description
 */
export function createFieldDescription(field: {
  label: string;
  type: string;
  required?: boolean;
  error?: string;
  hint?: string;
  value?: string;
}): {
  description: string;
  ariaDescribedBy: string[];
} {
  const parts: string[] = [];
  const describedBy: string[] = [];
  
  // Field type and requirement
  if (field.required) {
    parts.push(`Required ${field.type} field`);
  } else {
    parts.push(`Optional ${field.type} field`);
  }
  
  // Current value for some field types
  if (field.value && ['select', 'radio', 'checkbox'].includes(field.type)) {
    parts.push(`currently ${field.value}`);
  }
  
  // Hint
  if (field.hint) {
    parts.push(field.hint);
    describedBy.push('hint');
  }
  
  // Error
  if (field.error) {
    parts.push(`Error: ${field.error}`);
    describedBy.push('error');
  }
  
  return {
    description: parts.join(', '),
    ariaDescribedBy: describedBy,
  };
}

/**
 * Create accessible status message
 */
export function createStatusMessage(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  context?: string
): string {
  const typeLabels = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  };
  
  let fullMessage = `${typeLabels[type]}: ${message}`;
  
  if (context) {
    fullMessage = `${typeLabels[type]} in ${context}: ${message}`;
  }
  
  return fullMessage;
}

/**
 * Create accessible navigation announcement
 */
export function createNavigationAnnouncement(
  currentPage: string,
  totalPages?: number,
  currentItem?: number,
  totalItems?: number
): string {
  const parts: string[] = [`On ${currentPage}`];
  
  if (totalPages && totalPages > 1) {
    parts.push(`page ${currentPage} of ${totalPages}`);
  }
  
  if (currentItem && totalItems) {
    parts.push(`item ${currentItem} of ${totalItems}`);
  }
  
  return parts.join(', ');
}

/**
 * Create accessible progress announcement
 */
export function createProgressAnnouncement(
  current: number,
  total: number,
  label?: string
): string {
  const percentage = Math.round((current / total) * 100);
  const parts: string[] = [];
  
  if (label) {
    parts.push(label);
  }
  
  parts.push(`${percentage}% complete`);
  parts.push(`${current} of ${total}`);
  
  return parts.join(', ');
}

/**
 * Optimize text for screen readers
 */
export function optimizeForScreenReader(text: string): string {
  let optimized = text;
  
  // Expand common abbreviations
  const abbreviations: Record<string, string> = {
    'ETA': 'estimated time of arrival',
    'GPS': 'global positioning system',
    'ID': 'identifier',
    'OK': 'okay',
    'PM': 'post meridiem',
    'AM': 'ante meridiem',
    'St.': 'Street',
    'Ave.': 'Avenue',
    'Blvd.': 'Boulevard',
    'Dr.': 'Drive',
    'Rd.': 'Road',
  };
  
  Object.entries(abbreviations).forEach(([abbr, expansion]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    optimized = optimized.replace(regex, expansion);
  });
  
  // Handle numbers and units
  optimized = optimized.replace(/(\d+)\s*(mph|kmh|km|mi|ft|m)\b/gi, '$1 $2');
  optimized = optimized.replace(/(\d+)\s*%/g, '$1 percent');
  
  // Improve pronunciation of times
  optimized = optimized.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, '$1 $2 $3');
  
  // Handle coordinates differently
  optimized = optimized.replace(/(\d+\.\d+),\s*(\d+\.\d+)/, 'coordinates $1, $2');
  
  // Limit length if too long
  if (optimized.length > ACCESSIBILITY_CONFIG.DESCRIPTION_MAX_LENGTH) {
    optimized = optimized.substring(0, ACCESSIBILITY_CONFIG.DESCRIPTION_MAX_LENGTH - 3) + '...';
  }
  
  return optimized;
}

/**
 * Create accessible keyboard instruction
 */
export function createKeyboardInstruction(
  action: string,
  keys: string[],
  context?: string
): string {
  const keyText = keys.join(' + ');
  let instruction = `Press ${keyText} to ${action}`;
  
  if (context) {
    instruction += ` in ${context}`;
  }
  
  // Limit length
  if (instruction.length > ACCESSIBILITY_CONFIG.INSTRUCTION_MAX_LENGTH) {
    instruction = instruction.substring(0, ACCESSIBILITY_CONFIG.INSTRUCTION_MAX_LENGTH - 3) + '...';
  }
  
  return instruction;
}

/**
 * Create accessible error message
 */
export function createAccessibleError(
  error: string,
  field?: string,
  suggestion?: string
): string {
  const parts: string[] = ['Error'];
  
  if (field) {
    parts.push(`in ${field}`);
  }
  
  parts.push(error);
  
  if (suggestion) {
    parts.push(`Suggestion: ${suggestion}`);
  }
  
  return parts.join(': ');
}

/**
 * Format time for screen readers
 */
export function formatTimeForScreenReader(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Recent times
  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  
  // Absolute times for older dates
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}