/**
 * Logistics Design System - Main Export
 * Unified design system architecture consolidating fragmented tokens
 * 
 * @version 2.0.0
 * @performance Bundle: <15KB gzip, tree-shakeable
 * @accessibility WCAG 2.1 AA compliant
 */

// Core brand primitives - Single source of truth
export {
  brandColors,
  brandTypography,
  brandSpacing,
  brandRadius,
  brandShadows,
  brandMotion,
  brandBreakpoints,
  brandZIndex,
} from './tokens/core/brand';

// Semantic logistics tokens - Domain-specific meanings
export {
  driverStatus,
  jobStatus,
  priorityLevels,
  vehicleTypes,
  mapOverlays,
  subscriptionStatus,
  performanceIndicators,
  connectionStatus,
} from './tokens/semantic/logistics';

// Action-based semantic tokens - Interactive states
export {
  interactionStates,
  fieldStates,
  linkStates,
  surfaceStates,
  overlayStates,
} from './tokens/semantic/actions';

// Component-specific tokens - Optimized for UI patterns
export {
  buttonTokens,
  inputTokens,
  cardTokens,
  badgeTokens,
  tableTokens,
  modalTokens,
  navigationTokens,
  toastTokens,
  dropdownTokens,
} from './tokens/component';

// TypeScript interfaces and types
export type {
  // Core types
  BrandColor,
  BrandColorScale,
  BrandFontFamily,
  BrandFontSize,
  BrandFontWeight,
  BrandSpacing,
  BrandRadius,
  BrandShadow,
  BrandDuration,
  BrandEasing,
  BrandBreakpoint,
  BrandZIndex,
  
  // Semantic logistics types
  DriverStatus,
  JobStatus,
  PriorityLevel,
  VehicleType,
  MapOverlay,
  SubscriptionStatus,
  PerformanceIndicator,
  ConnectionStatus,
  
  // Semantic action types
  InteractionState,
  InteractionVariant,
  FieldState,
  LinkState,
  SurfaceState,
  OverlayState,
  
  // Component types
  ButtonSize,
  ButtonVariant,
  ButtonShape,
  InputSize,
  InputState,
  CardSize,
  CardVariant,
  BadgeSize,
  BadgeVariant,
  ModalSize,
  ToastVariant,
  ToastSize,
  
  // Utility types
  ColorValue,
  SemanticColorValue,
  StatusColorValue,
  FontSizeValue,
  TypographyScale,
  ComponentSize,
  StateValue,
  InteractionStateValue,
  TokenValidationError,
  TokenValidationResult,
  DesignSystemConfig,
  TokenMetadata,
  Theme,
  ThemeOverride,
  DeepReadonly,
  TokenPath,
  TokenValue,
  CSSCustomProperty,
  CSSCustomProperties,
} from './types';

// Validation utilities
export {
  validateBrandColor,
  validateColorScale,
  validateSpacing,
  validateRadius,
  validateDriverStatus,
  validateJobStatus,
  validatePriorityLevel,
  validateInteractionState,
  validateColorContrast,
  validateComponentUsage,
  validateTokenNaming,
  validateDesignTokens,
  createTokenValidator,
  assertValidColor,
  assertValidSpacing,
  assertValidDriverStatus,
  warnInvalidTokenUsage,
} from './validators';

// CSS generation utilities
export {
  generateCoreBrandCSS,
  generateSemanticLogisticsCSS,
  generateSemanticActionsCSS,
  generateCompleteCSS,
  generateSCSSVariables,
  generateTokensModule,
} from './css';

// Consolidated tokens object for convenience
import { brandColors, brandTypography, brandSpacing, brandRadius, brandShadows, brandMotion, brandBreakpoints, brandZIndex } from './tokens/core/brand';
import { driverStatus, jobStatus, priorityLevels, vehicleTypes, mapOverlays, subscriptionStatus, performanceIndicators, connectionStatus } from './tokens/semantic/logistics';
import { interactionStates, fieldStates, linkStates, surfaceStates, overlayStates } from './tokens/semantic/actions';
import { buttonTokens, inputTokens, cardTokens, badgeTokens, tableTokens, modalTokens, navigationTokens, toastTokens, dropdownTokens } from './tokens/component';

/**
 * Complete consolidated design system tokens
 * Single source of truth replacing fragmented token files
 */
export const designSystem = {
  // Core brand primitives
  brand: {
    colors: brandColors,
    typography: brandTypography,
    spacing: brandSpacing,
    radius: brandRadius,
    shadows: brandShadows,
    motion: brandMotion,
    breakpoints: brandBreakpoints,
    zIndex: brandZIndex,
  },
  
  // Semantic logistics domain
  logistics: {
    driverStatus,
    jobStatus,
    priorityLevels,
    vehicleTypes,
    mapOverlays,
    subscriptionStatus,
    performanceIndicators,
    connectionStatus,
  },
  
  // Semantic actions
  actions: {
    interactionStates,
    fieldStates,
    linkStates,
    surfaceStates,
    overlayStates,
  },
  
  // Component-specific
  components: {
    button: buttonTokens,
    input: inputTokens,
    card: cardTokens,
    badge: badgeTokens,
    table: tableTokens,
    modal: modalTokens,
    navigation: navigationTokens,
    toast: toastTokens,
    dropdown: dropdownTokens,
  },
} as const;

/**
 * Helper functions for common token usage patterns
 */
