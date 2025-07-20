import React, { lazy, Suspense, ComponentType } from 'react'
import Loading from './Loading'

// Lazy load heavy components with loading fallbacks
export const LazyActiveJobsTable = lazy(() => 
  import('../Dashboard/ActiveJobs/ActiveJobsTable').then(module => ({
    default: module.ActiveJobsTable
  }))
)

export const LazyDriverMap = lazy(() => 
  import('../dispatch/DriverMap').then(module => ({
    default: module.default
  }))
)

export const LazyAnalyticsDashboard = lazy(() => 
  import('../Dashboard/Analytics/AnalyticsDashboard').then(module => ({
    default: module.AnalyticsDashboard
  }))
)

export const LazyPricingPage = lazy(() => 
  import('../PricingPage/PricingPage').then(module => ({
    default: module.PricingPage
  }))
)

export const LazyPaymentMethodsList = lazy(() => 
  import('../PaymentMethods/PaymentMethodsList').then(module => ({
    default: module.PaymentMethodsList
  }))
)

// Higher-order component for lazy loading with error boundary
interface LazyComponentProps {
  fallback?: React.ComponentType
  errorFallback?: React.ComponentType<{ error: Error }>
}

export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: LazyComponentProps = {}
) {
  const { fallback: Fallback = Loading, errorFallback: ErrorFallback } = options

  return function LazyComponent(props: P) {
    return (
      <Suspense fallback={<Fallback />}>
        {ErrorFallback ? (
          <ErrorBoundary fallback={ErrorFallback}>
            <Component {...props} />
          </ErrorBoundary>
        ) : (
          <Component {...props} />
        )}
      </Suspense>
    )
  }
}

// Simple error boundary for lazy components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback
      return <FallbackComponent error={this.state.error} />
    }

    return this.props.children
  }
}

// Preload function for critical components
export const preloadComponents = {
  activeJobs: () => import('../Dashboard/ActiveJobs/ActiveJobsTable'),
  driverMap: () => import('../dispatch/DriverMap'),
  analytics: () => import('../Dashboard/Analytics/AnalyticsDashboard'),
  pricing: () => import('../PricingPage/PricingPage'),
  paymentMethods: () => import('../PaymentMethods/PaymentMethodsList'),
}

// Preload critical components on idle
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload most likely to be used components
      preloadComponents.activeJobs()
      preloadComponents.driverMap()
    })
  }
}