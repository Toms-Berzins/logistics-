/**
 * Typography tokens for the logistics dispatch platform
 * Optimized for readability and accessibility in operational interfaces
 */

// Font family definitions
export const fontFamilies = {
  // Primary font stack - optimized for UI
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji',
  ],
  
  // Monospace font stack - for code, IDs, and precise data
  mono: [
    'JetBrains Mono',
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Roboto Mono',
    'Consolas',
    'Courier New',
    'monospace',
  ],
  
  // Display font stack - for headings and branding
  display: [
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'sans-serif',
  ],
} as const;

// Font weight scale
export const fontWeights = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

// Font size scale with corresponding line heights
export const fontSizes = {
  xs: {
    fontSize: '0.75rem',    // 12px
    lineHeight: '1rem',     // 16px
    letterSpacing: '0.05em',
  },
  sm: {
    fontSize: '0.875rem',   // 14px
    lineHeight: '1.25rem',  // 20px
    letterSpacing: '0.025em',
  },
  base: {
    fontSize: '1rem',       // 16px
    lineHeight: '1.5rem',   // 24px
    letterSpacing: '0em',
  },
  lg: {
    fontSize: '1.125rem',   // 18px
    lineHeight: '1.75rem',  // 28px
    letterSpacing: '-0.025em',
  },
  xl: {
    fontSize: '1.25rem',    // 20px
    lineHeight: '1.75rem',  // 28px
    letterSpacing: '-0.025em',
  },
  '2xl': {
    fontSize: '1.5rem',     // 24px
    lineHeight: '2rem',     // 32px
    letterSpacing: '-0.025em',
  },
  '3xl': {
    fontSize: '1.875rem',   // 30px
    lineHeight: '2.25rem',  // 36px
    letterSpacing: '-0.025em',
  },
  '4xl': {
    fontSize: '2.25rem',    // 36px
    lineHeight: '2.5rem',   // 40px
    letterSpacing: '-0.025em',
  },
  '5xl': {
    fontSize: '3rem',       // 48px
    lineHeight: '1',        // 48px
    letterSpacing: '-0.025em',
  },
  '6xl': {
    fontSize: '3.75rem',    // 60px
    lineHeight: '1',        // 60px
    letterSpacing: '-0.025em',
  },
  '7xl': {
    fontSize: '4.5rem',     // 72px
    lineHeight: '1',        // 72px
    letterSpacing: '-0.025em',
  },
  '8xl': {
    fontSize: '6rem',       // 96px
    lineHeight: '1',        // 96px
    letterSpacing: '-0.025em',
  },
  '9xl': {
    fontSize: '8rem',       // 128px
    lineHeight: '1',        // 128px
    letterSpacing: '-0.025em',
  },
} as const;

// Semantic typography styles for logistics interfaces
export const typographyStyles = {
  // Display styles for headers and important text
  display: {
    large: {
      fontFamily: fontFamilies.display,
      fontSize: fontSizes['5xl'].fontSize,
      lineHeight: fontSizes['5xl'].lineHeight,
      fontWeight: fontWeights.bold,
      letterSpacing: fontSizes['5xl'].letterSpacing,
    },
    medium: {
      fontFamily: fontFamilies.display,
      fontSize: fontSizes['4xl'].fontSize,
      lineHeight: fontSizes['4xl'].lineHeight,
      fontWeight: fontWeights.bold,
      letterSpacing: fontSizes['4xl'].letterSpacing,
    },
    small: {
      fontFamily: fontFamilies.display,
      fontSize: fontSizes['3xl'].fontSize,
      lineHeight: fontSizes['3xl'].lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes['3xl'].letterSpacing,
    },
  },
  
  // Heading hierarchy
  heading: {
    h1: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes['2xl'].fontSize,
      lineHeight: fontSizes['2xl'].lineHeight,
      fontWeight: fontWeights.bold,
      letterSpacing: fontSizes['2xl'].letterSpacing,
    },
    h2: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xl.fontSize,
      lineHeight: fontSizes.xl.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.xl.letterSpacing,
    },
    h3: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.lg.fontSize,
      lineHeight: fontSizes.lg.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.lg.letterSpacing,
    },
    h4: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.base.fontSize,
      lineHeight: fontSizes.base.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.base.letterSpacing,
    },
    h5: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
    h6: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.xs.letterSpacing,
    },
  },
  
  // Body text styles
  body: {
    large: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.lg.fontSize,
      lineHeight: fontSizes.lg.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.lg.letterSpacing,
    },
    medium: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.base.fontSize,
      lineHeight: fontSizes.base.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.base.letterSpacing,
    },
    small: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
  },
  
  // Caption and supporting text
  caption: {
    large: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
    medium: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.xs.letterSpacing,
    },
  },
  
  // Code and monospace text
  code: {
    large: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.base.fontSize,
      lineHeight: fontSizes.base.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: '0em',
    },
    medium: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: '0em',
    },
    small: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: '0em',
    },
  },
} as const;

