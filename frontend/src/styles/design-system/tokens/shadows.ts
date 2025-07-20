/**
 * Shadow tokens for the logistics dispatch platform
 * Elevation system providing depth and hierarchy
 */

// Base shadow definitions using modern CSS with color opacity
export const baseShadows = {
  // No shadow
  none: 'none',
  
  // Subtle shadows for minimal elevation
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  
  // Standard elevation shadows
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  
  // High elevation shadows
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '3xl': '0 35px 60px -12px rgb(0 0 0 / 0.35)',
  
  // Inner shadows for inset effects
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  innerMd: 'inset 0 4px 8px 0 rgb(0 0 0 / 0.1)',
  innerLg: 'inset 0 8px 16px 0 rgb(0 0 0 / 0.15)',
} as const;

// Colored shadows for semantic states and branding
export const coloredShadows = {
  // Brand color shadows
  primary: {
    xs: '0 1px 2px 0 rgb(59 130 246 / 0.1)',
    sm: '0 1px 3px 0 rgb(59 130 246 / 0.15), 0 1px 2px -1px rgb(59 130 246 / 0.1)',
    md: '0 4px 6px -1px rgb(59 130 246 / 0.15), 0 2px 4px -2px rgb(59 130 246 / 0.1)',
    lg: '0 10px 15px -3px rgb(59 130 246 / 0.2), 0 4px 6px -4px rgb(59 130 246 / 0.1)',
    xl: '0 20px 25px -5px rgb(59 130 246 / 0.25), 0 8px 10px -6px rgb(59 130 246 / 0.1)',
  },
  
  // Semantic state shadows
  success: {
    xs: '0 1px 2px 0 rgb(34 197 94 / 0.1)',
    sm: '0 1px 3px 0 rgb(34 197 94 / 0.15), 0 1px 2px -1px rgb(34 197 94 / 0.1)',
    md: '0 4px 6px -1px rgb(34 197 94 / 0.15), 0 2px 4px -2px rgb(34 197 94 / 0.1)',
    lg: '0 10px 15px -3px rgb(34 197 94 / 0.2), 0 4px 6px -4px rgb(34 197 94 / 0.1)',
  },
  
  warning: {
    xs: '0 1px 2px 0 rgb(245 158 11 / 0.1)',
    sm: '0 1px 3px 0 rgb(245 158 11 / 0.15), 0 1px 2px -1px rgb(245 158 11 / 0.1)',
    md: '0 4px 6px -1px rgb(245 158 11 / 0.15), 0 2px 4px -2px rgb(245 158 11 / 0.1)',
    lg: '0 10px 15px -3px rgb(245 158 11 / 0.2), 0 4px 6px -4px rgb(245 158 11 / 0.1)',
  },
  
  error: {
    xs: '0 1px 2px 0 rgb(239 68 68 / 0.1)',
    sm: '0 1px 3px 0 rgb(239 68 68 / 0.15), 0 1px 2px -1px rgb(239 68 68 / 0.1)',
    md: '0 4px 6px -1px rgb(239 68 68 / 0.15), 0 2px 4px -2px rgb(239 68 68 / 0.1)',
    lg: '0 10px 15px -3px rgb(239 68 68 / 0.2), 0 4px 6px -4px rgb(239 68 68 / 0.1)',
  },
  
  info: {
    xs: '0 1px 2px 0 rgb(14 165 233 / 0.1)',
    sm: '0 1px 3px 0 rgb(14 165 233 / 0.15), 0 1px 2px -1px rgb(14 165 233 / 0.1)',
    md: '0 4px 6px -1px rgb(14 165 233 / 0.15), 0 2px 4px -2px rgb(14 165 233 / 0.1)',
    lg: '0 10px 15px -3px rgb(14 165 233 / 0.2), 0 4px 6px -4px rgb(14 165 233 / 0.1)',
  },
} as const;

