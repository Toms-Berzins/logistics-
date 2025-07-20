/**
 * ARIA landmarks system for logistics platform
 * Provides semantic structure and navigation for screen readers
 */

import { LOGISTICS_ARIA_LABELS, LOGISTICS_ARIA_PATTERNS } from './index';
import { announceToLiveRegion } from './live-regions';

/**
 * Landmark configuration interface
 */
export interface LandmarkConfig {
  role: string;
  label?: string;
  description?: string;
  selector?: string;
  required?: boolean;
  unique?: boolean;
}

/**
 * Logistics platform landmark structure
 */
export const LOGISTICS_LANDMARKS: Record<string, LandmarkConfig> = {
  // Main structural landmarks
  banner: {
    role: 'banner',
    label: 'Site header',
    selector: 'header, [role="banner"]',
    required: true,
    unique: true,
  },
  
  navigation: {
    role: 'navigation',
    label: LOGISTICS_ARIA_LABELS.MAIN_NAVIGATION,
    selector: 'nav:not([aria-label]), [role="navigation"]:not([aria-label])',
    required: true,
    unique: false,
  },
  
  main: {
    role: 'main',
    label: 'Main content',
    selector: 'main, [role="main"]',
    required: true,
    unique: true,
  },
  
  contentinfo: {
    role: 'contentinfo',
    label: 'Site footer',
    selector: 'footer, [role="contentinfo"]',
    required: false,
    unique: true,
  },
  
  // Logistics-specific landmarks
  search: {
    role: 'search',
    label: 'Search jobs and drivers',
    selector: '[data-search-form], form[role="search"]',
    required: false,
    unique: false,
  },
  
  complementary: {
    role: 'complementary',
    label: 'Additional information',
    selector: 'aside, [role="complementary"]',
    required: false,
    unique: false,
  },
  
  // Logistics dashboard regions
  dispatchBoard: {
    role: 'region',
    label: 'Dispatch board',
    selector: '[data-dispatch-board]',
    required: false,
    unique: true,
  },
  
  jobList: {
    role: 'region',
    label: 'Job list',
    selector: '[data-job-list]',
    required: false,
    unique: false,
  },
  
  driverPanel: {
    role: 'region',
    label: 'Driver management',
    selector: '[data-driver-panel]',
    required: false,
    unique: true,
  },
  
  mapView: {
    role: 'img',
    label: 'Logistics map view',
    selector: '[data-map-container]',
    required: false,
    unique: true,
  },
  
  statusPanel: {
    role: 'status',
    label: 'Real-time status updates',
    selector: '[data-status-panel]',
    required: false,
    unique: true,
  },
};

/**
 * Landmark state management
 */
interface LandmarkState {
  appliedLandmarks: Map<string, HTMLElement[]>;
  observers: Map<string, MutationObserver>;
  initialized: boolean;
}

const landmarkState: LandmarkState = {
  appliedLandmarks: new Map(),
  observers: new Map(),
  initialized: false,
};

/**
 * Initialize ARIA landmarks system
 */
export function initializeAriaLandmarks(): void {
  if (typeof window === 'undefined' || landmarkState.initialized) return;
  
  // Apply landmarks to existing elements
  applyLandmarksToDocument();
  
  // Set up mutation observer for dynamic content
  setupLandmarkObserver();
  
  // Set up keyboard shortcuts for landmark navigation
  setupLandmarkNavigation();
  
  landmarkState.initialized = true;
  
  // Announce initialization
  announceToLiveRegion(
    'Page landmarks initialized for screen reader navigation',
    { priority: 'polite', category: 'system' }
  );
}

/**
 * Apply landmarks to the entire document
 */
export function applyLandmarksToDocument(): void {
  Object.entries(LOGISTICS_LANDMARKS).forEach(([key, config]) => {
    applyLandmark(key, config);
  });
  
  // Validate required landmarks
  validateRequiredLandmarks();
}

/**
 * Apply a specific landmark configuration
 */
