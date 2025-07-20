/**
 * Action-based semantic tokens
 * These tokens define interactive states and user actions
 */

import { brandColors } from '../core/brand';

// Interactive states
export const interactionStates = {
  // Primary actions
  primary: {
    default: {
      background: brandColors.primary[600],
      color: brandColors.neutral[50],
      border: brandColors.primary[600],
    },
    hover: {
      background: brandColors.primary[700],
      color: brandColors.neutral[50],
      border: brandColors.primary[700],
    },
    active: {
      background: brandColors.primary[800],
      color: brandColors.neutral[50],
      border: brandColors.primary[800],
    },
    focus: {
      background: brandColors.primary[600],
      color: brandColors.neutral[50],
      border: brandColors.primary[600],
      ring: brandColors.primary[200],
    },
    disabled: {
      background: brandColors.neutral[200],
      color: brandColors.neutral[400],
      border: brandColors.neutral[200],
    },
  },

  // Secondary actions
  secondary: {
    default: {
      background: brandColors.neutral[50],
      color: brandColors.neutral[700],
      border: brandColors.neutral[300],
    },
    hover: {
      background: brandColors.neutral[100],
      color: brandColors.neutral[800],
      border: brandColors.neutral[400],
    },
    active: {
      background: brandColors.neutral[200],
      color: brandColors.neutral[900],
      border: brandColors.neutral[400],
    },
    focus: {
      background: brandColors.neutral[50],
      color: brandColors.neutral[700],
      border: brandColors.neutral[300],
      ring: brandColors.primary[200],
    },
    disabled: {
      background: brandColors.neutral[50],
      color: brandColors.neutral[300],
      border: brandColors.neutral[200],
    },
  },

  // Destructive actions
  destructive: {
    default: {
      background: brandColors.error[600],
      color: brandColors.neutral[50],
      border: brandColors.error[600],
    },
    hover: {
      background: brandColors.error[700],
      color: brandColors.neutral[50],
      border: brandColors.error[700],
    },
    active: {
      background: brandColors.error[800],
      color: brandColors.neutral[50],
      border: brandColors.error[800],
    },
    focus: {
      background: brandColors.error[600],
      color: brandColors.neutral[50],
      border: brandColors.error[600],
      ring: brandColors.error[200],
    },
    disabled: {
      background: brandColors.neutral[200],
      color: brandColors.neutral[400],
      border: brandColors.neutral[200],
    },
  },

  // Ghost/text actions
  ghost: {
    default: {
      background: 'transparent',
      color: brandColors.neutral[700],
      border: 'transparent',
    },
    hover: {
      background: brandColors.neutral[100],
      color: brandColors.neutral[800],
      border: 'transparent',
    },
    active: {
      background: brandColors.neutral[200],
      color: brandColors.neutral[900],
      border: 'transparent',
    },
    focus: {
      background: 'transparent',
      color: brandColors.neutral[700],
      border: 'transparent',
      ring: brandColors.primary[200],
    },
    disabled: {
      background: 'transparent',
      color: brandColors.neutral[300],
      border: 'transparent',
    },
  },

  // Success actions
  success: {
    default: {
      background: brandColors.success[600],
      color: brandColors.neutral[50],
      border: brandColors.success[600],
    },
    hover: {
      background: brandColors.success[700],
      color: brandColors.neutral[50],
      border: brandColors.success[700],
    },
    active: {
      background: brandColors.success[800],
      color: brandColors.neutral[50],
      border: brandColors.success[800],
    },
    focus: {
      background: brandColors.success[600],
      color: brandColors.neutral[50],
      border: brandColors.success[600],
      ring: brandColors.success[200],
    },
    disabled: {
      background: brandColors.neutral[200],
      color: brandColors.neutral[400],
      border: brandColors.neutral[200],
    },
  },
} as const;

// Form field states
export const fieldStates = {
  default: {
    background: brandColors.neutral[50],
    color: brandColors.neutral[900],
    border: brandColors.neutral[300],
    placeholder: brandColors.neutral[400],
  },
  
  focus: {
    background: brandColors.neutral[50],
    color: brandColors.neutral[900],
    border: brandColors.primary[500],
    ring: brandColors.primary[200],
    placeholder: brandColors.neutral[400],
  },
  
  error: {
    background: brandColors.neutral[50],
    color: brandColors.neutral[900],
    border: brandColors.error[500],
    ring: brandColors.error[200],
    placeholder: brandColors.neutral[400],
  },
  
  success: {
    background: brandColors.neutral[50],
    color: brandColors.neutral[900],
    border: brandColors.success[500],
    ring: brandColors.success[200],
    placeholder: brandColors.neutral[400],
  },
  
  disabled: {
    background: brandColors.neutral[100],
    color: brandColors.neutral[400],
    border: brandColors.neutral[200],
    placeholder: brandColors.neutral[300],
  },
  
  readonly: {
    background: brandColors.neutral[50],
    color: brandColors.neutral[700],
    border: brandColors.neutral[200],
    placeholder: brandColors.neutral[400],
  },
} as const;

// Link states
export const linkStates = {
  default: {
    color: brandColors.primary[600],
    textDecoration: 'none',
  },
  hover: {
    color: brandColors.primary[700],
    textDecoration: 'underline',
  },
  active: {
    color: brandColors.primary[800],
    textDecoration: 'underline',
  },
  focus: {
    color: brandColors.primary[600],
    textDecoration: 'none',
    ring: brandColors.primary[200],
  },
  visited: {
    color: brandColors.primary[700],
    textDecoration: 'none',
  },
  disabled: {
    color: brandColors.neutral[400],
    textDecoration: 'none',
  },
} as const;

// Surface states (cards, panels, etc.)
export const surfaceStates = {
  default: {
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  
  hover: {
    background: brandColors.neutral[50],
    border: brandColors.neutral[300],
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  
  focus: {
    background: brandColors.neutral[50],
    border: brandColors.primary[300],
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    ring: brandColors.primary[200],
  },
  
  selected: {
    background: brandColors.primary[50],
    border: brandColors.primary[300],
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  
  disabled: {
    background: brandColors.neutral[100],
    border: brandColors.neutral[200],
    shadow: 'none',
  },
  
  elevated: {
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
} as const;

// Overlay states (modals, dropdowns, etc.)
export const overlayStates = {
  backdrop: {
    background: 'rgb(0 0 0 / 0.5)',
    backdropFilter: 'blur(4px)',
  },
  
  surface: {
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  
  popover: {
    background: brandColors.neutral[50],
    border: brandColors.neutral[200],
    shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  
  tooltip: {
    background: brandColors.neutral[900],
    color: brandColors.neutral[50],
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
} as const;