// Semantic elevation system for logistics components
export const elevationShadows = {
  // Surface levels - following Material Design elevation principles
  surface: {
    // Level 0 - Base surface (no elevation)
    0: baseShadows.none,
    
    // Level 1 - Raised elements (cards, buttons in resting state)
    1: baseShadows.xs,
    
    // Level 2 - Slightly elevated elements (hovered cards, raised buttons)
    2: baseShadows.sm,
    
    // Level 3 - Floating elements (dropdowns, tooltips)
    3: baseShadows.md,
    
    // Level 4 - Overlays (modals, dialogs)
    4: baseShadows.lg,
    
    // Level 5 - High elevation (floating action buttons, important overlays)
    5: baseShadows.xl,
    
    // Level 6 - Maximum elevation (alerts, critical notifications)
    6: baseShadows['2xl'],
  },
  
  // Interactive states
  interactive: {
    resting: baseShadows.xs,
    hover: baseShadows.sm,
    active: baseShadows.inner,
    focus: '0 0 0 2px rgb(59 130 246 / 0.5)',
    disabled: baseShadows.none,
  },
  
  // Component-specific elevations
  component: {
    card: baseShadows.sm,
    cardHover: baseShadows.md,
    button: baseShadows.xs,
    buttonHover: baseShadows.sm,
    dropdown: baseShadows.lg,
    modal: baseShadows.xl,
    tooltip: baseShadows.md,
    popover: baseShadows.lg,
    drawer: baseShadows['2xl'],
  },
} as const;

// Logistics-specific shadow patterns
export const logisticsShadows = {
  // Dashboard elements
  dashboard: {
    // KPI cards and metric displays
    metricCard: baseShadows.sm,
    metricCardHover: baseShadows.md,
    metricCardActive: baseShadows.lg,
    
    // Status indicators and badges
    statusBadge: baseShadows.xs,
    priorityBadge: baseShadows.sm,
    alertBadge: coloredShadows.error.sm,
    
    // Chart containers
    chartContainer: baseShadows.sm,
    chartTooltip: baseShadows.md,
  },
  
  // Map and visualization shadows
  map: {
    // Map markers and pins
    marker: baseShadows.sm,
    markerHover: baseShadows.md,
    markerActive: baseShadows.lg,
    markerCluster: baseShadows.md,
    
    // Map overlays and controls
    overlay: baseShadows.lg,
    controls: baseShadows.sm,
    popup: baseShadows.xl,
    
    // Route and path indicators
    routeLine: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
    activeRoute: '0 4px 8px 0 rgb(59 130 246 / 0.2)',
  },
  
  // Table and list shadows
  table: {
    // Table container
    container: baseShadows.sm,
    header: baseShadows.xs,
    
    // Row interactions
    rowHover: 'inset 0 1px 0 0 rgb(0 0 0 / 0.05)',
    rowSelected: 'inset 3px 0 0 0 rgb(59 130 246 / 1)',
    
    // Sorting and filtering
    sortIndicator: baseShadows.xs,
    filterDropdown: baseShadows.lg,
  },
  
  // Form elements
  form: {
    // Input fields
    input: baseShadows.inner,
    inputFocus: '0 0 0 1px rgb(59 130 246 / 0.5), inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    inputError: '0 0 0 1px rgb(239 68 68 / 0.5), inset 0 1px 2px 0 rgb(239 68 68 / 0.1)',
    
    // Buttons
    buttonPrimary: baseShadows.sm,
    buttonPrimaryHover: baseShadows.md,
    buttonSecondary: baseShadows.xs,
    buttonSecondaryHover: baseShadows.sm,
    
    // Form sections
    fieldGroup: baseShadows.xs,
    formSection: baseShadows.sm,
  },
  
  // Navigation shadows
  navigation: {
    // Top navigation
    topNav: baseShadows.sm,
    
    // Sidebar navigation
    sidebar: baseShadows.lg,
    sidebarCollapsed: baseShadows.md,
    
    // Mobile navigation
    mobileNav: baseShadows.xl,
    bottomNav: '0 -2px 8px 0 rgb(0 0 0 / 0.1)',
    
    // Breadcrumbs
    breadcrumb: baseShadows.xs,
  },
  
  // Mobile-specific shadows
  mobile: {
    // Touch-friendly elements
    touchTarget: baseShadows.sm,
    touchActive: baseShadows.xs,
    
    // Mobile cards
    mobileCard: baseShadows.sm,
    mobileCardPressed: baseShadows.inner,
    
    // Swipe actions
    swipeAction: baseShadows.md,
    pullToRefresh: baseShadows.lg,
    
    // Floating action button
    fab: baseShadows.lg,
    fabPressed: baseShadows.md,
  },
  
  // Status-specific shadows
  status: {
    // Driver status indicators
    driverAvailable: coloredShadows.success.xs,
    driverBusy: coloredShadows.warning.xs,
    driverOffline: baseShadows.xs,
    
    // Job status indicators
    jobPending: baseShadows.xs,
    jobAssigned: coloredShadows.primary.xs,
    jobCompleted: coloredShadows.success.xs,
    jobDelayed: coloredShadows.error.xs,
    
    // Route status indicators
    routeActive: coloredShadows.primary.sm,
    routeCompleted: coloredShadows.success.sm,
    routeDelayed: coloredShadows.error.sm,
  },
} as const;