export function applyLandmark(key: string, config: LandmarkConfig): void {
  const elements = config.selector 
    ? Array.from(document.querySelectorAll(config.selector)) as HTMLElement[]
    : [];
  
  elements.forEach((element, index) => {
    // Set role if not already present
    if (!element.getAttribute('role')) {
      element.setAttribute('role', config.role);
    }
    
    // Set aria-label if provided and not already present
    if (config.label && !element.getAttribute('aria-label')) {
      const label = config.unique || elements.length === 1 
        ? config.label
        : `${config.label} ${index + 1}`;
      element.setAttribute('aria-label', label);
    }
    
    // Set aria-describedby if description provided
    if (config.description) {
      const descId = `landmark-desc-${key}-${index}`;
      let descElement = document.getElementById(descId);
      
      if (!descElement) {
        descElement = document.createElement('div');
        descElement.id = descId;
        descElement.className = 'sr-only';
        descElement.textContent = config.description;
        document.body.appendChild(descElement);
      }
      
      element.setAttribute('aria-describedby', descId);
    }
    
    // Mark as processed
    element.setAttribute('data-landmark-processed', 'true');
  });
  
  // Store applied landmarks
  landmarkState.appliedLandmarks.set(key, elements);
}

/**
 * Validate that all required landmarks are present
 */
export function validateRequiredLandmarks(): void {
  const missingLandmarks: string[] = [];
  
  Object.entries(LOGISTICS_LANDMARKS).forEach(([key, config]) => {
    if (config.required) {
      const elements = landmarkState.appliedLandmarks.get(key) || [];
      if (elements.length === 0) {
        missingLandmarks.push(key);
      }
    }
  });
  
  if (missingLandmarks.length > 0) {
    console.warn(
      `Missing required landmarks: ${missingLandmarks.join(', ')}. ` +
      'This may impact screen reader navigation.'
    );
  }
}

/**
 * Set up mutation observer to apply landmarks to dynamic content
 */
function setupLandmarkObserver(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldReapply = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            // Check if added element matches any landmark selectors
            Object.values(LOGISTICS_LANDMARKS).forEach((config) => {
              if (config.selector && element.matches?.(config.selector)) {
                shouldReapply = true;
              }
              
              // Check descendants
              if (config.selector && element.querySelector?.(config.selector)) {
                shouldReapply = true;
              }
            });
          }
        });
      }
    });
    
    if (shouldReapply) {
      // Debounce reapplication
      setTimeout(() => {
        applyLandmarksToDocument();
      }, 100);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  landmarkState.observers.set('main', observer);
}

/**
 * Set up keyboard shortcuts for landmark navigation
 */
function setupLandmarkNavigation(): void {
  document.addEventListener('keydown', (event) => {
    // Only handle if Alt key is pressed (common screen reader pattern)
    if (!event.altKey) return;
    
    let targetLandmark: HTMLElement | null = null;
    
    switch (event.key.toLowerCase()) {
      case 'm':
        // Navigate to main content
        targetLandmark = document.querySelector('main, [role="main"]');
        break;
      case 'n':
        // Navigate to navigation
        targetLandmark = document.querySelector('nav, [role="navigation"]');
        break;
      case 's':
        // Navigate to search
        targetLandmark = document.querySelector('[role="search"]');
        break;
      case 'd':
        // Navigate to dispatch board
        targetLandmark = document.querySelector('[data-dispatch-board]');
        break;
      case 'j':
        // Navigate to job list
        targetLandmark = document.querySelector('[data-job-list]');
        break;
      case 'p':
        // Navigate to driver panel
        targetLandmark = document.querySelector('[data-driver-panel]');
        break;
      case 'h':
        // Navigate to header/banner
        targetLandmark = document.querySelector('header, [role="banner"]');
        break;
      case 'f':
        // Navigate to footer
        targetLandmark = document.querySelector('footer, [role="contentinfo"]');
        break;
    }
    
    if (targetLandmark) {
      event.preventDefault();
      
      // Focus the landmark
      targetLandmark.focus();
      
      // Announce navigation
      const label = targetLandmark.getAttribute('aria-label') || 
                   targetLandmark.tagName.toLowerCase();
      announceToLiveRegion(
        `Navigated to ${label}`,
        { priority: 'polite', category: 'system' }
      );
    }
  });
}

/**
 * Get all available landmarks on the page
 */
