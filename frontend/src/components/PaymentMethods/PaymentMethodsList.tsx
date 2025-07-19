'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { paymentTokens, getCardAnimation } from '../../styles/payment-tokens';
import { CardDisplay, AddNewCard } from '../CreditCard/CardDisplay';
import { PaymentModal, ConfirmationModal, SuccessModal } from '../Modal/PaymentModal';

// Mock payment method interface (replace with your actual type)
interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
  holderName?: string;
  createdAt?: string;
  status?: 'active' | 'expired' | 'requires_action';
}

interface PaymentMethodsListProps {
  paymentMethods?: PaymentMethod[];
  isLoading?: boolean;
  onAddPaymentMethod?: (paymentMethod: unknown) => Promise<void>;
  onUpdatePaymentMethod?: (id: string, paymentMethod: unknown) => Promise<void>;
  onDeletePaymentMethod?: (id: string) => Promise<void>;
  onSetDefaultPaymentMethod?: (id: string) => Promise<void>;
  viewMode?: 'grid' | 'list';
  className?: string;
  'data-testid'?: string;
}

// Mock data for demo
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: true,
    holderName: 'John Doe',
    createdAt: '2023-06-15',
    status: 'active',
  },
  {
    id: '2',
    brand: 'mastercard',
    last4: '5555',
    expMonth: 8,
    expYear: 2024,
    isDefault: false,
    holderName: 'John Doe',
    createdAt: '2023-03-10',
    status: 'active',
  },
  {
    id: '3',
    brand: 'amex',
    last4: '1234',
    expMonth: 4,
    expYear: 2026,
    isDefault: false,
    holderName: 'John Doe',
    createdAt: '2023-01-20',
    status: 'active',
  },
];

