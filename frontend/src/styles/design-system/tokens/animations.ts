/**
 * Animation tokens for the logistics dispatch platform
 * Motion design system with timing functions, durations, and transitions
 */

// Duration scale for consistent timing
export const durations = {
  // Instant - for immediate feedback
  instant: '0ms',
  
  // Fast - for micro-interactions and hover states
  fastest: '75ms',
  fast: '100ms',
  
  // Normal - for standard transitions and UI changes
  normal: '150ms',
  moderate: '200ms',
  
  // Slow - for content changes and state transitions
  slow: '300ms',
  slower: '500ms',
  
  // Extended - for complex animations and page transitions
  extended: '700ms',
  longest: '1000ms',
  
  // Custom durations for specific use cases
  tooltip: '150ms',
  dropdown: '200ms',
  modal: '300ms',
  pageTransition: '500ms',
  loading: '1000ms',
} as const;

// Easing functions for natural motion
export const easingFunctions = {
  // Linear timing
  linear: 'linear',
  
  // Standard easing curves
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Custom cubic-bezier curves for better UX
  // Based on Material Design motion guidelines
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Most common easing
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // Elements entering screen
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)', // Elements leaving screen
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)', // Quick, decisive motion
  
  // Bounce and elastic curves for playful interactions
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Logistics-specific curves
  mapZoom: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth map animations
  statusChange: 'cubic-bezier(0.23, 1, 0.320, 1)', // Status indicator changes
  realtime: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Real-time updates
} as const;

// Predefined transitions for common UI patterns
export const transitions = {
  // Basic property transitions
  all: {
    fast: `all ${durations.fast} ${easingFunctions.standard}`,
    normal: `all ${durations.normal} ${easingFunctions.standard}`,
    slow: `all ${durations.slow} ${easingFunctions.standard}`,
  },
  
  // Color transitions
  colors: {
    fast: `color ${durations.fast} ${easingFunctions.standard}, background-color ${durations.fast} ${easingFunctions.standard}, border-color ${durations.fast} ${easingFunctions.standard}`,
    normal: `color ${durations.normal} ${easingFunctions.standard}, background-color ${durations.normal} ${easingFunctions.standard}, border-color ${durations.normal} ${easingFunctions.standard}`,
  },
  
  // Transform transitions
  transform: {
    fast: `transform ${durations.fast} ${easingFunctions.standard}`,
    normal: `transform ${durations.normal} ${easingFunctions.standard}`,
    slow: `transform ${durations.slow} ${easingFunctions.standard}`,
    bounce: `transform ${durations.moderate} ${easingFunctions.bounce}`,
  },
  
  // Opacity transitions
  opacity: {
    fast: `opacity ${durations.fast} ${easingFunctions.standard}`,
    normal: `opacity ${durations.normal} ${easingFunctions.standard}`,
    slow: `opacity ${durations.slow} ${easingFunctions.standard}`,
  },
  
  // Shadow transitions
  shadow: {
    fast: `box-shadow ${durations.fast} ${easingFunctions.standard}`,
    normal: `box-shadow ${durations.normal} ${easingFunctions.standard}`,
    slow: `box-shadow ${durations.slow} ${easingFunctions.standard}`,
  },
  
  // Layout transitions
  layout: {
    width: `width ${durations.moderate} ${easingFunctions.standard}`,
    height: `height ${durations.moderate} ${easingFunctions.standard}`,
    size: `width ${durations.moderate} ${easingFunctions.standard}, height ${durations.moderate} ${easingFunctions.standard}`,
    margin: `margin ${durations.normal} ${easingFunctions.standard}`,
    padding: `padding ${durations.normal} ${easingFunctions.standard}`,
  },
} as const;