// Logistics-specific typography patterns
export const logisticsTypography = {
  // Dashboard elements
  dashboard: {
    // KPI values and metrics
    metric: {
      large: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSizes['4xl'].fontSize,
        lineHeight: fontSizes['4xl'].lineHeight,
        fontWeight: fontWeights.bold,
        letterSpacing: '-0.02em',
        fontFeatureSettings: '"tnum"', // Tabular numbers
      },
      medium: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSizes['2xl'].fontSize,
        lineHeight: fontSizes['2xl'].lineHeight,
        fontWeight: fontWeights.semibold,
        letterSpacing: '-0.02em',
        fontFeatureSettings: '"tnum"',
      },
      small: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSizes.lg.fontSize,
        lineHeight: fontSizes.lg.lineHeight,
        fontWeight: fontWeights.semibold,
        letterSpacing: '-0.02em',
        fontFeatureSettings: '"tnum"',
      },
    },
    
    // Card titles and labels
    cardTitle: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.lg.fontSize,
      lineHeight: fontSizes.lg.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: fontSizes.lg.letterSpacing,
    },
    
    cardSubtitle: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
  },
  
  // Table and list typography
  table: {
    header: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    
    cell: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
    
    // Numeric data in tables
    numeric: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: '0em',
      fontFeatureSettings: '"tnum"',
    },
  },
  
  // Status and indicator typography
  status: {
    // Status badges and pills
    badge: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: '0.025em',
      textTransform: 'uppercase',
    },
    
    // Status labels
    label: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
  },
  
  // Form typography
  form: {
    label: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
    
    input: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.base.fontSize,
      lineHeight: fontSizes.base.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.base.letterSpacing,
    },
    
    help: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.xs.letterSpacing,
    },
    
    error: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.xs.letterSpacing,
    },
  },
  
  // Navigation typography
  navigation: {
    // Main navigation items
    primary: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.medium,
      letterSpacing: fontSizes.sm.letterSpacing,
    },
    
    // Secondary navigation and breadcrumbs
    secondary: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.normal,
      letterSpacing: fontSizes.xs.letterSpacing,
    },
  },
  
  // Button typography
  button: {
    large: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.base.fontSize,
      lineHeight: fontSizes.base.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: '0.025em',
    },
    
    medium: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.sm.fontSize,
      lineHeight: fontSizes.sm.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: '0.025em',
    },
    
    small: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.xs.fontSize,
      lineHeight: fontSizes.xs.lineHeight,
      fontWeight: fontWeights.semibold,
      letterSpacing: '0.05em',
    },
  },
} as const;

// CSS custom properties for typography tokens
export const typographyTokens = {
  cssVars: {
    // Font families
    '--font-sans': fontFamilies.sans.join(', '),
    '--font-mono': fontFamilies.mono.join(', '),
    '--font-display': fontFamilies.display.join(', '),
    
    // Font weights
    '--font-weight-normal': fontWeights.normal,
    '--font-weight-medium': fontWeights.medium,
    '--font-weight-semibold': fontWeights.semibold,
    '--font-weight-bold': fontWeights.bold,
    
    // Font sizes
    '--font-size-xs': fontSizes.xs.fontSize,
    '--font-size-sm': fontSizes.sm.fontSize,
    '--font-size-base': fontSizes.base.fontSize,
    '--font-size-lg': fontSizes.lg.fontSize,
    '--font-size-xl': fontSizes.xl.fontSize,
    '--font-size-2xl': fontSizes['2xl'].fontSize,
    '--font-size-3xl': fontSizes['3xl'].fontSize,
    '--font-size-4xl': fontSizes['4xl'].fontSize,
    
    // Line heights
    '--line-height-xs': fontSizes.xs.lineHeight,
    '--line-height-sm': fontSizes.sm.lineHeight,
    '--line-height-base': fontSizes.base.lineHeight,
    '--line-height-lg': fontSizes.lg.lineHeight,
    '--line-height-xl': fontSizes.xl.lineHeight,
    
    // Letter spacing
    '--letter-spacing-tight': '-0.025em',
    '--letter-spacing-normal': '0em',
    '--letter-spacing-wide': '0.025em',
    '--letter-spacing-wider': '0.05em',
    
    // Logistics-specific typography variables
    '--metric-font-size': logisticsTypography.dashboard.metric.large.fontSize,
    '--metric-font-weight': logisticsTypography.dashboard.metric.large.fontWeight,
    '--table-header-font-size': logisticsTypography.table.header.fontSize,
    '--table-cell-font-size': logisticsTypography.table.cell.fontSize,
    '--badge-font-size': logisticsTypography.status.badge.fontSize,
    '--button-font-weight': logisticsTypography.button.medium.fontWeight,
  },
} as const;

// Consolidated typography export
export const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  styles: typographyStyles,
  logistics: logisticsTypography,
  tokens: typographyTokens,
} as const;

// Type definitions for TypeScript support
export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type TypographyStyle = keyof typeof typographyStyles;
export type LogisticsTypography = keyof typeof logisticsTypography;

// Utility types for accessing nested typography values
export type DisplayStyle = keyof typeof typographyStyles.display;
export type HeadingLevel = keyof typeof typographyStyles.heading;
export type BodyStyle = keyof typeof typographyStyles.body;
export type CodeStyle = keyof typeof typographyStyles.code;

export type DashboardTypography = keyof typeof logisticsTypography.dashboard;
export type TableTypography = keyof typeof logisticsTypography.table;
export type StatusTypography = keyof typeof logisticsTypography.status;
export type FormTypography = keyof typeof logisticsTypography.form;
export type ButtonTypography = keyof typeof logisticsTypography.button;