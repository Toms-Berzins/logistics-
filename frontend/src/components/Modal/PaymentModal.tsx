'use client';

import React, { useEffect, useRef } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { paymentTokens } from '../../styles/payment-tokens';
import { StripeCardForm } from '../Form/StripeFormElements';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  title?: string;
  onSuccess: (paymentMethod: unknown) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
  initialData?: {
    holderName?: string;
    billingAddress?: unknown;
  };
  className?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  mode,
  title,
  onSuccess,
  onError,
  isLoading = false,
  initialData,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element when modal opens
      firstFocusableRef.current?.focus();
      
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = (paymentMethod: unknown) => {
    onSuccess(paymentMethod);
    onClose();
  };

  const defaultTitle = mode === 'add' ? 'Add New Payment Method' : 'Edit Payment Method';

  if (!isOpen) return null;

  return (
    <div
      className={paymentTokens.modal.backdrop}
      onClick={handleBackdropClick}
      data-testid="payment-modal-backdrop"
    >
      <div className={paymentTokens.modal.container}>
        <div
          ref={modalRef}
          className={`${paymentTokens.modal.content} ${paymentTokens.animations.scaleIn} ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          data-testid="payment-modal"
        >
          {/* Modal Header */}
          <div className={paymentTokens.modal.header}>
            <h2
              id="modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              {title || defaultTitle}
            </h2>
            <button
              ref={firstFocusableRef}
              onClick={onClose}
              className={`
                ${paymentTokens.buttons.ghost}
                ${paymentTokens.accessibility.touchTarget}
                ${paymentTokens.accessibility.focusRing}
              `}
              aria-label="Close modal"
              data-testid="close-modal-button"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className={paymentTokens.modal.body}>
            <StripeCardForm
              onSuccess={handleSuccess}
              onError={onError}
              isLoading={isLoading}
              submitButtonText={mode === 'add' ? 'Add Payment Method' : 'Update Payment Method'}
              showBillingAddress={true}
              initialData={initialData}
            />
          </div>

          {/* Modal Footer */}
          <div className={paymentTokens.modal.footer}>
            <button
              ref={lastFocusableRef}
              onClick={onClose}
              className={paymentTokens.buttons.secondary}
              disabled={isLoading}
              data-testid="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  className?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />,
          confirmButton: paymentTokens.buttons.danger,
        };
      case 'warning':
        return {
          icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />,
          confirmButton: 'inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-200',
        };
      default:
        return {
          icon: <ExclamationTriangleIcon className="w-6 h-6 text-blue-600" />,
          confirmButton: paymentTokens.buttons.primary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  if (!isOpen) return null;

  return (
    <div
      className={paymentTokens.modal.backdrop}
      onClick={handleBackdropClick}
      data-testid="confirmation-modal-backdrop"
    >
      <div className={paymentTokens.modal.container}>
        <div
          ref={modalRef}
          className={`${paymentTokens.modal.content} ${paymentTokens.animations.scaleIn} max-w-sm ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
          data-testid="confirmation-modal"
        >
          {/* Modal Content */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                {variantStyles.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  id="confirmation-title"
                  className="text-lg font-medium text-gray-900 mb-2"
                >
                  {title}
                </h3>
                <p className="text-sm text-gray-600">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                ref={cancelButtonRef}
                onClick={onClose}
                className={paymentTokens.buttons.secondary}
                disabled={isLoading}
                data-testid="confirmation-cancel-button"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={variantStyles.confirmButton}
                disabled={isLoading}
                data-testid="confirmation-confirm-button"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className={paymentTokens.loading.spinner} />
                    <span className="ml-2">Processing...</span>
                  </div>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Success Modal Component
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actionText = 'Continue',
  onAction,
  className = '',
}) => {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={paymentTokens.modal.backdrop}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="success-modal-backdrop"
    >
      <div className={paymentTokens.modal.container}>
        <div
          className={`${paymentTokens.modal.content} ${paymentTokens.animations.scaleIn} max-w-sm ${className}`}
          role="dialog"
          aria-modal="true"
          data-testid="success-modal"
        >
          <div className="p-6 text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>

            {/* Action */}
            <button
              onClick={handleAction}
              className={paymentTokens.buttons.primary}
              autoFocus
              data-testid="success-action-button"
            >
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;