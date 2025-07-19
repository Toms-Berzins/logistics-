export const typography = {
  // Font families
  fontFamily: {
    sans: [
      'Inter', 
      '-apple-system', 
      'BlinkMacSystemFont', 
      'Segoe UI', 
      'Roboto', 
      'Helvetica Neue', 
      'Arial', 
      'sans-serif'
    ],
    mono: [
      'JetBrains Mono',
      'SF Mono', 
      'Monaco', 
      'Inconsolata', 
      'Roboto Mono', 
      'Consolas', 
      'monospace'
    ]
  },

  // Font sizes with line heights
  fontSize: {
    xs: {
      fontSize: '0.75rem',    // 12px
      lineHeight: '1rem'      // 16px
    },
    sm: {
      fontSize: '0.875rem',   // 14px
      lineHeight: '1.25rem'   // 20px
    },
    base: {
      fontSize: '1rem',       // 16px
      lineHeight: '1.5rem'    // 24px
    },
    lg: {
      fontSize: '1.125rem',   // 18px
      lineHeight: '1.75rem'   // 28px
    },
    xl: {
      fontSize: '1.25rem',    // 20px
      lineHeight: '1.75rem'   // 28px
    },
    '2xl': {
      fontSize: '1.5rem',     // 24px
      lineHeight: '2rem'      // 32px
    },
    '3xl': {
      fontSize: '1.875rem',   // 30px
      lineHeight: '2.25rem'   // 36px
    },
    '4xl': {
      fontSize: '2.25rem',    // 36px
      lineHeight: '2.5rem'    // 40px
    }
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
} as const

// Component-specific typography
export const componentTypography = {
  // Table typography
  table: {
    header: {
      fontSize: typography.fontSize.xs.fontSize,
      fontWeight: typography.fontWeight.medium,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase' as const,
      lineHeight: typography.fontSize.xs.lineHeight
    },
    cell: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.sm.lineHeight
    },
    cellMono: {
      fontFamily: typography.fontFamily.mono.join(', '),
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm.lineHeight
    }
  },

  // Badge typography
  badge: {
    small: {
      fontSize: typography.fontSize.xs.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.xs.lineHeight
    },
    medium: {
      fontSize: typography.fontSize.xs.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.xs.lineHeight
    },
    large: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm.lineHeight
    }
  },

  // Card typography
  card: {
    title: {
      fontSize: typography.fontSize.lg.fontSize,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.lg.lineHeight
    },
    subtitle: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm.lineHeight
    },
    body: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.sm.lineHeight
    },
    caption: {
      fontSize: typography.fontSize.xs.fontSize,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.xs.lineHeight
    }
  },

  // Input typography
  input: {
    fontSize: typography.fontSize.sm.fontSize,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.fontSize.sm.lineHeight,
    placeholder: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.normal
    }
  },

  // Button typography
  button: {
    small: {
      fontSize: typography.fontSize.xs.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.xs.lineHeight
    },
    medium: {
      fontSize: typography.fontSize.sm.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm.lineHeight
    },
    large: {
      fontSize: typography.fontSize.base.fontSize,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.base.lineHeight
    }
  },

  // Heading typography
  heading: {
    h1: {
      fontSize: typography.fontSize['3xl'].fontSize,
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.fontSize['3xl'].lineHeight,
      letterSpacing: typography.letterSpacing.tight
    },
    h2: {
      fontSize: typography.fontSize['2xl'].fontSize,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize['2xl'].lineHeight,
      letterSpacing: typography.letterSpacing.tight
    },
    h3: {
      fontSize: typography.fontSize.xl.fontSize,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.xl.lineHeight
    },
    h4: {
      fontSize: typography.fontSize.lg.fontSize,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.lg.lineHeight
    }
  }
} as const

// Utility functions for consistent text styles
export const textStyles = {
  // Status text styles
  statusText: (_status: 'success' | 'warning' | 'error' | 'info' | 'neutral') => ({
    fontSize: typography.fontSize.sm.fontSize,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.sm.lineHeight
  }),

  // Monospace text for IDs, codes, etc.
  monospace: {
    fontFamily: typography.fontFamily.mono.join(', '),
    fontSize: typography.fontSize.sm.fontSize,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.tight
  },

  // Screen reader only text
  srOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    borderWidth: '0'
  },

  // Truncated text
  truncate: {
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const
  },

  // Multi-line truncate (requires line-clamp utility)
  truncateLines: (lines: number) => ({
    display: '-webkit-box' as const,
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden' as const
  })
} as const

// Accessibility considerations
export const a11yTypography = {
  // Minimum font sizes for readability
  minFontSize: {
    mobile: '16px',  // Prevents iOS zoom on focus
    desktop: '14px'
  },

  // High contrast ratios
  contrastRatios: {
    normal: '4.5:1',    // WCAG AA
    enhanced: '7:1'     // WCAG AAA
  },

  // Line height for readability
  readableLineHeight: {
    min: 1.4,           // Minimum for accessibility
    recommended: 1.5    // Recommended for optimal readability
  }
} as const

export type FontSizeKey = keyof typeof typography.fontSize
export type FontWeightKey = keyof typeof typography.fontWeight
export type ComponentTypographyKey = keyof typeof componentTypography