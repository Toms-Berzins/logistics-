/**
 * Design tokens for the logistics dispatch platform
 * These tokens provide consistent design patterns across the application
 */

// Color tokens with semantic meaning for logistics operations
export const colors = {
  // Brand colors
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
  
  // Semantic colors for logistics status
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#059669', // Available/success - drivers ready
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
    500: '#D97706', // Warning amber - attention needed
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
    500: '#DC2626', // Error red - urgent attention
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
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  
  // Neutral colors with high contrast ratios
  neutral: {
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
  },
} as const

// Typography tokens optimized for logistics interfaces
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const

// Spacing tokens based on 4px grid system
export const spacing = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  7: '1.75rem', // 28px
  8: '2rem',    // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem',   // 48px
  14: '3.5rem', // 56px
  16: '4rem',   // 64px
  18: '4.5rem', // 72px
  20: '5rem',   // 80px
  24: '6rem',   // 96px
  28: '7rem',   // 112px
  32: '8rem',   // 128px
  36: '9rem',   // 144px
  40: '10rem',  // 160px
  44: '11rem',  // 176px
  48: '12rem',  // 192px
  52: '13rem',  // 208px
  56: '14rem',  // 224px
  60: '15rem',  // 240px
  64: '16rem',  // 256px
  72: '18rem',  // 288px
  80: '20rem',  // 320px
  96: '24rem',  // 384px
  128: '32rem', // 512px
} as const

// Border radius tokens
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

// Shadow tokens for depth and elevation
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const

// Animation tokens
export const animations = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// Breakpoint tokens for responsive design
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Z-index tokens for layering
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  tooltip: '1000',
  modal: '1010',
  popover: '1020',
  dropdown: '1030',
  toast: '1040',
  overlay: '1050',
} as const

// Semantic color mappings for logistics operations
export const semanticColors = {
  driver: {
    available: colors.success[500],
    busy: colors.warning[500],
    offline: colors.error[500],
    enRoute: colors.primary[600],
  },
  status: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },
  priority: {
    high: colors.error[500],
    medium: colors.warning[500],
    low: colors.success[500],
  },
  // AI prediction colors for route overlays
  prediction: {
    high: '#10b981', // emerald-400 for high confidence
    medium: '#fbbf24', // amber-300 for medium confidence  
    low: '#fda4af', // rose-200 for low confidence
    predictiveBlue: '#3b82f6', // predictive-blue-500
  },
  // Traffic heat map gradient
  trafficHeat: {
    low: '#22c55e',
    moderate: '#eab308',
    heavy: '#f97316',
    severe: '#ef4444',
  },
  // Driver state indicators
  driverStates: {
    availablePulse: '#10b981',
    busySolid: '#f59e0b',
    enRoutePurple: '#8b5cf6',
    returningBlue: '#3b82f6',
    offlineRed: '#ef4444',
  },
} as const

// Accessibility tokens
export const accessibility = {
  focusRing: {
    width: '2px',
    color: colors.primary[500],
    offset: '2px',
  },
  touchTarget: {
    minSize: '44px',
  },
  contrast: {
    // WCAG AA compliance ratios
    normal: '4.5:1',
    large: '3:1',
  },
} as const

// Pricing-specific design tokens
export const pricingTokens = {
  // Pricing tier colors and styling
  tiers: {
    starter: {
      background: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-900',
      accent: 'text-slate-600',
      card: 'bg-white border-slate-200',
    },
    professional: {
      background: 'bg-blue-50',
      border: 'border-blue-600 border-2',
      text: 'text-blue-900',
      accent: 'text-blue-600',
      highlight: 'bg-blue-600',
      card: 'bg-blue-50 border-blue-600 border-2',
      popular: true,
    },
    enterprise: {
      background: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      accent: 'text-purple-600',
      card: 'bg-white border-purple-200',
    },
  },
  
  // Pricing card layout
  card: {
    width: 'w-80', // 320px
    gap: 'gap-6', // 24px
    maxWidth: 'max-w-6xl', // ~1200px
    padding: 'p-8',
    spacing: 'space-y-6',
  },
  
  // Typography hierarchy for pricing
  typography: {
    planName: 'text-2xl font-bold',
    price: 'text-4xl font-black',
    features: 'text-sm',
    description: 'text-base text-gray-600',
    badge: 'text-xs font-medium',
  },
  
  // Interactive states
  interactions: {
    hover: 'hover:shadow-lg hover:scale-105',
    transition: 'transition-all duration-200 ease-out',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
  },
  
  // Feature comparison icons
  icons: {
    included: 'text-green-500',
    excluded: 'text-red-400',
    size: 'w-5 h-5',
  },
  
  // Badge styling
  badges: {
    popular: {
      base: 'absolute -top-3 right-4 bg-blue-600 text-white',
      size: 'px-3 py-1 text-xs font-medium',
      shape: 'rounded-full',
    },
    current: {
      base: 'absolute -top-3 right-4 bg-green-600 text-white',
      size: 'px-3 py-1 text-xs font-medium',
      shape: 'rounded-full',
    },
  },
  
  // Button variants for pricing
  buttons: {
    primary: {
      base: 'bg-blue-600 hover:bg-blue-700 text-white',
      size: 'w-full px-6 py-3 text-sm font-medium',
      shape: 'rounded-lg',
      focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    },
    secondary: {
      base: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
      size: 'w-full px-6 py-3 text-sm font-medium',
      shape: 'rounded-lg',
      focus: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    },
  },
  
  // Loading skeleton styles
  loading: {
    skeleton: 'bg-gray-200 animate-pulse rounded',
    price: 'h-12 w-24 bg-gray-200 animate-pulse rounded',
    feature: 'h-4 w-full bg-gray-200 animate-pulse rounded',
  },
  
  // Responsive grid system
  responsive: {
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    container: 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8',
    section: 'py-12 sm:py-16 lg:py-20',
  },
} as const;

// Billing toggle design tokens
export const billingToggleTokens = {
  container: 'relative bg-gray-200 p-1 rounded-full',
  button: 'relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200',
  activeButton: 'text-blue-600',
  inactiveButton: 'text-gray-500',
  indicator: 'absolute top-1 left-1 bg-white shadow-sm rounded-full transition-transform duration-200 ease-out',
  indicatorSize: 'h-8',
} as const;

// Export all tokens as a single object for convenience
export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  semanticColors,
  accessibility,
  pricing: pricingTokens,
  billingToggle: billingToggleTokens,
} as const

// Type definitions for TypeScript support
export type ColorToken = keyof typeof colors
export type TypographyToken = keyof typeof typography
export type SpacingToken = keyof typeof spacing
export type BorderRadiusToken = keyof typeof borderRadius
export type ShadowToken = keyof typeof shadows
export type AnimationToken = keyof typeof animations
export type BreakpointToken = keyof typeof breakpoints
export type ZIndexToken = keyof typeof zIndex
export type SemanticColorToken = keyof typeof semanticColors
export type AccessibilityToken = keyof typeof accessibility