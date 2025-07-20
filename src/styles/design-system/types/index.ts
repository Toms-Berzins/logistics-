/**
 * TypeScript interfaces for design tokens
 * These types ensure type-safe consumption of design tokens
 */

import type { 
  brandColors, 
  brandTypography, 
  brandSpacing, 
  brandRadius,
  brandShadows,
  brandMotion,
  brandBreakpoints,
  brandZIndex,
} from '../tokens/core/brand';

import type {
  driverStatus,
  jobStatus,
  priorityLevels,
  vehicleTypes,
  mapOverlays,
  subscriptionStatus,
  performanceIndicators,
  connectionStatus,
} from '../tokens/semantic/logistics';

import type {
  interactionStates,
  fieldStates,
  linkStates,
  surfaceStates,
  overlayStates,
} from '../tokens/semantic/actions';

import type {
  buttonTokens,
  inputTokens,
  cardTokens,
  badgeTokens,
  tableTokens,
  modalTokens,
  navigationTokens,
  toastTokens,
  dropdownTokens,
} from '../tokens/component';

// Core brand types
export type BrandColor = keyof typeof brandColors;
export type BrandColorScale = keyof typeof brandColors.primary;
export type BrandFontFamily = keyof typeof brandTypography.fontFamily;
export type BrandFontSize = keyof typeof brandTypography.fontSize;
export type BrandFontWeight = keyof typeof brandTypography.fontWeight;
export type BrandSpacing = keyof typeof brandSpacing;
export type BrandRadius = keyof typeof brandRadius;
export type BrandShadow = keyof typeof brandShadows;
export type BrandDuration = keyof typeof brandMotion.duration;
export type BrandEasing = keyof typeof brandMotion.easing;
export type BrandBreakpoint = keyof typeof brandBreakpoints;
export type BrandZIndex = keyof typeof brandZIndex;

// Semantic logistics types
export type DriverStatus = keyof typeof driverStatus;
export type JobStatus = keyof typeof jobStatus;
export type PriorityLevel = keyof typeof priorityLevels;
export type VehicleType = keyof typeof vehicleTypes;
export type MapOverlay = keyof typeof mapOverlays;
export type SubscriptionStatus = keyof typeof subscriptionStatus;
export type PerformanceIndicator = keyof typeof performanceIndicators;
export type ConnectionStatus = keyof typeof connectionStatus;

// Semantic action types
export type InteractionState = keyof typeof interactionStates;
export type InteractionVariant = keyof typeof interactionStates.primary;
export type FieldState = keyof typeof fieldStates;
export type LinkState = keyof typeof linkStates;
export type SurfaceState = keyof typeof surfaceStates;
export type OverlayState = keyof typeof overlayStates;

// Component types
export type ButtonSize = keyof typeof buttonTokens.size;
export type ButtonVariant = keyof typeof buttonTokens.variant;
export type ButtonShape = keyof typeof buttonTokens.shape;

export type InputSize = keyof typeof inputTokens.size;
export type InputState = keyof typeof inputTokens.state;

export type CardSize = keyof typeof cardTokens.size;
export type CardVariant = keyof typeof cardTokens.variant;

export type BadgeSize = keyof typeof badgeTokens.size;
export type BadgeVariant = keyof typeof badgeTokens.variant;

export type TableComponent = keyof typeof tableTokens;

export type ModalSize = keyof typeof modalTokens.size;
export type ModalComponent = keyof typeof modalTokens;

export type NavigationState = keyof typeof navigationTokens.state;

export type ToastVariant = keyof typeof toastTokens.variant;
export type ToastSize = keyof typeof toastTokens.size;

export type DropdownComponent = keyof typeof dropdownTokens;

// Color value types
export interface ColorValue {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SemanticColorValue {
  color: string;
  background: string;
  border: string;
  icon: string;
  text: string;
}

export interface StatusColorValue extends SemanticColorValue {
  pulse?: string;
  dot?: string;
  badge?: string;
}

// Typography value types
export interface FontSizeValue {
  size: string;
  lineHeight: string;
}

export interface TypographyScale {
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, FontSizeValue>;
  fontWeight: Record<string, string>;
  letterSpacing: Record<string, string>;
  lineHeight: Record<string, string>;
}

// Component size types
export interface ComponentSize {
  height?: string;
  width?: string;
  padding?: string;
  paddingX?: string;
  paddingY?: string;
  fontSize?: string;
  lineHeight?: string;
  gap?: string;
  iconSize?: string;
  borderRadius?: string;
  borderWidth?: string;
}

// Interaction state types
export interface StateValue {
  background?: string;
  color?: string;
  border?: string;
  ring?: string;
  shadow?: string;
  textDecoration?: string;
}

export interface InteractionStateValue {
  default: StateValue;
  hover: StateValue;
  active: StateValue;
  focus: StateValue;
  disabled: StateValue;
}

// Validation types
export interface TokenValidationError {
  path: string;
  expected: string;
  received: string;
  message: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  errors: TokenValidationError[];
}

// Design system configuration
export interface DesignSystemConfig {
  prefix?: string;
  generateCSS?: boolean;
  generateSass?: boolean;
  outputDir?: string;
  formats?: Array<'css' | 'scss' | 'js' | 'ts' | 'json'>;
}

// Token metadata
export interface TokenMetadata {
  name: string;
  description?: string;
  category: 'core' | 'semantic' | 'component';
  subcategory?: string;
  deprecated?: boolean;
  alias?: string;
  group?: string;
}

// Export utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type TokenPath<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? `${K}.${TokenPath<T[K]>}`
    : K
  : never;

export type TokenValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? TokenValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// CSS custom property types
export interface CSSCustomProperty {
  name: string;
  value: string;
  fallback?: string;
}

export type CSSCustomProperties = Record<string, CSSCustomProperty>;

// Theme types
export interface Theme {
  colors: typeof brandColors;
  typography: typeof brandTypography;
  spacing: typeof brandSpacing;
  radius: typeof brandRadius;
  shadows: typeof brandShadows;
  motion: typeof brandMotion;
  breakpoints: typeof brandBreakpoints;
  zIndex: typeof brandZIndex;
}

export interface ThemeOverride {
  colors?: Partial<typeof brandColors>;
  typography?: Partial<typeof brandTypography>;
  spacing?: Partial<typeof brandSpacing>;
  radius?: Partial<typeof brandRadius>;
  shadows?: Partial<typeof brandShadows>;
  motion?: Partial<typeof brandMotion>;
  breakpoints?: Partial<typeof brandBreakpoints>;
  zIndex?: Partial<typeof brandZIndex>;
}