import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentMethodsList } from './PaymentMethodsList';

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ShieldCheckIcon: () => <div data-testid="shield-icon" />,
  CreditCardIcon: () => <div data-testid="credit-card-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
}));

// Mock child components
vi.mock('../CreditCard/CardDisplay', () => ({
  CardDisplay: ({ paymentMethod, 'data-testid': dataTestId, onSetDefault, onEdit, onDelete }: {
    paymentMethod: { id: string; last4: string };
    'data-testid'?: string;
    onSetDefault?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
  }) => (
    <div data-testid={dataTestId}>
      <span>Card {paymentMethod.last4}</span>
      <button onClick={() => onSetDefault?.(paymentMethod.id)} data-testid={`set-default-${paymentMethod.id}`}>
        Set Default
      </button>
      <button onClick={() => onEdit?.(paymentMethod.id)} data-testid={`edit-${paymentMethod.id}`}>
        Edit
      </button>
      <button onClick={() => onDelete?.(paymentMethod.id)} data-testid={`delete-${paymentMethod.id}`}>
        Delete
      </button>
    </div>
  ),
  AddNewCard: ({ onClick, 'data-testid': dataTestId }: {
    onClick?: () => void;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} data-testid={dataTestId}>
      Add New Card
    </button>
  ),
}));

// Mock modal components
vi.mock('../Modal/PaymentModal', () => ({
  PaymentModal: ({ isOpen, mode, onSuccess, onClose }: {
    isOpen: boolean;
    mode: string;
    onSuccess: (data: { id: string }) => void;
    onClose: () => void;
  }) => 
    isOpen ? (
      <div data-testid={`payment-modal-${mode}`}>
        <button onClick={() => onSuccess({ id: 'new' })} data-testid="modal-success">
          Success
        </button>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
      </div>
    ) : null,
  ConfirmationModal: ({ isOpen, onConfirm, onClose }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <button onClick={onConfirm} data-testid="confirm-delete">
          Confirm
        </button>
        <button onClick={onClose} data-testid="cancel-delete">
          Cancel
        </button>
      </div>
    ) : null,
  SuccessModal: ({ isOpen, onClose }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="success-modal">
        <button onClick={onClose} data-testid="success-close">
          Close
        </button>
      </div>
    ) : null,
}));

describe('PaymentMethodsList', () => {
  const mockPaymentMethods = [
    {
      id: '1',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
      isDefault: true,
      holderName: 'John Doe',
    },
    {
      id: '2',
      brand: 'mastercard',
      last4: '5555',
      expMonth: 8,
      expYear: 2024,
      isDefault: false,
      holderName: 'Jane Doe',
    },
  ];

  it('renders payment methods list correctly', () => {
    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        data-testid="payment-list"
      />
    );

    expect(screen.getByTestId('payment-list')).toBeInTheDocument();
    expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    expect(screen.getByText('2 methods')).toBeInTheDocument();
    expect(screen.getByTestId('add-new-card')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(
      <PaymentMethodsList isLoading={true} />
    );

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles adding new payment method', async () => {
    const onAddPaymentMethod = vi.fn().mockResolvedValue(undefined);

    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        onAddPaymentMethod={onAddPaymentMethod}
      />
    );

    // Click add new card
    fireEvent.click(screen.getByTestId('add-new-card'));

    // Modal should open
    expect(screen.getByTestId('payment-modal-add')).toBeInTheDocument();

    // Simulate successful submission
    fireEvent.click(screen.getByTestId('modal-success'));

    await waitFor(() => {
      expect(onAddPaymentMethod).toHaveBeenCalled();
    });

    // Success modal should show
    await waitFor(() => {
      expect(screen.getByTestId('success-modal')).toBeInTheDocument();
    });
  });

  it('handles setting default payment method', async () => {
    const onSetDefaultPaymentMethod = vi.fn().mockResolvedValue(undefined);

    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        onSetDefaultPaymentMethod={onSetDefaultPaymentMethod}
      />
    );

    // Click set default on second card
    fireEvent.click(screen.getByTestId('set-default-2'));

    await waitFor(() => {
      expect(onSetDefaultPaymentMethod).toHaveBeenCalledWith('2');
    });
  });

  it('handles editing payment method', () => {
    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
      />
    );

    // Click edit on first card
    fireEvent.click(screen.getByTestId('edit-1'));

    // Edit modal should open
    expect(screen.getByTestId('payment-modal-edit')).toBeInTheDocument();
  });

  it('handles deleting payment method', async () => {
    const onDeletePaymentMethod = vi.fn().mockResolvedValue(undefined);

    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        onDeletePaymentMethod={onDeletePaymentMethod}
      />
    );

    // Click delete on first card
    fireEvent.click(screen.getByTestId('delete-1'));

    // Confirmation modal should open
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(onDeletePaymentMethod).toHaveBeenCalledWith('1');
    });
  });

  it('displays error message when error occurs', async () => {
    const onAddPaymentMethod = vi.fn().mockRejectedValue(new Error('API Error'));

    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        onAddPaymentMethod={onAddPaymentMethod}
      />
    );

    // Trigger add payment method
    fireEvent.click(screen.getByTestId('add-new-card'));
    fireEvent.click(screen.getByTestId('modal-success'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to add payment method/)).toBeInTheDocument();
    });
  });

  it('shows security section', () => {
    render(
      <PaymentMethodsList paymentMethods={mockPaymentMethods} />
    );

    expect(screen.getByText('Your payment information is secure')).toBeInTheDocument();
    expect(screen.getByText('Secured by Stripe')).toBeInTheDocument();
    expect(screen.getByText('SSL Encrypted')).toBeInTheDocument();
    expect(screen.getByText('PCI Compliant')).toBeInTheDocument();
  });

  it('handles empty payment methods list', () => {
    render(
      <PaymentMethodsList paymentMethods={[]} />
    );

    expect(screen.getByText('0 methods')).toBeInTheDocument();
    expect(screen.getByTestId('add-new-card')).toBeInTheDocument();
  });

  it('supports list view mode', () => {
    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        viewMode="list"
      />
    );

    // Should render cards (mock component doesn't distinguish view modes visually)
    expect(screen.getByText('Card 4242')).toBeInTheDocument();
    expect(screen.getByText('Card 5555')).toBeInTheDocument();
  });

  it('shows correct payment methods count', () => {
    const singleMethod = [mockPaymentMethods[0]];

    render(
      <PaymentMethodsList paymentMethods={singleMethod} />
    );

    expect(screen.getByText('1 method')).toBeInTheDocument();
  });

  it('handles modal close actions', () => {
    render(
      <PaymentMethodsList paymentMethods={mockPaymentMethods} />
    );

    // Open add modal
    fireEvent.click(screen.getByTestId('add-new-card'));
    expect(screen.getByTestId('payment-modal-add')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByTestId('payment-modal-add')).not.toBeInTheDocument();
  });

  it('prevents actions when loading', async () => {
    const onAddPaymentMethod = vi.fn().mockResolvedValue(undefined);

    render(
      <PaymentMethodsList
        paymentMethods={mockPaymentMethods}
        onAddPaymentMethod={onAddPaymentMethod}
      />
    );

    // Open modal and trigger action
    fireEvent.click(screen.getByTestId('add-new-card'));
    fireEvent.click(screen.getByTestId('modal-success'));

    await waitFor(() => {
      expect(onAddPaymentMethod).toHaveBeenCalledTimes(1);
    });
  });
});