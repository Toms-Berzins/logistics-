// Performance monitoring utilities for Core Web Vitals
import React from 'react'

export interface PerformanceMetrics {
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  renderTime?: number
  bundleSize?: number
}

export interface PerformanceEntry {
  name: string
  value: number
  delta: number
  id: string
  timestamp: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()
  private callbacks: Set<(entry: PerformanceEntry) => void> = new Set()
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Largest Contentful Paint
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries.at(-1)
      if (lastEntry) {
        this.recordMetric('LCP', lastEntry.startTime)
      }
    })

    // First Input Delay
    this.observeMetric('first-input', (entries) => {
      const firstEntry = entries[0]
      if (firstEntry) {
        this.recordMetric('FID', firstEntry.processingStart - firstEntry.startTime)
      }
    })

    // Cumulative Layout Shift
    this.observeMetric('layout-shift', (entries) => {
      let cls = 0
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      }
      if (cls > 0) {
        this.recordMetric('CLS', cls)
      }
    })

    // Navigation and Paint timings
    this.observeMetric('navigation', (entries) => {
      const navigation = entries[0] as PerformanceNavigationTiming
      if (navigation) {
        this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart)
      }
    })

    this.observeMetric('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime)
        }
      }
    })
  }

  private observeMetric(
    type: string, 
    callback: (entries: PerformanceEntryList) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries())
      })
      observer.observe({ entryTypes: [type] })
      this.observers.set(type, observer)
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error)
    }
  }

  private recordMetric(name: string, value: number) {
    const id = `${name}-${Date.now()}`
    const existing = this.metrics.get(name)
    const delta = existing ? value - existing.value : value
    
    const entry: PerformanceEntry = {
      name,
      value,
      delta,
      id,
      timestamp: Date.now()
    }
    
    this.metrics.set(name, entry)
    this.callbacks.forEach(callback => callback(entry))
    
    // Log performance issues
    this.checkThresholds(entry)
  }

  private checkThresholds(entry: PerformanceEntry) {
    const thresholds = {
      LCP: 2500, // 2.5s
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      FCP: 1800, // 1.8s
      TTFB: 800  // 800ms
    }

    const threshold = thresholds[entry.name as keyof typeof thresholds]
    if (threshold && entry.value > threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${entry.name} = ${entry.value}ms (threshold: ${threshold}ms)`)
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(entry)
      }
    }
  }

  private sendToAnalytics(entry: PerformanceEntry) {
    // Send to your analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: entry.name,
        metric_value: entry.value,
        metric_delta: entry.delta,
        custom_map: {
          metric_id: entry.id
        }
      })
    }
  }

  // Public API
  public subscribe(callback: (entry: PerformanceEntry) => void) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  public getMetrics(): PerformanceMetrics {
    return {
      lcp: this.metrics.get('LCP')?.value,
      fid: this.metrics.get('FID')?.value,
      cls: this.metrics.get('CLS')?.value,
      fcp: this.metrics.get('FCP')?.value,
      ttfb: this.metrics.get('TTFB')?.value,
    }
  }

  public measureRender(componentName: string, renderFn: () => void) {
    const start = performance.now()
    renderFn()
    const duration = performance.now() - start
    
    this.recordMetric(`render-${componentName}`, duration)
    
    if (duration > 16) { // > 16ms affects 60fps
      console.warn(`🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`)
    }
  }

  public measureAsync<T>(name: string, asyncFn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    return asyncFn().finally(() => {
      const duration = performance.now() - start
      this.recordMetric(`async-${name}`, duration)
    })
  }

  public markBundleSize(bundleName: string, size: number) {
    this.recordMetric(`bundle-${bundleName}`, size)
    
    if (size > 500000) { // > 500KB
      console.warn(`📦 Large bundle: ${bundleName} is ${(size / 1000).toFixed(1)}KB`)
    }
  }

  public disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.callbacks.clear()
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({})

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((entry) => {
      setMetrics(current => ({
        ...current,
        [entry.name.toLowerCase()]: entry.value
      }))
    })

    // Get initial metrics
    setMetrics(performanceMonitor.getMetrics())

    return unsubscribe
  }, [])

  return metrics
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  const PerformanceMonitoredComponent = React.forwardRef<any, P>((props, ref) => {
    const renderStartTime = React.useRef<number>(0)
    
    // Measure render time
    React.useLayoutEffect(() => {
      renderStartTime.current = performance.now()
    })
    
    React.useEffect(() => {
      const renderTime = performance.now() - renderStartTime.current
      performanceMonitor.recordMetric(`render-${componentName}`, renderTime)
    })

    return <WrappedComponent {...props} ref={ref} />
  })
  
  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`
  
  return PerformanceMonitoredComponent
}

// Performance budget checker
export function checkPerformanceBudget() {
  const budget = {
    maxBundleSize: 500000, // 500KB
    maxRenderTime: 16,     // 16ms for 60fps
    maxLCP: 2500,         // 2.5s
    maxFID: 100,          // 100ms
    maxCLS: 0.1           // 0.1
  }

  const metrics = performanceMonitor.getMetrics()
  const violations: string[] = []

  if (metrics.lcp && metrics.lcp > budget.maxLCP) {
    violations.push(`LCP: ${metrics.lcp}ms > ${budget.maxLCP}ms`)
  }
  
  if (metrics.fid && metrics.fid > budget.maxFID) {
    violations.push(`FID: ${metrics.fid}ms > ${budget.maxFID}ms`)
  }
  
  if (metrics.cls && metrics.cls > budget.maxCLS) {
    violations.push(`CLS: ${metrics.cls} > ${budget.maxCLS}`)
  }

  if (violations.length > 0) {
    console.warn('❌ Performance budget violations:', violations)
    return false
  }

  console.log('✅ Performance budget passed')
  return true
}

// Bundle size reporter for webpack
export function reportBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entries = performance.getEntriesByType('resource')
    
    entries.forEach(entry => {
      if (entry.name.includes('.js') || entry.name.includes('.css')) {
        const size = (entry as any).encodedBodySize || (entry as any).transferSize
        if (size) {
          const fileName = entry.name.split('/').pop() || 'unknown'
          performanceMonitor.markBundleSize(fileName, size)
        }
      }
    })
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Report bundle sizes
    window.addEventListener('load', () => {
      setTimeout(reportBundleSize, 1000)
    })

    // Check performance budget periodically
    if (process.env.NODE_ENV === 'development') {
      setInterval(checkPerformanceBudget, 30000) // Every 30 seconds
    }
  }
}