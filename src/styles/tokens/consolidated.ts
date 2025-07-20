/**
 * Consolidated Design Tokens - Migration Bridge
 * This file serves as a bridge between old fragmented tokens and the new unified system
 * 
 * @deprecated Use the new design system from '../design-system' instead
 * This file exists for backward compatibility during migration
 */

import { designSystem, tokenHelpers } from '../design-system';

// Re-export design system as consolidated tokens for backward compatibility
export const tokens = designSystem;

// Legacy token aliases for existing components
export const colors = designSystem.brand.colors;
export const spacing = designSystem.brand.spacing;
export const typography = designSystem.brand.typography;
export const borderRadius = designSystem.brand.radius;
export const shadows = designSystem.brand.shadows;
export const animations = designSystem.brand.motion;
export const breakpoints = designSystem.brand.breakpoints;
export const zIndex = designSystem.brand.zIndex;

// Legacy semantic colors for existing usage
export const semanticColors = {
  driver: designSystem.logistics.driverStatus,
  status: {
    success: designSystem.logistics.driverStatus.available.color,
    warning: designSystem.logistics.driverStatus.busy.color,
    error: designSystem.logistics.driverStatus.offline.color,
    info: designSystem.logistics.driverStatus.break.color,
  },
  priority: designSystem.logistics.priorityLevels,
  
  // AI prediction colors for route overlays (maintained for compatibility)
  prediction: {
    high: designSystem.brand.colors.success[400],
    medium: designSystem.brand.colors.warning[300],
    low: designSystem.brand.colors.error[200],
    predictiveBlue: designSystem.brand.colors.primary[500],
  },
  
  // Traffic heat map gradient (maintained for compatibility)
  trafficHeat: {
    low: designSystem.brand.colors.success[500],
    moderate: designSystem.brand.colors.warning[500],
    heavy: designSystem.brand.colors.secondary[500],
    severe: designSystem.brand.colors.error[500],
  },
  
  // Driver state indicators (maintained for compatibility)
  driverStates: {
    availablePulse: designSystem.logistics.driverStatus.available.pulse,
    busySolid: designSystem.logistics.driverStatus.busy.color,
    enRoutePurple: designSystem.logistics.driverStatus.enRoute.color,
    returningBlue: designSystem.brand.colors.primary[500],
    offlineRed: designSystem.logistics.driverStatus.offline.color,
  },
};

// Legacy accessibility tokens
export const accessibility = {
  focusRing: {
    width: '2px',
    color: designSystem.brand.colors.primary[500],
    offset: '2px',
  },
  touchTarget: {
    minSize: '44px',
  },
  contrast: {
    normal: '4.5:1',
    large: '3:1',
  },
};