export const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({
  paymentMethods = mockPaymentMethods,
  isLoading = false,
  onAddPaymentMethod,
  onUpdatePaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod,
  viewMode = 'grid',
  className = '',
  'data-testid': dataTestId,
}) => {
  const [modalState, setModalState] = useState<{
    type: 'add' | 'edit' | 'delete' | 'success' | null;
    isOpen: boolean;
    selectedPaymentMethod?: PaymentMethod;
    data?: unknown;
  }>({
    type: null,
    isOpen: false,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle adding new payment method
  const handleAddPaymentMethod = async (stripePaymentMethod: unknown) => {
    try {
      setActionLoading('add');
      await onAddPaymentMethod?.(stripePaymentMethod);
      
      setModalState({
        type: 'success',
        isOpen: true,
        data: {
          title: 'Payment Method Added',
          message: 'Your new payment method has been successfully added to your account.',
        },
      });
    } catch {
      setError('Failed to add payment method. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle setting default payment method
  const handleSetDefault = async (id: string) => {
    try {
      setActionLoading(`default-${id}`);
      await onSetDefaultPaymentMethod?.(id);
    } catch {
      setError('Failed to set default payment method. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle editing payment method
  const handleEdit = (id: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === id);
    if (paymentMethod) {
      setModalState({
        type: 'edit',
        isOpen: true,
        selectedPaymentMethod: paymentMethod,
      });
    }
  };

  // Handle update payment method
  const handleUpdatePaymentMethod = async (stripePaymentMethod: unknown) => {
    try {
      setActionLoading('update');
      await onUpdatePaymentMethod?.(modalState.selectedPaymentMethod!.id, stripePaymentMethod);
      
      setModalState({
        type: 'success',
        isOpen: true,
        data: {
          title: 'Payment Method Updated',
          message: 'Your payment method has been successfully updated.',
        },
      });
    } catch {
      setError('Failed to update payment method. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete confirmation
  const handleDelete = (id: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === id);
    if (paymentMethod) {
      setModalState({
        type: 'delete',
        isOpen: true,
        selectedPaymentMethod: paymentMethod,
      });
    }
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    try {
      setActionLoading('delete');
      await onDeletePaymentMethod?.(modalState.selectedPaymentMethod!.id);
      setModalState({ type: null, isOpen: false });
    } catch {
      setError('Failed to delete payment method. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Close all modals
  const closeModal = () => {
    setModalState({ type: null, isOpen: false });
  };

  const handleAddCardClick = () => {
    setModalState({
      type: 'add',
      isOpen: true,
    });
  };

  if (isLoading) {
    return <PaymentMethodsSkeleton viewMode={viewMode} className={className} />;
  }

  return (
    <div className={`${paymentTokens.layout.container} ${className}`} data-testid={dataTestId}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Methods
        </h1>
        <p className="text-gray-600">
          Manage your payment methods and billing information securely.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Grid/List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Saved Payment Methods
          </h2>
          <div className="text-sm text-gray-500">
            {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''}
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className={`
            ${paymentTokens.layout.grid}
            ${paymentTokens.layout.gridCols.mobile}
            ${paymentTokens.layout.gridCols.desktop}
            ${paymentTokens.spacing.cardGap}
          `}>
            {/* Add New Card */}
            <AddNewCard
              onClick={handleAddCardClick}
              isLoading={actionLoading === 'add'}
              data-testid="add-new-card"
              className={getCardAnimation(0)}
            />

            {/* Existing Cards */}
            {paymentMethods.map((paymentMethod, index) => (
              <CardDisplay
                key={paymentMethod.id}
                paymentMethod={paymentMethod}
                variant="visual"
                onSetDefault={handleSetDefault}
                onEdit={handleEdit}
                onDelete={handleDelete}
                className={getCardAnimation(index + 1)}
                data-testid={`payment-method-${paymentMethod.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((paymentMethod) => (
              <CardDisplay
                key={paymentMethod.id}
                paymentMethod={paymentMethod}
                variant="compact"
                onSetDefault={handleSetDefault}
                onEdit={handleEdit}
                onDelete={handleDelete}
                data-testid={`payment-method-compact-${paymentMethod.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Security Section */}
      <SecuritySection />

      {/* Modals */}
      <PaymentModal
        isOpen={modalState.type === 'add' && modalState.isOpen}
        onClose={closeModal}
        mode="add"
        onSuccess={handleAddPaymentMethod}
        onError={setError}
        isLoading={actionLoading === 'add'}
      />

      <PaymentModal
        isOpen={modalState.type === 'edit' && modalState.isOpen}
        onClose={closeModal}
        mode="edit"
        onSuccess={handleUpdatePaymentMethod}
        onError={setError}
        isLoading={actionLoading === 'update'}
        initialData={{
          holderName: modalState.selectedPaymentMethod?.holderName,
        }}
      />

      <ConfirmationModal
        isOpen={modalState.type === 'delete' && modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Method"
        message={`Are you sure you want to delete this payment method ending in ${modalState.selectedPaymentMethod?.last4}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={actionLoading === 'delete'}
      />

      <SuccessModal
        isOpen={modalState.type === 'success' && modalState.isOpen}
        onClose={closeModal}
        title={modalState.data?.title || 'Success'}
        message={modalState.data?.message || 'Operation completed successfully.'}
      />
    </div>
  );
};

// Security Section Component
const SecuritySection: React.FC = () => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <div className="flex items-start space-x-4">
        <ShieldCheckIcon className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Your payment information is secure
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All card information is encrypted and stored securely by Stripe</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>We never store your complete card number or CVV</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>PCI DSS Level 1 compliant payment processing</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-gray-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span>Secured by Stripe</span>
              </div>
              <div className="flex items-center space-x-1">
                <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
                <span>SSL Encrypted</span>
              </div>
              <div className="flex items-center space-x-1">
                <CreditCardIcon className="w-4 h-4 text-gray-400" />
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const PaymentMethodsSkeleton: React.FC<{ viewMode: 'grid' | 'list'; className?: string }> = ({ 
  viewMode, 
  className = '' 
}) => {
  return (
    <div className={`${paymentTokens.layout.container} ${className}`}>
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className={`${paymentTokens.loading.skeleton} h-8 w-64 mb-2`} />
        <div className={`${paymentTokens.loading.skeleton} h-4 w-96`} />
      </div>

      {/* Section Header Skeleton */}
      <div className="mb-6">
        <div className={`${paymentTokens.loading.skeleton} h-6 w-48`} />
      </div>

      {/* Cards Skeleton */}
      {viewMode === 'grid' ? (
        <div className={`
          ${paymentTokens.layout.grid}
          ${paymentTokens.layout.gridCols.mobile}
          ${paymentTokens.layout.gridCols.desktop}
          ${paymentTokens.spacing.cardGap}
          mb-8
        `}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`
                ${paymentTokens.cards.dimensions.width}
                ${paymentTokens.cards.dimensions.height}
                ${paymentTokens.cards.dimensions.borderRadius}
                ${paymentTokens.loading.shimmer}
              `}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`${paymentTokens.loading.skeleton} h-20 rounded-lg`}
            />
          ))}
        </div>
      )}

      {/* Security Section Skeleton */}
      <div className={`${paymentTokens.loading.skeleton} h-32 rounded-xl`} />
    </div>
  );
};

export default PaymentMethodsList;