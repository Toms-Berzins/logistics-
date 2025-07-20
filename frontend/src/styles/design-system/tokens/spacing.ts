/**
 * Spacing tokens for the logistics dispatch platform
 * Based on 4px grid system for consistent layout and rhythm
 */

// Base spacing scale following 4px grid system
export const baseSpacing = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px - base unit
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  7: '1.75rem', // 28px
  8: '2rem',    // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px - minimum touch target
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
} as const;

// Semantic spacing for specific use cases
export const semanticSpacing = {
  // Micro spacing for fine adjustments
  micro: {
    xs: baseSpacing[1], // 4px - very tight spacing
    sm: baseSpacing[2], // 8px - tight spacing
    md: baseSpacing[3], // 12px - small adjustments
    lg: baseSpacing[4], // 16px - base micro spacing
  },
  
  // Component internal spacing
  component: {
    xs: baseSpacing[2], // 8px - minimal component padding
    sm: baseSpacing[3], // 12px - small component padding
    md: baseSpacing[4], // 16px - standard component padding
    lg: baseSpacing[6], // 24px - generous component padding
    xl: baseSpacing[8], // 32px - large component padding
  },
  
  // Layout spacing between major elements
  layout: {
    xs: baseSpacing[4],  // 16px - tight layout spacing
    sm: baseSpacing[6],  // 24px - small layout spacing
    md: baseSpacing[8],  // 32px - standard layout spacing
    lg: baseSpacing[12], // 48px - generous layout spacing
    xl: baseSpacing[16], // 64px - large layout spacing
    xxl: baseSpacing[24], // 96px - extra large layout spacing
  },
  
  // Section spacing for page structure
  section: {
    xs: baseSpacing[8],  // 32px - minimal section spacing
    sm: baseSpacing[12], // 48px - small section spacing
    md: baseSpacing[16], // 64px - standard section spacing
    lg: baseSpacing[20], // 80px - generous section spacing
    xl: baseSpacing[24], // 96px - large section spacing
    xxl: baseSpacing[32], // 128px - extra large section spacing
  },
} as const;

// Logistics-specific spacing patterns
export const logisticsSpacing = {
  // Dashboard grid spacing
  dashboard: {
    cardGap: baseSpacing[6], // 24px - gap between dashboard cards
    cardPadding: baseSpacing[6], // 24px - internal card padding
    headerHeight: baseSpacing[16], // 64px - dashboard header height
    sidebarWidth: baseSpacing[64], // 256px - sidebar width
    contentPadding: baseSpacing[8], // 32px - main content padding
  },
  
  // Table and list spacing
  table: {
    cellPadding: baseSpacing[3], // 12px - table cell padding
    rowHeight: baseSpacing[12], // 48px - minimum row height
    headerHeight: baseSpacing[14], // 56px - table header height
    actionSpacing: baseSpacing[2], // 8px - spacing between action buttons
  },
  
  // Form elements spacing
  form: {
    fieldSpacing: baseSpacing[4], // 16px - spacing between form fields
    labelSpacing: baseSpacing[2], // 8px - spacing between label and input
    groupSpacing: baseSpacing[6], // 24px - spacing between form groups
    buttonSpacing: baseSpacing[3], // 12px - spacing between buttons
    sectionSpacing: baseSpacing[8], // 32px - spacing between form sections
  },
  
  // Map and visualization spacing
  map: {
    controlPadding: baseSpacing[3], // 12px - map control padding
    markerSize: baseSpacing[8], // 32px - standard marker size
    clusterSize: baseSpacing[10], // 40px - cluster marker size
    overlayPadding: baseSpacing[4], // 16px - overlay element padding
    tooltipPadding: baseSpacing[2], // 8px - tooltip padding
  },
  
  // Mobile-specific spacing
  mobile: {
    touchTarget: baseSpacing[11], // 44px - minimum touch target size
    edgePadding: baseSpacing[4], // 16px - screen edge padding
    cardSpacing: baseSpacing[4], // 16px - spacing between mobile cards
    tabBarHeight: baseSpacing[16], // 64px - mobile tab bar height
    headerHeight: baseSpacing[14], // 56px - mobile header height
  },
  
  // Modal and overlay spacing
  modal: {
    padding: baseSpacing[6], // 24px - modal content padding
    margin: baseSpacing[4], // 16px - modal margin from screen edges
    headerPadding: baseSpacing[6], // 24px - modal header padding
    footerPadding: baseSpacing[6], // 24px - modal footer padding
    buttonSpacing: baseSpacing[3], // 12px - spacing between modal buttons
  },
  
  // Status indicators and badges
  indicator: {
    padding: baseSpacing[2], // 8px - indicator padding
    spacing: baseSpacing[2], // 8px - spacing between indicators
    iconSize: baseSpacing[4], // 16px - standard icon size
    badgeSize: baseSpacing[5], // 20px - badge size
    dotSize: baseSpacing[2], // 8px - status dot size
  },
} as const;

