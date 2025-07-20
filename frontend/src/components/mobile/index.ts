// Touch-first mobile components
export { TouchJobCard, QuickActions } from './TouchJobCard'
export { PullToRefresh, EnhancedPullToRefresh, usePullToRefresh } from './PullToRefresh'
export { 
  TouchNavigationDrawer, 
  DrawerToggleButton, 
  BottomSheetNavigation,
  useNavigationDrawer 
} from './TouchNavigationDrawer'
export { 
  PWAInstallPrompt, 
  usePWAInstall 
} from './PWAInstallPrompt'

// Touch gesture hooks
export { 
  useTouchGestures, 
  useJobCardGestures, 
  useMapGestures 
} from '../hooks/touch/useTouchGestures'
export { 
  usePushNotifications, 
  useNotificationAnalytics,
  PushNotificationProvider,
  usePushNotificationContext 
} from '../hooks/touch/usePushNotifications'
export { useOfflineJobQueue } from '../hooks/touch/useOfflineJobQueue'

// Responsive and performance hooks  
export {
  useResponsiveBreakpoints,
  useResponsiveValue,
  useMediaQuery,
  useDeviceDetection,
  useResponsiveComponent,
  useResponsiveImage,
  createResponsiveStyles,
  useContainerQuery,
  useSafeArea,
  useTouchSpacing
} from '../hooks/touch/useResponsiveBreakpoints'
export {
  usePerformanceMonitoring,
  PerformanceMonitor,
  useComponentPerformance
} from '../hooks/touch/usePerformanceMonitoring'

// Types
export type {
  TouchPoint,
  SwipeGestureConfig,
  LongPressConfig,
  PinchGestureConfig,
  TouchGestureOptions,
  TouchGestureState
} from '../hooks/touch/useTouchGestures'