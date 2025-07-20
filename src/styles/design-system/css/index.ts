/**
 * CSS Custom Properties Generator
 * Generates CSS variables for runtime theming support
 */

import { 
  brandColors, 
  brandTypography, 
  brandSpacing, 
  brandRadius,
  brandShadows,
  brandMotion,
  brandBreakpoints,
  brandZIndex,
} from '../tokens/core/brand';

import {
  driverStatus,
  jobStatus,
  priorityLevels,
  vehicleTypes,
  mapOverlays,
  subscriptionStatus,
  performanceIndicators,
  connectionStatus,
} from '../tokens/semantic/logistics';

import {
  interactionStates,
  fieldStates,
  linkStates,
  surfaceStates,
  overlayStates,
} from '../tokens/semantic/actions';

/**
 * Converts a nested token object to CSS custom properties
 */
function generateCSSProperties(
  tokens: Record<string, any>,
  prefix: string = '--logistics',
  parentKey: string = ''
): Record<string, string> {
  const cssProps: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(tokens)) {
    const propName = parentKey 
      ? `${prefix}-${parentKey}-${key}`
      : `${prefix}-${key}`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      const nestedProps = generateCSSProperties(
        value,
        prefix,
        parentKey ? `${parentKey}-${key}` : key
      );
      Object.assign(cssProps, nestedProps);
    } else if (Array.isArray(value)) {
      // Handle array values (like font families)
      cssProps[propName] = value.join(', ');
    } else {
      // Handle primitive values
      cssProps[propName] = String(value);
    }
  }
  
  return cssProps;
}

/**
 * Generate core brand CSS custom properties
 */
export function generateCoreBrandCSS(): string {
  const coreProps = {
    ...generateCSSProperties(brandColors, '--logistics-color'),
    ...generateCSSProperties(brandSpacing, '--logistics-spacing'),
    ...generateCSSProperties(brandRadius, '--logistics-radius'),
    ...generateCSSProperties(brandShadows, '--logistics-shadow'),
    ...generateCSSProperties(brandMotion.duration, '--logistics-duration'),
    ...generateCSSProperties(brandMotion.easing, '--logistics-easing'),
    ...generateCSSProperties(brandBreakpoints, '--logistics-breakpoint'),
    ...generateCSSProperties(brandZIndex, '--logistics-z'),
  };
  
  // Add typography properties with special handling
  const fontFamilyProps = Object.entries(brandTypography.fontFamily).map(
    ([key, value]) => `  --logistics-font-family-${key}: ${value.join(', ')};`
  ).join('\n');
  
  const fontSizeProps = Object.entries(brandTypography.fontSize).map(
    ([key, value]) => {
      return [
        `  --logistics-font-size-${key}: ${value.size};`,
        `  --logistics-line-height-${key}: ${value.lineHeight};`
      ].join('\n');
    }
  ).join('\n');
  
  const fontWeightProps = Object.entries(brandTypography.fontWeight).map(
    ([key, value]) => `  --logistics-font-weight-${key}: ${value};`
  ).join('\n');
  
  const letterSpacingProps = Object.entries(brandTypography.letterSpacing).map(
    ([key, value]) => `  --logistics-letter-spacing-${key}: ${value};`
  ).join('\n');
  
  const lineHeightProps = Object.entries(brandTypography.lineHeight).map(
    ([key, value]) => `  --logistics-line-height-base-${key}: ${value};`
  ).join('\n');
  
  // Convert core properties to CSS string
  const coreCSSProps = Object.entries(coreProps).map(
    ([prop, value]) => `  ${prop}: ${value};`
  ).join('\n');
  
  return `:root {
${coreCSSProps}

  /* Typography Properties */
${fontFamilyProps}

${fontSizeProps}

${fontWeightProps}

${letterSpacingProps}

${lineHeightProps}
}`;
}

/**
 * Generate semantic logistics CSS custom properties
 */
export function generateSemanticLogisticsCSS(): string {
  const semanticProps = {
    ...generateCSSProperties(driverStatus, '--logistics-driver-status'),
    ...generateCSSProperties(jobStatus, '--logistics-job-status'),
    ...generateCSSProperties(priorityLevels, '--logistics-priority'),
    ...generateCSSProperties(vehicleTypes, '--logistics-vehicle'),
    ...generateCSSProperties(mapOverlays, '--logistics-map'),
    ...generateCSSProperties(subscriptionStatus, '--logistics-subscription'),
    ...generateCSSProperties(performanceIndicators, '--logistics-performance'),
    ...generateCSSProperties(connectionStatus, '--logistics-connection'),
  };
  
  const semanticCSSProps = Object.entries(semanticProps).map(
    ([prop, value]) => `  ${prop}: ${value};`
  ).join('\n');
  
  return `:root {
  /* Logistics Semantic Properties */
${semanticCSSProps}
}`;
}

/**
 * Generate action-based semantic CSS custom properties
 */
