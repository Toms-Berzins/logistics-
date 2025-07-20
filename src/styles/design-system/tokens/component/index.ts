/**
 * Component-specific design tokens
 * These tokens are optimized for specific UI components and patterns
 */

import { brandSpacing, brandRadius, brandShadows, brandTypography } from '../core/brand';
import { interactionStates, fieldStates, surfaceStates } from '../semantic/actions';
import { driverStatus, jobStatus, priorityLevels } from '../semantic/logistics';

// Button component tokens
export const buttonTokens = {
  size: {
    sm: {
      height: '32px',
      paddingX: brandSpacing[3],
      paddingY: brandSpacing[1.5],
      fontSize: brandTypography.fontSize.sm.size,
      lineHeight: brandTypography.fontSize.sm.lineHeight,
      gap: brandSpacing[1.5],
      iconSize: '16px',
    },
    md: {
      height: '40px',
      paddingX: brandSpacing[4],
      paddingY: brandSpacing[2],
      fontSize: brandTypography.fontSize.sm.size,
      lineHeight: brandTypography.fontSize.sm.lineHeight,
      gap: brandSpacing[2],
      iconSize: '16px',
    },
    lg: {
      height: '48px',
      paddingX: brandSpacing[6],
      paddingY: brandSpacing[3],
      fontSize: brandTypography.fontSize.base.size,
      lineHeight: brandTypography.fontSize.base.lineHeight,
      gap: brandSpacing[2.5],
      iconSize: '20px',
    },
  },
  
  variant: {
    primary: interactionStates.primary,
    secondary: interactionStates.secondary,
    destructive: interactionStates.destructive,
    ghost: interactionStates.ghost,
    success: interactionStates.success,
  },
  
  shape: {
    default: {
      borderRadius: brandRadius.md,
    },
    pill: {
      borderRadius: brandRadius.full,
    },
    square: {
      borderRadius: brandRadius.none,
    },
  },
} as const;

// Input component tokens
export const inputTokens = {
  size: {
    sm: {
      height: '32px',
      paddingX: brandSpacing[3],
      paddingY: brandSpacing[1.5],
      fontSize: brandTypography.fontSize.sm.size,
      lineHeight: brandTypography.fontSize.sm.lineHeight,
    },
    md: {
      height: '40px',
      paddingX: brandSpacing[3],
      paddingY: brandSpacing[2],
      fontSize: brandTypography.fontSize.sm.size,
      lineHeight: brandTypography.fontSize.sm.lineHeight,
    },
    lg: {
      height: '48px',
      paddingX: brandSpacing[4],
      paddingY: brandSpacing[3],
      fontSize: brandTypography.fontSize.base.size,
      lineHeight: brandTypography.fontSize.base.lineHeight,
    },
  },
  
  state: fieldStates,
  
  shape: {
    borderRadius: brandRadius.md,
    borderWidth: '1px',
  },
} as const;

// Card component tokens
export const cardTokens = {
  size: {
    sm: {
      padding: brandSpacing[4],
      gap: brandSpacing[3],
    },
    md: {
      padding: brandSpacing[6],
      gap: brandSpacing[4],
    },
    lg: {
      padding: brandSpacing[8],
      gap: brandSpacing[6],
    },
  },
  
  variant: {
    default: surfaceStates.default,
    elevated: surfaceStates.elevated,
    interactive: {
      default: surfaceStates.default,
      hover: surfaceStates.hover,
      focus: surfaceStates.focus,
    },
  },
  
  shape: {
    borderRadius: brandRadius.lg,
    borderWidth: '1px',
  },
} as const;

// Badge component tokens
export const badgeTokens = {
  size: {
    sm: {
      height: '20px',
      paddingX: brandSpacing[2],
      fontSize: brandTypography.fontSize.xs.size,
      lineHeight: brandTypography.fontSize.xs.lineHeight,
      gap: brandSpacing[1],
      iconSize: '12px',
    },
    md: {
      height: '24px',
      paddingX: brandSpacing[2.5],
      fontSize: brandTypography.fontSize.xs.size,
      lineHeight: brandTypography.fontSize.xs.lineHeight,
      gap: brandSpacing[1],
      iconSize: '14px',
    },
    lg: {
      height: '28px',
      paddingX: brandSpacing[3],
      fontSize: brandTypography.fontSize.sm.size,
      lineHeight: brandTypography.fontSize.sm.lineHeight,
      gap: brandSpacing[1.5],
      iconSize: '16px',
    },
  },
  
  variant: {
    driverStatus,
    jobStatus,
    priority: priorityLevels,
  },
  
  shape: {
    borderRadius: brandRadius.full,
    borderWidth: '1px',
  },
} as const;

