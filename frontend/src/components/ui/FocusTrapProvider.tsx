/**
 * Focus trap provider and utilities for modals, dropdowns, and other interactive elements
 * Centralized focus management with automatic cleanup and restoration
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useRef, 
  useEffect, 
  useCallback,
  useState,
} from 'react';
import { FocusTrap, focusManager } from '@/lib/accessibility/focus-management';
import { announceToLiveRegion } from '@/lib/accessibility/live-regions';

/**
 * Focus trap context interface
 */
interface FocusTrapContextValue {
  createTrap: (
    element: HTMLElement, 
    options?: FocusTrapOptions
  ) => string;
  removeTrap: (trapId: string) => void;
  isTrapped: () => boolean;
  getCurrentTrap: () => string | null;
  trapStack: string[];
}

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  initialFocus?: HTMLElement | 'first' | 'last';
  restoreFocus?: boolean;
  escapeDeactivates?: boolean;
  autoActivate?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  returnFocusOnDeactivate?: boolean;
}

/**
 * Focus trap state management
 */
interface FocusTrapState {
  activeTraps: Map<string, {
    trap: FocusTrap;
    element: HTMLElement;
    options: FocusTrapOptions;
  }>;
  trapStack: string[];
  nextTrapId: number;
}

const FocusTrapContext = createContext<FocusTrapContextValue | null>(null);

/**
 * Focus trap provider component
 */
export function FocusTrapProvider({ children }: { children: React.ReactNode }) {
  const stateRef = useRef<FocusTrapState>({
    activeTraps: new Map(),
    trapStack: [],
    nextTrapId: 1,
  });

  const [trapStack, setTrapStack] = useState<string[]>([]);

  /**
   * Create a new focus trap
   */
  const createTrap = useCallback((
    element: HTMLElement,
    options: FocusTrapOptions = {}
  ): string => {
    const state = stateRef.current;
    const trapId = `trap-${state.nextTrapId++}`;

    // Create the focus trap
    const trap = new FocusTrap(element, {
      initialFocus: options.initialFocus,
      restoreFocus: options.restoreFocus ?? true,
      escapeDeactivates: options.escapeDeactivates ?? true,
    });

    // Store trap reference
    state.activeTraps.set(trapId, {
      trap,
      element,
      options,
    });

    // Add to trap stack
    state.trapStack.push(trapId);
    setTrapStack([...state.trapStack]);

    // Activate if auto-activate is enabled (default)
    if (options.autoActivate !== false) {
      trap.activate();
      
      // Call activation callback
      options.onActivate?.();
      
      // Announce trap activation
      const elementLabel = element.getAttribute('aria-label') ||
                          element.getAttribute('role') ||
                          'interactive element';
      announceToLiveRegion(
        `Focus trapped in ${elementLabel}`,
        { priority: 'polite', category: 'system' }
      );
    }

    return trapId;
  }, []);

  /**
   * Remove a focus trap
   */
  const removeTrap = useCallback((trapId: string) => {
    const state = stateRef.current;
    const trapData = state.activeTraps.get(trapId);

    if (!trapData) return;

    // Deactivate the trap
    trapData.trap.deactivate();

    // Call deactivation callback
    trapData.options.onDeactivate?.();

    // Remove from stack
    const stackIndex = state.trapStack.indexOf(trapId);
    if (stackIndex > -1) {
      state.trapStack.splice(stackIndex, 1);
      setTrapStack([...state.trapStack]);
    }

    // Remove from active traps
    state.activeTraps.delete(trapId);

    // Announce trap removal
    const elementLabel = trapData.element.getAttribute('aria-label') ||
                        trapData.element.getAttribute('role') ||
                        'interactive element';
    announceToLiveRegion(
      `Focus released from ${elementLabel}`,
      { priority: 'polite', category: 'system' }
    );
  }, []);

  /**
   * Check if any trap is currently active
   */
  const isTrapped = useCallback((): boolean => {
    return stateRef.current.trapStack.length > 0;
  }, []);

  /**
   * Get the ID of the current active trap
   */
  const getCurrentTrap = useCallback((): string | null => {
    const stack = stateRef.current.trapStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, []);

  // Cleanup all traps on unmount
  useEffect(() => {
    return () => {
      const state = stateRef.current;
      state.activeTraps.forEach((trapData, trapId) => {
        trapData.trap.deactivate();
      });
      state.activeTraps.clear();
      state.trapStack = [];
    };
  }, []);

  const contextValue: FocusTrapContextValue = {
    createTrap,
    removeTrap,
    isTrapped,
    getCurrentTrap,
    trapStack,
  };

  return (
    <FocusTrapContext.Provider value={contextValue}>
      {children}
    </FocusTrapContext.Provider>
  );
}

/**
 * Hook to use focus trap context
 */
export function useFocusTrap() {
  const context = useContext(FocusTrapContext);
  if (!context) {
    throw new Error('useFocusTrap must be used within a FocusTrapProvider');
  }
  return context;
}

/**
 * Hook for managing focus traps with automatic cleanup
 */
export function useFocusTrapManagement(options: FocusTrapOptions = {}) {
  const { createTrap, removeTrap } = useFocusTrap();
  const trapIdRef = useRef<string | null>(null);

  /**
   * Activate focus trap on an element
   */
  const activateTrap = useCallback((element: HTMLElement) => {
    // Remove existing trap first
    if (trapIdRef.current) {
      removeTrap(trapIdRef.current);
    }

    // Create new trap
    trapIdRef.current = createTrap(element, options);
    return trapIdRef.current;
  }, [createTrap, removeTrap, options]);

  /**
   * Deactivate current focus trap
   */
  const deactivateTrap = useCallback(() => {
    if (trapIdRef.current) {
      removeTrap(trapIdRef.current);
      trapIdRef.current = null;
    }
  }, [removeTrap]);

  /**
   * Check if trap is currently active
   */
  const isActive = useCallback(() => {
    return trapIdRef.current !== null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trapIdRef.current) {
        removeTrap(trapIdRef.current);
      }
    };
  }, [removeTrap]);

  return {
    activateTrap,
    deactivateTrap,
    isActive,
    trapId: trapIdRef.current,
  };
}

