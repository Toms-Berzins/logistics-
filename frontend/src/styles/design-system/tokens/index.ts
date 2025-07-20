/**
 * Design system tokens index
 * Atomic design token architecture for the logistics dispatch platform
 */

// Import all token categories
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './animations';

// Re-export organized token structure
export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';
export { shadows } from './shadows';
export { animations } from './animations';

// Consolidated token export for easy consumption
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';
import { animations } from './animations';

export const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  animations,
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid system tokens
export const grid = {
  columns: {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: '11',
    12: '12',
  },
  
  gap: {
    0: '0px',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  
  maxWidth: {
    none: 'none',
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
    full: '100%',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
    prose: '65ch',
    screen: '100vw',
  },
} as const;

// Accessibility tokens
export const accessibility = {
  // WCAG compliance
  contrast: {
    aaSmall: 4.5,
    aaLarge: 3.0,
    aaaSmall: 7.0,
    aaaLarge: 4.5,
  },
  
  // Touch targets
  touchTarget: {
    minimum: '44px',
    comfortable: '48px',
    large: '56px',
  },
  
  // Focus indicators
  focus: {
    ringWidth: '2px',
    ringOffset: '2px',
    ringColor: colors.brand.primary[500],
  },
  
  // Screen reader
  screenReader: {
    only: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    },
  },
  
  // Motion preferences
  motion: {
    reduce: {
      animation: 'none',
      transition: 'none',
    },
    
    safe: animations.durations.fast,
  },
} as const;

// Performance tokens
export const performance = {
  // Loading states
  loading: {
    skeleton: {
      background: colors.neutral[200],
      highlight: colors.neutral[50],
      animation: animations.logistics.loading.skeleton.animation,
    },
    
    spinner: {
      color: colors.brand.primary[600],
      size: spacing.base[6],
      animation: animations.logistics.loading.spinner.animation,
    },
  },
  
  // Virtualization
  virtualization: {
    itemHeight: spacing.base[12], // 48px
    overscan: 5,
    threshold: 100,
  },
  
  // Lazy loading
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1,
  },
} as const;

// All CSS custom properties for runtime theming
export const cssVariables = {
  ...colors.tokens.cssVars,
  ...spacing.tokens.cssVars,
  ...typography.tokens.cssVars,
  ...shadows.tokens.cssVars,
  ...animations.tokens.cssVars,
  
  // Breakpoints
  '--breakpoint-xs': breakpoints.xs,
  '--breakpoint-sm': breakpoints.sm,
  '--breakpoint-md': breakpoints.md,
  '--breakpoint-lg': breakpoints.lg,
  '--breakpoint-xl': breakpoints.xl,
  '--breakpoint-2xl': breakpoints['2xl'],
  
  // Grid
  '--grid-columns': grid.columns[12],
  '--grid-gap': grid.gap[4],
  '--container-max-width': grid.maxWidth['7xl'],
  
  // Accessibility
  '--touch-target-min': accessibility.touchTarget.minimum,
  '--focus-ring-width': accessibility.focus.ringWidth,
  '--focus-ring-offset': accessibility.focus.ringOffset,
  '--focus-ring-color': accessibility.focus.ringColor,
  
  // Performance
  '--loading-skeleton-bg': performance.loading.skeleton.background,
  '--loading-spinner-color': performance.loading.spinner.color,
  '--loading-spinner-size': performance.loading.spinner.size,
} as const;

// Token validation and type safety
export type DesignToken = typeof designTokens;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type TypographyToken = keyof typeof typography;
export type ShadowToken = keyof typeof shadows;
export type AnimationToken = keyof typeof animations;
export type BreakpointToken = keyof typeof breakpoints;
export type GridToken = keyof typeof grid;
export type AccessibilityToken = keyof typeof accessibility;
export type PerformanceToken = keyof typeof performance;

// Token validation functions
export function validateToken<T extends Record<string, any>>(
  tokens: T,
  key: keyof T
): boolean {
  return key in tokens && tokens[key] !== undefined;
}

export function getToken<T extends Record<string, any>>(
  tokens: T,
  key: keyof T,
  fallback?: T[keyof T]
): T[keyof T] | undefined {
  return validateToken(tokens, key) ? tokens[key] : fallback;
}

// CSS-in-JS utilities for consuming tokens
export function createTokenUtilities() {
  return {
    // Color utilities
    color: (token: string) => `var(--color-${token})`,
    backgroundColor: (token: string) => `var(--color-${token})`,
    borderColor: (token: string) => `var(--color-${token})`,
    
    // Spacing utilities
    margin: (token: string) => `var(--spacing-${token})`,
    padding: (token: string) => `var(--spacing-${token})`,
    gap: (token: string) => `var(--spacing-${token})`,
    
    // Typography utilities
    fontSize: (token: string) => `var(--font-size-${token})`,
    fontWeight: (token: string) => `var(--font-weight-${token})`,
    lineHeight: (token: string) => `var(--line-height-${token})`,
    fontFamily: (token: string) => `var(--font-${token})`,
    
    // Shadow utilities
    boxShadow: (token: string) => `var(--shadow-${token})`,
    
    // Animation utilities
    transition: (token: string) => `var(--transition-${token})`,
    animation: (token: string) => `var(--animation-${token})`,
    
    // Layout utilities
    maxWidth: (token: string) => `var(--max-width-${token})`,
    borderRadius: (token: string) => `var(--radius-${token})`,
  };
}

// Utility for generating CSS custom properties
export function generateCSSVariables(): string {
  return Object.entries(cssVariables)
    .map(([property, value]) => `${property}: ${value};`)
    .join('\n');
}

// Theme configuration for runtime switching
export interface ThemeConfig {
  name: string;
  colors: Partial<typeof colors>;
  spacing?: Partial<typeof spacing>;
  typography?: Partial<typeof typography>;
  shadows?: Partial<typeof shadows>;
  animations?: Partial<typeof animations>;
}

export const themes: Record<string, ThemeConfig> = {
  default: {
    name: 'Default',
    colors,
  },
  
  dark: {
    name: 'Dark Mode',
    colors: {
      ...colors,
      neutral: {
        50: '#0a0a0a',
        100: '#171717',
        200: '#262626',
        300: '#404040',
        400: '#525252',
        500: '#737373',
        600: '#a3a3a3',
        700: '#d4d4d4',
        800: '#e5e5e5',
        900: '#f5f5f5',
        950: '#fafafa',
      },
    },
  },
  
  highContrast: {
    name: 'High Contrast',
    colors: {
      ...colors,
      brand: {
        ...colors.brand,
        primary: {
          ...colors.brand.primary,
          600: '#000000',
        },
      },
    },
  },
} as const;

export type ThemeName = keyof typeof themes;