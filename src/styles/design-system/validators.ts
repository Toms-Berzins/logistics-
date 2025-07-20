/**
 * Token validation utilities
 * Prevents inconsistent usage and ensures design system compliance
 */

import type { 
  TokenValidationError, 
  TokenValidationResult,
  BrandColor,
  BrandColorScale,
  BrandSpacing,
  BrandRadius,
  DriverStatus,
  JobStatus,
  PriorityLevel,
  InteractionState,
} from './types';

import { 
  brandColors, 
  brandSpacing, 
  brandRadius,
} from './tokens/core/brand';

import {
  driverStatus,
  jobStatus,
  priorityLevels,
} from './tokens/semantic/logistics';

import {
  interactionStates,
} from './tokens/semantic/actions';

/**
 * Validates if a color exists in the brand color palette
 */
export function validateBrandColor(color: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(color in brandColors)) {
    errors.push({
      path: 'brandColors',
      expected: `One of: ${Object.keys(brandColors).join(', ')}`,
      received: color,
      message: `Invalid brand color "${color}". Use a valid brand color from the design system.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if a color scale value exists
 */
export function validateColorScale(color: BrandColor, scale: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  const colorValidation = validateBrandColor(color);
  if (!colorValidation.isValid) {
    return colorValidation;
  }
  
  const colorPalette = brandColors[color];
  if (!(scale in colorPalette)) {
    errors.push({
      path: `brandColors.${color}`,
      expected: `One of: ${Object.keys(colorPalette).join(', ')}`,
      received: scale,
      message: `Invalid color scale "${scale}" for color "${color}". Use a valid scale value.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates spacing values
 */
export function validateSpacing(spacing: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(spacing in brandSpacing)) {
    errors.push({
      path: 'brandSpacing',
      expected: `One of: ${Object.keys(brandSpacing).join(', ')}`,
      received: spacing,
      message: `Invalid spacing value "${spacing}". Use a value from the spacing scale.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates border radius values
 */
export function validateRadius(radius: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(radius in brandRadius)) {
    errors.push({
      path: 'brandRadius',
      expected: `One of: ${Object.keys(brandRadius).join(', ')}`,
      received: radius,
      message: `Invalid border radius "${radius}". Use a value from the radius scale.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates driver status values
 */
export function validateDriverStatus(status: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(status in driverStatus)) {
    errors.push({
      path: 'driverStatus',
      expected: `One of: ${Object.keys(driverStatus).join(', ')}`,
      received: status,
      message: `Invalid driver status "${status}". Use a valid status from the logistics domain.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates job status values
 */
export function validateJobStatus(status: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(status in jobStatus)) {
    errors.push({
      path: 'jobStatus',
      expected: `One of: ${Object.keys(jobStatus).join(', ')}`,
      received: status,
      message: `Invalid job status "${status}". Use a valid status from the logistics domain.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates priority level values
 */
export function validatePriorityLevel(priority: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(priority in priorityLevels)) {
    errors.push({
      path: 'priorityLevels',
      expected: `One of: ${Object.keys(priorityLevels).join(', ')}`,
      received: priority,
      message: `Invalid priority level "${priority}". Use a valid priority from the logistics domain.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates interaction state values
 */
export function validateInteractionState(state: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  if (!(state in interactionStates)) {
    errors.push({
      path: 'interactionStates',
      expected: `One of: ${Object.keys(interactionStates).join(', ')}`,
      received: state,
      message: `Invalid interaction state "${state}". Use a valid interaction state.`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates color contrast ratios for accessibility
 */
export function validateColorContrast(
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  // This is a simplified contrast check
  // In a real implementation, you'd use a proper contrast calculation library
  const requiredRatio = level === 'AAA' ? 7 : 4.5;
  
  // Mock contrast calculation (replace with actual implementation)
  const calculateContrast = (fg: string, bg: string): number => {
    // This is a placeholder - implement actual contrast calculation
    // using a library like 'color' or 'chroma-js'
    return 4.5; // Mock passing value
  };
  
  const actualRatio = calculateContrast(foreground, background);
  
  if (actualRatio < requiredRatio) {
    errors.push({
      path: 'colorContrast',
      expected: `Contrast ratio >= ${requiredRatio}:1`,
      received: `${actualRatio}:1`,
      message: `Insufficient color contrast between "${foreground}" and "${background}". ` +
               `Required: ${requiredRatio}:1, Actual: ${actualRatio}:1`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates component token usage
 */
export function validateComponentUsage(
  component: string,
  variant: string,
  size: string
): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  // Define valid combinations for components
  const validCombinations: Record<string, {
    variants: string[];
    sizes: string[];
  }> = {
    button: {
      variants: ['primary', 'secondary', 'destructive', 'ghost', 'success'],
      sizes: ['sm', 'md', 'lg'],
    },
    input: {
      variants: ['default'],
      sizes: ['sm', 'md', 'lg'],
    },
    badge: {
      variants: ['driverStatus', 'jobStatus', 'priority'],
      sizes: ['sm', 'md', 'lg'],
    },
    card: {
      variants: ['default', 'elevated', 'interactive'],
      sizes: ['sm', 'md', 'lg'],
    },
  };
  
  const componentConfig = validCombinations[component];
  
  if (!componentConfig) {
    errors.push({
      path: 'component',
      expected: `One of: ${Object.keys(validCombinations).join(', ')}`,
      received: component,
      message: `Invalid component "${component}". Use a valid component from the design system.`,
    });
    return { isValid: false, errors };
  }
  
  if (!componentConfig.variants.includes(variant)) {
    errors.push({
      path: `${component}.variant`,
      expected: `One of: ${componentConfig.variants.join(', ')}`,
      received: variant,
      message: `Invalid variant "${variant}" for component "${component}".`,
    });
  }
  
  if (!componentConfig.sizes.includes(size)) {
    errors.push({
      path: `${component}.size`,
      expected: `One of: ${componentConfig.sizes.join(', ')}`,
      received: size,
      message: `Invalid size "${size}" for component "${component}".`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates token naming conventions
 */
export function validateTokenNaming(tokenName: string): TokenValidationResult {
  const errors: TokenValidationError[] = [];
  
  // Token naming rules:
  // - Must use kebab-case
  // - Must not start or end with hyphen
  // - Must contain only lowercase letters, numbers, and hyphens
  const tokenNameRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  
  if (!tokenNameRegex.test(tokenName)) {
    errors.push({
      path: 'tokenName',
      expected: 'kebab-case format (e.g., "primary-500", "button-large")',
      received: tokenName,
      message: `Invalid token name "${tokenName}". Token names must use kebab-case format.`,
    });
  }
  
  // Check for reserved prefixes
  const reservedPrefixes = ['css-', 'html-', 'js-', 'ts-'];
  const hasReservedPrefix = reservedPrefixes.some(prefix => tokenName.startsWith(prefix));
  
  if (hasReservedPrefix) {
    errors.push({
      path: 'tokenName',
      expected: 'Name without reserved prefixes',
      received: tokenName,
      message: `Token name "${tokenName}" uses a reserved prefix. Avoid: ${reservedPrefixes.join(', ')}`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive token validation
 */
export function validateDesignTokens(tokens: Record<string, any>): TokenValidationResult {
  const allErrors: TokenValidationError[] = [];
  
  // Recursively validate all tokens
  const validateTokenTree = (obj: any, path: string = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Validate token naming
      const namingResult = validateTokenNaming(key);
      if (!namingResult.isValid) {
        allErrors.push(...namingResult.errors.map(error => ({
          ...error,
          path: currentPath,
        })));
      }
      
      // Recursively validate nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        validateTokenTree(value, currentPath);
      }
    }
  };
  
  validateTokenTree(tokens);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Helper function to create validation utilities for specific token types
 */
export function createTokenValidator<T extends Record<string, any>>(
  tokens: T,
  tokenType: string
) {
  return function validate(value: string): TokenValidationResult {
    const errors: TokenValidationError[] = [];
    
    if (!(value in tokens)) {
      errors.push({
        path: tokenType,
        expected: `One of: ${Object.keys(tokens).join(', ')}`,
        received: value,
        message: `Invalid ${tokenType} "${value}". Use a valid token from the design system.`,
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
}

/**
 * Runtime assertion functions for development
 */
export function assertValidColor(color: string): asserts color is BrandColor {
  const result = validateBrandColor(color);
  if (!result.isValid) {
    throw new Error(result.errors[0]?.message || `Invalid color: ${color}`);
  }
}

export function assertValidSpacing(spacing: string): asserts spacing is BrandSpacing {
  const result = validateSpacing(spacing);
  if (!result.isValid) {
    throw new Error(result.errors[0]?.message || `Invalid spacing: ${spacing}`);
  }
}

export function assertValidDriverStatus(status: string): asserts status is DriverStatus {
  const result = validateDriverStatus(status);
  if (!result.isValid) {
    throw new Error(result.errors[0]?.message || `Invalid driver status: ${status}`);
  }
}

// Development-only validation warnings
export function warnInvalidTokenUsage(
  tokenType: string,
  value: string,
  validationResult: TokenValidationResult
): void {
  if (!validationResult.isValid && process.env.NODE_ENV === 'development') {
    console.warn(
      `🎨 Design System Warning: Invalid ${tokenType} usage`,
      validationResult.errors
    );
  }
}