// Border radius tokens
export const borderRadius = {
  none: '0px',
  xs: '0.125rem', // 2px - very small radius
  sm: '0.25rem',  // 4px - small radius
  md: '0.375rem', // 6px - medium radius
  lg: '0.5rem',   // 8px - large radius
  xl: '0.75rem',  // 12px - extra large radius
  '2xl': '1rem',   // 16px - 2x large radius
  '3xl': '1.5rem', // 24px - 3x large radius
  full: '9999px', // Full rounded (circle/pill)
} as const;

// Container and content width constraints
export const contentWidth = {
  // Text content optimal reading widths
  text: {
    xs: '20rem',  // 320px - very narrow text
    sm: '24rem',  // 384px - narrow text
    md: '32rem',  // 512px - standard text width
    lg: '40rem',  // 640px - wide text
    xl: '48rem',  // 768px - extra wide text
  },
  
  // Container maximum widths
  container: {
    xs: '20rem',   // 320px - mobile container
    sm: '24rem',   // 384px - small container
    md: '28rem',   // 448px - medium container
    lg: '32rem',   // 512px - large container
    xl: '36rem',   // 576px - extra large container
    '2xl': '42rem', // 672px - 2x large container
    '3xl': '48rem', // 768px - 3x large container
    '4xl': '56rem', // 896px - 4x large container
    '5xl': '64rem', // 1024px - 5x large container
    '6xl': '72rem', // 1152px - 6x large container
    '7xl': '80rem', // 1280px - 7x large container
    full: '100%',   // Full width
  },
  
  // Logistics dashboard specific widths
  dashboard: {
    sidebar: baseSpacing[64],   // 256px - standard sidebar
    sidebarCollapsed: baseSpacing[16], // 64px - collapsed sidebar
    cardMin: '20rem',          // 320px - minimum card width
    cardMax: '24rem',          // 384px - maximum card width
    tableMin: '48rem',         // 768px - minimum table width
  },
} as const;

// Z-index layering system
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  
  // Component-specific z-index values
  dropdown: '1000',
  sticky: '1010',
  tooltip: '1020',
  overlay: '1030',
  modal: '1040',
  popover: '1050',
  toast: '1060',
  debug: '2147483647', // Maximum z-index for debugging
} as const;

// CSS custom properties for runtime theming
export const spacingTokens = {
  cssVars: {
    // Base spacing variables
    '--spacing-xs': semanticSpacing.component.xs,
    '--spacing-sm': semanticSpacing.component.sm,
    '--spacing-md': semanticSpacing.component.md,
    '--spacing-lg': semanticSpacing.component.lg,
    '--spacing-xl': semanticSpacing.component.xl,
    
    // Layout spacing variables
    '--layout-xs': semanticSpacing.layout.xs,
    '--layout-sm': semanticSpacing.layout.sm,
    '--layout-md': semanticSpacing.layout.md,
    '--layout-lg': semanticSpacing.layout.lg,
    '--layout-xl': semanticSpacing.layout.xl,
    
    // Logistics-specific spacing
    '--dashboard-card-gap': logisticsSpacing.dashboard.cardGap,
    '--dashboard-card-padding': logisticsSpacing.dashboard.cardPadding,
    '--table-cell-padding': logisticsSpacing.table.cellPadding,
    '--form-field-spacing': logisticsSpacing.form.fieldSpacing,
    '--mobile-touch-target': logisticsSpacing.mobile.touchTarget,
    
    // Border radius variables
    '--radius-sm': borderRadius.sm,
    '--radius-md': borderRadius.md,
    '--radius-lg': borderRadius.lg,
    '--radius-xl': borderRadius.xl,
    '--radius-full': borderRadius.full,
  },
} as const;

// Consolidated spacing export
export const spacing = {
  base: baseSpacing,
  semantic: semanticSpacing,
  logistics: logisticsSpacing,
  borderRadius,
  contentWidth,
  zIndex,
  tokens: spacingTokens,
} as const;

// Type definitions for TypeScript support
export type BaseSpacing = keyof typeof baseSpacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type LogisticsSpacing = keyof typeof logisticsSpacing;
export type BorderRadius = keyof typeof borderRadius;
export type ContentWidth = keyof typeof contentWidth;
export type ZIndex = keyof typeof zIndex;

// Utility type for accessing nested spacing values
export type SpacingScale<T> = T extends Record<string, any> 
  ? keyof T 
  : never;

export type ComponentSpacing = SpacingScale<typeof semanticSpacing.component>;
export type LayoutSpacing = SpacingScale<typeof semanticSpacing.layout>;
export type DashboardSpacing = SpacingScale<typeof logisticsSpacing.dashboard>;