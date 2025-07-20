// Tree-shaking optimization utilities

// Optimized icon imports to prevent full icon library loading
export const Icons = {
  // Only import specific icons to avoid loading entire libraries
  ChevronDown: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ChevronDownIcon })),
  ChevronUp: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ChevronUpIcon })),
  Search: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.MagnifyingGlassIcon })),
  Filter: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.FunnelIcon })),
  Settings: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.CogIcon })),
  Map: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.MapIcon })),
  Table: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.TableCellsIcon })),
  Chart: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ChartBarIcon })),
  Download: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ArrowDownTrayIcon })),
  Upload: () => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ArrowUpTrayIcon })),
}

// Optimized date-fns imports to prevent loading entire library
export const DateUtils = {
  format: () => import('date-fns/format').then(mod => mod.default),
  formatDistanceToNow: () => import('date-fns/formatDistanceToNow').then(mod => mod.default),
  parseISO: () => import('date-fns/parseISO').then(mod => mod.default),
  startOfDay: () => import('date-fns/startOfDay').then(mod => mod.default),
  endOfDay: () => import('date-fns/endOfDay').then(mod => mod.default),
  subDays: () => import('date-fns/subDays').then(mod => mod.default),
  addDays: () => import('date-fns/addDays').then(mod => mod.default),
}

// Optimized lodash imports
export const LodashUtils = {
  debounce: () => import('lodash-es/debounce').then(mod => mod.default),
  throttle: () => import('lodash-es/throttle').then(mod => mod.default),
  cloneDeep: () => import('lodash-es/cloneDeep').then(mod => mod.default),
  merge: () => import('lodash-es/merge').then(mod => mod.default),
  pick: () => import('lodash-es/pick').then(mod => mod.default),
  omit: () => import('lodash-es/omit').then(mod => mod.default),
}

// Dynamic import helper with error handling and caching
class DynamicImportCache {
  private cache = new Map<string, Promise<any>>()
  
  async import<T>(
    importKey: string,
    importFn: () => Promise<{ default: T }>,
    fallback?: T
  ): Promise<T> {
    if (!this.cache.has(importKey)) {
      this.cache.set(importKey, importFn().catch(error => {
        console.error(`Failed to load ${importKey}:`, error)
        if (fallback) {
          return { default: fallback }
        }
        throw error
      }))
    }
    
    const module = await this.cache.get(importKey)!
    return module.default
  }
  
  preload(importKey: string, importFn: () => Promise<any>) {
    if (!this.cache.has(importKey)) {
      this.cache.set(importKey, importFn())
    }
  }
  
  clear() {
    this.cache.clear()
  }
}

export const importCache = new DynamicImportCache()

// Bundle analyzer helper
export function analyzeBundleUsage() {
  if (typeof window === 'undefined') return
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    
    entries.forEach(entry => {
      if (entry.entryType === 'resource' && entry.name.includes('.js')) {
        const size = (entry as any).transferSize || (entry as any).encodedBodySize
        const fileName = entry.name.split('/').pop()
        
        if (size > 100000) { // > 100KB
          console.warn(`📦 Large bundle detected: ${fileName} (${(size / 1000).toFixed(1)}KB)`)
        }
      }
    })
  })
  
  observer.observe({ entryTypes: ['resource'] })
  
  // Report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const jsResources = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .map(entry => ({
          name: entry.name.split('/').pop(),
          size: (entry as any).transferSize || (entry as any).encodedBodySize,
          duration: entry.duration
        }))
        .sort((a, b) => b.size - a.size)
      
      console.group('📊 Bundle Analysis')
      console.table(jsResources.slice(0, 10)) // Top 10 largest bundles
      console.groupEnd()
    }, 2000)
  })
}

// Code splitting helper for routes
export function createRouteComponent<T>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback: React.ComponentType = () => React.createElement('div', null, 'Loading...')
) {
  return React.lazy(importFn)
}

// SVG optimization helper
export function optimizeSVGImports() {
  // This would typically be handled by a build tool
  // But we can provide runtime optimization for inline SVGs
  const svgElements = document.querySelectorAll('svg')
  
  svgElements.forEach(svg => {
    // Remove unnecessary attributes
    svg.removeAttribute('xmlns:xlink')
    svg.removeAttribute('xml:space')
    
    // Optimize paths
    const paths = svg.querySelectorAll('path')
    paths.forEach(path => {
      const d = path.getAttribute('d')
      if (d) {
        // Simple path optimization (remove unnecessary precision)
        const optimized = d.replace(/(\d+\.\d{3,})/g, (match) => 
          parseFloat(match).toFixed(2)
        )
        path.setAttribute('d', optimized)
      }
    })
  })
}

// Preload critical resources
export function preloadCriticalResources() {
  const criticalResources = [
    // Preload critical CSS
    { href: '/_next/static/css/critical.css', as: 'style' },
    // Preload critical fonts
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    // Preload critical images
    { href: '/icons/logo.svg', as: 'image' },
  ]
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    Object.assign(link, resource)
    document.head.appendChild(link)
  })
}

// Module federation helper for micro-frontends
export function loadFederatedModule<T>(
  scope: string,
  module: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${scope}/remoteEntry.js`
    script.onload = () => {
      // @ts-ignore
      const container = window[scope]
      container.init(__webpack_share_scopes__.default)
      container.get(module).then((factory: () => T) => {
        const Module = factory()
        resolve(Module)
      }).catch(reject)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// Tree-shaking validator (development only)
export function validateTreeShaking() {
  if (process.env.NODE_ENV !== 'development') return
  
  const unusedExports = new Set<string>()
  
  // This would require build-time analysis in a real implementation
  // For now, just log imported modules
  console.group('🌲 Tree Shaking Analysis')
  console.log('Consider using webpack-bundle-analyzer for detailed analysis')
  console.groupEnd()
}

// Initialize optimizations
export function initializeTreeShakingOptimizations() {
  if (typeof window === 'undefined') return
  
  // Analyze bundle usage
  analyzeBundleUsage()
  
  // Preload critical resources
  preloadCriticalResources()
  
  // Optimize SVGs after load
  window.addEventListener('load', () => {
    setTimeout(optimizeSVGImports, 1000)
  })
  
  // Validate tree shaking in development
  validateTreeShaking()
}