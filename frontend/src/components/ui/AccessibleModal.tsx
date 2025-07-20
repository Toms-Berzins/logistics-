/**
 * Accessible modal component for logistics platform
 * WCAG 2.1 AA compliant with focus trapping and screen reader support
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FocusTrap, focusManager } from '@/lib/accessibility/focus-management';
import { announceToLiveRegion } from '@/lib/accessibility/live-regions';
import { ACCESSIBILITY_CONFIG, LOGISTICS_ARIA_LABELS } from '@/lib/accessibility';

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocus?: HTMLElement | 'first' | 'last';
  restoreFocus?: boolean;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocus = 'first',
  restoreFocus = true,
  role = 'dialog',
  className = '',
  overlayClassName = '',
  contentClassName = '',
  description,
  actions,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);
  const [mounted, setMounted] = useState(false);

  // Generate unique IDs for ARIA references
  const titleId = `modal-title-${React.useId()}`;
  const descId = description ? `modal-desc-${React.useId()}` : undefined;

  // Size classes mapping
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus trap management
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Create and activate focus trap
    focusTrapRef.current = new FocusTrap(modalRef.current, {
      initialFocus,
      restoreFocus,
      escapeDeactivates: closeOnEscape,
    });

    focusTrapRef.current.activate();

    // Announce modal opening
    announceToLiveRegion(`Modal opened: ${title}`, {
      priority: 'polite',
      category: 'system',
    });

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
    };
  }, [isOpen, title, initialFocus, restoreFocus, closeOnEscape]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape]);

  const handleClose = () => {
    announceToLiveRegion(`Modal closed: ${title}`, {
      priority: 'polite',
      category: 'system',
    });
    onClose();
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      handleClose();
    }
  };

  // Don't render on server
  if (!mounted) return null;

  const modal = (
    <div
      ref={overlayRef}
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        transition-opacity duration-${ACCESSIBILITY_CONFIG.FOCUS_TRANSITION_DURATION}
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${overlayClassName}
      `}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} mx-4 my-8
          bg-white rounded-lg shadow-xl
          transform transition-all duration-${ACCESSIBILITY_CONFIG.FOCUS_TRANSITION_DURATION}
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between p-6 border-b border-gray-200
          ${contentClassName}
        `}>
          <h2
            id={titleId}
            className="text-xl font-semibold text-gray-900"
          >
            {title}
          </h2>
          
          <button
            type="button"
            onClick={handleClose}
            className="
              p-2 text-gray-400 hover:text-gray-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              rounded-md transition-colors
            "
            aria-label={LOGISTICS_ARIA_LABELS.COLLAPSE_DETAILS}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {description && (
          <div
            id={descId}
            className="px-6 pt-4 text-sm text-gray-600"
          >
            {description}
          </div>
        )}

        {/* Content */}
        <div className={`p-6 ${description ? 'pt-4' : ''} ${contentClassName}`}>
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className={`
            flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg
            border-t border-gray-200
            ${contentClassName}
          `}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * Accessible modal hook for managing modal state
 */
export function useAccessibleModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}

/**
 * Confirmation modal component for critical actions
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="
          px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
          rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:ring-offset-2 transition-colors
        "
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        className={`
          px-4 py-2 text-sm font-medium text-white rounded-md
          focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
          ${variantStyles[variant]}
        `}
        autoFocus
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      role="alertdialog"
      size="sm"
      actions={actions}
      initialFocus="last" // Focus confirm button by default
    >
      <div className="text-sm text-gray-600">
        {message}
      </div>
    </AccessibleModal>
  );
}