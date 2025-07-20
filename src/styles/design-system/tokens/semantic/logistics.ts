/**
 * Logistics-specific semantic tokens
 * These tokens provide meaning and context for logistics operations
 * Built on top of core brand primitives
 */

import { brandColors } from '../core/brand';

// Driver status semantic tokens
export const driverStatus = {
  available: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    border: brandColors.success[200],
    pulse: `${brandColors.success[500]}33`, // 20% opacity
    icon: brandColors.success[600],
    text: brandColors.success[700],
  },
  
  busy: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    border: brandColors.warning[200],
    pulse: `${brandColors.warning[500]}33`,
    icon: brandColors.warning[600],
    text: brandColors.warning[700],
  },
  
  offline: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    border: brandColors.error[200],
    pulse: `${brandColors.error[500]}33`,
    icon: brandColors.error[600],
    text: brandColors.error[700],
  },
  
  break: {
    color: brandColors.info[500],
    background: brandColors.info[50],
    border: brandColors.info[200],
    pulse: `${brandColors.info[500]}33`,
    icon: brandColors.info[600],
    text: brandColors.info[700],
  },
  
  enRoute: {
    color: brandColors.primary[600],
    background: brandColors.primary[50],
    border: brandColors.primary[200],
    pulse: `${brandColors.primary[600]}33`,
    icon: brandColors.primary[700],
    text: brandColors.primary[800],
  },
} as const;

// Job status semantic tokens
export const jobStatus = {
  pending: {
    color: brandColors.neutral[500],
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    icon: brandColors.neutral[600],
    text: brandColors.neutral[700],
    badge: 'bg-gray-100 text-gray-700',
  },
  
  assigned: {
    color: brandColors.info[500],
    background: brandColors.info[50],
    border: brandColors.info[200],
    icon: brandColors.info[600],
    text: brandColors.info[700],
    badge: 'bg-blue-100 text-blue-700',
  },
  
  inProgress: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    border: brandColors.warning[200],
    icon: brandColors.warning[600],
    text: brandColors.warning[700],
    badge: 'bg-amber-100 text-amber-700',
  },
  
  completed: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    border: brandColors.success[200],
    icon: brandColors.success[600],
    text: brandColors.success[700],
    badge: 'bg-green-100 text-green-700',
  },
  
  failed: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    border: brandColors.error[200],
    icon: brandColors.error[600],
    text: brandColors.error[700],
    badge: 'bg-red-100 text-red-700',
  },
  
  cancelled: {
    color: brandColors.neutral[400],
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    icon: brandColors.neutral[500],
    text: brandColors.neutral[600],
    badge: 'bg-gray-100 text-gray-600',
  },
} as const;

// Priority level semantic tokens
export const priorityLevels = {
  critical: {
    color: brandColors.error[600],
    background: brandColors.error[50],
    border: brandColors.error[300],
    icon: brandColors.error[700],
    text: brandColors.error[800],
    badge: 'bg-red-100 text-red-800 border-red-200',
    indicator: brandColors.error[500],
  },
  
  high: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    border: brandColors.error[200],
    icon: brandColors.error[600],
    text: brandColors.error[700],
    badge: 'bg-red-50 text-red-700 border-red-200',
    indicator: brandColors.error[400],
  },
  
  medium: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    border: brandColors.warning[200],
    icon: brandColors.warning[600],
    text: brandColors.warning[700],
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    indicator: brandColors.warning[400],
  },
  
  low: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    border: brandColors.success[200],
    icon: brandColors.success[600],
    text: brandColors.success[700],
    badge: 'bg-green-50 text-green-700 border-green-200',
    indicator: brandColors.success[400],
  },
  
  none: {
    color: brandColors.neutral[400],
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    icon: brandColors.neutral[500],
    text: brandColors.neutral[600],
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    indicator: brandColors.neutral[300],
  },
} as const;

// Vehicle type semantic tokens
export const vehicleTypes = {
  truck: {
    color: brandColors.primary[600],
    background: brandColors.primary[50],
    border: brandColors.primary[200],
    icon: brandColors.primary[700],
    text: brandColors.primary[800],
    capacity: 'high',
  },
  
  van: {
    color: brandColors.info[600],
    background: brandColors.info[50],
    border: brandColors.info[200],
    icon: brandColors.info[700],
    text: brandColors.info[800],
    capacity: 'medium',
  },
  
  car: {
    color: brandColors.secondary[600],
    background: brandColors.secondary[50],
    border: brandColors.secondary[200],
    icon: brandColors.secondary[700],
    text: brandColors.secondary[800],
    capacity: 'low',
  },
  
  motorcycle: {
    color: brandColors.warning[600],
    background: brandColors.warning[50],
    border: brandColors.warning[200],
    icon: brandColors.warning[700],
    text: brandColors.warning[800],
    capacity: 'minimal',
  },
  
  bicycle: {
    color: brandColors.success[600],
    background: brandColors.success[50],
    border: brandColors.success[200],
    icon: brandColors.success[700],
    text: brandColors.success[800],
    capacity: 'minimal',
  },
} as const;

