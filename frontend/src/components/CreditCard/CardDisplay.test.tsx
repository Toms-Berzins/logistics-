import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CardDisplay, AddNewCard } from './CardDisplay';

// Mock Heroicons
vi.mock('@heroicons/react/24/solid', () => ({
  StarIcon: () => <div data-testid="star-icon" />,
  LockClosedIcon: () => <div data-testid="lock-icon" />,
}));

describe('CardDisplay', () => {
  const mockPaymentMethod = {
    id: '1',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
    isDefault: false,
    holderName: 'John Doe',
  };

  it('renders visual card correctly', () => {
    render(
      <CardDisplay
        paymentMethod={mockPaymentMethod}
        variant="visual"
        data-testid="test-card"
      />
    );

    expect(screen.getByTestId('test-card')).toBeInTheDocument();
    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    expect(screen.getByText('12/25')).toBeInTheDocument();
  });

  it('renders compact card correctly', () => {
    render(
      <CardDisplay
        paymentMethod={mockPaymentMethod}
        variant="compact"
      />
    );

    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('John Doe • Expires 12/25')).toBeInTheDocument();
  });

  it('shows default badge when isDefault is true', () => {
    const defaultPaymentMethod = { ...mockPaymentMethod, isDefault: true };
    
    render(
      <CardDisplay
        paymentMethod={defaultPaymentMethod}
        variant="visual"
      />
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });

  it('handles card actions dropdown', () => {
    const onSetDefault = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CardDisplay
        paymentMethod={mockPaymentMethod}
        onSetDefault={onSetDefault}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    // Open dropdown
    const actionsButton = screen.getByTestId('card-actions-trigger');
    fireEvent.click(actionsButton);

    // Check menu is visible
    expect(screen.getByTestId('card-actions-menu')).toBeInTheDocument();

    // Click set default
    const setDefaultButton = screen.getByTestId('set-default-action');
    fireEvent.click(setDefaultButton);

    expect(onSetDefault).toHaveBeenCalledWith('1');
  });

  it('does not show set default option for default card', () => {
    const defaultPaymentMethod = { ...mockPaymentMethod, isDefault: true };

    render(
      <CardDisplay
        paymentMethod={defaultPaymentMethod}
        onSetDefault={vi.fn()}
      />
    );

    // Open dropdown
    const actionsButton = screen.getByTestId('card-actions-trigger');
    fireEvent.click(actionsButton);

    // Should not show set default option
    expect(screen.queryByTestId('set-default-action')).not.toBeInTheDocument();
  });

  it('masks card number correctly', () => {
    render(
      <CardDisplay
        paymentMethod={mockPaymentMethod}
        variant="visual"
      />
    );

    // Should show masked number with last 4 digits
    expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument();
  });

  it('handles missing cardholder name gracefully', () => {
    const paymentMethodWithoutName = { ...mockPaymentMethod, holderName: undefined };

    render(
      <CardDisplay
        paymentMethod={paymentMethodWithoutName}
        variant="compact"
      />
    );

    // Should show expiry without name
    expect(screen.getByText('Expires 12/25')).toBeInTheDocument();
  });
});

describe('AddNewCard', () => {
  it('renders add new card button', () => {
    const onClick = vi.fn();

    render(
      <AddNewCard
        onClick={onClick}
        data-testid="add-card"
      />
    );

    expect(screen.getByTestId('add-card')).toBeInTheDocument();
    expect(screen.getByText('Add New Card')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();

    render(
      <AddNewCard onClick={onClick} />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(
      <AddNewCard
        onClick={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <AddNewCard onClick={vi.fn()} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Add new payment method');
  });
});