export function getAvailableLandmarks(): Array<{
  element: HTMLElement;
  role: string;
  label: string;
  key?: string;
}> {
  const landmarks: Array<{
    element: HTMLElement;
    role: string;
    label: string;
    key?: string;
  }> = [];
  
  landmarkState.appliedLandmarks.forEach((elements, key) => {
    elements.forEach((element) => {
      const role = element.getAttribute('role') || '';
      const label = element.getAttribute('aria-label') || 
                   element.textContent?.slice(0, 50) || 
                   role;
      
      landmarks.push({
        element,
        role,
        label,
        key,
      });
    });
  });
  
  return landmarks.sort((a, b) => {
    // Sort by DOM order
    if (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    return 1;
  });
}

/**
 * Navigate to a specific landmark
 */
export function navigateToLandmark(
  selector: string | HTMLElement,
  announce: boolean = true
): boolean {
  let element: HTMLElement | null = null;
  
  if (typeof selector === 'string') {
    element = document.querySelector(selector);
  } else {
    element = selector;
  }
  
  if (!element) return false;
  
  // Make element focusable if it isn't already
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }
  
  // Focus the element
  element.focus();
  
  // Scroll into view
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  
  if (announce) {
    const label = element.getAttribute('aria-label') || 
                 element.getAttribute('role') ||
                 'content area';
    announceToLiveRegion(
      `Navigated to ${label}`,
      { priority: 'polite', category: 'system' }
    );
  }
  
  return true;
}

/**
 * Create landmark navigation menu for screen readers
 */
export function createLandmarkNavigation(): HTMLElement {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Page landmarks');
  nav.className = 'sr-only focus-within:not-sr-only';
  
  const title = document.createElement('h2');
  title.textContent = 'Skip to:';
  title.className = 'text-sm font-medium mb-2';
  
  const list = document.createElement('ul');
  list.className = 'space-y-1';
  
  const landmarks = getAvailableLandmarks();
  
  landmarks.forEach((landmark, index) => {
    const item = document.createElement('li');
    
    const link = document.createElement('button');
    link.textContent = landmark.label;
    link.className = `
      block w-full text-left px-3 py-2 text-sm text-blue-600 
      hover:text-blue-800 hover:bg-blue-50 rounded-md
      focus:outline-none focus:ring-2 focus:ring-blue-500
    `;
    
    link.addEventListener('click', () => {
      navigateToLandmark(landmark.element);
    });
    
    item.appendChild(link);
    list.appendChild(item);
  });
  
  nav.appendChild(title);
  nav.appendChild(list);
  
  return nav;
}

/**
 * Add skip links to the page
 */
export function addSkipLinks(): void {
  const skipContainer = document.createElement('div');
  skipContainer.className = 'sr-only focus-within:not-sr-only absolute top-0 left-0 z-50';
  
  const skipLinks = [
    { href: '#main', label: 'Skip to main content' },
    { href: '[role="navigation"]', label: 'Skip to navigation' },
    { href: '[data-search-form]', label: 'Skip to search' },
    { href: '[data-dispatch-board]', label: 'Skip to dispatch board' },
  ];
  
  skipLinks.forEach(({ href, label }) => {
    const element = document.querySelector(href);
    if (!element) return;
    
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.className = `
      block bg-blue-600 text-white px-4 py-2 m-1 rounded-md text-sm font-medium
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      hover:bg-blue-700 transition-colors
    `;
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToLandmark(element as HTMLElement);
    });
    
    skipContainer.appendChild(link);
  });
  
  document.body.insertBefore(skipContainer, document.body.firstChild);
}

/**
 * Clean up landmark system
 */
export function cleanupLandmarks(): void {
  // Clear observers
  landmarkState.observers.forEach((observer) => {
    observer.disconnect();
  });
  landmarkState.observers.clear();
  
  // Clear applied landmarks
  landmarkState.appliedLandmarks.clear();
  
  landmarkState.initialized = false;
}

/**
 * Get landmark navigation help text
 */
export function getLandmarkNavigationHelp(): string[] {
  return [
    'Alt + M: Navigate to main content',
    'Alt + N: Navigate to navigation',
    'Alt + S: Navigate to search',
    'Alt + D: Navigate to dispatch board',
    'Alt + J: Navigate to job list',
    'Alt + P: Navigate to driver panel',
    'Alt + H: Navigate to header',
    'Alt + F: Navigate to footer',
  ];
}