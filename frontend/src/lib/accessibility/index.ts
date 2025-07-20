/**
 * Comprehensive accessibility infrastructure for logistics platform
 * WCAG 2.1 AA compliant with logistics-specific enhancements
 */

export * from './focus-management';
export * from './keyboard-navigation';
export * from './live-regions';
export * from './logistics-shortcuts';
export * from './screen-reader';
export * from './aria-landmarks';

// Re-export enhanced utilities from base accessibility
export {
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  calculateContrastRatio,
  meetsContrastRequirements,
  getFocusStyles,
  getAriaAttributes,
  isFocusable,
  getFocusableElements,
  handleKeyboardNavigation
} from '../accessibility';

/**
 * Accessibility configuration for logistics platform
 */
export const ACCESSIBILITY_CONFIG = {
  // Performance targets
  KEYBOARD_RESPONSE_TIME: 50, // ms
  LIVE_REGION_DELAY: 200, // ms
  FOCUS_TRANSITION_DURATION: 150, // ms
  
  // WCAG compliance levels
  CONTRAST_RATIOS: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
  },
  
  // Logistics-specific settings
  JOB_STATUS_ANNOUNCEMENT_DELAY: 500, // ms
  DRIVER_UPDATE_PRIORITY: 'assertive' as const,
  NOTIFICATION_THROTTLE: 2000, // ms
  
  // Screen reader optimization
  DESCRIPTION_MAX_LENGTH: 120,
  INSTRUCTION_MAX_LENGTH: 80,
  STATUS_MESSAGE_MAX_LENGTH: 60,
  
  // Focus management
  FOCUS_TRAP_SELECTOR: '[data-focus-trap]',
  SKIP_LINK_OFFSET: 16, // px
  ROVING_TABINDEX_SELECTOR: '[data-roving-tabindex]',
} as const;

/**
 * Logistics-specific ARIA roles and patterns
 */
export const LOGISTICS_ARIA_PATTERNS = {
  // Job management
  JOB_LIST: 'grid',
  JOB_ITEM: 'gridcell',
  JOB_STATUS: 'status',
  JOB_PRIORITY: 'note',
  
  // Driver tracking
  DRIVER_LIST: 'list',
  DRIVER_ITEM: 'listitem',
  DRIVER_LOCATION: 'region',
  DRIVER_STATUS: 'status',
  
  // Dispatch operations
  DISPATCH_BOARD: 'application',
  ROUTE_PLANNER: 'region',
  MAP_CONTAINER: 'img',
  
  // Notifications
  ALERT_CONTAINER: 'alert',
  STATUS_CONTAINER: 'status',
  LOG_CONTAINER: 'log',
} as const;

/**
 * Predefined ARIA labels for common logistics elements
 */
export const LOGISTICS_ARIA_LABELS = {
  // Actions
  ASSIGN_JOB: 'Assign job to driver',
  REASSIGN_JOB: 'Reassign job to different driver',
  CANCEL_JOB: 'Cancel job assignment',
  VIEW_DETAILS: 'View job details',
  UPDATE_STATUS: 'Update job status',
  
  // Navigation
  MAIN_NAVIGATION: 'Main navigation',
  BREADCRUMB: 'Breadcrumb navigation',
  PAGINATION: 'Page navigation',
  FILTER_CONTROLS: 'Filter and search controls',
  
  // Status indicators
  JOB_PENDING: 'Job pending assignment',
  JOB_ASSIGNED: 'Job assigned to driver',
  JOB_IN_PROGRESS: 'Job in progress',
  JOB_COMPLETED: 'Job completed',
  JOB_CANCELLED: 'Job cancelled',
  
  DRIVER_AVAILABLE: 'Driver available',
  DRIVER_BUSY: 'Driver on assignment',
  DRIVER_OFFLINE: 'Driver offline',
  
  // Interactive elements
  SORT_ASCENDING: 'Sort in ascending order',
  SORT_DESCENDING: 'Sort in descending order',
  EXPAND_DETAILS: 'Expand details panel',
  COLLAPSE_DETAILS: 'Collapse details panel',
} as const;

/**
 * Initialize accessibility features for the logistics platform
 */
export function initializeAccessibility(): void {
  // Set up global keyboard shortcuts
  setupGlobalKeyboardShortcuts();
  
  // Initialize live region manager
  initializeLiveRegions();
  
  // Set up focus management
  initializeFocusManagement();
  
  // Apply ARIA landmarks
  applyAriaLandmarks();
  
  // Set up high contrast mode detection
  initializeHighContrastMode();
}

/**
 * Global keyboard shortcuts setup
 */
