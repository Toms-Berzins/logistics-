import type { Config } from 'tailwindcss'
import { designTokens, breakpoints, grid, accessibility } from './src/styles/design-system/tokens'

const config: Config = {
  mode: 'jit',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/styles/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Safelist dynamic classes for logistics states
    {
      pattern: /bg-(primary|success|warning|error|info|neutral)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /text-(primary|success|warning|error|info|neutral)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern: /border-(primary|success|warning|error|info|neutral)-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    // Logistics-specific color patterns
    {
      pattern: /bg-driver-(available|busy|offline|enRoute|break|emergency)/,
    },
    {
      pattern: /bg-job-(pending|assigned|inProgress|completed|cancelled|delayed)/,
    },
    {
      pattern: /bg-route-(active|completed|delayed|optimized|traffic)/,
    },
    {
      pattern: /text-driver-(available|busy|offline|enRoute|break|emergency)/,
    },
    {
      pattern: /text-job-(pending|assigned|inProgress|completed|cancelled|delayed)/,
    },
    {
      pattern: /text-route-(active|completed|delayed|optimized|traffic)/,
    },
  ],
  theme: {
    extend: {
      // Colors from design tokens
      colors: {
        // Brand colors
        primary: designTokens.colors.brand.primary,
        secondary: designTokens.colors.brand.secondary,
        
        // Semantic colors
        success: designTokens.colors.semantic.success,
        warning: designTokens.colors.semantic.warning,
        error: designTokens.colors.semantic.error,
        info: designTokens.colors.semantic.info,
        neutral: designTokens.colors.neutral,
        
        // Logistics operational colors
        'driver-available': designTokens.colors.logistics.driver.available,
        'driver-busy': designTokens.colors.logistics.driver.busy,
        'driver-offline': designTokens.colors.logistics.driver.offline,
        'driver-enRoute': designTokens.colors.logistics.driver.enRoute,
        'driver-break': designTokens.colors.logistics.driver.break,
        'driver-emergency': designTokens.colors.logistics.driver.emergency,
        
        'job-pending': designTokens.colors.logistics.job.pending,
        'job-assigned': designTokens.colors.logistics.job.assigned,
        'job-inProgress': designTokens.colors.logistics.job.inProgress,
        'job-completed': designTokens.colors.logistics.job.completed,
        'job-cancelled': designTokens.colors.logistics.job.cancelled,
        'job-delayed': designTokens.colors.logistics.job.delayed,
        
        'route-active': designTokens.colors.logistics.route.active,
        'route-completed': designTokens.colors.logistics.route.completed,
        'route-delayed': designTokens.colors.logistics.route.delayed,
        'route-optimized': designTokens.colors.logistics.route.optimized,
        'route-traffic': designTokens.colors.logistics.route.traffic,
        
        'priority-low': designTokens.colors.logistics.priority.low,
        'priority-normal': designTokens.colors.logistics.priority.normal,
        'priority-high': designTokens.colors.logistics.priority.high,
        'priority-urgent': designTokens.colors.logistics.priority.urgent,
        'priority-critical': designTokens.colors.logistics.priority.critical,
        
        // AI and prediction colors
        'ai-high': designTokens.colors.ai.prediction.high,
        'ai-medium': designTokens.colors.ai.prediction.medium,
        'ai-low': designTokens.colors.ai.prediction.low,
        'ai-processing': designTokens.colors.ai.prediction.processing,
      },
      
      // Typography from design tokens
      fontFamily: designTokens.typography.fontFamilies,
      fontSize: Object.fromEntries(
        Object.entries(designTokens.typography.fontSizes).map(([key, value]) => [
          key,
          [value.fontSize, { lineHeight: value.lineHeight, letterSpacing: value.letterSpacing }]
        ])
      ),
      fontWeight: designTokens.typography.fontWeights,
      
      // Spacing from design tokens
      spacing: {
        ...designTokens.spacing.base,
        // Semantic spacing shortcuts
        'micro-xs': designTokens.spacing.semantic.micro.xs,
        'micro-sm': designTokens.spacing.semantic.micro.sm,
        'micro-md': designTokens.spacing.semantic.micro.md,
        'micro-lg': designTokens.spacing.semantic.micro.lg,
        
        'component-xs': designTokens.spacing.semantic.component.xs,
        'component-sm': designTokens.spacing.semantic.component.sm,
        'component-md': designTokens.spacing.semantic.component.md,
        'component-lg': designTokens.spacing.semantic.component.lg,
        'component-xl': designTokens.spacing.semantic.component.xl,
        
        'layout-xs': designTokens.spacing.semantic.layout.xs,
        'layout-sm': designTokens.spacing.semantic.layout.sm,
        'layout-md': designTokens.spacing.semantic.layout.md,
        'layout-lg': designTokens.spacing.semantic.layout.lg,
        'layout-xl': designTokens.spacing.semantic.layout.xl,
        'layout-xxl': designTokens.spacing.semantic.layout.xxl,
        
        // Logistics-specific spacing
        'dashboard-card-gap': designTokens.spacing.logistics.dashboard.cardGap,
        'dashboard-card-padding': designTokens.spacing.logistics.dashboard.cardPadding,
        'table-cell-padding': designTokens.spacing.logistics.table.cellPadding,
        'form-field-spacing': designTokens.spacing.logistics.form.fieldSpacing,
        'mobile-touch-target': designTokens.spacing.logistics.mobile.touchTarget,
      },
      
      // Border radius from design tokens
      borderRadius: designTokens.spacing.borderRadius,
      
      // Shadows from design tokens
      boxShadow: {
        ...designTokens.shadows.base,
        // Elevation system
        'elevation-0': designTokens.shadows.elevation.surface[0],
        'elevation-1': designTokens.shadows.elevation.surface[1],
        'elevation-2': designTokens.shadows.elevation.surface[2],
        'elevation-3': designTokens.shadows.elevation.surface[3],
        'elevation-4': designTokens.shadows.elevation.surface[4],
        'elevation-5': designTokens.shadows.elevation.surface[5],
        'elevation-6': designTokens.shadows.elevation.surface[6],
        
        // Interactive states
        'hover': designTokens.shadows.elevation.interactive.hover,
        'active': designTokens.shadows.elevation.interactive.active,
        'focus': designTokens.shadows.elevation.interactive.focus,
        
        // Component shadows
        'card': designTokens.shadows.elevation.component.card,
        'card-hover': designTokens.shadows.elevation.component.cardHover,
        'button': designTokens.shadows.elevation.component.button,
        'button-hover': designTokens.shadows.elevation.component.buttonHover,
        'dropdown': designTokens.shadows.elevation.component.dropdown,
        'modal': designTokens.shadows.elevation.component.modal,
        
        // Logistics-specific shadows
        'metric-card': designTokens.shadows.logistics.dashboard.metricCard,
        'map-marker': designTokens.shadows.logistics.map.marker,
        'table-row-selected': designTokens.shadows.logistics.table.rowSelected,
        'mobile-card': designTokens.shadows.logistics.mobile.mobileCard,
        
        // Focus rings
        'focus-ring': designTokens.shadows.focus.default,
        'focus-ring-strong': designTokens.shadows.focus.strong,
        'focus-ring-offset': designTokens.shadows.focus.offset,
        'focus-ring-error': designTokens.shadows.focus.error,
      },
      
      // Animations from design tokens
      animation: {
        // Basic animations
        'fade-in': `${designTokens.animations.keyframes.fadeIn.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.decelerate}`,
        'fade-out': `${designTokens.animations.keyframes.fadeOut.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.accelerate}`,
        'fade-in-up': `${designTokens.animations.keyframes.fadeInUp.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.decelerate}`,
        'fade-in-down': `${designTokens.animations.keyframes.fadeInDown.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.decelerate}`,
        'slide-in-right': `${designTokens.animations.keyframes.slideInRight.name} ${designTokens.animations.durations.moderate} ${designTokens.animations.easingFunctions.decelerate}`,
        'slide-in-left': `${designTokens.animations.keyframes.slideInLeft.name} ${designTokens.animations.durations.moderate} ${designTokens.animations.easingFunctions.decelerate}`,
        'scale-in': `${designTokens.animations.keyframes.scaleIn.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.decelerate}`,
        'scale-out': `${designTokens.animations.keyframes.scaleOut.name} ${designTokens.animations.durations.normal} ${designTokens.animations.easingFunctions.accelerate}`,
        
        // Status and indicator animations
        'pulse': `${designTokens.animations.keyframes.pulse.name} 2s ${designTokens.animations.easingFunctions.standard} infinite`,
        'pulse-soft': `${designTokens.animations.keyframes.pulseSoft.name} 2s ${designTokens.animations.easingFunctions.standard} infinite`,
        'pulse-scale': `${designTokens.animations.keyframes.pulseScale.name} 1.5s ${designTokens.animations.easingFunctions.standard} infinite`,
        
        // Utility animations
        'spin': `${designTokens.animations.keyframes.spin.name} ${designTokens.animations.durations.loading} ${designTokens.animations.easingFunctions.linear} infinite`,
        'bounce': `${designTokens.animations.keyframes.bounce.name} ${designTokens.animations.durations.slow} ${designTokens.animations.easingFunctions.bounce}`,
        'shake': `${designTokens.animations.keyframes.shake.name} ${designTokens.animations.durations.moderate} ${designTokens.animations.easingFunctions.standard}`,
        
        // Logistics-specific animations
        'driver-available': designTokens.animations.logistics.realtime.driverAvailable.animation,
        'driver-busy': designTokens.animations.logistics.realtime.driverBusy.animation,
        'data-update': designTokens.animations.logistics.realtime.dataUpdate.animation,
        'metric-update': designTokens.animations.logistics.dashboard.metricUpdate.animation,
        'loading-dots': `${designTokens.animations.keyframes.loadingDots.name} 1.4s ${designTokens.animations.easingFunctions.standard} infinite both`,
      },
      
      // Keyframes from design tokens
      keyframes: Object.fromEntries(
        Object.entries(designTokens.animations.keyframes).map(([key, value]) => [
          value.name,
          value.keyframes
        ])
      ),
      
      // Transitions
      transitionDuration: designTokens.animations.durations,
      transitionTimingFunction: designTokens.animations.easingFunctions,
      
      // Responsive breakpoints
      screens: breakpoints,
      
      // Grid system
      gridTemplateColumns: Object.fromEntries(
        Object.entries(grid.columns).map(([key, value]) => [
          key,
          `repeat(${value}, minmax(0, 1fr))`
        ])
      ),
      
      // Container configuration
      container: {
        center: true,
        padding: {
          DEFAULT: designTokens.spacing.base[4],
          sm: designTokens.spacing.base[6],
          md: designTokens.spacing.base[8],
          lg: designTokens.spacing.base[12],
          xl: designTokens.spacing.base[16],
          '2xl': designTokens.spacing.base[20],
        },
        screens: {
          sm: breakpoints.sm,
          md: breakpoints.md,
          lg: breakpoints.lg,
          xl: breakpoints.xl,
          '2xl': breakpoints['2xl'],
        },
      },
      
      // Max width utilities
      maxWidth: grid.maxWidth,
      
      // Z-index scale
      zIndex: designTokens.spacing.zIndex,
    },
  },
  plugins: [
    // Custom plugin for focus-visible styles
    function({ addUtilities, theme }: { addUtilities: any, theme: any }) {
      const newUtilities = {
        '.focus-ring': {
          '&:focus-visible': {
            outline: `2px solid ${theme('colors.primary.500')}`,
            outlineOffset: '2px',
          },
        },
        '.focus-ring-inset': {
          '&:focus-visible': {
            outline: `2px solid ${theme('colors.primary.500')}`,
            outlineOffset: '-2px',
          },
        },
        // Touch-friendly minimum sizes
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        // High contrast support
        '@media (prefers-contrast: high)': {
          '.contrast-high': {
            borderWidth: '2px',
            borderColor: theme('colors.neutral.900'),
          },
        },
        // Reduced motion support
        '@media (prefers-reduced-motion: reduce)': {
          '.motion-reduce': {
            animation: 'none',
            transition: 'none',
          },
        },
      }
      addUtilities(newUtilities)
    },
  ],
}

export default config