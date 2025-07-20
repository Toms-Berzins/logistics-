/**
 * Core brand primitive tokens - Single source of truth for all brand values
 * These are the foundational design tokens that define our visual identity
 */

// Brand color palettes - Generated from brand guidelines
export const brandColors = {
  // Primary logistics blue - Professional, trustworthy, tech-forward
  primary: {
    50: '#F0F7FF',
    100: '#E0EFFE', 
    200: '#B9DFFD',
    300: '#7CC7FB',
    400: '#36ADF7',
    500: '#0C8CE8',
    600: '#006DC6',
    700: '#1C4E80', // Primary brand color
    800: '#1A3A5C',
    900: '#1C2E3D',
    950: '#111B2A',
  },

  // Secondary orange - Energy, movement, urgency
  secondary: {
    50: '#FFF7ED',
    100: '#FFEED4', 
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Secondary brand color
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
    950: '#431407',
  },

  // Neutral palette - Carefully calibrated for accessibility
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // Status colors - Semantic meaning for operations
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // Success green
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Warning amber
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Error red
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  info: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Info blue
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },
} as const;

// Typography scale - Optimized for logistics interfaces
export const brandTypography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont', 
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif'
    ],
    mono: [
      'JetBrains Mono',
      'SF Mono',
      'Monaco',
      'Inconsolata',
      'Roboto Mono',
      'Consolas',
      'monospace'
    ],
  },

  fontSize: {
    xs: { size: '0.75rem', lineHeight: '1rem' },      // 12px/16px
    sm: { size: '0.875rem', lineHeight: '1.25rem' },   // 14px/20px
    base: { size: '1rem', lineHeight: '1.5rem' },      // 16px/24px
    lg: { size: '1.125rem', lineHeight: '1.75rem' },   // 18px/28px
    xl: { size: '1.25rem', lineHeight: '1.75rem' },    // 20px/28px
    '2xl': { size: '1.5rem', lineHeight: '2rem' },     // 24px/32px
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px/36px
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' },  // 36px/40px
    '5xl': { size: '3rem', lineHeight: '1' },          // 48px/48px
    '6xl': { size: '3.75rem', lineHeight: '1' },       // 60px/60px
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

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

// Spacing scale - 4px grid system
export const brandSpacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  18: '4.5rem',    // 72px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
  128: '32rem',    // 512px
} as const;

// Border radius scale
export const brandRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  base: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Shadow scale - Subtle elevation system
export const brandShadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Animation duration and easing
export const brandMotion = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Breakpoints for responsive design
export const brandBreakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-index scale - Consistent layering
export const brandZIndex = {
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;