function setupGlobalKeyboardShortcuts(): void {
  if (typeof window === 'undefined') return;
  
  document.addEventListener('keydown', (event) => {
    // Skip if user is typing in an input
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // Global shortcuts (Ctrl/Cmd + key)
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'd':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('logistics:dispatch'));
          break;
        case 'r':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('logistics:reassign'));
          break;
        case '/':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('logistics:search'));
          break;
      }
    }
    
    // Standalone shortcuts
    switch (event.key) {
      case '?':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('logistics:help'));
        }
        break;
    }
  });
}

/**
 * Initialize live regions for dynamic announcements
 */
function initializeLiveRegions(): void {
  if (typeof window === 'undefined') return;
  
  // Create polite live region
  const politeRegion = document.createElement('div');
  politeRegion.id = 'accessibility-live-polite';
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'true');
  politeRegion.className = 'sr-only';
  document.body.appendChild(politeRegion);
  
  // Create assertive live region
  const assertiveRegion = document.createElement('div');
  assertiveRegion.id = 'accessibility-live-assertive';
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-atomic', 'true');
  assertiveRegion.className = 'sr-only';
  document.body.appendChild(assertiveRegion);
}

/**
 * Initialize focus management system
 */
function initializeFocusManagement(): void {
  if (typeof window === 'undefined') return;
  
  // Handle route changes
  window.addEventListener('popstate', () => {
    // Announce page change
    const title = document.title;
    announceToScreenReader(`Navigated to ${title}`, 'polite');
    
    // Focus main content
    setTimeout(() => {
      const main = document.querySelector('main') || document.querySelector('[role="main"]');
      if (main) {
        (main as HTMLElement).focus();
      }
    }, 100);
  });
}

/**
 * Apply ARIA landmarks to the page structure
 */
function applyAriaLandmarks(): void {
  if (typeof window === 'undefined') return;
  
  // Apply landmarks on DOM ready
  const applyLandmarks = () => {
    // Main navigation
    const nav = document.querySelector('nav:not([role])');
    if (nav) {
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', LOGISTICS_ARIA_LABELS.MAIN_NAVIGATION);
    }
    
    // Main content
    const main = document.querySelector('main:not([role])');
    if (main) {
      main.setAttribute('role', 'main');
    }
    
    // Search forms
    const searchForms = document.querySelectorAll('form[role="search"], [data-search-form]');
    searchForms.forEach(form => {
      if (!form.getAttribute('role')) {
        form.setAttribute('role', 'search');
      }
    });
  };
  
  // Apply now and on DOM changes
  applyLandmarks();
  
  // Set up mutation observer for dynamic content
  const observer = new MutationObserver(applyLandmarks);
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Initialize high contrast mode detection and handling
 */
function initializeHighContrastMode(): void {
  if (typeof window === 'undefined') return;
  
  const mediaQuery = window.matchMedia('(prefers-contrast: high)');
  
  const handleHighContrast = (matches: boolean) => {
    document.documentElement.classList.toggle('high-contrast', matches);
    
    // Announce change
    if (matches) {
      announceToScreenReader('High contrast mode enabled', 'polite');
    }
  };
  
  // Initial check
  handleHighContrast(mediaQuery.matches);
  
  // Listen for changes
  mediaQuery.addEventListener('change', (e) => {
    handleHighContrast(e.matches);
  });
}

/**
 * Announce message to screen readers via live regions
 */
export function announceToScreenReader(
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof window === 'undefined') return;
  
  const regionId = priority === 'assertive' 
    ? 'accessibility-live-assertive' 
    : 'accessibility-live-polite';
  
  const region = document.getElementById(regionId);
  if (!region) return;
  
  // Clear previous message
  region.textContent = '';
  
  // Add new message after a brief delay to ensure it's announced
  setTimeout(() => {
    region.textContent = message;
    
    // Clear after announcement to avoid repetition
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }, ACCESSIBILITY_CONFIG.LIVE_REGION_DELAY);
}

/**
 * Format logistics data for screen readers
 */
export function formatForScreenReader(data: {
  type: 'job' | 'driver' | 'route' | 'status';
  content: Record<string, any>;
}): string {
  const { type, content } = data;
  
  switch (type) {
    case 'job':
      return `Job ${content.id}: ${content.title || 'Untitled'}, Status: ${content.status}, Priority: ${content.priority || 'Normal'}`;
    
    case 'driver':
      return `Driver ${content.name}: ${content.status}, Location: ${content.location || 'Unknown'}`;
    
    case 'route':
      return `Route from ${content.origin} to ${content.destination}, Distance: ${content.distance}, ETA: ${content.eta}`;
    
    case 'status':
      return `Status update: ${content.message}`;
    
    default:
      return String(content);
  }
}