// Table component tokens
export const tableTokens = {
  cell: {
    paddingX: brandSpacing[4],
    paddingY: brandSpacing[3],
    fontSize: brandTypography.fontSize.sm.size,
    lineHeight: brandTypography.fontSize.sm.lineHeight,
  },
  
  header: {
    paddingX: brandSpacing[4],
    paddingY: brandSpacing[3],
    fontSize: brandTypography.fontSize.xs.size,
    lineHeight: brandTypography.fontSize.xs.lineHeight,
    fontWeight: brandTypography.fontWeight.semibold,
    letterSpacing: brandTypography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  
  row: {
    borderWidth: '1px',
    hover: {
      backgroundColor: surfaceStates.hover.background,
    },
    selected: {
      backgroundColor: surfaceStates.selected.background,
      borderColor: surfaceStates.selected.border,
    },
  },
} as const;

// Modal component tokens
export const modalTokens = {
  backdrop: {
    backgroundColor: 'rgb(0 0 0 / 0.5)',
    backdropFilter: 'blur(4px)',
  },
  
  container: {
    padding: brandSpacing[4],
  },
  
  content: {
    backgroundColor: surfaceStates.default.background,
    borderRadius: brandRadius.xl,
    boxShadow: brandShadows.xl,
    borderWidth: '1px',
    borderColor: surfaceStates.default.border,
  },
  
  size: {
    sm: {
      maxWidth: '384px', // 24rem
    },
    md: {
      maxWidth: '512px', // 32rem
    },
    lg: {
      maxWidth: '768px', // 48rem
    },
    xl: {
      maxWidth: '1024px', // 64rem
    },
    full: {
      width: '100vw',
      height: '100vh',
      borderRadius: brandRadius.none,
    },
  },
  
  header: {
    padding: brandSpacing[6],
    borderBottomWidth: '1px',
    fontSize: brandTypography.fontSize.lg.size,
    fontWeight: brandTypography.fontWeight.semibold,
  },
  
  body: {
    padding: brandSpacing[6],
    fontSize: brandTypography.fontSize.sm.size,
  },
  
  footer: {
    padding: brandSpacing[6],
    borderTopWidth: '1px',
    gap: brandSpacing[3],
  },
} as const;

// Navigation component tokens
export const navigationTokens = {
  item: {
    paddingX: brandSpacing[3],
    paddingY: brandSpacing[2],
    fontSize: brandTypography.fontSize.sm.size,
    fontWeight: brandTypography.fontWeight.medium,
    borderRadius: brandRadius.md,
    gap: brandSpacing[2],
    iconSize: '16px',
  },
  
  state: {
    default: {
      color: interactionStates.ghost.default.color,
      backgroundColor: interactionStates.ghost.default.background,
    },
    hover: {
      color: interactionStates.ghost.hover.color,
      backgroundColor: interactionStates.ghost.hover.background,
    },
    active: {
      color: interactionStates.primary.default.color,
      backgroundColor: interactionStates.primary.default.background,
    },
    focus: {
      color: interactionStates.ghost.focus.color,
      backgroundColor: interactionStates.ghost.focus.background,
      ring: interactionStates.ghost.focus.ring,
    },
  },
} as const;

// Toast component tokens
export const toastTokens = {
  container: {
    padding: brandSpacing[4],
    borderRadius: brandRadius.lg,
    borderWidth: '1px',
    boxShadow: brandShadows.lg,
    gap: brandSpacing[3],
  },
  
  variant: {
    success: {
      backgroundColor: driverStatus.available.background,
      borderColor: driverStatus.available.border,
      color: driverStatus.available.text,
      iconColor: driverStatus.available.icon,
    },
    warning: {
      backgroundColor: driverStatus.busy.background,
      borderColor: driverStatus.busy.border,
      color: driverStatus.busy.text,
      iconColor: driverStatus.busy.icon,
    },
    error: {
      backgroundColor: driverStatus.offline.background,
      borderColor: driverStatus.offline.border,
      color: driverStatus.offline.text,
      iconColor: driverStatus.offline.icon,
    },
    info: {
      backgroundColor: driverStatus.break.background,
      borderColor: driverStatus.break.border,
      color: driverStatus.break.text,
      iconColor: driverStatus.break.icon,
    },
  },
  
  size: {
    sm: {
      padding: brandSpacing[3],
      fontSize: brandTypography.fontSize.xs.size,
      iconSize: '16px',
    },
    md: {
      padding: brandSpacing[4],
      fontSize: brandTypography.fontSize.sm.size,
      iconSize: '20px',
    },
  },
} as const;

// Dropdown component tokens
export const dropdownTokens = {
  trigger: {
    ...buttonTokens.variant.secondary,
    gap: brandSpacing[2],
    iconSize: '16px',
  },
  
  content: {
    backgroundColor: surfaceStates.elevated.background,
    borderColor: surfaceStates.elevated.border,
    borderWidth: '1px',
    borderRadius: brandRadius.lg,
    boxShadow: brandShadows.lg,
    padding: brandSpacing[1],
    minWidth: '160px',
  },
  
  item: {
    padding: brandSpacing[2],
    fontSize: brandTypography.fontSize.sm.size,
    borderRadius: brandRadius.base,
    gap: brandSpacing[2],
    iconSize: '16px',
    
    state: {
      default: {
        color: interactionStates.ghost.default.color,
        backgroundColor: interactionStates.ghost.default.background,
      },
      hover: {
        color: interactionStates.ghost.hover.color,
        backgroundColor: interactionStates.ghost.hover.background,
      },
      focus: {
        color: interactionStates.ghost.focus.color,
        backgroundColor: interactionStates.ghost.focus.background,
      },
    },
  },
  
  separator: {
    height: '1px',
    marginY: brandSpacing[1],
    backgroundColor: surfaceStates.default.border,
  },
} as const;