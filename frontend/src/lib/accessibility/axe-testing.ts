/**
 * Automated accessibility testing integration with aXe
 * Provides runtime accessibility scanning and reporting
 */

import { ACCESSIBILITY_CONFIG } from './index';

/**
 * aXe configuration interface
 */
export interface AxeConfig {
  enabled: boolean;
  environment: 'development' | 'testing' | 'production';
  rules: Record<string, 'error' | 'warn' | 'off'>;
  tags: string[];
  selectors: {
    include?: string[];
    exclude?: string[];
  };
  reportingLevel: 'violations' | 'all';
  autoScan: boolean;
  scanInterval?: number;
}

/**
 * aXe violation interface
 */
export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
    element: HTMLElement;
  }>;
}

/**
 * aXe scan result interface
 */
export interface AxeScanResult {
  violations: AxeViolation[];
  passes: Array<{
    id: string;
    description: string;
    impact: string;
    tags: string[];
    nodes: number;
  }>;
  incomplete: Array<{
    id: string;
    description: string;
    impact: string;
    tags: string[];
    nodes: number;
  }>;
  timestamp: number;
  url: string;
  duration: number;
}

/**
 * Default aXe configuration
 */
const DEFAULT_AXE_CONFIG: AxeConfig = {
  enabled: true,
  environment: 'development',
  rules: {
    'color-contrast': 'error',
    'keyboard-navigation': 'error',
    'focus-management': 'error',
    'aria-labels': 'error',
    'semantic-markup': 'warn',
    'heading-structure': 'warn',
    'link-purpose': 'warn',
    'image-alt': 'error',
    'form-labels': 'error',
    'landmark-structure': 'warn',
  },
  tags: ['wcag2a', 'wcag2aa', 'section508', 'best-practice'],
  selectors: {
    include: ['main', '[role="main"]', '[data-testid]'],
    exclude: ['[data-testid="loading"]', '.sr-only'],
  },
  reportingLevel: 'violations',
  autoScan: true,
  scanInterval: 30000, // 30 seconds
};

/**
 * aXe testing state
 */
interface AxeTestingState {
  config: AxeConfig;
  isScanning: boolean;
  lastScanResult: AxeScanResult | null;
  scanHistory: AxeScanResult[];
  observers: MutationObserver[];
  intervalId: number | null;
  violationCounts: Record<string, number>;
}

let axeState: AxeTestingState = {
  config: DEFAULT_AXE_CONFIG,
  isScanning: false,
  lastScanResult: null,
  scanHistory: [],
  observers: [],
  intervalId: null,
  violationCounts: {},
};

/**
 * Initialize aXe accessibility testing
 */
export async function initializeAxeTesting(config: Partial<AxeConfig> = {}): Promise<void> {
  // Only initialize in browser environment
  if (typeof window === 'undefined') return;

  // Merge with default config
  axeState.config = { ...DEFAULT_AXE_CONFIG, ...config };

  // Skip if disabled or in production
  if (!axeState.config.enabled || axeState.config.environment === 'production') {
    return;
  }

  try {
    // Dynamically import aXe core
    const axeCore = await import('axe-core');
    
    // Configure aXe
    await configureAxe(axeCore.default);
    
    // Set up auto-scanning if enabled
    if (axeState.config.autoScan) {
      setupAutoScanning();
    }
    
    // Set up mutation observers for dynamic content
    setupDynamicContentScanning();
    
    console.log('aXe accessibility testing initialized');
    
  } catch (error) {
    console.warn('Failed to initialize aXe accessibility testing:', error);
  }
}

/**
 * Configure aXe with custom rules and settings
 */
async function configureAxe(axe: any): Promise<void> {
  const { rules, tags, selectors } = axeState.config;

  // Configure rules
  const ruleConfig: Record<string, any> = {};
  Object.entries(rules).forEach(([ruleId, level]) => {
    ruleConfig[ruleId] = { enabled: level !== 'off' };
  });

  axe.configure({
    rules: ruleConfig,
    tags,
    ...selectors,
  });

  // Add custom logistics-specific rules
  await addLogisticsRules(axe);
}

/**
 * Add custom rules specific to logistics platform
 */