export function generateSemanticActionsCSS(): string {
  const actionProps = {
    ...generateCSSProperties(interactionStates, '--logistics-interaction'),
    ...generateCSSProperties(fieldStates, '--logistics-field'),
    ...generateCSSProperties(linkStates, '--logistics-link'),
    ...generateCSSProperties(surfaceStates, '--logistics-surface'),
    ...generateCSSProperties(overlayStates, '--logistics-overlay'),
  };
  
  const actionCSSProps = Object.entries(actionProps).map(
    ([prop, value]) => `  ${prop}: ${value};`
  ).join('\n');
  
  return `:root {
  /* Action Semantic Properties */
${actionCSSProps}
}`;
}

/**
 * Generate complete CSS custom properties
 */
export function generateCompleteCSS(): string {
  const coreCSS = generateCoreBrandCSS();
  const semanticLogisticsCSS = generateSemanticLogisticsCSS();
  const semanticActionsCSS = generateSemanticActionsCSS();
  
  return `/*
 * Logistics Design System - CSS Custom Properties
 * Generated automatically from design tokens
 * 
 * Usage:
 *   color: var(--logistics-color-primary-500);
 *   margin: var(--logistics-spacing-4);
 *   border-radius: var(--logistics-radius-md);
 */

${coreCSS}

${semanticLogisticsCSS}

${semanticActionsCSS}

/* Utility Classes */
.logistics-container {
  max-width: var(--logistics-breakpoint-2xl);
  margin: 0 auto;
  padding: 0 var(--logistics-spacing-4);
}

.logistics-surface {
  background-color: var(--logistics-surface-default-background);
  border: 1px solid var(--logistics-surface-default-border);
  border-radius: var(--logistics-radius-lg);
  box-shadow: var(--logistics-shadow-sm);
}

.logistics-button-primary {
  background-color: var(--logistics-interaction-primary-default-background);
  color: var(--logistics-interaction-primary-default-color);
  border: 1px solid var(--logistics-interaction-primary-default-border);
  border-radius: var(--logistics-radius-md);
  padding: var(--logistics-spacing-2) var(--logistics-spacing-4);
  font-size: var(--logistics-font-size-sm);
  font-weight: var(--logistics-font-weight-medium);
  transition: all var(--logistics-duration-normal) var(--logistics-easing-out);
}

.logistics-button-primary:hover {
  background-color: var(--logistics-interaction-primary-hover-background);
  border-color: var(--logistics-interaction-primary-hover-border);
}

.logistics-button-primary:focus {
  outline: 2px solid var(--logistics-interaction-primary-focus-ring);
  outline-offset: 2px;
}

.logistics-input {
  background-color: var(--logistics-field-default-background);
  color: var(--logistics-field-default-color);
  border: 1px solid var(--logistics-field-default-border);
  border-radius: var(--logistics-radius-md);
  padding: var(--logistics-spacing-2) var(--logistics-spacing-3);
  font-size: var(--logistics-font-size-sm);
  transition: border-color var(--logistics-duration-normal) var(--logistics-easing-out);
}

.logistics-input:focus {
  outline: none;
  border-color: var(--logistics-field-focus-border);
  box-shadow: 0 0 0 3px var(--logistics-field-focus-ring);
}

.logistics-badge-success {
  background-color: var(--logistics-driver-status-available-background);
  color: var(--logistics-driver-status-available-text);
  border: 1px solid var(--logistics-driver-status-available-border);
  border-radius: var(--logistics-radius-full);
  padding: var(--logistics-spacing-1) var(--logistics-spacing-2-5);
  font-size: var(--logistics-font-size-xs);
  font-weight: var(--logistics-font-weight-medium);
}

.logistics-badge-warning {
  background-color: var(--logistics-driver-status-busy-background);
  color: var(--logistics-driver-status-busy-text);
  border: 1px solid var(--logistics-driver-status-busy-border);
  border-radius: var(--logistics-radius-full);
  padding: var(--logistics-spacing-1) var(--logistics-spacing-2-5);
  font-size: var(--logistics-font-size-xs);
  font-weight: var(--logistics-font-weight-medium);
}

.logistics-badge-error {
  background-color: var(--logistics-driver-status-offline-background);
  color: var(--logistics-driver-status-offline-text);
  border: 1px solid var(--logistics-driver-status-offline-border);
  border-radius: var(--logistics-radius-full);
  padding: var(--logistics-spacing-1) var(--logistics-spacing-2-5);
  font-size: var(--logistics-font-size-xs);
  font-weight: var(--logistics-font-weight-medium);
}

/* Animation Classes */
.logistics-fade-in {
  animation: logistics-fade-in var(--logistics-duration-normal) var(--logistics-easing-out);
}

.logistics-slide-up {
  animation: logistics-slide-up var(--logistics-duration-normal) var(--logistics-easing-out);
}

.logistics-pulse {
  animation: logistics-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes logistics-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes logistics-slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes logistics-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive Utilities */
@media (max-width: ${brandBreakpoints.sm}) {
  .logistics-container {
    padding: 0 var(--logistics-spacing-3);
  }
  
  .logistics-button-primary {
    padding: var(--logistics-spacing-2-5) var(--logistics-spacing-3);
    font-size: var(--logistics-font-size-xs);
  }
}

/* Dark Theme Support (Example) */
@media (prefers-color-scheme: dark) {
  :root {
    --logistics-surface-default-background: var(--logistics-color-neutral-900);
    --logistics-surface-default-border: var(--logistics-color-neutral-700);
  }
}

/* High Contrast Support */
@media (prefers-contrast: high) {
  :root {
    --logistics-interaction-primary-default-background: var(--logistics-color-primary-700);
    --logistics-surface-default-border: var(--logistics-color-neutral-900);
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .logistics-button-primary,
  .logistics-input {
    transition: none;
  }
  
  .logistics-fade-in,
  .logistics-slide-up,
  .logistics-pulse {
    animation: none;
  }
}`;
}

