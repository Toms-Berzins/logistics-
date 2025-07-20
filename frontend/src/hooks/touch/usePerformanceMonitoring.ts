import { useEffect, useCallback, useRef, useState } from 'react'

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  
  // Custom metrics
  touchResponseTime: number[]
  renderTime: number[]
  scrollPerformance: number[]
  gestureLatency: number[]
  
  // App launch metrics
  appLaunchTime: number | null
  timeToInteractive: number | null
  
  // PWA metrics
  offlineReadiness: boolean
  cacheHitRate: number
  
  // Mobile-specific
  batteryLevel: number | null
  networkType: string | null
  memoryUsage: number | null
}

interface PerformanceTarget {
  touchResponse: 100 // <100ms
  appLaunch: 2000 // <2s
  scrollFps: 60 // 60fps minimum
  gestureResponse: 16 // <16ms for 60fps
  offlineReliability: 99 // 99%
}

const PERFORMANCE_TARGETS: PerformanceTarget = {
  touchResponse: 100,
  appLaunch: 2000,
  scrollFps: 60,
  gestureResponse: 16,
  offlineReliability: 99
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    touchResponseTime: [],
    renderTime: [],
    scrollPerformance: [],
    gestureLatency: [],
    appLaunchTime: null,
    timeToInteractive: null,
    offlineReadiness: false,
    cacheHitRate: 0,
    batteryLevel: null,
    networkType: null,
    memoryUsage: null
  })

  const [performanceScore, setPerformanceScore] = useState(0)
  const frameTimesRef = useRef<number[]>([])
  const lastFrameTime = useRef(performance.now())

  // Initialize Core Web Vitals monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
        }
      }
    })
    fcpObserver.observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setMetrics(prev => ({ 
          ...prev, 
          fid: (entry as any).processingStart - entry.startTime 
        }))
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }))
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    return () => {
      fcpObserver.disconnect()
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  // Monitor app launch time
  useEffect(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationEntry) {
      const appLaunchTime = navigationEntry.loadEventEnd - navigationEntry.navigationStart
      setMetrics(prev => ({ ...prev, appLaunchTime }))
    }

    // Time to Interactive (simplified)
    const checkTTI = () => {
      if (document.readyState === 'complete') {
        const tti = performance.now()
        setMetrics(prev => ({ ...prev, timeToInteractive: tti }))
      } else {
        setTimeout(checkTTI, 100)
      }
    }
    checkTTI()
  }, [])

  // Monitor frame rate and scroll performance
  useEffect(() => {
    let animationId: number

    const measureFrameRate = () => {
      const now = performance.now()
      const frameDuration = now - lastFrameTime.current
      
      frameTimesRef.current.push(frameDuration)
      
      // Keep only last 60 frames
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift()
      }
      
      lastFrameTime.current = now
      animationId = requestAnimationFrame(measureFrameRate)
    }

    animationId = requestAnimationFrame(measureFrameRate)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  // Calculate scroll performance
  const measureScrollPerformance = useCallback(() => {
    const frameTimes = frameTimesRef.current
    if (frameTimes.length === 0) return

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    const fps = 1000 / avgFrameTime
    
    setMetrics(prev => ({
      ...prev,
      scrollPerformance: [...prev.scrollPerformance.slice(-19), fps]
    }))
  }, [])

  // Monitor device capabilities
  useEffect(() => {
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setMetrics(prev => ({ 
          ...prev, 
          batteryLevel: battery.level * 100 
        }))
        
        battery.addEventListener('levelchange', () => {
          setMetrics(prev => ({ 
            ...prev, 
            batteryLevel: battery.level * 100 
          }))
        })
      })
    }

    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setMetrics(prev => ({ 
        ...prev, 
        networkType: connection.effectiveType 
      }))
      
      connection.addEventListener('change', () => {
        setMetrics(prev => ({ 
          ...prev, 
          networkType: connection.effectiveType 
        }))
      })
    }

    // Memory API
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMetrics(prev => ({ 
        ...prev, 
        memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit 
      }))
    }
  }, [])

  // Touch response time measurement
  const measureTouchResponse = useCallback((startTime: number) => {
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    setMetrics(prev => ({
      ...prev,
      touchResponseTime: [...prev.touchResponseTime.slice(-19), responseTime]
    }))
    
    return responseTime
  }, [])

  // Gesture latency measurement
  const measureGestureLatency = useCallback((gestureStartTime: number) => {
    const latency = performance.now() - gestureStartTime
    
    setMetrics(prev => ({
      ...prev,
      gestureLatency: [...prev.gestureLatency.slice(-19), latency]
    }))
    
    return latency
  }, [])

  // Render time measurement
  const measureRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const renderTime = performance.now() - startTime
      setMetrics(prev => ({
        ...prev,
        renderTime: [...prev.renderTime.slice(-19), renderTime]
      }))
      
      // Log slow renders
      if (renderTime > PERFORMANCE_TARGETS.gestureResponse) {
        console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [])

  // Calculate performance score
  useEffect(() => {
    const calculateScore = () => {
      let score = 100
      
      // Deduct points for poor metrics
      if (metrics.fcp && metrics.fcp > 1800) score -= 20
      if (metrics.lcp && metrics.lcp > 2500) score -= 25
      if (metrics.fid && metrics.fid > 100) score -= 15
      if (metrics.cls && metrics.cls > 0.1) score -= 15
      
      // Touch response score
      const avgTouchResponse = metrics.touchResponseTime.length > 0
        ? metrics.touchResponseTime.reduce((a, b) => a + b, 0) / metrics.touchResponseTime.length
        : 0
      if (avgTouchResponse > PERFORMANCE_TARGETS.touchResponse) score -= 10
      
      // App launch score
      if (metrics.appLaunchTime && metrics.appLaunchTime > PERFORMANCE_TARGETS.appLaunch) {
        score -= 15
      }
      
      setPerformanceScore(Math.max(0, score))
    }
    
    calculateScore()
  }, [metrics])

  // PWA readiness check
  const checkOfflineReadiness = useCallback(async () => {
    try {
      const cacheNames = await caches.keys()
      const hasServiceWorker = 'serviceWorker' in navigator && 
                               await navigator.serviceWorker.getRegistration()
      
      setMetrics(prev => ({
        ...prev,
        offlineReadiness: cacheNames.length > 0 && !!hasServiceWorker
      }))
    } catch (error) {
      console.warn('Failed to check offline readiness:', error)
    }
  }, [])

  // Cache hit rate calculation
  const measureCacheHitRate = useCallback(() => {
    // This would typically be implemented with service worker messaging
    // For now, simulate based on offline readiness
    const hitRate = metrics.offlineReadiness ? 85 : 0
    setMetrics(prev => ({ ...prev, cacheHitRate: hitRate }))
  }, [metrics.offlineReadiness])

  // Performance report generation
  const generateReport = useCallback(() => {
    const avgTouchResponse = metrics.touchResponseTime.length > 0
      ? metrics.touchResponseTime.reduce((a, b) => a + b, 0) / metrics.touchResponseTime.length
      : 0

    const avgScrollFps = metrics.scrollPerformance.length > 0
      ? metrics.scrollPerformance.reduce((a, b) => a + b, 0) / metrics.scrollPerformance.length
      : 0

    const avgGestureLatency = metrics.gestureLatency.length > 0
      ? metrics.gestureLatency.reduce((a, b) => a + b, 0) / metrics.gestureLatency.length
      : 0

    return {
      score: performanceScore,
      targets: PERFORMANCE_TARGETS,
      results: {
        coreWebVitals: {
          fcp: metrics.fcp,
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls
        },
        touchPerformance: {
          avgResponseTime: avgTouchResponse,
          meetsTarget: avgTouchResponse <= PERFORMANCE_TARGETS.touchResponse
        },
        scrollPerformance: {
          avgFps: avgScrollFps,
          meetsTarget: avgScrollFps >= PERFORMANCE_TARGETS.scrollFps
        },
        gesturePerformance: {
          avgLatency: avgGestureLatency,
          meetsTarget: avgGestureLatency <= PERFORMANCE_TARGETS.gestureResponse
        },
        appLaunch: {
          time: metrics.appLaunchTime,
          meetsTarget: !metrics.appLaunchTime || metrics.appLaunchTime <= PERFORMANCE_TARGETS.appLaunch
        },
        offline: {
          readiness: metrics.offlineReadiness,
          cacheHitRate: metrics.cacheHitRate,
          meetsTarget: metrics.cacheHitRate >= PERFORMANCE_TARGETS.offlineReliability
        },
        device: {
          batteryLevel: metrics.batteryLevel,
          networkType: metrics.networkType,
          memoryUsage: metrics.memoryUsage
        }
      }
    }
  }, [metrics, performanceScore])

  return {
    metrics,
    performanceScore,
    measureTouchResponse,
    measureGestureLatency,
    measureRenderTime,
    measureScrollPerformance,
    checkOfflineReadiness,
    measureCacheHitRate,
    generateReport
  }
}