async function addLogisticsRules(axe: any): Promise<void> {
  // Custom rule for job status indicators
  axe.configure({
    rules: {
      'logistics-job-status': {
        enabled: true,
        selector: '[data-job-status]',
        tags: ['logistics', 'wcag2aa'],
        metadata: {
          description: 'Job status indicators must have accessible labels',
          help: 'Ensure job status indicators are properly labeled for screen readers',
        },
        check: (node: HTMLElement) => {
          const statusElement = node.querySelector('[data-job-status]');
          if (!statusElement) return true;

          const hasAriaLabel = statusElement.hasAttribute('aria-label');
          const hasTitle = statusElement.hasAttribute('title');
          const hasVisibleText = statusElement.textContent?.trim();

          return hasAriaLabel || hasTitle || hasVisibleText;
        },
      },
      
      // Custom rule for driver location indicators
      'logistics-driver-location': {
        enabled: true,
        selector: '[data-driver-location]',
        tags: ['logistics', 'wcag2aa'],
        metadata: {
          description: 'Driver location indicators must be accessible',
          help: 'Ensure driver locations are communicated to screen readers',
        },
        check: (node: HTMLElement) => {
          const locationElement = node.querySelector('[data-driver-location]');
          if (!locationElement) return true;

          const hasAriaLabel = locationElement.hasAttribute('aria-label');
          const hasAriaDescribedBy = locationElement.hasAttribute('aria-describedby');

          return hasAriaLabel || hasAriaDescribedBy;
        },
      },
      
      // Custom rule for dispatch board accessibility
      'logistics-dispatch-board': {
        enabled: true,
        selector: '[data-dispatch-board]',
        tags: ['logistics', 'wcag2aa'],
        metadata: {
          description: 'Dispatch board must have proper ARIA structure',
          help: 'Ensure dispatch board is navigable with keyboard and screen readers',
        },
        check: (node: HTMLElement) => {
          const dispatchBoard = node.querySelector('[data-dispatch-board]');
          if (!dispatchBoard) return true;

          const hasRole = dispatchBoard.hasAttribute('role');
          const hasAriaLabel = dispatchBoard.hasAttribute('aria-label');
          const hasFocusableElements = dispatchBoard.querySelectorAll('[tabindex], button, input, select, textarea, a[href]').length > 0;

          return hasRole && hasAriaLabel && hasFocusableElements;
        },
      },
    },
  });
}

/**
 * Run accessibility scan on current page or specific element
 */
export async function runAxeScan(
  element?: HTMLElement,
  options: Partial<AxeConfig> = {}
): Promise<AxeScanResult | null> {
  if (axeState.isScanning) {
    console.warn('aXe scan already in progress');
    return null;
  }

  try {
    axeState.isScanning = true;
    const startTime = performance.now();

    // Dynamically import aXe
    const axeCore = await import('axe-core');
    const axe = axeCore.default;

    // Prepare scan context
    const context = element || document;
    const scanOptions = {
      ...axeState.config,
      ...options,
    };

    // Run the scan
    const results = await axe.run(context, {
      rules: scanOptions.rules,
      tags: scanOptions.tags,
      include: scanOptions.selectors.include,
      exclude: scanOptions.selectors.exclude,
    });

    const scanResult: AxeScanResult = {
      violations: results.violations.map(formatViolation),
      passes: results.passes.map(formatPass),
      incomplete: results.incomplete.map(formatIncomplete),
      timestamp: Date.now(),
      url: window.location.href,
      duration: performance.now() - startTime,
    };

    // Store result
    axeState.lastScanResult = scanResult;
    axeState.scanHistory.push(scanResult);

    // Limit history size
    if (axeState.scanHistory.length > 50) {
      axeState.scanHistory.shift();
    }

    // Update violation counts
    updateViolationCounts(scanResult.violations);

    // Log results
    logScanResults(scanResult);

    // Report critical violations
    reportCriticalViolations(scanResult.violations);

    return scanResult;

  } catch (error) {
    console.error('aXe scan failed:', error);
    return null;
  } finally {
    axeState.isScanning = false;
  }
}

/**
 * Format violation for consistent structure
 */
function formatViolation(violation: any): AxeViolation {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node: any) => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
      element: node.element,
    })),
  };
}

/**
 * Format pass result
 */
function formatPass(pass: any) {
  return {
    id: pass.id,
    description: pass.description,
    impact: pass.impact,
    tags: pass.tags,
    nodes: pass.nodes.length,
  };
}

/**
 * Format incomplete result
 */
function formatIncomplete(incomplete: any) {
  return {
    id: incomplete.id,
    description: incomplete.description,
    impact: incomplete.impact,
    tags: incomplete.tags,
    nodes: incomplete.nodes.length,
  };
}

/**
 * Update violation counts for tracking
 */
function updateViolationCounts(violations: AxeViolation[]): void {
  violations.forEach((violation) => {
    axeState.violationCounts[violation.id] = 
      (axeState.violationCounts[violation.id] || 0) + violation.nodes.length;
  });
}

/**
 * Log scan results to console
 */
function logScanResults(result: AxeScanResult): void {
  const { violations, passes, incomplete, duration } = result;

  console.group(`🔍 aXe Accessibility Scan (${duration.toFixed(2)}ms)`);
  
  if (violations.length > 0) {
    console.error(`❌ ${violations.length} violations found:`);
    violations.forEach((violation) => {
      console.error(`  • ${violation.id} (${violation.impact}): ${violation.description}`);
      violation.nodes.forEach((node) => {
        console.error(`    → ${node.target.join(', ')}`);
      });
    });
  } else {
    console.log('✅ No violations found');
  }

  if (passes.length > 0) {
    console.log(`✅ ${passes.length} rules passed`);
  }

  if (incomplete.length > 0) {
    console.warn(`⚠️ ${incomplete.length} rules need manual review`);
  }

  console.groupEnd();
}