/**
 * Generate SCSS variables from tokens
 */
export function generateSCSSVariables(): string {
  const generateSCSSProps = (
    tokens: Record<string, any>,
    prefix: string = '$logistics',
    parentKey: string = ''
  ): string => {
    const scssVars: string[] = [];
    
    for (const [key, value] of Object.entries(tokens)) {
      const varName = parentKey 
        ? `${prefix}-${parentKey}-${key}`
        : `${prefix}-${key}`;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        scssVars.push(generateSCSSProps(
          value,
          prefix,
          parentKey ? `${parentKey}-${key}` : key
        ));
      } else if (Array.isArray(value)) {
        scssVars.push(`${varName}: ${value.join(', ')};`);
      } else {
        scssVars.push(`${varName}: ${value};`);
      }
    }
    
    return scssVars.join('\n');
  };
  
  const coreVars = generateSCSSProps(brandColors, '$logistics-color');
  const spacingVars = generateSCSSProps(brandSpacing, '$logistics-spacing');
  const radiusVars = generateSCSSProps(brandRadius, '$logistics-radius');
  
  return `// Logistics Design System - SCSS Variables
// Generated automatically from design tokens

// Colors
${coreVars}

// Spacing
${spacingVars}

// Border Radius
${radiusVars}

// Typography
$logistics-font-family-sans: ${brandTypography.fontFamily.sans.join(', ')};
$logistics-font-family-mono: ${brandTypography.fontFamily.mono.join(', ')};

// Breakpoints
$logistics-breakpoint-xs: ${brandBreakpoints.xs};
$logistics-breakpoint-sm: ${brandBreakpoints.sm};
$logistics-breakpoint-md: ${brandBreakpoints.md};
$logistics-breakpoint-lg: ${brandBreakpoints.lg};
$logistics-breakpoint-xl: ${brandBreakpoints.xl};
$logistics-breakpoint-2xl: ${brandBreakpoints['2xl']};`;
}

/**
 * Export token values as JavaScript/TypeScript module
 */
export function generateTokensModule(): string {
  return `// Logistics Design System - Token Values
// Generated automatically from design tokens

export const logisticsTokens = {
  colors: ${JSON.stringify(brandColors, null, 2)},
  spacing: ${JSON.stringify(brandSpacing, null, 2)},
  radius: ${JSON.stringify(brandRadius, null, 2)},
  shadows: ${JSON.stringify(brandShadows, null, 2)},
  motion: ${JSON.stringify(brandMotion, null, 2)},
  breakpoints: ${JSON.stringify(brandBreakpoints, null, 2)},
  zIndex: ${JSON.stringify(brandZIndex, null, 2)},
  typography: ${JSON.stringify(brandTypography, null, 2)},
  
  // Semantic tokens
  driverStatus: ${JSON.stringify(driverStatus, null, 2)},
  jobStatus: ${JSON.stringify(jobStatus, null, 2)},
  priorityLevels: ${JSON.stringify(priorityLevels, null, 2)},
  vehicleTypes: ${JSON.stringify(vehicleTypes, null, 2)},
  mapOverlays: ${JSON.stringify(mapOverlays, null, 2)},
  subscriptionStatus: ${JSON.stringify(subscriptionStatus, null, 2)},
  performanceIndicators: ${JSON.stringify(performanceIndicators, null, 2)},
  connectionStatus: ${JSON.stringify(connectionStatus, null, 2)},
  
  // Action states
  interactionStates: ${JSON.stringify(interactionStates, null, 2)},
  fieldStates: ${JSON.stringify(fieldStates, null, 2)},
  linkStates: ${JSON.stringify(linkStates, null, 2)},
  surfaceStates: ${JSON.stringify(surfaceStates, null, 2)},
  overlayStates: ${JSON.stringify(overlayStates, null, 2)},
} as const;

export type LogisticsTokens = typeof logisticsTokens;`;
}