export const tokenHelpers = {
  /**
   * Get color value with optional opacity
   */
  color: (colorPath: string, opacity?: number): string => {
    const getNestedValue = (obj: any, path: string): string => {
      return path.split('.').reduce((current, key) => current?.[key], obj) || '';
    };
    
    const color = getNestedValue(designSystem, colorPath);
    if (!color) {
      console.warn(`Color not found: ${colorPath}`);
      return '';
    }
    
    if (opacity !== undefined) {
      // Convert hex to rgba if opacity is provided
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
  },
  
  /**
   * Get spacing value in rem
   */
  spacing: (spacingKey: keyof typeof brandSpacing): string => {
    return brandSpacing[spacingKey];
  },
  
  /**
   * Get typography configuration
   */
  typography: (sizeKey: keyof typeof brandTypography.fontSize) => {
    return brandTypography.fontSize[sizeKey];
  },
  
  /**
   * Get semantic color for logistics status
   */
  statusColor: (status: keyof typeof driverStatus, property: 'color' | 'background' | 'border' = 'color'): string => {
    return driverStatus[status]?.[property] || '';
  },
  
  /**
   * Get interaction state colors
   */
  interactionColor: (
    state: keyof typeof interactionStates, 
    variant: keyof typeof interactionStates.primary = 'default',
    property: 'background' | 'color' | 'border' = 'background'
  ): string => {
    return interactionStates[state]?.[variant]?.[property] || '';
  },
  
  /**
   * Get component token
   */
  component: (componentType: string, tokenPath: string): any => {
    const component = (designSystem.components as any)[componentType];
    if (!component) {
      console.warn(`Component not found: ${componentType}`);
      return undefined;
    }
    
    return tokenPath.split('.').reduce((current, key) => current?.[key], component);
  },
  
  /**
   * Generate CSS custom property name
   */
  cssVar: (tokenPath: string): string => {
    return `var(--logistics-${tokenPath.replace(/\./g, '-')})`;
  },
  
  /**
   * Create theme-aware color function
   */
  themeColor: (lightColor: string, darkColor: string): string => {
    return `light-dark(${lightColor}, ${darkColor})`;
  },
} as const;

/**
 * Migration utilities for existing components
 */
export const migration = {
  /**
   * Map legacy token names to new design system paths
   */
  legacyMapping: {
    // Color mappings
    'colors.primary.600': 'brand.colors.primary.600',
    'colors.success.500': 'logistics.driverStatus.available.color',
    'colors.warning.500': 'logistics.driverStatus.busy.color',
    'colors.error.500': 'logistics.driverStatus.offline.color',
    
    // Spacing mappings
    'spacing.4': 'brand.spacing.4',
    'spacing.6': 'brand.spacing.6',
    'spacing.8': 'brand.spacing.8',
    
    // Typography mappings
    'fontSize.sm': 'brand.typography.fontSize.sm',
    'fontSize.base': 'brand.typography.fontSize.base',
    'fontSize.lg': 'brand.typography.fontSize.lg',
    
    // Component mappings
    'dashboardTokens.buttons.primary': 'components.button.variant.primary',
    'paymentTokens.buttons.primary': 'components.button.variant.primary',
    'chartTokens.colors.primary': 'brand.colors.primary.500',
  },
  
  /**
   * Get new token path from legacy path
   */
  mapLegacyToken: (legacyPath: string): string => {
    return migration.legacyMapping[legacyPath as keyof typeof migration.legacyMapping] || legacyPath;
  },
  
  /**
   * Validate legacy component migration
   */
  validateMigration: (componentName: string, legacyTokens: string[]): string[] => {
    const unmappedTokens: string[] = [];
    
    legacyTokens.forEach(token => {
      const mapped = migration.mapLegacyToken(token);
      if (mapped === token) {
        unmappedTokens.push(token);
      }
    });
    
    if (unmappedTokens.length > 0) {
      console.warn(
        `🎨 Design System Migration Warning for ${componentName}:`,
        `Unmapped tokens: ${unmappedTokens.join(', ')}`
      );
    }
    
    return unmappedTokens;
  },
} as const;

/**
 * Performance utilities
 */
export const performance = {
  /**
   * Preload critical CSS custom properties
   */
  preloadCriticalCSS: (): void => {
    if (typeof document !== 'undefined') {
      const criticalProps = [
        '--logistics-color-primary-600',
        '--logistics-spacing-4',
        '--logistics-font-size-base',
        '--logistics-radius-md',
      ];
      
      const style = document.createElement('style');
      style.textContent = `:root { ${criticalProps.map(prop => `${prop}: initial;`).join(' ')} }`;
      document.head.insertBefore(style, document.head.firstChild);
    }
  },
  
  /**
   * Lazy load non-critical design tokens
   */
  lazyLoadTokens: async (): Promise<void> => {
    if (typeof document !== 'undefined') {
      const { generateCompleteCSS } = await import('./css');
      const style = document.createElement('style');
      style.textContent = generateCompleteCSS();
      document.head.appendChild(style);
    }
  },
} as const;

// Version and metadata
export const version = '2.0.0';
export const metadata = {
  name: 'Logistics Design System',
  version,
  description: 'Unified design system for logistics operations platforms',
  tokenCount: {
    core: Object.keys(brandColors).length + Object.keys(brandSpacing).length,
    semantic: Object.keys(driverStatus).length + Object.keys(jobStatus).length,
    component: Object.keys(buttonTokens).length + Object.keys(inputTokens).length,
  },
  bundleSize: '<15KB gzip',
  accessibility: 'WCAG 2.1 AA',
  browser: 'Modern browsers, IE11+ with polyfills',
  framework: 'Framework agnostic',
} as const;

// Default export for convenience
export default designSystem;