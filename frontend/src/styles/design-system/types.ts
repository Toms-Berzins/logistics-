/**
 * TypeScript types for design system tokens
 * Comprehensive type definitions for compile-time token validation
 */

import type {
  colors,
  spacing,
  typography,
  shadows,
  animations,
  designTokens,
  breakpoints,
  grid,
  accessibility,
} from './tokens';

// =============================================================================
// COLOR TYPES
// =============================================================================

// Brand color types
export type BrandColorScale = keyof typeof colors.brand.primary;
export type BrandPrimaryColor = `primary-${BrandColorScale}`;
export type BrandSecondaryColor = `secondary-${BrandColorScale}`;

// Semantic color types
export type SemanticColorScale = keyof typeof colors.semantic.success;
export type SuccessColor = `success-${SemanticColorScale}`;
export type WarningColor = `warning-${SemanticColorScale}`;
export type ErrorColor = `error-${SemanticColorScale}`;
export type InfoColor = `info-${SemanticColorScale}`;

// Neutral color types
export type NeutralColorScale = keyof typeof colors.neutral;
export type NeutralColor = `neutral-${NeutralColorScale}`;

// Logistics color types
export type DriverStatus = keyof typeof colors.logistics.driver;
export type DriverStatusColor = `driver-${DriverStatus}`;

export type JobStatus = keyof typeof colors.logistics.job;
export type JobStatusColor = `job-${JobStatus}`;

export type RouteStatus = keyof typeof colors.logistics.route;
export type RouteStatusColor = `route-${RouteStatus}`;

export type PriorityLevel = keyof typeof colors.logistics.priority;
export type PriorityColor = `priority-${PriorityLevel}`;

// AI color types
export type AIPredictionLevel = keyof typeof colors.ai.prediction;
export type AIColor = `ai-${AIPredictionLevel}`;

// Union type for all possible colors
export type ColorToken = 
  | BrandPrimaryColor
  | BrandSecondaryColor
  | SuccessColor
  | WarningColor
  | ErrorColor
  | InfoColor
  | NeutralColor
  | DriverStatusColor
  | JobStatusColor
  | RouteStatusColor
  | PriorityColor
  | AIColor;

// Color utility types
export type ColorValue = string;
export type ColorScale<T extends Record<string, any>> = keyof T;

// =============================================================================
// SPACING TYPES
// =============================================================================

// Base spacing scale
export type BaseSpacingScale = keyof typeof spacing.base;
export type BaseSpacingToken = BaseSpacingScale;

// Semantic spacing types
export type MicroSpacing = keyof typeof spacing.semantic.micro;
export type ComponentSpacing = keyof typeof spacing.semantic.component;
export type LayoutSpacing = keyof typeof spacing.semantic.layout;
export type SectionSpacing = keyof typeof spacing.semantic.section;

// Logistics spacing types
export type DashboardSpacing = keyof typeof spacing.logistics.dashboard;
export type TableSpacing = keyof typeof spacing.logistics.table;
export type FormSpacing = keyof typeof spacing.logistics.form;
export type MapSpacing = keyof typeof spacing.logistics.map;
export type MobileSpacing = keyof typeof spacing.logistics.mobile;
export type ModalSpacing = keyof typeof spacing.logistics.modal;
export type IndicatorSpacing = keyof typeof spacing.logistics.indicator;

// Border radius types
export type BorderRadiusScale = keyof typeof spacing.borderRadius;
export type BorderRadiusToken = BorderRadiusScale;

// Content width types
export type TextWidth = keyof typeof spacing.contentWidth.text;
export type ContainerWidth = keyof typeof spacing.contentWidth.container;
export type DashboardWidth = keyof typeof spacing.contentWidth.dashboard;

// Z-index types
export type ZIndexScale = keyof typeof spacing.zIndex;
export type ZIndexToken = ZIndexScale;

// Union type for all spacing tokens
export type SpacingToken = 
  | BaseSpacingToken
  | `micro-${MicroSpacing}`
  | `component-${ComponentSpacing}`
  | `layout-${LayoutSpacing}`
  | `section-${SectionSpacing}`;

// =============================================================================
// TYPOGRAPHY TYPES
// =============================================================================

// Font family types
export type FontFamily = keyof typeof typography.fontFamilies;

// Font weight types
export type FontWeight = keyof typeof typography.fontWeights;
export type FontWeightValue = typeof typography.fontWeights[FontWeight];

// Font size types
export type FontSizeScale = keyof typeof typography.fontSizes;
export type FontSizeToken = FontSizeScale;

// Typography style types
export type DisplayStyle = keyof typeof typography.styles.display;
export type HeadingLevel = keyof typeof typography.styles.heading;
export type BodyStyle = keyof typeof typography.styles.body;
export type CaptionStyle = keyof typeof typography.styles.caption;
export type CodeStyle = keyof typeof typography.styles.code;

