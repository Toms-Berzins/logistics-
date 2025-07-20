/**
 * Logistics-specific keyboard shortcuts and navigation patterns
 * Optimized for rapid job assignment and real-time status monitoring
 */

export interface LogisticsShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  action: () => void;
  context?: 'global' | 'dashboard' | 'jobs' | 'drivers' | 'routes';
  enabled?: () => boolean;
}

export interface KeyboardNavigationState {
  activeContext: string;
  shortcuts: Map<string, LogisticsShortcut>;
  listeners: Map<string, (e: KeyboardEvent) => void>;
  isInputFocused: boolean;
}

const navigationState: KeyboardNavigationState = {
  activeContext: 'global',
  shortcuts: new Map(),
  listeners: new Map(),
  isInputFocused: false,
};

/**
 * Logistics keyboard shortcuts configuration
 */
export const LOGISTICS_SHORTCUTS: LogisticsShortcut[] = [
  // Global shortcuts
  {
    key: 'd',
    modifiers: ['ctrl'],
    description: 'Quick dispatch - Open dispatch dialog',
    action: () => window.dispatchEvent(new CustomEvent('logistics:dispatch')),
    context: 'global',
  },
  {
    key: 'r',
    modifiers: ['ctrl'],
    description: 'Reassign job - Open reassignment dialog',
    action: () => window.dispatchEvent(new CustomEvent('logistics:reassign')),
    context: 'global',
  },
  {
    key: '/',
    modifiers: ['ctrl'],
    description: 'Global search - Focus search input',
    action: () => window.dispatchEvent(new CustomEvent('logistics:search')),
    context: 'global',
  },
  {
    key: 'n',
    modifiers: ['ctrl'],
    description: 'New job - Create new job',
    action: () => window.dispatchEvent(new CustomEvent('logistics:new-job')),
    context: 'global',
  },
  {
    key: 'h',
    modifiers: ['ctrl'],
    description: 'Home - Navigate to dashboard',
    action: () => window.dispatchEvent(new CustomEvent('logistics:home')),
    context: 'global',
  },
  
  // Job management shortcuts
  {
    key: 'j',
    description: 'Next job - Navigate to next job in list',
    action: () => window.dispatchEvent(new CustomEvent('logistics:next-job')),
    context: 'jobs',
  },
  {
    key: 'k',
    description: 'Previous job - Navigate to previous job in list',
    action: () => window.dispatchEvent(new CustomEvent('logistics:prev-job')),
    context: 'jobs',
  },
  {
    key: 'Enter',
    description: 'View details - Open job details',
    action: () => window.dispatchEvent(new CustomEvent('logistics:view-details')),
    context: 'jobs',
  },
  {
    key: ' ',
    description: 'Quick action - Perform primary action on selected job',
    action: () => window.dispatchEvent(new CustomEvent('logistics:quick-action')),
    context: 'jobs',
  },
  {
    key: 'a',
    description: 'Assign job - Open assignment dialog',
    action: () => window.dispatchEvent(new CustomEvent('logistics:assign')),
    context: 'jobs',
  },
  {
    key: 'c',
    description: 'Cancel job - Cancel selected job',
    action: () => window.dispatchEvent(new CustomEvent('logistics:cancel')),
    context: 'jobs',
  },
  {
    key: 'p',
    description: 'Set priority - Change job priority',
    action: () => window.dispatchEvent(new CustomEvent('logistics:priority')),
    context: 'jobs',
  },
  
  // Driver management shortcuts
  {
    key: 'j',
    description: 'Next driver - Navigate to next driver in list',
    action: () => window.dispatchEvent(new CustomEvent('logistics:next-driver')),
    context: 'drivers',
  },
  {
    key: 'k',
    description: 'Previous driver - Navigate to previous driver in list',
    action: () => window.dispatchEvent(new CustomEvent('logistics:prev-driver')),
    context: 'drivers',
  },
  {
    key: 'l',
    description: 'View location - Show driver location on map',
    action: () => window.dispatchEvent(new CustomEvent('logistics:view-location')),
    context: 'drivers',
  },
  {
    key: 's',
    description: 'Update status - Change driver status',
    action: () => window.dispatchEvent(new CustomEvent('logistics:update-status')),
    context: 'drivers',
  },
  
  // Navigation shortcuts
  {
    key: '1',
    modifiers: ['ctrl'],
    description: 'Dashboard - Navigate to main dashboard',
    action: () => window.dispatchEvent(new CustomEvent('logistics:nav-dashboard')),
    context: 'global',
  },
  {
    key: '2',
    modifiers: ['ctrl'],
    description: 'Jobs - Navigate to jobs view',
    action: () => window.dispatchEvent(new CustomEvent('logistics:nav-jobs')),
    context: 'global',
  },
  {
    key: '3',
    modifiers: ['ctrl'],
    description: 'Drivers - Navigate to drivers view',
    action: () => window.dispatchEvent(new CustomEvent('logistics:nav-drivers')),
    context: 'global',
  },
  {
    key: '4',
    modifiers: ['ctrl'],
    description: 'Routes - Navigate to routes view',
    action: () => window.dispatchEvent(new CustomEvent('logistics:nav-routes')),
    context: 'global',
  },
  {
    key: '5',
    modifiers: ['ctrl'],
    description: 'Analytics - Navigate to analytics view',
    action: () => window.dispatchEvent(new CustomEvent('logistics:nav-analytics')),
    context: 'global',
  },
  
  // Help and accessibility
  {
    key: '?',
    description: 'Help - Show keyboard shortcuts help',
    action: () => window.dispatchEvent(new CustomEvent('logistics:help')),
    context: 'global',
  },
  {
    key: 'Escape',
    description: 'Close - Close current dialog or cancel operation',
    action: () => window.dispatchEvent(new CustomEvent('logistics:close')),
    context: 'global',
  },
];

