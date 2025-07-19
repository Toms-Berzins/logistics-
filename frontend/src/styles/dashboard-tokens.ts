// Dashboard-specific design tokens for subscription overview
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
    
    // Specific card sizes
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
    primary: 'inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    secondary: 'inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    destructive: 'inline-flex items-center px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    tertiary: 'inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  },
  
  progress: {
    container: 'relative w-full',
    track: 'w-full bg-gray-200 rounded-full overflow-hidden',
    bar: 'h-full rounded-full transition-all duration-300 ease-out',
    label: 'flex justify-between items-center text-sm',
    percentage: 'font-medium',
    
    // Circular progress
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
} as const;

// Usage threshold helpers
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

// Animation delays for staggered entrance
export const getStaggerDelay = (index: number) => {
  const delays = [
    dashboardTokens.animations.fadeIn,
    dashboardTokens.animations.stagger.delay100,
    dashboardTokens.animations.stagger.delay200,
    dashboardTokens.animations.stagger.delay300,
  ];
  return delays[index % delays.length];
};