// Legacy dashboard tokens (maintained for compatibility)
export const dashboardTokens = {
  layout: {
    grid: 'grid gap-6',
    gridCols: {
      mobile: 'grid-cols-1',
      tablet: 'md:grid-cols-2',
      desktop: 'lg:grid-cols-3',
    },
    container: 'mx-auto px-4 py-6 max-w-7xl',
    section: 'space-y-6',
  },
  
  cards: {
    base: 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
    padding: 'p-6',
    spacing: 'space-y-4',
    hover: 'hover:shadow-md transition-shadow duration-200',
    focus: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
    planOverview: 'w-full max-w-md',
    usageMetrics: 'w-full',
    billingSummary: 'w-full max-w-lg',
  },
  
  typography: {
    cardTitle: 'text-lg font-semibold text-gray-900',
    cardSubtitle: 'text-sm text-gray-600',
    metricValue: 'text-2xl font-bold text-gray-900',
    metricLabel: 'text-sm font-medium text-gray-700',
    planName: 'text-xl font-semibold text-gray-900',
    billingAmount: 'text-3xl font-black text-gray-900',
    billingCycle: 'text-sm text-gray-600',
    statusText: 'text-sm font-medium',
  },
  
  colors: {
    usage: {
      low: {
        bg: 'bg-green-100',
        bar: 'bg-green-500',
        text: 'text-green-700',
        ring: 'stroke-green-500',
      },
      medium: {
        bg: 'bg-yellow-100',
        bar: 'bg-yellow-500',
        text: 'text-yellow-700',
        ring: 'stroke-yellow-500',
      },
      high: {
        bg: 'bg-red-100',
        bar: 'bg-red-500',
        text: 'text-red-700',
        ring: 'stroke-red-500',
      },
    },
    status: {
      active: {
        dot: 'bg-green-500',
        text: 'text-green-700',
        bg: 'bg-green-50',
      },
      trial: {
        dot: 'bg-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50',
      },
      pastDue: {
        dot: 'bg-red-500 animate-pulse',
        text: 'text-red-700',
        bg: 'bg-red-50',
      },
      canceled: {
        dot: 'bg-gray-500',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
      },
    },
  },
  
  buttons: {
    primary: `inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`,
    secondary: `inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`,
    destructive: `inline-flex items-center px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2`,
    tertiary: `inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`,
  },
  
  progress: {
    container: 'relative w-full',
    track: 'w-full bg-gray-200 rounded-full overflow-hidden',
    bar: 'h-full rounded-full transition-all duration-300 ease-out',
    label: 'flex justify-between items-center text-sm',
    percentage: 'font-medium',
    circle: {
      size: 'w-16 h-16',
      svg: 'transform -rotate-90',
      track: 'stroke-gray-200 stroke-2 fill-none',
      progress: 'stroke-2 fill-none transition-all duration-300 ease-out',
    },
  },
  
  animations: {
    stagger: {
      delay100: 'animate-in slide-in-from-bottom-4 duration-300 delay-100',
      delay200: 'animate-in slide-in-from-bottom-4 duration-300 delay-200',
      delay300: 'animate-in slide-in-from-bottom-4 duration-300 delay-300',
    },
    fadeIn: 'animate-in fade-in duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  },
  
  icons: {
    size: 'w-5 h-5',
    small: 'w-4 h-4',
    large: 'w-6 h-6',
    status: 'w-2 h-2 rounded-full',
  },
  
  spacing: {
    cardGap: 'gap-6',
    sectionGap: 'gap-4',
    itemGap: 'gap-3',
    textGap: 'gap-1',
  },
};

// Legacy helper functions
export const getUsageColorScheme = (percentage: number) => {
  if (percentage >= 80) return dashboardTokens.colors.usage.high;
  if (percentage >= 60) return dashboardTokens.colors.usage.medium;
  return dashboardTokens.colors.usage.low;
};

export const getStatusColorScheme = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return dashboardTokens.colors.status.active;
    case 'trial':
    case 'trialing':
      return dashboardTokens.colors.status.trial;
    case 'past_due':
    case 'pastdue':
      return dashboardTokens.colors.status.pastDue;
    case 'canceled':
    case 'cancelled':
      return dashboardTokens.colors.status.canceled;
    default:
      return dashboardTokens.colors.status.active;
  }
};

export const getStaggerDelay = (index: number) => {
  const delays = [
    dashboardTokens.animations.fadeIn,
    dashboardTokens.animations.stagger.delay100,
    dashboardTokens.animations.stagger.delay200,
    dashboardTokens.animations.stagger.delay300,
  ];
  return delays[index % delays.length];
};