// Logistics typography types
export type DashboardTypography = keyof typeof typography.logistics.dashboard;
export type TableTypography = keyof typeof typography.logistics.table;
export type StatusTypography = keyof typeof typography.logistics.status;
export type FormTypography = keyof typeof typography.logistics.form;
export type NavigationTypography = keyof typeof typography.logistics.navigation;
export type ButtonTypography = keyof typeof typography.logistics.button;

// Typography token union type
export type TypographyToken = 
  | FontSizeToken
  | `display-${DisplayStyle}`
  | `heading-${HeadingLevel}`
  | `body-${BodyStyle}`
  | `caption-${CaptionStyle}`
  | `code-${CodeStyle}`;

// =============================================================================
// SHADOW TYPES
// =============================================================================

// Base shadow types
export type BaseShadowScale = keyof typeof shadows.base;
export type BaseShadowToken = BaseShadowScale;

// Elevation types
export type ElevationLevel = keyof typeof shadows.elevation.surface;
export type ElevationToken = `elevation-${ElevationLevel}`;

export type InteractiveState = keyof typeof shadows.elevation.interactive;
export type InteractiveShadow = InteractiveState;

export type ComponentShadow = keyof typeof shadows.elevation.component;

// Logistics shadow types
export type DashboardShadow = keyof typeof shadows.logistics.dashboard;
export type MapShadow = keyof typeof shadows.logistics.map;
export type TableShadow = keyof typeof shadows.logistics.table;
export type FormShadow = keyof typeof shadows.logistics.form;
export type NavigationShadow = keyof typeof shadows.logistics.navigation;
export type MobileShadow = keyof typeof shadows.logistics.mobile;
export type StatusShadow = keyof typeof shadows.logistics.status;

// Focus shadow types
export type FocusShadow = keyof typeof shadows.focus;
export type FocusShadowToken = `focus-ring${FocusShadow extends 'default' ? '' : `-${FocusShadow}`}`;

// Shadow token union type
export type ShadowToken = 
  | BaseShadowToken
  | ElevationToken
  | InteractiveShadow
  | ComponentShadow
  | FocusShadowToken;

// =============================================================================
// ANIMATION TYPES
// =============================================================================

// Duration types
export type AnimationDuration = keyof typeof animations.durations;
export type DurationValue = typeof animations.durations[AnimationDuration];

// Easing function types
export type EasingFunction = keyof typeof animations.easingFunctions;
export type EasingValue = typeof animations.easingFunctions[EasingFunction];

// Transition types
export type TransitionProperty = keyof typeof animations.transitions;
export type TransitionToken = TransitionProperty;

// Keyframe types
export type KeyframeName = keyof typeof animations.keyframes;
export type KeyframeToken = KeyframeName;

// Logistics animation types
export type RealtimeAnimation = keyof typeof animations.logistics.realtime;
export type MapAnimation = keyof typeof animations.logistics.map;
export type DashboardAnimation = keyof typeof animations.logistics.dashboard;
export type TableAnimation = keyof typeof animations.logistics.table;
export type FormAnimation = keyof typeof animations.logistics.form;
export type ModalAnimation = keyof typeof animations.logistics.modal;
export type LoadingAnimation = keyof typeof animations.logistics.loading;

// Animation token union type
export type AnimationToken = 
  | KeyframeToken
  | `realtime-${RealtimeAnimation}`
  | `map-${MapAnimation}`
  | `dashboard-${DashboardAnimation}`
  | `table-${TableAnimation}`
  | `form-${FormAnimation}`
  | `modal-${ModalAnimation}`
  | `loading-${LoadingAnimation}`;

// =============================================================================
// RESPONSIVE TYPES
// =============================================================================

// Breakpoint types
export type BreakpointScale = keyof typeof breakpoints;
export type BreakpointToken = BreakpointScale;
export type BreakpointValue = typeof breakpoints[BreakpointScale];

// Grid types
export type GridColumns = keyof typeof grid.columns;
export type GridGap = keyof typeof grid.gap;
export type GridMaxWidth = keyof typeof grid.maxWidth;

// Responsive utility types
export type ResponsiveValue<T> = T | Partial<Record<BreakpointToken, T>>;

// =============================================================================
// ACCESSIBILITY TYPES
// =============================================================================

// Contrast types
export type ContrastLevel = keyof typeof accessibility.contrast;
export type ContrastRatio = typeof accessibility.contrast[ContrastLevel];

// Touch target types
export type TouchTargetSize = keyof typeof accessibility.touchTarget;
export type TouchTargetValue = typeof accessibility.touchTarget[TouchTargetSize];

// Focus types
export type FocusProperty = keyof typeof accessibility.focus;

// Motion preference types
export type MotionPreference = 'reduce' | 'safe';

// =============================================================================
// DESIGN TOKEN UNION TYPES
// =============================================================================

// All possible design tokens
export type DesignToken = 
  | ColorToken
  | SpacingToken
  | TypographyToken
  | ShadowToken
  | AnimationToken
  | BreakpointToken;

