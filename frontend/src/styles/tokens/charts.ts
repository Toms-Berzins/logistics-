export const chartTokens = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    neutral: '#6b7280',
    
    performance: {
      excellent: '#10b981',
      good: '#22c55e',
      average: '#f59e0b',
      poor: '#ef4444',
      critical: '#dc2626',
    },
    
    trends: {
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#6b7280',
    },
    
    chart: {
      background: '#ffffff',
      grid: '#f3f4f6',
      text: '#374151',
      tooltip: '#1f2937',
    },
    
    gradient: {
      primary: ['#3b82f6', '#1d4ed8'],
      success: ['#10b981', '#047857'],
      warning: ['#f59e0b', '#d97706'],
      error: ['#ef4444', '#dc2626'],
    },
  },
  
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: 'ease-out',
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
      margin: 16,
      padding: 12,
      gap: 8,
    },
  },
  
  responsive: {
    breakpoints: {
      mobile: 'max-width: 640px',
      tablet: 'max-width: 1024px',
      desktop: 'min-width: 1025px',
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
      background: '#ffffff',
      text: '#000000',
      grid: '#cccccc',
    },
  },
} as const;

export type ChartColorScheme = keyof typeof chartTokens.colors.performance;
export type TrendDirection = keyof typeof chartTokens.colors.trends;

export const getPerformanceColor = (value: number, target: number): ChartColorScheme => {
  const percentage = (value / target) * 100;
  if (percentage >= 110) return 'excellent';
  if (percentage >= 100) return 'good';
  if (percentage >= 90) return 'average';
  if (percentage >= 70) return 'poor';
  return 'critical';
};

export const getTrendColor = (change: number): TrendDirection => {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
};