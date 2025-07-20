/**
 * Advanced focus management for logistics platform
 * Handles focus traps, restoration, and roving tabindex patterns
 */

import { getFocusableElements, isFocusable } from '../accessibility';
import { ACCESSIBILITY_CONFIG } from './index';

/**
 * Focus management state
 */
interface FocusState {
  previousFocus: HTMLElement | null;
  trapStack: HTMLElement[];
  rovingTabindexGroups: Map<string, RovingTabindexGroup>;
}

interface RovingTabindexGroup {
  container: HTMLElement;
  items: HTMLElement[];
  currentIndex: number;
  orientation: 'horizontal' | 'vertical' | 'both';
}

const focusState: FocusState = {
  previousFocus: null,
  trapStack: [],
  rovingTabindexGroups: new Map(),
};

/**
 * Enhanced focus trap with restoration and escape handling
 */
export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: HTMLElement[];
  private firstFocusable: HTMLElement | null;
  private lastFocusable: HTMLElement | null;
  private previouslyFocused: HTMLElement | null;
  private isActive: boolean = false;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: {
    initialFocus?: HTMLElement | 'first' | 'last';
    restoreFocus?: boolean;
    escapeDeactivates?: boolean;
  } = {}) {
    this.container = container;
    this.previouslyFocused = document.activeElement as HTMLElement;
    
    this.keydownHandler = this.handleKeydown.bind(this);
    this.updateFocusableElements();
    
    const {
      initialFocus = 'first',
      restoreFocus = true,
      escapeDeactivates = true,
    } = options;
    
    // Store options
    this.restoreFocus = restoreFocus;
    this.escapeDeactivates = escapeDeactivates;
    this.initialFocus = initialFocus;
  }

  private restoreFocus: boolean;
  private escapeDeactivates: boolean;
  private initialFocus: HTMLElement | 'first' | 'last';

  activate(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    focusState.trapStack.push(this.container);
    
    // Add event listener
    document.addEventListener('keydown', this.keydownHandler, true);
    
    // Set initial focus
    this.setInitialFocus();
    
    // Update container attributes
    this.container.setAttribute('data-focus-trap-active', 'true');
  }

  deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove from stack
    const index = focusState.trapStack.indexOf(this.container);
    if (index > -1) {
      focusState.trapStack.splice(index, 1);
    }
    
    // Remove event listener
    document.removeEventListener('keydown', this.keydownHandler, true);
    
    // Restore focus
    if (this.restoreFocus && this.previouslyFocused) {
      // Use setTimeout to avoid timing issues
      setTimeout(() => {
        if (this.previouslyFocused && isFocusable(this.previouslyFocused)) {
          this.previouslyFocused.focus();
        }
      }, 0);
    }
    
    // Update container attributes
    this.container.removeAttribute('data-focus-trap-active');
  }

  private updateFocusableElements(): void {
    this.focusableElements = getFocusableElements(this.container);
    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  private setInitialFocus(): void {
    this.updateFocusableElements();
    
    let elementToFocus: HTMLElement | null = null;
    
    if (this.initialFocus === 'first') {
      elementToFocus = this.firstFocusable;
    } else if (this.initialFocus === 'last') {
      elementToFocus = this.lastFocusable;
    } else if (this.initialFocus instanceof HTMLElement) {
      elementToFocus = this.initialFocus;
    }
    
    if (elementToFocus) {
      // Use setTimeout to ensure the element is ready for focus
      setTimeout(() => {
        elementToFocus!.focus();
      }, 0);
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Only handle if this is the active trap
    if (focusState.trapStack[focusState.trapStack.length - 1] !== this.container) {
      return;
    }
    
    if (e.key === 'Escape' && this.escapeDeactivates) {
      e.preventDefault();
      this.deactivate();
      return;
    }
    
    if (e.key === 'Tab') {
      this.handleTabKey(e);
    }
  }

  private handleTabKey(e: KeyboardEvent): void {
    this.updateFocusableElements();
    
    if (this.focusableElements.length === 0) {
      e.preventDefault();
      return;
    }
    
    if (this.focusableElements.length === 1) {
      e.preventDefault();
      this.focusableElements[0].focus();
      return;
    }
    
    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = this.focusableElements.indexOf(activeElement);
    
    if (e.shiftKey) {
      // Shift + Tab (backwards)
      if (currentIndex <= 0) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab (forwards)
      if (currentIndex >= this.focusableElements.length - 1) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  }
}

/**
 * Roving tabindex implementation for lists and grids
 */
export class RovingTabindex {
  private container: HTMLElement;
  private items: HTMLElement[];
  private currentIndex: number = 0;
  private orientation: 'horizontal' | 'vertical' | 'both';
  private wrap: boolean;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(
    container: HTMLElement,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      selector?: string;
      initialIndex?: number;
    } = {}
  ) {
    this.container = container;
    this.orientation = options.orientation || 'vertical';
    this.wrap = options.wrap !== false;
    
    this.keydownHandler = this.handleKeydown.bind(this);
    this.updateItems(options.selector);
    
    if (options.initialIndex !== undefined) {
      this.currentIndex = Math.max(0, Math.min(options.initialIndex, this.items.length - 1));
    }
    
    this.activate();
  }

  private updateItems(selector?: string): void {
    if (selector) {
      this.items = Array.from(this.container.querySelectorAll(selector)) as HTMLElement[];
    } else {
      this.items = getFocusableElements(this.container);
    }
    
    // Set up initial tabindex values
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  activate(): void {
    this.container.addEventListener('keydown', this.keydownHandler);
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
  }

  deactivate(): void {
    this.container.removeEventListener('keydown', this.keydownHandler);
    this.container.removeEventListener('focusin', this.handleFocusIn.bind(this));
  }

  focusItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    
    // Update tabindex values
    this.items.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    
    this.currentIndex = index;
    this.items[index].focus();
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const index = this.items.indexOf(target);
    
    if (index > -1) {
      this.currentIndex = index;
      this.updateTabindexes();
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    let handled = false;
    let newIndex = this.currentIndex;
    
    switch (e.key) {
      case 'ArrowDown':
        if (this.orientation === 'vertical' || this.orientation === 'both') {
          newIndex = this.getNextIndex(1);
          handled = true;
        }
        break;
        
      case 'ArrowUp':
        if (this.orientation === 'vertical' || this.orientation === 'both') {
          newIndex = this.getNextIndex(-1);
          handled = true;
        }
        break;
        
      case 'ArrowRight':
        if (this.orientation === 'horizontal' || this.orientation === 'both') {
          newIndex = this.getNextIndex(1);
          handled = true;
        }
        break;
        
      case 'ArrowLeft':
        if (this.orientation === 'horizontal' || this.orientation === 'both') {
          newIndex = this.getNextIndex(-1);
          handled = true;
        }
        break;
        
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
        
      case 'End':
        newIndex = this.items.length - 1;
        handled = true;
        break;
    }
    
    if (handled) {
      e.preventDefault();
      this.focusItem(newIndex);
    }
  }

  private getNextIndex(direction: number): number {
    let newIndex = this.currentIndex + direction;
    
    if (this.wrap) {
      if (newIndex < 0) {
        newIndex = this.items.length - 1;
      } else if (newIndex >= this.items.length) {
        newIndex = 0;
      }
    } else {
      newIndex = Math.max(0, Math.min(newIndex, this.items.length - 1));
    }
    
    return newIndex;
  }

  private updateTabindexes(): void {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Create and activate a focus trap
   */
  createTrap(container: HTMLElement, options?: Parameters<typeof FocusTrap.prototype.constructor>[1]): FocusTrap {
    return new FocusTrap(container, options);
  },

  /**
   * Create and activate roving tabindex
   */
  createRovingTabindex(container: HTMLElement, options?: Parameters<typeof RovingTabindex.prototype.constructor>[1]): RovingTabindex {
    return new RovingTabindex(container, options);
  },

  /**
   * Save current focus for later restoration
   */
  saveFocus(): HTMLElement | null {
    focusState.previousFocus = document.activeElement as HTMLElement;
    return focusState.previousFocus;
  },

  /**
   * Restore previously saved focus
   */
  restoreFocus(): boolean {
    if (focusState.previousFocus && isFocusable(focusState.previousFocus)) {
      focusState.previousFocus.focus();
      return true;
    }
    return false;
  },

  /**
   * Focus the first focusable element in a container
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  },

  /**
   * Focus the last focusable element in a container
   */
  focusLast(container: HTMLElement): boolean {
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
      return true;
    }
    return false;
  },

  /**
   * Find and focus the next focusable element
   */
  focusNext(currentElement?: HTMLElement): boolean {
    const current = currentElement || document.activeElement as HTMLElement;
    const allFocusable = getFocusableElements(document.body);
    const currentIndex = allFocusable.indexOf(current);
    
    if (currentIndex > -1 && currentIndex < allFocusable.length - 1) {
      allFocusable[currentIndex + 1].focus();
      return true;
    }
    
    return false;
  },

  /**
   * Find and focus the previous focusable element
   */
  focusPrevious(currentElement?: HTMLElement): boolean {
    const current = currentElement || document.activeElement as HTMLElement;
    const allFocusable = getFocusableElements(document.body);
    const currentIndex = allFocusable.indexOf(current);
    
    if (currentIndex > 0) {
      allFocusable[currentIndex - 1].focus();
      return true;
    }
    
    return false;
  },

  /**
   * Check if focus is currently trapped
   */
  isTrapped(): boolean {
    return focusState.trapStack.length > 0;
  },

  /**
   * Get the current focus trap container
   */
  getCurrentTrap(): HTMLElement | null {
    return focusState.trapStack[focusState.trapStack.length - 1] || null;
  },
};