import type { TestRunnerConfig } from '@storybook/test-runner'
import { getStoryContext } from '@storybook/test-runner'

const config: TestRunnerConfig = {
  setup() {
    // Setup Percy for visual testing
    if (process.env.PERCY_TOKEN) {
      require('@percy/storybook')
    }
  },
  
  async preVisit(page, context) {
    // Set viewport based on story parameters
    const storyContext = await getStoryContext(page, context)
    const viewport = storyContext.parameters?.viewport?.defaultViewport
    
    if (viewport) {
      const viewports = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1280, height: 800 },
        wide: { width: 1920, height: 1080 }
      }
      
      const size = viewports[viewport as keyof typeof viewports]
      if (size) {
        await page.setViewportSize(size)
      }
    }

    // Wait for fonts and animations
    await page.evaluate(() => {
      return Promise.all([
        document.fonts.ready,
        new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(undefined)
          } else {
            window.addEventListener('load', () => resolve(undefined))
          }
        })
      ])
    })

    // Disable animations for consistent snapshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    })
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context)
    
    // Skip visual tests for certain stories
    if (storyContext.parameters?.percy?.disable) {
      return
    }

    // Take Percy snapshot
    if (process.env.PERCY_TOKEN) {
      const percySnapshot = require('@percy/playwright')
      
      const options = {
        name: `${context.title} - ${context.name}`,
        ...storyContext.parameters?.percy
      }

      await percySnapshot(page, options.name, options)
    }

    // Component health checks
    await page.evaluate(() => {
      const debugger = (window as any).__visualDebugger
      if (debugger) {
        const report = debugger.generateHealthReport()
        console.log('Component Health Report:', report)
        
        // Fail test if critical issues found
        if (report.recentIssues.some((issue: any) => issue.severity === 'error')) {
          throw new Error(`Critical rendering issues found: ${report.recentIssues.length}`)
        }
      }
    })
  },

  // Test timeout
  timeout: 10000,
}

export default config