// Legacy chart tokens
export const chartTokens = {
  colors: {
    primary: designSystem.brand.colors.primary[500],
    success: designSystem.brand.colors.success[500],
    warning: designSystem.brand.colors.warning[500],
    error: designSystem.brand.colors.error[500],
    info: designSystem.brand.colors.info[500],
    neutral: designSystem.brand.colors.neutral[500],
    
    performance: {
      excellent: designSystem.logistics.performanceIndicators.excellent.color,
      good: designSystem.logistics.performanceIndicators.good.color,
      average: designSystem.logistics.performanceIndicators.average.color,
      poor: designSystem.logistics.performanceIndicators.poor.color,
      critical: designSystem.logistics.performanceIndicators.critical.color,
    },
    
    trends: {
      positive: designSystem.brand.colors.success[500],
      negative: designSystem.brand.colors.error[500],
      neutral: designSystem.brand.colors.neutral[500],
    },
    
    chart: {
      background: designSystem.brand.colors.neutral[50],
      grid: designSystem.brand.colors.neutral[200],
      text: designSystem.brand.colors.neutral[700],
      tooltip: designSystem.brand.colors.neutral[900],
    },
    
    gradient: {
      primary: [designSystem.brand.colors.primary[500], designSystem.brand.colors.primary[700]],
      success: [designSystem.brand.colors.success[500], designSystem.brand.colors.success[700]],
      warning: [designSystem.brand.colors.warning[500], designSystem.brand.colors.warning[700]],
      error: [designSystem.brand.colors.error[500], designSystem.brand.colors.error[700]],
    },
  },
  
  animations: {
    duration: {
      fast: parseInt(designSystem.brand.motion.duration.fast),
      normal: parseInt(designSystem.brand.motion.duration.normal),
      slow: parseInt(designSystem.brand.motion.duration.slow),
    },
    easing: designSystem.brand.motion.easing.out,
  },
  
  typography: {
    chart: {
      title: 'text-lg font-semibold text-gray-900',
      value: 'text-2xl font-bold',
      label: 'text-sm font-medium text-gray-700',
      subtitle: 'text-sm text-gray-600',
      tooltip: 'text-xs text-white',
    },
  },
  
  spacing: {
    chart: {
      margin: parseInt(designSystem.brand.spacing[4]),
      padding: parseInt(designSystem.brand.spacing[3]),
      gap: parseInt(designSystem.brand.spacing[2]),
    },
  },
  
  responsive: {
    breakpoints: {
      mobile: `max-width: ${designSystem.brand.breakpoints.sm}`,
      tablet: `max-width: ${designSystem.brand.breakpoints.lg}`,
      desktop: `min-width: ${parseInt(designSystem.brand.breakpoints.lg) + 1}px`,
    },
    heights: {
      mobile: 200,
      tablet: 250,
      desktop: 300,
    },
  },
  
  accessibility: {
    focusRing: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    screenReader: 'sr-only',
    highContrast: {
      background: designSystem.brand.colors.neutral[50],
      text: designSystem.brand.colors.neutral[950],
      grid: designSystem.brand.colors.neutral[400],
    },
  },
};

// Legacy payment tokens (maintained for compatibility)
export const paymentTokens = {
  layout: {
    container: 'mx-auto px-4 py-6 max-w-6xl',
    grid: 'grid gap-6',
    gridCols: {
      mobile: 'grid-cols-1',
      desktop: 'md:grid-cols-2',
    },
    section: 'space-y-6',
  },
  
  cards: {
    dimensions: {
      width: 'w-80',
      height: 'h-48',
      borderRadius: 'rounded-xl',
    },
    visual: {
      base: 'relative overflow-hidden shadow-lg transition-all duration-200',
      hover: 'hover:shadow-xl hover:scale-105',
      focus: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
      gradient: 'bg-gradient-to-br',
      visa: 'from-blue-600 to-blue-800',
      mastercard: 'from-red-600 to-orange-600',
      amex: 'from-green-600 to-teal-700',
      discover: 'from-orange-500 to-orange-700',
      default: 'from-gray-600 to-gray-800',
    },
  },
  
  buttons: designSystem.components.button.variant,
  forms: designSystem.components.input,
  modal: designSystem.components.modal,
};

// Migration warning
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '🎨 Design System Migration Notice:\n' +
    'You are using the legacy consolidated tokens.\n' +
    'Please migrate to the new design system from "../design-system" for better performance and maintainability.\n' +
    'See the migration guide for details.'
  );
}

// Helper to get new design system token
export const getNewToken = (legacyPath: string): any => {
  console.warn(
    `🎨 Legacy token usage detected: ${legacyPath}\n` +
    'Consider migrating to the new design system.'
  );
  
  return tokenHelpers.color(legacyPath);
};

// Export all for backward compatibility
export {
  // New design system (recommended)
  designSystem,
  tokenHelpers,
} from '../design-system';

// Legacy token re-exports (deprecated)
export const logisticsColors = designSystem.brand.colors;
export const componentSpacing = spacing;
export const layoutSpacing = {
  container: {
    paddingX: spacing[4],
    paddingXMobile: spacing[3],
    maxWidth: '1280px',
  },
  section: {
    paddingY: spacing[8],
    paddingYMobile: spacing[6],
    gap: spacing[6],
  },
  grid: {
    gap: spacing[4],
    gapMobile: spacing[3],
  },
  stack: {
    gap: spacing[4],
    gapSmall: spacing[2],
    gapLarge: spacing[6],
  },
};

export default tokens;