/**
 * Higher-order component for automatic focus trapping
 */
export function withFocusTrap<P extends object>(
  Component: React.ComponentType<P>,
  trapOptions: FocusTrapOptions = {}
) {
  const WrappedComponent = React.forwardRef<HTMLElement, P>((props, ref) => {
    const elementRef = useRef<HTMLElement>(null);
    const { activateTrap, deactivateTrap } = useFocusTrapManagement(trapOptions);

    // Combine refs
    const combinedRef = useCallback((element: HTMLElement | null) => {
      elementRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref]);

    // Activate trap when component mounts
    useEffect(() => {
      if (elementRef.current) {
        activateTrap(elementRef.current);
      }
      return deactivateTrap;
    }, [activateTrap, deactivateTrap]);

    return <Component {...props} ref={combinedRef} />;
  });

  WrappedComponent.displayName = `withFocusTrap(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Component for declarative focus trapping
 */
interface FocusTrapComponentProps {
  children: React.ReactNode;
  active: boolean;
  options?: FocusTrapOptions;
  className?: string;
}

export function FocusTrapComponent({
  children,
  active,
  options = {},
  className = '',
}: FocusTrapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activateTrap, deactivateTrap } = useFocusTrapManagement(options);

  // Activate/deactivate based on active prop
  useEffect(() => {
    if (!containerRef.current) return;

    if (active) {
      activateTrap(containerRef.current);
    } else {
      deactivateTrap();
    }
  }, [active, activateTrap, deactivateTrap]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-focus-trap={active}
    >
      {children}
    </div>
  );
}

/**
 * Hook for managing dropdown focus traps
 */
export function useDropdownFocusTrap() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLElement>(null);
  const { activateTrap, deactivateTrap } = useFocusTrapManagement({
    escapeDeactivates: true,
    restoreFocus: true,
    onDeactivate: () => setIsOpen(false),
  });

  /**
   * Open dropdown and activate focus trap
   */
  const openDropdown = useCallback(() => {
    setIsOpen(true);
    
    // Activate trap on next frame to ensure dropdown is rendered
    requestAnimationFrame(() => {
      if (dropdownRef.current) {
        activateTrap(dropdownRef.current);
      }
    });
  }, [activateTrap]);

  /**
   * Close dropdown and deactivate focus trap
   */
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    deactivateTrap();
    
    // Return focus to trigger
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [deactivateTrap]);

  /**
   * Toggle dropdown state
   */
  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [isOpen, openDropdown, closeDropdown]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDropdown]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;

      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeDropdown]);

  return {
    isOpen,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    triggerRef,
    dropdownRef,
    triggerProps: {
      ref: triggerRef,
      'aria-expanded': isOpen,
      'aria-haspopup': true,
      onClick: toggleDropdown,
    },
    dropdownProps: {
      ref: dropdownRef,
      role: 'menu',
      'aria-hidden': !isOpen,
    },
  };
}

/**
 * Hook for managing modal focus traps
 */
export function useModalFocusTrap() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const { activateTrap, deactivateTrap } = useFocusTrapManagement({
    escapeDeactivates: true,
    restoreFocus: true,
    initialFocus: 'first',
  });

  /**
   * Open modal and activate focus trap
   */
  const openModal = useCallback(() => {
    setIsOpen(true);
    
    // Activate trap on next frame to ensure modal is rendered
    requestAnimationFrame(() => {
      if (modalRef.current) {
        activateTrap(modalRef.current);
      }
    });
  }, [activateTrap]);

  /**
   * Close modal and deactivate focus trap
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    deactivateTrap();
  }, [deactivateTrap]);

  return {
    isOpen,
    openModal,
    closeModal,
    modalRef,
    modalProps: {
      ref: modalRef,
      role: 'dialog',
      'aria-modal': true,
      'aria-hidden': !isOpen,
    },
  };
}