/**
 * Initialize logistics keyboard shortcuts
 */
export function initializeLogisticsShortcuts(): void {
  // Register all shortcuts
  LOGISTICS_SHORTCUTS.forEach(registerShortcut);
  
  // Set up global keyboard listener
  setupGlobalKeyboardListener();
  
  // Set up input focus tracking
  setupInputFocusTracking();
  
  // Set up context switching
  setupContextSwitching();
}

/**
 * Register a keyboard shortcut
 */
export function registerShortcut(shortcut: LogisticsShortcut): void {
  const key = generateShortcutKey(shortcut);
  navigationState.shortcuts.set(key, shortcut);
}

/**
 * Unregister a keyboard shortcut
 */
export function unregisterShortcut(shortcut: LogisticsShortcut): void {
  const key = generateShortcutKey(shortcut);
  navigationState.shortcuts.delete(key);
}

/**
 * Generate a unique key for a shortcut
 */
function generateShortcutKey(shortcut: LogisticsShortcut): string {
  const modifiers = (shortcut.modifiers || []).sort().join('+');
  const context = shortcut.context || 'global';
  return `${context}:${modifiers}${modifiers ? '+' : ''}${shortcut.key}`;
}

/**
 * Set up global keyboard listener
 */
function setupGlobalKeyboardListener(): void {
  const handleKeydown = (event: KeyboardEvent) => {
    // Skip if user is typing in an input (unless it's a global shortcut)
    if (navigationState.isInputFocused) {
      const activeModifiers = getActiveModifiers(event);
      if (!activeModifiers.includes('ctrl') && !activeModifiers.includes('meta')) {
        return;
      }
    }
    
    // Check for matching shortcuts
    const activeModifiers = getActiveModifiers(event);
    const currentContext = navigationState.activeContext;
    
    // Try context-specific shortcuts first
    const contextKey = `${currentContext}:${formatKeyWithModifiers(event.key, activeModifiers)}`;
    let shortcut = navigationState.shortcuts.get(contextKey);
    
    // Fall back to global shortcuts
    if (!shortcut) {
      const globalKey = `global:${formatKeyWithModifiers(event.key, activeModifiers)}`;
      shortcut = navigationState.shortcuts.get(globalKey);
    }
    
    if (shortcut) {
      // Check if shortcut is enabled
      if (shortcut.enabled && !shortcut.enabled()) {
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      // Execute shortcut action with performance monitoring
      const startTime = performance.now();
      
      try {
        shortcut.action();
        
        // Announce shortcut execution to screen readers
        const description = shortcut.description.toLowerCase();
        window.dispatchEvent(new CustomEvent('logistics:announce', {
          detail: { message: description, priority: 'polite' }
        }));
        
      } catch (error) {
        console.error('Error executing shortcut:', error);
        window.dispatchEvent(new CustomEvent('logistics:announce', {
          detail: { message: 'Shortcut execution failed', priority: 'assertive' }
        }));
      }
      
      // Performance monitoring
      const executionTime = performance.now() - startTime;
      if (executionTime > 50) { // ACCESSIBILITY_CONFIG.KEYBOARD_RESPONSE_TIME
        console.warn(`Slow keyboard shortcut execution: ${executionTime}ms for ${shortcut.description}`);
      }
    }
  };
  
  document.addEventListener('keydown', handleKeydown, { capture: true });
  navigationState.listeners.set('global', handleKeydown);
}

/**
 * Get active modifiers from keyboard event
 */
function getActiveModifiers(event: KeyboardEvent): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.shiftKey) modifiers.push('shift');
  if (event.altKey) modifiers.push('alt');
  if (event.metaKey) modifiers.push('meta');
  return modifiers;
}

