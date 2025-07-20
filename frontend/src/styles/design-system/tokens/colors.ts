/**
 * Color tokens for the logistics dispatch platform
 * Following atomic design token architecture with semantic meaning
 */

// Core brand colors
export const brandColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#1E40AF', // Primary blue - professional, trustworthy
    700: '#1d4ed8',
    800: '#1e3a8a',
    900: '#1e3a8a',
    950: '#172554',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

// Semantic state colors for logistics operations
export const semanticColors = {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Success green - jobs completed, drivers available
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Warning amber - attention needed
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Error red - urgent attention, offline drivers
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Info blue - system notifications
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
} as const;

// Neutral colors with WCAG AA compliance
export const neutralColors = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
} as const;

// Logistics-specific operational colors
export const logisticsColors = {
  // Driver status indicators
  driver: {
    available: '#22c55e', // Green 500 - ready for assignment
    busy: '#f59e0b', // Yellow 500 - on active job
    offline: '#6b7280', // Gray 400 - not available
    enRoute: '#3b82f6', // Blue 500 - traveling to pickup/delivery
    break: '#f97316', // Orange 500 - on scheduled break
    emergency: '#ef4444', // Red 500 - emergency status
  },
  
  // Job status progression
  job: {
    pending: '#6b7280', // Gray 500 - waiting for assignment
    assigned: '#3b82f6', // Blue 500 - assigned to driver
    inProgress: '#f59e0b', // Yellow 500 - being executed
    completed: '#22c55e', // Green 500 - successfully finished
    cancelled: '#ef4444', // Red 500 - cancelled
    delayed: '#f97316', // Orange 500 - behind schedule
  },
  
  // Route states and indicators
  route: {
    active: '#3b82f6', // Blue 600 - route in progress
    completed: '#22c55e', // Green 600 - route finished
    delayed: '#ef4444', // Red 500 - route experiencing delays
    optimized: '#8b5cf6', // Purple 500 - AI-optimized route
    traffic: '#f59e0b', // Yellow 500 - traffic-affected
  },
  
  // Priority levels
  priority: {
    low: '#22c55e', // Green 500 - standard priority
    normal: '#3b82f6', // Blue 500 - normal priority
    high: '#f59e0b', // Yellow 500 - elevated priority
    urgent: '#ef4444', // Red 500 - critical priority
    critical: '#7c2d12', // Red 800 - emergency priority
  },
  
  // Map visualization colors
  map: {
    // Marker types
    singleMarker: brandColors.primary[600],
    clusteredMarker: '#8b5cf6', // Purple 500
    selectedMarker: '#ef4444', // Red 500
    
    // Heat map gradients
    heatLow: '#22c55e', // Green 500
    heatModerate: '#f59e0b', // Yellow 500
    heatHigh: '#f97316', // Orange 500
    heatSevere: '#ef4444', // Red 500
    
    // Zone colors
    serviceZone: '#3b82f650', // Blue 500 with 50% opacity
    restrictedZone: '#ef444450', // Red 500 with 50% opacity
    depotZone: '#8b5cf650', // Purple 500 with 50% opacity
  },
  
  // Real-time indicators
  realtime: {
    // Connection status
    connected: '#22c55e', // Green 500
    connecting: '#f59e0b', // Yellow 500
    disconnected: '#ef4444', // Red 500
    
    // Activity indicators
    active: '#3b82f6', // Blue 500
    idle: '#6b7280', // Gray 500
    updating: '#8b5cf6', // Purple 500
    
    // Pulse animations
    pulseGreen: '#22c55e',
    pulseYellow: '#f59e0b',
    pulseRed: '#ef4444',
    pulseBlue: '#3b82f6',
  },
} as const;

// AI and predictive analytics colors
export const aiColors = {
  prediction: {
    high: '#059669', // Emerald 600 - high confidence predictions
    medium: '#ca8a04', // Yellow 600 - medium confidence
    low: '#dc2626', // Red 600 - low confidence
    processing: '#8b5cf6', // Purple 500 - AI processing
  },
  
  // Machine learning insights
  insight: {
    positive: '#22c55e', // Green 500 - beneficial insights
    neutral: '#6b7280', // Gray 500 - informational
    negative: '#ef4444', // Red 500 - concerning patterns
    trend: '#3b82f6', // Blue 500 - trend indicators
  },
  
  // Optimization states
  optimization: {
    optimal: '#22c55e', // Green 500 - best route/assignment
    suboptimal: '#f59e0b', // Yellow 500 - could be improved
    inefficient: '#ef4444', // Red 500 - needs optimization
    calculating: '#8b5cf6', // Purple 500 - optimization in progress
  },
} as const;

// Accessibility and interaction colors
export const accessibilityColors = {
  focus: {
    ring: brandColors.primary[500],
    ringOffset: '#ffffff',
    ringWidth: '2px',
    ringOffset: '2px',
  },
  
  // High contrast variants
  highContrast: {
    text: '#000000',
    background: '#ffffff',
    border: '#000000',
    link: '#0000ee',
    visited: '#551a8b',
  },
  
  // Touch targets and interactive states
  interactive: {
    hover: 'rgba(59, 130, 246, 0.1)', // Primary blue with 10% opacity
    active: 'rgba(59, 130, 246, 0.2)', // Primary blue with 20% opacity
    disabled: '#d1d5db', // Gray 300
    selected: 'rgba(59, 130, 246, 0.15)', // Primary blue with 15% opacity
  },
} as const;

// Color tokens for theming and CSS custom properties
export const colorTokens = {
  // CSS custom property mappings
  cssVars: {
    '--color-primary': brandColors.primary[600],
    '--color-primary-hover': brandColors.primary[700],
    '--color-primary-light': brandColors.primary[50],
    
    '--color-success': semanticColors.success[500],
    '--color-warning': semanticColors.warning[500],
    '--color-error': semanticColors.error[500],
    '--color-info': semanticColors.info[500],
    
    '--color-neutral-50': neutralColors[50],
    '--color-neutral-100': neutralColors[100],
    '--color-neutral-500': neutralColors[500],
    '--color-neutral-900': neutralColors[900],
    
    // Logistics-specific CSS variables
    '--color-driver-available': logisticsColors.driver.available,
    '--color-driver-busy': logisticsColors.driver.busy,
    '--color-driver-offline': logisticsColors.driver.offline,
    
    '--color-job-pending': logisticsColors.job.pending,
    '--color-job-assigned': logisticsColors.job.assigned,
    '--color-job-completed': logisticsColors.job.completed,
    
    '--color-route-active': logisticsColors.route.active,
    '--color-route-delayed': logisticsColors.route.delayed,
    
    '--color-focus-ring': accessibilityColors.focus.ring,
  },
} as const;

// Consolidated color export
export const colors = {
  brand: brandColors,
  semantic: semanticColors,
  neutral: neutralColors,
  logistics: logisticsColors,
  ai: aiColors,
  accessibility: accessibilityColors,
  tokens: colorTokens,
} as const;

// Type definitions for TypeScript support
export type BrandColor = keyof typeof brandColors;
export type SemanticColor = keyof typeof semanticColors;
export type NeutralColor = keyof typeof neutralColors;
export type LogisticsColor = keyof typeof logisticsColors;
export type AiColor = keyof typeof aiColors;
export type AccessibilityColor = keyof typeof accessibilityColors;

export type ColorScale = keyof typeof brandColors.primary;
export type DriverStatus = keyof typeof logisticsColors.driver;
export type JobStatus = keyof typeof logisticsColors.job;
export type RouteStatus = keyof typeof logisticsColors.route;
export type Priority = keyof typeof logisticsColors.priority;