// Focus ring system for accessibility
export const focusShadows = {
  // Standard focus rings
  default: '0 0 0 2px rgb(59 130 246 / 0.5)',
  strong: '0 0 0 3px rgb(59 130 246 / 0.6)',
  
  // High contrast focus rings
  highContrast: '0 0 0 2px rgb(0 0 0 / 1)',
  
  // Semantic focus rings
  success: '0 0 0 2px rgb(34 197 94 / 0.5)',
  warning: '0 0 0 2px rgb(245 158 11 / 0.5)',
  error: '0 0 0 2px rgb(239 68 68 / 0.5)',
  
  // Focus ring with offset
  offset: '0 0 0 2px rgb(255 255 255 / 1), 0 0 0 4px rgb(59 130 246 / 0.5)',
  
  // Inset focus rings for form elements
  inset: 'inset 0 0 0 2px rgb(59 130 246 / 0.5)',
} as const;

// CSS custom properties for shadow tokens
export const shadowTokens = {
  cssVars: {
    // Base shadows
    '--shadow-xs': baseShadows.xs,
    '--shadow-sm': baseShadows.sm,
    '--shadow-md': baseShadows.md,
    '--shadow-lg': baseShadows.lg,
    '--shadow-xl': baseShadows.xl,
    '--shadow-2xl': baseShadows['2xl'],
    '--shadow-inner': baseShadows.inner,
    
    // Elevation levels
    '--elevation-0': elevationShadows.surface[0],
    '--elevation-1': elevationShadows.surface[1],
    '--elevation-2': elevationShadows.surface[2],
    '--elevation-3': elevationShadows.surface[3],
    '--elevation-4': elevationShadows.surface[4],
    '--elevation-5': elevationShadows.surface[5],
    '--elevation-6': elevationShadows.surface[6],
    
    // Interactive states
    '--shadow-hover': elevationShadows.interactive.hover,
    '--shadow-active': elevationShadows.interactive.active,
    '--shadow-focus': elevationShadows.interactive.focus,
    
    // Component shadows
    '--shadow-card': elevationShadows.component.card,
    '--shadow-card-hover': elevationShadows.component.cardHover,
    '--shadow-button': elevationShadows.component.button,
    '--shadow-button-hover': elevationShadows.component.buttonHover,
    '--shadow-dropdown': elevationShadows.component.dropdown,
    '--shadow-modal': elevationShadows.component.modal,
    
    // Logistics-specific shadows
    '--shadow-metric-card': logisticsShadows.dashboard.metricCard,
    '--shadow-map-marker': logisticsShadows.map.marker,
    '--shadow-table-row-selected': logisticsShadows.table.rowSelected,
    '--shadow-mobile-card': logisticsShadows.mobile.mobileCard,
    
    // Focus rings
    '--focus-ring': focusShadows.default,
    '--focus-ring-strong': focusShadows.strong,
    '--focus-ring-offset': focusShadows.offset,
    '--focus-ring-error': focusShadows.error,
  },
} as const;

// Consolidated shadows export
export const shadows = {
  base: baseShadows,
  colored: coloredShadows,
  elevation: elevationShadows,
  logistics: logisticsShadows,
  focus: focusShadows,
  tokens: shadowTokens,
} as const;

// Type definitions for TypeScript support
export type BaseShadow = keyof typeof baseShadows;
export type ColoredShadow = keyof typeof coloredShadows;
export type ElevationLevel = keyof typeof elevationShadows.surface;
export type InteractiveState = keyof typeof elevationShadows.interactive;
export type ComponentShadow = keyof typeof elevationShadows.component;
export type LogisticsShadow = keyof typeof logisticsShadows;
export type FocusShadow = keyof typeof focusShadows;

// Utility types for accessing nested shadow values
export type ShadowScale<T> = T extends Record<string, any> 
  ? keyof T 
  : never;

export type DashboardShadow = ShadowScale<typeof logisticsShadows.dashboard>;
export type MapShadow = ShadowScale<typeof logisticsShadows.map>;
export type TableShadow = ShadowScale<typeof logisticsShadows.table>;
export type FormShadow = ShadowScale<typeof logisticsShadows.form>;
export type NavigationShadow = ShadowScale<typeof logisticsShadows.navigation>;
export type MobileShadow = ShadowScale<typeof logisticsShadows.mobile>;
export type StatusShadow = ShadowScale<typeof logisticsShadows.status>;