// Map overlay semantic tokens
export const mapOverlays = {
  // Geofence zones
  deliveryZone: {
    stroke: brandColors.success[500],
    fill: `${brandColors.success[500]}1A`, // 10% opacity
    strokeWidth: '2px',
    strokeDashArray: 'none',
  },
  
  restrictedZone: {
    stroke: brandColors.error[500],
    fill: `${brandColors.error[500]}1A`,
    strokeWidth: '2px',
    strokeDashArray: '5,5',
  },
  
  warehouseZone: {
    stroke: brandColors.primary[600],
    fill: `${brandColors.primary[600]}1A`,
    strokeWidth: '2px',
    strokeDashArray: 'none',
  },
  
  customerZone: {
    stroke: brandColors.secondary[500],
    fill: `${brandColors.secondary[500]}1A`,
    strokeWidth: '2px',
    strokeDashArray: 'none',
  },
  
  // Route visualizations
  routePlanned: {
    stroke: brandColors.primary[500],
    strokeWidth: '3px',
    strokeDashArray: 'none',
    opacity: '0.8',
  },
  
  routeActive: {
    stroke: brandColors.success[500],
    strokeWidth: '4px',
    strokeDashArray: 'none',
    opacity: '1',
  },
  
  routeOptimal: {
    stroke: brandColors.info[500],
    strokeWidth: '3px',
    strokeDashArray: '10,5',
    opacity: '0.7',
  },
  
  // Traffic conditions
  trafficLow: {
    color: brandColors.success[500],
    opacity: '0.6',
  },
  
  trafficModerate: {
    color: brandColors.warning[500],
    opacity: '0.7',
  },
  
  trafficHeavy: {
    color: brandColors.error[500],
    opacity: '0.8',
  },
  
  trafficSevere: {
    color: brandColors.error[700],
    opacity: '0.9',
  },
} as const;

// Subscription status semantic tokens
export const subscriptionStatus = {
  active: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    border: brandColors.success[200],
    dot: brandColors.success[500],
    text: brandColors.success[700],
    badge: 'bg-green-100 text-green-800',
  },
  
  trial: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    border: brandColors.warning[200],
    dot: brandColors.warning[500],
    text: brandColors.warning[700],
    badge: 'bg-amber-100 text-amber-800',
  },
  
  pastDue: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    border: brandColors.error[200],
    dot: brandColors.error[500],
    text: brandColors.error[700],
    badge: 'bg-red-100 text-red-800',
    pulse: true,
  },
  
  cancelled: {
    color: brandColors.neutral[500],
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    dot: brandColors.neutral[500],
    text: brandColors.neutral[700],
    badge: 'bg-gray-100 text-gray-800',
  },
  
  suspended: {
    color: brandColors.neutral[400],
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    dot: brandColors.neutral[400],
    text: brandColors.neutral[600],
    badge: 'bg-gray-100 text-gray-600',
  },
} as const;

// Performance indicators
export const performanceIndicators = {
  excellent: {
    color: brandColors.success[600],
    background: brandColors.success[50],
    text: brandColors.success[800],
    range: [95, 100],
  },
  
  good: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    text: brandColors.success[700],
    range: [85, 94],
  },
  
  average: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    text: brandColors.warning[700],
    range: [70, 84],
  },
  
  poor: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    text: brandColors.error[700],
    range: [50, 69],
  },
  
  critical: {
    color: brandColors.error[600],
    background: brandColors.error[50],
    text: brandColors.error[800],
    range: [0, 49],
  },
} as const;

// Connection status semantic tokens
export const connectionStatus = {
  connected: {
    color: brandColors.success[500],
    background: brandColors.success[50],
    dot: brandColors.success[500],
    text: brandColors.success[700],
    pulse: true,
  },
  
  connecting: {
    color: brandColors.warning[500],
    background: brandColors.warning[50],
    dot: brandColors.warning[500],
    text: brandColors.warning[700],
    pulse: true,
  },
  
  disconnected: {
    color: brandColors.error[500],
    background: brandColors.error[50],
    dot: brandColors.error[500],
    text: brandColors.error[700],
    pulse: false,
  },
  
  reconnecting: {
    color: brandColors.info[500],
    background: brandColors.info[50],
    dot: brandColors.info[500],
    text: brandColors.info[700],
    pulse: true,
  },
} as const;