// Keyframe animations for complex motion
export const keyframes = {
  // Fade animations
  fadeIn: {
    name: 'fadeIn',
    keyframes: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
  },
  
  fadeOut: {
    name: 'fadeOut',
    keyframes: {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
  },
  
  fadeInUp: {
    name: 'fadeInUp',
    keyframes: {
      '0%': { 
        opacity: '0',
        transform: 'translateY(20px)',
      },
      '100%': { 
        opacity: '1',
        transform: 'translateY(0)',
      },
    },
  },
  
  fadeInDown: {
    name: 'fadeInDown',
    keyframes: {
      '0%': { 
        opacity: '0',
        transform: 'translateY(-20px)',
      },
      '100%': { 
        opacity: '1',
        transform: 'translateY(0)',
      },
    },
  },
  
  // Slide animations
  slideInRight: {
    name: 'slideInRight',
    keyframes: {
      '0%': { 
        transform: 'translateX(100%)',
      },
      '100%': { 
        transform: 'translateX(0)',
      },
    },
  },
  
  slideInLeft: {
    name: 'slideInLeft',
    keyframes: {
      '0%': { 
        transform: 'translateX(-100%)',
      },
      '100%': { 
        transform: 'translateX(0)',
      },
    },
  },
  
  slideOutRight: {
    name: 'slideOutRight',
    keyframes: {
      '0%': { 
        transform: 'translateX(0)',
      },
      '100%': { 
        transform: 'translateX(100%)',
      },
    },
  },
  
  slideOutLeft: {
    name: 'slideOutLeft',
    keyframes: {
      '0%': { 
        transform: 'translateX(0)',
      },
      '100%': { 
        transform: 'translateX(-100%)',
      },
    },
  },
  
  // Scale animations
  scaleIn: {
    name: 'scaleIn',
    keyframes: {
      '0%': { 
        opacity: '0',
        transform: 'scale(0.9)',
      },
      '100%': { 
        opacity: '1',
        transform: 'scale(1)',
      },
    },
  },
  
  scaleOut: {
    name: 'scaleOut',
    keyframes: {
      '0%': { 
        opacity: '1',
        transform: 'scale(1)',
      },
      '100%': { 
        opacity: '0',
        transform: 'scale(0.9)',
      },
    },
  },
  
  // Pulse animations for status indicators
  pulse: {
    name: 'pulse',
    keyframes: {
      '0%, 100%': { 
        opacity: '1',
      },
      '50%': { 
        opacity: '0.5',
      },
    },
  },
  
  pulseSoft: {
    name: 'pulseSoft',
    keyframes: {
      '0%, 100%': { 
        opacity: '1',
      },
      '50%': { 
        opacity: '0.8',
      },
    },
  },
  
  pulseScale: {
    name: 'pulseScale',
    keyframes: {
      '0%, 100%': { 
        transform: 'scale(1)',
      },
      '50%': { 
        transform: 'scale(1.05)',
      },
    },
  },
  
  // Shake animation for errors
  shake: {
    name: 'shake',
    keyframes: {
      '0%, 100%': { 
        transform: 'translateX(0)',
      },
      '10%, 30%, 50%, 70%, 90%': { 
        transform: 'translateX(-2px)',
      },
      '20%, 40%, 60%, 80%': { 
        transform: 'translateX(2px)',
      },
    },
  },
  
  // Bounce animation
  bounce: {
    name: 'bounce',
    keyframes: {
      '0%, 20%, 53%, 80%, 100%': {
        transform: 'translate3d(0,0,0)',
      },
      '40%, 43%': {
        transform: 'translate3d(0, -8px, 0)',
      },
      '70%': {
        transform: 'translate3d(0, -4px, 0)',
      },
      '90%': {
        transform: 'translate3d(0, -2px, 0)',
      },
    },
  },
  
  // Spin animation for loading states
  spin: {
    name: 'spin',
    keyframes: {
      '0%': { 
        transform: 'rotate(0deg)',
      },
      '100%': { 
        transform: 'rotate(360deg)',
      },
    },
  },
  
  // Loading dots animation
  loadingDots: {
    name: 'loadingDots',
    keyframes: {
      '0%, 80%, 100%': {
        transform: 'scale(0)',
        opacity: '0.5',
      },
      '40%': {
        transform: 'scale(1)',
        opacity: '1',
      },
    },
  },
} as const;

// Logistics-specific animations
export const logisticsAnimations = {
  // Real-time status indicators
  realtime: {
    // Driver status pulse
    driverAvailable: {
      animation: `${keyframes.pulseSoft.name} 2s ${easingFunctions.standard} infinite`,
      keyframes: keyframes.pulseSoft.keyframes,
    },
    
    driverBusy: {
      animation: `${keyframes.pulseScale.name} 1.5s ${easingFunctions.standard} infinite`,
      keyframes: keyframes.pulseScale.keyframes,
    },
    
    // Connection status
    connecting: {
      animation: `${keyframes.pulse.name} 1s ${easingFunctions.standard} infinite`,
      keyframes: keyframes.pulse.keyframes,
    },
    
    // Data update indicator
    dataUpdate: {
      animation: `${keyframes.fadeInUp.name} ${durations.normal} ${easingFunctions.decelerate}`,
      keyframes: keyframes.fadeInUp.keyframes,
    },
  },
  
  // Map animations
  map: {
    // Marker animations
    markerDrop: {
      name: 'markerDrop',
      keyframes: {
        '0%': {
          transform: 'translateY(-20px) scale(0.8)',
          opacity: '0',
        },
        '50%': {
          transform: 'translateY(2px) scale(1.1)',
          opacity: '0.8',
        },
        '100%': {
          transform: 'translateY(0) scale(1)',
          opacity: '1',
        },
      },
      animation: `markerDrop ${durations.moderate} ${easingFunctions.bounce}`,
    },
    
    // Route line drawing
    routeDraw: {
      name: 'routeDraw',
      keyframes: {
        '0%': {
          strokeDasharray: '0 1000',
        },
        '100%': {
          strokeDasharray: '1000 0',
        },
      },
      animation: `routeDraw ${durations.extended} ${easingFunctions.standard}`,
    },
    
    // Zoom animations
    mapZoom: {
      animation: `${keyframes.scaleIn.name} ${durations.moderate} ${easingFunctions.mapZoom}`,
      keyframes: keyframes.scaleIn.keyframes,
    },
  },
  
  // Dashboard animations
  dashboard: {
    // KPI card entrance
    kpiCardEnter: {
      animation: `${keyframes.fadeInUp.name} ${durations.moderate} ${easingFunctions.decelerate}`,
      keyframes: keyframes.fadeInUp.keyframes,
    },
    
    // Metric value changes
    metricUpdate: {
      name: 'metricUpdate',
      keyframes: {
        '0%': {
          transform: 'scale(1)',
        },
        '50%': {
          transform: 'scale(1.05)',
          color: 'rgb(59 130 246)', // Blue highlight
        },
        '100%': {
          transform: 'scale(1)',
        },
      },
      animation: `metricUpdate ${durations.moderate} ${easingFunctions.standard}`,
    },
    
    // Chart animations
    chartBarGrow: {
      name: 'chartBarGrow',
      keyframes: {
        '0%': {
          transform: 'scaleY(0)',
        },
        '100%': {
          transform: 'scaleY(1)',
        },
      },
      animation: `chartBarGrow ${durations.slow} ${easingFunctions.decelerate}`,
    },
    
    chartLineIn: {
      name: 'chartLineIn',
      keyframes: {
        '0%': {
          strokeDasharray: '0 100',
        },
        '100%': {
          strokeDasharray: '100 0',
        },
      },
      animation: `chartLineIn ${durations.extended} ${easingFunctions.standard}`,
    },
  },
  
  // Table animations
  table: {
    // Row animations
    rowEnter: {
      animation: `${keyframes.fadeInUp.name} ${durations.normal} ${easingFunctions.decelerate}`,
      keyframes: keyframes.fadeInUp.keyframes,
    },
    
    rowExit: {
      animation: `${keyframes.fadeOut.name} ${durations.fast} ${easingFunctions.accelerate}`,
      keyframes: keyframes.fadeOut.keyframes,
    },
    
    // Sort animation
    sortChange: {
      name: 'sortChange',
      keyframes: {
        '0%': {
          opacity: '1',
          transform: 'translateY(0)',
        },
        '50%': {
          opacity: '0.5',
          transform: 'translateY(-5px)',
        },
        '100%': {
          opacity: '1',
          transform: 'translateY(0)',
        },
      },
      animation: `sortChange ${durations.moderate} ${easingFunctions.standard}`,
    },
  },
  
  // Form animations
  form: {
    // Field focus
    fieldFocus: {
      animation: `${keyframes.scaleIn.name} ${durations.fast} ${easingFunctions.standard}`,
      keyframes: keyframes.scaleIn.keyframes,
    },
    
    // Error indication
    fieldError: {
      animation: `${keyframes.shake.name} ${durations.moderate} ${easingFunctions.standard}`,
      keyframes: keyframes.shake.keyframes,
    },
    
    // Success indication
    fieldSuccess: {
      animation: `${keyframes.bounce.name} ${durations.slow} ${easingFunctions.bounce}`,
      keyframes: keyframes.bounce.keyframes,
    },
  },
  
  // Modal and overlay animations
  modal: {
    // Modal entrance
    enter: {
      overlay: {
        animation: `${keyframes.fadeIn.name} ${durations.modal} ${easingFunctions.standard}`,
        keyframes: keyframes.fadeIn.keyframes,
      },
      content: {
        animation: `${keyframes.scaleIn.name} ${durations.modal} ${easingFunctions.decelerate}`,
        keyframes: keyframes.scaleIn.keyframes,
      },
    },
    
    // Modal exit
    exit: {
      overlay: {
        animation: `${keyframes.fadeOut.name} ${durations.normal} ${easingFunctions.accelerate}`,
        keyframes: keyframes.fadeOut.keyframes,
      },
      content: {
        animation: `${keyframes.scaleOut.name} ${durations.normal} ${easingFunctions.accelerate}`,
        keyframes: keyframes.scaleOut.keyframes,
      },
    },
  },
  
  // Loading animations
  loading: {
    // Spinner
    spinner: {
      animation: `${keyframes.spin.name} ${durations.loading} ${easingFunctions.linear} infinite`,
      keyframes: keyframes.spin.keyframes,
    },
    
    // Skeleton loading
    skeleton: {
      name: 'skeletonLoading',
      keyframes: {
        '0%': {
          backgroundPosition: '-200px 0',
        },
        '100%': {
          backgroundPosition: 'calc(200px + 100%) 0',
        },
      },
      animation: `skeletonLoading 1.5s ${easingFunctions.linear} infinite`,
    },
    
    // Dots loading
    dots: {
      animation: `${keyframes.loadingDots.name} 1.4s ${easingFunctions.standard} infinite both`,
      keyframes: keyframes.loadingDots.keyframes,
    },
  },
} as const;

// CSS custom properties for animation tokens
export const animationTokens = {
  cssVars: {
    // Durations
    '--duration-instant': durations.instant,
    '--duration-fast': durations.fast,
    '--duration-normal': durations.normal,
    '--duration-slow': durations.slow,
    '--duration-extended': durations.extended,
    
    // Easing functions
    '--easing-standard': easingFunctions.standard,
    '--easing-decelerate': easingFunctions.decelerate,
    '--easing-accelerate': easingFunctions.accelerate,
    '--easing-sharp': easingFunctions.sharp,
    '--easing-bounce': easingFunctions.bounce,
    
    // Common transitions
    '--transition-colors': transitions.colors.normal,
    '--transition-transform': transitions.transform.normal,
    '--transition-opacity': transitions.opacity.normal,
    '--transition-shadow': transitions.shadow.normal,
    '--transition-all': transitions.all.normal,
    
    // Logistics-specific animations
    '--animation-pulse-soft': `${keyframes.pulseSoft.name} 2s ${easingFunctions.standard} infinite`,
    '--animation-fade-in-up': `${keyframes.fadeInUp.name} ${durations.normal} ${easingFunctions.decelerate}`,
    '--animation-loading-spinner': `${keyframes.spin.name} ${durations.loading} ${easingFunctions.linear} infinite`,
  },
} as const;

// Motion preferences for accessibility
export const motionPreferences = {
  // Reduced motion variants
  reducedMotion: {
    durations: {
      fast: durations.instant,
      normal: durations.instant,
      slow: durations.instant,
    },
    
    transitions: {
      all: `all ${durations.instant} ${easingFunctions.linear}`,
      colors: `color ${durations.instant} ${easingFunctions.linear}, background-color ${durations.instant} ${easingFunctions.linear}`,
    },
    
    animations: {
      disable: 'none',
    },
  },
  
  // High motion variants for enhanced experience
  enhancedMotion: {
    durations: {
      fast: durations.normal,
      normal: durations.slow,
      slow: durations.extended,
    },
    
    easingFunctions: {
      standard: easingFunctions.bounce,
      enter: easingFunctions.elastic,
    },
  },
} as const;

// Consolidated animations export
export const animations = {
  durations,
  easingFunctions,
  transitions,
  keyframes,
  logistics: logisticsAnimations,
  tokens: animationTokens,
  motionPreferences,
} as const;

// Type definitions for TypeScript support
export type Duration = keyof typeof durations;
export type EasingFunction = keyof typeof easingFunctions;
export type Transition = keyof typeof transitions;
export type Keyframe = keyof typeof keyframes;
export type LogisticsAnimation = keyof typeof logisticsAnimations;

// Utility types for accessing nested animation values
export type AnimationScale<T> = T extends Record<string, any> 
  ? keyof T 
  : never;

export type RealtimeAnimation = AnimationScale<typeof logisticsAnimations.realtime>;
export type MapAnimation = AnimationScale<typeof logisticsAnimations.map>;
export type DashboardAnimation = AnimationScale<typeof logisticsAnimations.dashboard>;
export type TableAnimation = AnimationScale<typeof logisticsAnimations.table>;
export type FormAnimation = AnimationScale<typeof logisticsAnimations.form>;
export type ModalAnimation = AnimationScale<typeof logisticsAnimations.modal>;
export type LoadingAnimation = AnimationScale<typeof logisticsAnimations.loading>;