// Token category types
export type TokenCategory = 
  | 'colors'
  | 'spacing'
  | 'typography'
  | 'shadows'
  | 'animations'
  | 'breakpoints'
  | 'grid'
  | 'accessibility';

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Token validation types
export type ValidToken<T extends TokenCategory> = 
  T extends 'colors' ? ColorToken :
  T extends 'spacing' ? SpacingToken :
  T extends 'typography' ? TypographyToken :
  T extends 'shadows' ? ShadowToken :
  T extends 'animations' ? AnimationToken :
  T extends 'breakpoints' ? BreakpointToken :
  never;

// CSS custom property types
export type CSSVariable = `--${string}`;
export type CSSValue = string | number;

// Token value extraction types
export type ExtractTokenValue<T> = T extends `${string}-${infer U}` ? U : T;

// Conditional token types
export type ConditionalToken<T, K extends string> = T extends `${K}-${infer U}` ? U : never;

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

// Common component props using design tokens
export interface BaseComponentProps {
  className?: string;
  color?: ColorToken;
  size?: SpacingToken;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

// Layout component props
export interface LayoutProps {
  spacing?: SpacingToken;
  maxWidth?: ContainerWidth;
  padding?: SpacingToken;
  margin?: SpacingToken;
  gap?: SpacingToken;
}

// Typography component props
export interface TypographyProps {
  fontSize?: FontSizeToken;
  fontWeight?: FontWeight;
  fontFamily?: FontFamily;
  lineHeight?: string;
  letterSpacing?: string;
}

// Interactive component props
export interface InteractiveProps {
  shadow?: ShadowToken;
  elevation?: ElevationLevel;
  animation?: AnimationToken;
  transition?: TransitionToken;
  focusRing?: FocusShadow;
}

// Responsive component props
export interface ResponsiveProps {
  breakpoint?: BreakpointToken;
  responsive?: boolean;
  hideAt?: BreakpointToken;
  showAt?: BreakpointToken;
}

// Logistics-specific component props
export interface LogisticsProps {
  driverStatus?: DriverStatus;
  jobStatus?: JobStatus;
  routeStatus?: RouteStatus;
  priority?: PriorityLevel;
  realtime?: boolean;
}

// =============================================================================
// THEME TYPES
// =============================================================================

// Theme configuration types
export interface ThemeColors {
  brand: typeof colors.brand;
  semantic: typeof colors.semantic;
  neutral: typeof colors.neutral;
  logistics: typeof colors.logistics;
  ai: typeof colors.ai;
  accessibility: typeof colors.accessibility;
}

export interface ThemeSpacing {
  base: typeof spacing.base;
  semantic: typeof spacing.semantic;
  logistics: typeof spacing.logistics;
  borderRadius: typeof spacing.borderRadius;
  contentWidth: typeof spacing.contentWidth;
  zIndex: typeof spacing.zIndex;
}

export interface ThemeTypography {
  fontFamilies: typeof typography.fontFamilies;
  fontWeights: typeof typography.fontWeights;
  fontSizes: typeof typography.fontSizes;
  styles: typeof typography.styles;
  logistics: typeof typography.logistics;
}

export interface ThemeShadows {
  base: typeof shadows.base;
  colored: typeof shadows.colored;
  elevation: typeof shadows.elevation;
  logistics: typeof shadows.logistics;
  focus: typeof shadows.focus;
}

export interface ThemeAnimations {
  durations: typeof animations.durations;
  easingFunctions: typeof animations.easingFunctions;
  transitions: typeof animations.transitions;
  keyframes: typeof animations.keyframes;
  logistics: typeof animations.logistics;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  breakpoints: typeof breakpoints;
  grid: typeof grid;
  accessibility: typeof accessibility;
}

// Theme context types
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  toggleDarkMode: () => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

// =============================================================================
// UTILITY FUNCTION TYPES
// =============================================================================

// Token getter function types
export type GetToken = <T extends TokenCategory>(
  category: T,
  token: ValidToken<T>
) => string;

export type GetColorToken = (token: ColorToken) => ColorValue;
export type GetSpacingToken = (token: SpacingToken) => string;
export type GetTypographyToken = (token: TypographyToken) => any;
export type GetShadowToken = (token: ShadowToken) => string;
export type GetAnimationToken = (token: AnimationToken) => string;

// Validation function types
export type ValidateToken = <T extends TokenCategory>(
  category: T,
  token: string
) => token is ValidToken<T>;

// CSS generation function types
export type GenerateCSS = (tokens: Partial<Theme>) => string;
export type GenerateCSSVariables = (tokens: Partial<Theme>) => Record<CSSVariable, CSSValue>;

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type {
  // Core design system type
  Theme as DesignSystemTheme,
  ThemeContextValue as DesignSystemContext,
  
  // Re-export main token types for convenience
  ColorToken as Color,
  SpacingToken as Spacing,
  TypographyToken as Typography,
  ShadowToken as Shadow,
  AnimationToken as Animation,
  BreakpointToken as Breakpoint,
  
  // Component prop types
  BaseComponentProps,
  LayoutProps,
  TypographyProps,
  InteractiveProps,
  ResponsiveProps,
  LogisticsProps,
};