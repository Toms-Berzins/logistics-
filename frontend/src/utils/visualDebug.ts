// Visual debugging utilities for component rendering pipeline

interface RenderMetrics {
  componentName: string
  renderTime: number
  timestamp: number
  props: Record<string, any>
  styles: CSSStyleDeclaration | null
  domNode: HTMLElement | null
}

interface StyleIssue {
  type: 'missing-styles' | 'specificity-conflict' | 'cascade-override' | 'hydration-mismatch'
  severity: 'error' | 'warning' | 'info'
  element: HTMLElement
  message: string
  suggestion?: string
  specificity?: number
}

class VisualDebugger {
  private renderMetrics: RenderMetrics[] = []
  private styleIssues: StyleIssue[] = []
  private observers: MutationObserver[] = []
  private isEnabled: boolean = process.env.NODE_ENV === 'development'

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupDebugTools()
      this.monitorStyleChanges()
    }
  }

  // Add debug attributes to components
  addDebugAttributes(element: HTMLElement, componentName: string, props: Record<string, any> = {}) {
    if (!this.isEnabled || !element) return

    element.setAttribute('data-component', componentName)
    element.setAttribute('data-testid', `${componentName.toLowerCase()}-${Date.now()}`)
    element.setAttribute('data-render-time', Date.now().toString())
    
    // Add props as debug attributes (excluding functions and complex objects)
    Object.entries(props).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        element.setAttribute(`data-prop-${key}`, String(value))
      }
    })

    this.trackRenderMetrics(componentName, element, props)
  }

  // Track component render performance
  trackRenderMetrics(componentName: string, element: HTMLElement, props: Record<string, any>) {
    const renderTime = performance.now()
    const styles = window.getComputedStyle(element)

    const metrics: RenderMetrics = {
      componentName,
      renderTime,
      timestamp: Date.now(),
      props,
      styles,
      domNode: element
    }

    this.renderMetrics.push(metrics)

    // Keep only last 100 metrics
    if (this.renderMetrics.length > 100) {
      this.renderMetrics.shift()
    }

    // Check for render performance issues
    this.checkRenderPerformance(metrics)
  }

  // Check for slow renders
  private checkRenderPerformance(metrics: RenderMetrics) {
    const SLOW_RENDER_THRESHOLD = 16 // 16ms for 60fps

    if (metrics.renderTime > SLOW_RENDER_THRESHOLD) {
      console.warn(`Slow render detected: ${metrics.componentName} took ${metrics.renderTime.toFixed(2)}ms`)
      
      this.addStyleIssue({
        type: 'missing-styles',
        severity: 'warning',
        element: metrics.domNode!,
        message: `Component ${metrics.componentName} rendered slowly (${metrics.renderTime.toFixed(2)}ms)`,
        suggestion: 'Consider optimizing render logic or using React.memo()'
      })
    }
  }

  // Monitor style changes and detect issues
  private monitorStyleChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const element = mutation.target as HTMLElement
          this.checkStyleIssues(element)
        }
      })
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    })

    this.observers.push(observer)
  }

  // Check for common style issues
  checkStyleIssues(element: HTMLElement) {
    if (!element.getAttribute('data-component')) return

    const computedStyles = window.getComputedStyle(element)
    const componentName = element.getAttribute('data-component')!

    // Check for missing styles
    if (computedStyles.display === 'inline' && element.tagName === 'DIV') {
      this.addStyleIssue({
        type: 'missing-styles',
        severity: 'warning',
        element,
        message: `Component ${componentName} may have missing block styles`,
        suggestion: 'Verify CSS classes are applied correctly'
      })
    }

    // Check for invisible elements
    if (computedStyles.opacity === '0' || computedStyles.visibility === 'hidden') {
      this.addStyleIssue({
        type: 'missing-styles',
        severity: 'info',
        element,
        message: `Component ${componentName} is invisible`,
        suggestion: 'Check if this is intentional'
      })
    }

    // Check for zero dimensions
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      this.addStyleIssue({
        type: 'missing-styles',
        severity: 'error',
        element,
        message: `Component ${componentName} has zero dimensions`,
        suggestion: 'Verify width/height styles are applied'
      })
    }
  }

  // Add style issue to tracking
  private addStyleIssue(issue: StyleIssue) {
    this.styleIssues.push(issue)
    
    // Keep only last 50 issues
    if (this.styleIssues.length > 50) {
      this.styleIssues.shift()
    }

    if (issue.severity === 'error') {
      console.error(`Style Issue: ${issue.message}`, issue.element)
    } else if (issue.severity === 'warning') {
      console.warn(`Style Issue: ${issue.message}`, issue.element)
    }
  }

  // Enhanced CSS specificity calculator
  calculateSpecificity(selector: string): { value: number; breakdown: { ids: number; classes: number; elements: number; inline: number } } {
    // Clean up selector for accurate parsing
    const cleanSelector = selector.replace(/\s+/g, ' ').trim()
    
    // Count IDs (#id)
    const idCount = (cleanSelector.match(/#[\w-]+/g) || []).length
    
    // Count classes (.class), attributes ([attr]), pseudo-classes (:hover)
    const classCount = (cleanSelector.match(/\.[\w-]+/g) || []).length +
                      (cleanSelector.match(/\[[^\]]+\]/g) || []).length +
                      (cleanSelector.match(/:(?!not\(|is\(|where\()[\w-]+/g) || []).length
    
    // Count elements (div, span, etc.) and pseudo-elements (::before)
    const elementCount = (cleanSelector.match(/\b[a-z][\w-]*(?=\s|$|[.#:\[])/gi) || []).length +
                        (cleanSelector.match(/::[\w-]+/g) || []).length
    
    // Inline styles have highest specificity
    const inlineCount = selector.includes('style=') ? 1 : 0
    
    const value = inlineCount * 1000 + idCount * 100 + classCount * 10 + elementCount
    
    return {
      value,
      breakdown: {
        inline: inlineCount,
        ids: idCount,
        classes: classCount,
        elements: elementCount
      }
    }
  }

  // Analyze CSS conflicts
  analyzeCSSConflicts(element: HTMLElement) {
    const rules = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || [])
        } catch {
          return []
        }
      })
      .filter(rule => rule.type === CSSRule.STYLE_RULE) as CSSStyleRule[]

    const conflictingRules = rules.filter(rule => {
      try {
        return element.matches(rule.selectorText)
      } catch {
        return false
      }
    })

    const specificityMap = conflictingRules.map(rule => {
      const specificity = this.calculateSpecificity(rule.selectorText)
      return {
        rule,
        specificity: specificity.value,
        specificityBreakdown: specificity.breakdown,
        selector: rule.selectorText
      }
    })

    return specificityMap.sort((a, b) => b.specificity - a.specificity)
  }

  // Generate component health report
  generateHealthReport() {
    const slowComponents = this.renderMetrics
      .filter(m => m.renderTime > 16)
      .reduce((acc, m) => {
        acc[m.componentName] = (acc[m.componentName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const issuesByComponent = this.styleIssues
      .reduce((acc, issue) => {
        const componentName = issue.element.getAttribute('data-component') || 'unknown'
        acc[componentName] = (acc[componentName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      totalComponents: new Set(this.renderMetrics.map(m => m.componentName)).size,
      slowComponents,
      styleIssues: this.styleIssues.length,
      issuesByComponent,
      averageRenderTime: this.renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / this.renderMetrics.length,
      recentIssues: this.styleIssues.slice(-10)
    }
  }

  // Advanced CSS specificity analysis
  analyzeSpecificityConflicts(element: HTMLElement) {
    const conflicts = this.analyzeCSSConflicts(element)
    const issues: StyleIssue[] = []
    
    // Check for unnecessarily high specificity
    conflicts.forEach(conflict => {
      const { specificity, specificityBreakdown, selector } = conflict
      
      if (specificityBreakdown.ids > 2) {
        issues.push({
          type: 'specificity-conflict',
          severity: 'warning',
          element,
          message: `High ID specificity in selector: ${selector}`,
          suggestion: 'Consider using classes instead of multiple IDs',
          specificity
        })
      }
      
      if (specificity > 200) {
        issues.push({
          type: 'specificity-conflict',
          severity: 'warning',
          element,
          message: `Very high specificity (${specificity}): ${selector}`,
          suggestion: 'Refactor to use lower specificity selectors'
        })
      }
    })
    
    // Check for conflicting rules with same specificity
    const sameSpecificity = conflicts.filter((c, i, arr) => 
      arr.some((other, j) => i !== j && other.specificity === c.specificity)
    )
    
    if (sameSpecificity.length > 1) {
      issues.push({
        type: 'cascade-override',
        severity: 'info',
        element,
        message: `Multiple rules with same specificity (cascade order matters)`,
        suggestion: 'Consider adjusting specificity or rule order'
      })
    }
    
    return { conflicts, issues }
  }

  // Visual diff highlighting with before/after comparison
  highlightChanges(element: HTMLElement, changes: string[]) {
    if (!this.isEnabled) return

    element.style.outline = '2px solid #ff6b6b'
    element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
    
    const tooltip = document.createElement('div')
    tooltip.textContent = `Changes: ${changes.join(', ')}`
    tooltip.style.cssText = `
      position: absolute;
      background: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
    `
    
    document.body.appendChild(tooltip)
    
    const rect = element.getBoundingClientRect()
    tooltip.style.left = `${rect.left}px`
    tooltip.style.top = `${rect.top - 30}px`

    setTimeout(() => {
      element.style.outline = ''
      element.style.backgroundColor = ''
      document.body.removeChild(tooltip)
    }, 3000)
  }

  // Create visual diff between states
  createVisualDiff(elementBefore: HTMLElement, elementAfter: HTMLElement, changeType: 'style' | 'content' | 'layout') {
    const diff = {
      changeType,
      timestamp: Date.now(),
      before: this.captureElementState(elementBefore),
      after: this.captureElementState(elementAfter),
      differences: this.findDifferences(elementBefore, elementAfter)
    }
    
    // Highlight differences visually
    this.visualizeDifferences(elementAfter, diff.differences)
    
    return diff
  }

  // Capture comprehensive element state
  private captureElementState(element: HTMLElement) {
    const computedStyles = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    
    return {
      tagName: element.tagName,
      className: element.className,
      textContent: element.textContent?.slice(0, 100),
      dimensions: {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      },
      styles: {
        display: computedStyles.display,
        position: computedStyles.position,
        color: computedStyles.color,
        backgroundColor: computedStyles.backgroundColor,
        fontSize: computedStyles.fontSize,
        fontWeight: computedStyles.fontWeight,
        margin: computedStyles.margin,
        padding: computedStyles.padding,
        border: computedStyles.border,
        transform: computedStyles.transform,
        opacity: computedStyles.opacity,
        zIndex: computedStyles.zIndex
      },
      attributes: Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value
        return acc
      }, {} as Record<string, string>)
    }
  }

  // Find differences between element states
  private findDifferences(elementBefore: HTMLElement, elementAfter: HTMLElement) {
    const before = this.captureElementState(elementBefore)
    const after = this.captureElementState(elementAfter)
    const differences: Array<{property: string; before: any; after: any; type: 'style' | 'content' | 'attribute' | 'layout'}> = []
    
    // Style differences
    Object.keys(after.styles).forEach(key => {
      if (before.styles[key as keyof typeof before.styles] !== after.styles[key as keyof typeof after.styles]) {
        differences.push({
          property: key,
          before: before.styles[key as keyof typeof before.styles],
          after: after.styles[key as keyof typeof after.styles],
          type: 'style'
        })
      }
    })
    
    // Content differences
    if (before.textContent !== after.textContent) {
      differences.push({
        property: 'textContent',
        before: before.textContent,
        after: after.textContent,
        type: 'content'
      })
    }
    
    // Layout differences
    Object.keys(after.dimensions).forEach(key => {
      const beforeVal = before.dimensions[key as keyof typeof before.dimensions]
      const afterVal = after.dimensions[key as keyof typeof after.dimensions]
      if (Math.abs(beforeVal - afterVal) > 1) { // 1px tolerance
        differences.push({
          property: key,
          before: beforeVal,
          after: afterVal,
          type: 'layout'
        })
      }
    })
    
    // Attribute differences
    Object.keys(after.attributes).forEach(key => {
      if (before.attributes[key] !== after.attributes[key]) {
        differences.push({
          property: key,
          before: before.attributes[key],
          after: after.attributes[key],
          type: 'attribute'
        })
      }
    })
    
    return differences
  }

  // Visualize differences with color coding
  private visualizeDifferences(element: HTMLElement, differences: Array<{property: string; type: string}>) {
    const colors = {
      style: '#3b82f6',    // blue
      content: '#10b981',  // green
      layout: '#f59e0b',   // yellow
      attribute: '#8b5cf6' // purple
    }
    
    differences.forEach((diff, index) => {
      const color = colors[diff.type as keyof typeof colors]
      
      // Create visual indicator
      const indicator = document.createElement('div')
      indicator.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        z-index: 10001;
        pointer-events: none;
        animation: pulse 1s infinite;
      `
      
      const rect = element.getBoundingClientRect()
      indicator.style.left = `${rect.right - 8 - (index * 12)}px`
      indicator.style.top = `${rect.top - 4}px`
      
      document.body.appendChild(indicator)
      
      // Add tooltip on hover
      const tooltip = document.createElement('div')
      tooltip.textContent = `${diff.type}: ${diff.property}`
      tooltip.style.cssText = `
        position: absolute;
        background: ${color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        z-index: 10002;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      `
      
      indicator.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1'
        document.body.appendChild(tooltip)
        tooltip.style.left = `${rect.right - 100}px`
        tooltip.style.top = `${rect.top - 25}px`
      })
      
      indicator.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0'
        setTimeout(() => {
          if (tooltip.parentNode) {
            document.body.removeChild(tooltip)
          }
        }, 200)
      })
      
      // Clean up after 5 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          document.body.removeChild(indicator)
        }
      }, 5000)
    })
  }

  // Setup debug overlay
  private setupDebugTools() {
    if (typeof window === 'undefined') return

    // Add to window for console access
    ;(window as any).__visualDebugger = this

    // Create debug panel
    const debugPanel = document.createElement('div')
    debugPanel.id = 'visual-debug-panel'
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      max-width: 300px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: none;
    `

    document.body.appendChild(debugPanel)

    // Toggle panel with keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        const panel = document.getElementById('visual-debug-panel')!
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
        this.updateDebugPanel()
      }
    })
  }

  // Update debug panel content
  private updateDebugPanel() {
    const panel = document.getElementById('visual-debug-panel')
    if (!panel) return

    const report = this.generateHealthReport()
    const allComponents = document.querySelectorAll('[data-component]')
    let totalSpecificityIssues = 0
    
    // Analyze CSS conflicts for all components
    allComponents.forEach(element => {
      const conflicts = this.analyzeSpecificityConflicts(element as HTMLElement)
      totalSpecificityIssues += conflicts.issues.length
    })
    
    panel.innerHTML = `
      <div style="max-height: 400px; overflow-y: auto;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Visual Debug Panel</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div style="background: #f8f9fa; padding: 8px; border-radius: 4px;">
            <div style="font-weight: bold; color: #495057;">Performance</div>
            <div style="font-size: 11px; color: #6c757d;">
              Avg Render: ${report.averageRenderTime.toFixed(2)}ms<br>
              Components: ${report.totalComponents}
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 8px; border-radius: 4px;">
            <div style="font-weight: bold; color: #495057;">Issues</div>
            <div style="font-size: 11px; color: #6c757d;">
              Style: ${report.styleIssues}<br>
              CSS Conflicts: ${totalSpecificityIssues}
            </div>
          </div>
        </div>
        
        ${Object.keys(report.slowComponents).length > 0 ? `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #dc3545;">Slow Components:</div>
            <div style="background: #fff5f5; padding: 6px; border-radius: 4px; border-left: 3px solid #dc3545;">
              ${Object.entries(report.slowComponents).map(([name, count]) => 
                `<div style="font-size: 11px;">${name}: ${count} slow renders</div>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
          <button onclick="window.__visualDebugger?.highlightAllComponents()" 
                  style="background: #007bff; color: white; border: none; padding: 4px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">
            Highlight All
          </button>
          <button onclick="window.__visualDebugger?.analyzePageCSS()" 
                  style="background: #28a745; color: white; border: none; padding: 4px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">
            Analyze CSS
          </button>
          <button onclick="window.__visualDebugger?.checkAccessibility()" 
                  style="background: #ffc107; color: black; border: none; padding: 4px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">
            A11y Check
          </button>
          <button onclick="console.log('Health Report:', window.__visualDebugger?.generateHealthReport())" 
                  style="background: #6c757d; color: white; border: none; padding: 4px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">
            Log Report
          </button>
        </div>
        
        <div style="font-size: 10px; color: #6c757d; text-align: center; border-top: 1px solid #dee2e6; padding-top: 6px;">
          Ctrl+Shift+D: Toggle Panel | Ctrl+Shift+H: Health Dashboard
        </div>
      </div>
    `
  }
  
  // Highlight all components for visual inspection
  highlightAllComponents() {
    const components = document.querySelectorAll('[data-component]')
    components.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      const componentName = htmlEl.getAttribute('data-component')
      
      htmlEl.style.outline = '2px solid #3b82f6'
      htmlEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
      
      // Add component label
      const label = document.createElement('div')
      label.textContent = componentName || 'Unknown'
      label.style.cssText = `
        position: absolute;
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        z-index: 10000;
        pointer-events: none;
        font-family: monospace;
      `
      
      const rect = htmlEl.getBoundingClientRect()
      label.style.left = `${rect.left}px`
      label.style.top = `${rect.top - 20}px`
      
      document.body.appendChild(label)
      
      setTimeout(() => {
        htmlEl.style.outline = ''
        htmlEl.style.backgroundColor = ''
        if (label.parentNode) {
          document.body.removeChild(label)
        }
      }, 3000)
    })
  }
  
  // Analyze CSS across the entire page
  analyzePageCSS() {
    const components = document.querySelectorAll('[data-component]')
    const analysis = {
      totalComponents: components.length,
      specificityIssues: 0,
      conflictingRules: 0,
      highSpecificity: [] as Array<{component: string; selector: string; specificity: number}>
    }
    
    components.forEach(element => {
      const htmlEl = element as HTMLElement
      const componentName = htmlEl.getAttribute('data-component')
      const conflicts = this.analyzeSpecificityConflicts(htmlEl)
      
      analysis.specificityIssues += conflicts.issues.length
      analysis.conflictingRules += conflicts.conflicts.length
      
      conflicts.conflicts.forEach(conflict => {
        if (conflict.specificity > 150) {
          analysis.highSpecificity.push({
            component: componentName || 'Unknown',
            selector: conflict.selector,
            specificity: conflict.specificity
          })
        }
      })
    })
    
    console.group('🎨 CSS Analysis Report')
    console.log('Components analyzed:', analysis.totalComponents)
    console.log('Specificity issues found:', analysis.specificityIssues)
    console.log('Conflicting rules:', analysis.conflictingRules)
    
    if (analysis.highSpecificity.length > 0) {
      console.group('⚠️ High Specificity Selectors (>150)')
      analysis.highSpecificity.forEach(item => {
        console.log(`${item.component}: ${item.selector} (${item.specificity})`)
      })
      console.groupEnd()
    }
    
    console.groupEnd()
    
    return analysis
  }
  
  // Basic accessibility check
  checkAccessibility() {
    const issues: Array<{element: HTMLElement; issue: string; severity: 'error' | 'warning'}> = []
    
    // Check for missing alt text on images
    const images = document.querySelectorAll('img:not([alt])')
    images.forEach(img => {
      issues.push({
        element: img as HTMLElement,
        issue: 'Missing alt attribute',
        severity: 'error'
      })
    })
    
    // Check for small click targets
    const clickable = document.querySelectorAll('button, a, [role="button"], input[type="submit"]')
    clickable.forEach(el => {
      const htmlEl = el as HTMLElement
      const rect = htmlEl.getBoundingClientRect()
      if (rect.width < 44 || rect.height < 44) {
        issues.push({
          element: htmlEl,
          issue: `Click target too small: ${rect.width}x${rect.height}px (minimum 44x44px)`,
          severity: 'warning'
        })
      }
    })
    
    // Check for low contrast
    const textElements = document.querySelectorAll('*')
    textElements.forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.textContent?.trim()) {
        const styles = window.getComputedStyle(htmlEl)
        const color = styles.color
        const bgColor = styles.backgroundColor
        
        // Simple contrast check (would need more sophisticated algorithm for production)
        if (color === 'rgb(128, 128, 128)' && bgColor === 'rgb(255, 255, 255)') {
          issues.push({
            element: htmlEl,
            issue: 'Potential low contrast text',
            severity: 'warning'
          })
        }
      }
    })
    
    console.group('♿ Accessibility Report')
    console.log(`Found ${issues.length} potential issues`)
    
    const errors = issues.filter(i => i.severity === 'error')
    const warnings = issues.filter(i => i.severity === 'warning')
    
    if (errors.length > 0) {
      console.group(`🚨 Errors (${errors.length})`)
      errors.forEach(issue => console.error(issue.issue, issue.element))
      console.groupEnd()
    }
    
    if (warnings.length > 0) {
      console.group(`⚠️ Warnings (${warnings.length})`)
      warnings.forEach(issue => console.warn(issue.issue, issue.element))
      console.groupEnd()
    }
    
    console.groupEnd()
    
    return issues
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.renderMetrics = []
    this.styleIssues = []
  }
}

// Global debugger instance
export const visualDebugger = new VisualDebugger()

// React hook for component debugging
export function useVisualDebug(componentName: string, props: Record<string, any> = {}) {
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (ref.current) {
      visualDebugger.addDebugAttributes(ref.current, componentName, props)
    }
  }, [componentName, props])

  return ref
}

// Higher-order component for automatic debugging
export function withVisualDebug<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, forwardedRef) => {
    const debugRef = useVisualDebug(componentName || Component.displayName || Component.name, props)
    
    const ref = React.useCallback((node: HTMLElement) => {
      if (node) {
        debugRef.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          forwardedRef.current = node
        }
      }
    }, [debugRef, forwardedRef])

    return React.createElement(Component, { ...props, ref })
  })

  WrappedComponent.displayName = `withVisualDebug(${componentName || Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default visualDebugger

// Import React for hooks
import React from 'react'