/**
 * Format key with modifiers for matching
 */
function formatKeyWithModifiers(key: string, modifiers: string[]): string {
  const sortedModifiers = modifiers.sort().join('+');
  return sortedModifiers ? `${sortedModifiers}+${key}` : key;
}

/**
 * Set up input focus tracking
 */
function setupInputFocusTracking(): void {
  const updateInputFocus = () => {
    const activeElement = document.activeElement;
    navigationState.isInputFocused = !!(
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.getAttribute('contenteditable') === 'true' ||
       activeElement.getAttribute('role') === 'textbox')
    );
  };
  
  document.addEventListener('focusin', updateInputFocus);
  document.addEventListener('focusout', updateInputFocus);
}

/**
 * Set up context switching based on current page/section
 */
function setupContextSwitching(): void {
  const updateContext = () => {
    const path = window.location.pathname;
    const section = document.querySelector('[data-keyboard-context]');
    
    if (section) {
      navigationState.activeContext = section.getAttribute('data-keyboard-context') || 'global';
    } else if (path.includes('/jobs')) {
      navigationState.activeContext = 'jobs';
    } else if (path.includes('/drivers')) {
      navigationState.activeContext = 'drivers';
    } else if (path.includes('/routes')) {
      navigationState.activeContext = 'routes';
    } else if (path.includes('/dashboard')) {
      navigationState.activeContext = 'dashboard';
    } else {
      navigationState.activeContext = 'global';
    }
  };
  
  // Update on route changes
  window.addEventListener('popstate', updateContext);
  
  // Update on DOM changes (for SPA navigation)
  const observer = new MutationObserver(updateContext);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true, 
    attributeFilter: ['data-keyboard-context'] 
  });
  
  // Initial update
  updateContext();
}

/**
 * Get help text for current context shortcuts
 */
export function getShortcutsHelp(context?: string): string[] {
  const targetContext = context || navigationState.activeContext;
  const shortcuts: string[] = [];
  
  navigationState.shortcuts.forEach((shortcut) => {
    if (shortcut.context === targetContext || shortcut.context === 'global') {
      const modifiers = shortcut.modifiers ? shortcut.modifiers.join(' + ') + ' + ' : '';
      shortcuts.push(`${modifiers}${shortcut.key}: ${shortcut.description}`);
    }
  });
  
  return shortcuts.sort();
}

/**
 * Create accessible keyboard shortcuts help dialog content
 */
export function createShortcutsHelpContent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'keyboard-shortcuts-help';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-labelledby', 'shortcuts-title');
  
  const title = document.createElement('h2');
  title.id = 'shortcuts-title';
  title.textContent = 'Keyboard Shortcuts';
  title.className = 'text-xl font-semibold mb-4';
  
  const contexts = ['global', 'jobs', 'drivers', 'routes', 'dashboard'];
  
  contexts.forEach((context) => {
    const contextShortcuts = getShortcutsHelp(context);
    if (contextShortcuts.length === 0) return;
    
    const section = document.createElement('section');
    section.className = 'mb-6';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = context.charAt(0).toUpperCase() + context.slice(1) + ' Shortcuts';
    sectionTitle.className = 'text-lg font-medium mb-2';
    
    const list = document.createElement('dl');
    list.className = 'space-y-2';
    
    contextShortcuts.forEach((shortcut) => {
      const [keys, description] = shortcut.split(': ');
      
      const dt = document.createElement('dt');
      dt.className = 'font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block';
      dt.textContent = keys;
      
      const dd = document.createElement('dd');
      dd.className = 'text-sm text-gray-700 ml-4';
      dd.textContent = description;
      
      list.appendChild(dt);
      list.appendChild(dd);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(list);
    container.appendChild(section);
  });
  
  container.appendChild(title);
  
  return container;
}

/**
 * Set keyboard context for a specific element or section
 */
export function setKeyboardContext(element: HTMLElement, context: string): void {
  element.setAttribute('data-keyboard-context', context);
  
  // Update current context if this element is currently active
  if (element.contains(document.activeElement)) {
    navigationState.activeContext = context;
  }
}

/**
 * Get current keyboard context
 */
export function getCurrentContext(): string {
  return navigationState.activeContext;
}

/**
 * Check if a shortcut exists and is enabled
 */
export function isShortcutEnabled(key: string, modifiers?: string[], context?: string): boolean {
  const targetContext = context || navigationState.activeContext;
  const shortcutKey = `${targetContext}:${formatKeyWithModifiers(key, modifiers || [])}`;
  const shortcut = navigationState.shortcuts.get(shortcutKey);
  
  return !!(shortcut && (!shortcut.enabled || shortcut.enabled()));
}