// React component for performance monitoring
export function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  const performance = usePerformanceMonitoring()
  
  useEffect(() => {
    // Check offline readiness on mount
    performance.checkOfflineReadiness()
    
    // Set up periodic cache hit rate measurement
    const interval = setInterval(() => {
      performance.measureCacheHitRate()
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [performance])

  // Log performance report in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        const report = performance.generateReport()
        console.log('Performance Report:', report)
      }, 5000) // After 5 seconds
      
      return () => clearTimeout(timer)
    }
  }, [performance])

  return <>{children}</>
}

// Hook for component-level performance tracking
export function useComponentPerformance(componentName: string) {
  const { measureRenderTime, measureTouchResponse } = usePerformanceMonitoring()
  const renderStartTime = useRef<number>(0)

  useEffect(() => {
    renderStartTime.current = performance.now()
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current
    if (renderTime > 0) {
      const endMeasurement = measureRenderTime(componentName)
      endMeasurement()
    }
  })

  const trackTouchEvent = useCallback((eventType: string) => {
    const startTime = performance.now()
    
    return () => {
      const responseTime = measureTouchResponse(startTime)
      
      if (process.env.NODE_ENV === 'development' && responseTime > 100) {
        console.warn(`Slow touch response for ${componentName}.${eventType}: ${responseTime.toFixed(2)}ms`)
      }
    }
  }, [componentName, measureTouchResponse])

  return {
    trackTouchEvent
  }
}