/**
 * Report critical violations
 */
function reportCriticalViolations(violations: AxeViolation[]): void {
  const criticalViolations = violations.filter(v => v.impact === 'critical');
  
  if (criticalViolations.length > 0) {
    console.error(
      `🚨 CRITICAL ACCESSIBILITY VIOLATIONS: ${criticalViolations.length} critical issues found. ` +
      'These must be fixed immediately for WCAG compliance.'
    );

    // In development, show detailed information
    if (axeState.config.environment === 'development') {
      criticalViolations.forEach((violation) => {
        console.error(`Critical violation: ${violation.id}`);
        console.error(`Help: ${violation.help}`);
        console.error(`URL: ${violation.helpUrl}`);
      });
    }
  }
}

/**
 * Set up automatic scanning
 */
function setupAutoScanning(): void {
  if (axeState.intervalId) {
    clearInterval(axeState.intervalId);
  }

  if (axeState.config.scanInterval) {
    axeState.intervalId = window.setInterval(() => {
      runAxeScan();
    }, axeState.config.scanInterval);
  }
}

/**
 * Set up scanning for dynamic content changes
 */
function setupDynamicContentScanning(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if significant content was added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            // Scan if interactive elements or ARIA content was added
            if (
              element.matches?.('button, input, select, textarea, [role], [aria-label], [tabindex]') ||
              element.querySelector?.('button, input, select, textarea, [role], [aria-label], [tabindex]')
            ) {
              shouldScan = true;
            }
          }
        });
      }
    });

    if (shouldScan) {
      // Debounce scanning
      setTimeout(() => {
        runAxeScan();
      }, 1000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  axeState.observers.push(observer);
}

/**
 * Get scan history
 */
export function getAxeScanHistory(limit: number = 10): AxeScanResult[] {
  return axeState.scanHistory.slice(-limit);
}

/**
 * Get violation counts
 */
export function getViolationCounts(): Record<string, number> {
  return { ...axeState.violationCounts };
}

/**
 * Clear scan history
 */
export function clearAxeHistory(): void {
  axeState.scanHistory = [];
  axeState.violationCounts = {};
}

/**
 * Stop aXe testing
 */
export function stopAxeTesting(): void {
  // Clear interval
  if (axeState.intervalId) {
    clearInterval(axeState.intervalId);
    axeState.intervalId = null;
  }

  // Disconnect observers
  axeState.observers.forEach((observer) => {
    observer.disconnect();
  });
  axeState.observers = [];

  console.log('aXe accessibility testing stopped');
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(): string {
  const { lastScanResult, violationCounts } = axeState;
  
  if (!lastScanResult) {
    return 'No scan results available';
  }

  const { violations, passes, incomplete, timestamp, url, duration } = lastScanResult;
  
  let report = `# Accessibility Report\n\n`;
  report += `**Generated:** ${new Date(timestamp).toLocaleString()}\n`;
  report += `**URL:** ${url}\n`;
  report += `**Scan Duration:** ${duration.toFixed(2)}ms\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `- ✅ **Passed:** ${passes.length} rules\n`;
  report += `- ❌ **Violations:** ${violations.length} issues\n`;
  report += `- ⚠️ **Incomplete:** ${incomplete.length} manual checks needed\n\n`;

  // Violations by impact
  if (violations.length > 0) {
    const violationsByImpact = violations.reduce((acc, v) => {
      acc[v.impact] = (acc[v.impact] || 0) + v.nodes.length;
      return acc;
    }, {} as Record<string, number>);

    report += `## Violations by Impact\n\n`;
    Object.entries(violationsByImpact)
      .sort(([, a], [, b]) => b - a)
      .forEach(([impact, count]) => {
        report += `- **${impact.toUpperCase()}:** ${count} issues\n`;
      });
    report += '\n';

    // Detailed violations
    report += `## Detailed Violations\n\n`;
    violations.forEach((violation, index) => {
      report += `### ${index + 1}. ${violation.id} (${violation.impact})\n\n`;
      report += `**Description:** ${violation.description}\n\n`;
      report += `**Help:** ${violation.help}\n\n`;
      report += `**Learn More:** [${violation.helpUrl}](${violation.helpUrl})\n\n`;
      
      if (violation.nodes.length > 0) {
        report += `**Affected Elements:**\n`;
        violation.nodes.forEach((node, nodeIndex) => {
          report += `${nodeIndex + 1}. \`${node.target.join(' > ')}\`\n`;
        });
        report += '\n';
      }
    });
  }

  return report;
}

/**
 * Download accessibility report as file
 */
export function downloadAccessibilityReport(): void {
  const report = generateAccessibilityReport();
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `accessibility-report-${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}