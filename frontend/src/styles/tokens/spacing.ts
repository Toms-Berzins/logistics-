export const spacing = {
  // Base spacing scale
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
} as const

// Component-specific spacing
export const componentSpacing = {
  table: {
    cellPaddingX: spacing[4],      // 16px horizontal padding
    cellPaddingY: spacing[3],      // 12px vertical padding
    rowGap: spacing[1],            // 4px between rows
    headerPaddingY: spacing[3],    // 12px header padding
    borderWidth: '1px',
  },
  
  card: {
    padding: spacing[4],           // 16px card padding
    paddingMobile: spacing[3],     // 12px mobile padding
    gap: spacing[3],               // 12px internal gaps
    borderRadius: spacing[2],      // 8px border radius
    borderWidth: '1px',
  },
  
  badge: {
    paddingX: spacing[2.5],        // 10px horizontal
    paddingY: spacing[1],          // 4px vertical
    paddingXSmall: spacing[2],     // 8px small horizontal
    paddingYSmall: spacing[0.5],   // 2px small vertical
    borderRadius: '9999px',        // Full rounded
    gap: spacing[1],               // 4px gap between elements
  },
  
  input: {
    paddingX: spacing[3],          // 12px horizontal
    paddingY: spacing[2],          // 8px vertical
    borderRadius: spacing[1.5],    // 6px border radius
    borderWidth: '1px',
  },
  
  button: {
    paddingX: spacing[4],          // 16px horizontal
    paddingY: spacing[2],          // 8px vertical
    paddingXSmall: spacing[3],     // 12px small horizontal
    paddingYSmall: spacing[1],     // 4px small vertical
    borderRadius: spacing[1.5],    // 6px border radius
    gap: spacing[2],               // 8px gap between elements
  },
  
  modal: {
    padding: spacing[6],           // 24px modal padding
    gap: spacing[4],               // 16px internal gaps
    borderRadius: spacing[3],      // 12px border radius
  },
  
  dropdown: {
    paddingX: spacing[3],          // 12px horizontal
    paddingY: spacing[2],          // 8px vertical
    itemPaddingY: spacing[2],      // 8px item vertical
    borderRadius: spacing[2],      // 8px border radius
    gap: spacing[1],               // 4px gap between items
  }
} as const

// Layout spacing
export const layoutSpacing = {
  container: {
    paddingX: spacing[4],          // 16px container padding
    paddingXMobile: spacing[3],    // 12px mobile container padding
    maxWidth: '1280px',            // Max container width
  },
  
  section: {
    paddingY: spacing[8],          // 32px section padding
    paddingYMobile: spacing[6],    // 24px mobile section padding
    gap: spacing[6],               // 24px gap between sections
  },
  
  grid: {
    gap: spacing[4],               // 16px grid gap
    gapMobile: spacing[3],         // 12px mobile grid gap
  },
  
  stack: {
    gap: spacing[4],               // 16px default stack gap
    gapSmall: spacing[2],          // 8px small stack gap
    gapLarge: spacing[6],          // 24px large stack gap
  }
} as const

// Responsive breakpoints (matching Tailwind)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

export type SpacingKey = keyof typeof spacing
export type ComponentSpacingKey = keyof typeof componentSpacing
export type LayoutSpacingKey = keyof typeof layoutSpacing