import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingToggle, BillingCycle } from './BillingToggle';

describe('BillingToggle', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with monthly selected by default', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    expect(screen.getByRole('radio', { name: /monthly billing/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /annual billing/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with annual selected when value is annual', () => {
    render(<BillingToggle value="annual" onChange={mockOnChange} />);
    
    expect(screen.getByRole('radio', { name: /monthly billing/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /annual billing/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicking different option', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    fireEvent.click(annualButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('annual');
  });

  it('does not call onChange when clicking current option', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    const monthlyButton = screen.getByRole('radio', { name: /monthly billing/i });
    fireEvent.click(monthlyButton);
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation with Enter and Space', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    
    // Test Enter key
    fireEvent.keyDown(annualButton, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith('annual');
    
    mockOnChange.mockClear();
    
    // Test Space key
    fireEvent.keyDown(annualButton, { key: ' ' });
    expect(mockOnChange).toHaveBeenCalledWith('annual');
  });

  it('shows 20% off badge on annual option', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    expect(screen.getByText('20% off')).toBeInTheDocument();
  });

  it('provides proper accessibility attributes', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    expect(screen.getByRole('radiogroup', { name: /billing cycle selection/i })).toBeInTheDocument();
    
    const monthlyButton = screen.getByRole('radio', { name: /monthly billing/i });
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    
    expect(monthlyButton).toHaveAttribute('aria-checked', 'true');
    expect(annualButton).toHaveAttribute('aria-checked', 'false');
  });

  it('announces state changes to screen readers', async () => {
    render(<BillingToggle value="annual" onChange={mockOnChange} />);
    
    // Check for live region announcement when annual is selected
    await waitFor(() => {
      expect(screen.getByText(/annual billing selected with 20% savings/i)).toBeInTheDocument();
    });
  });

  it('can be disabled', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} disabled />);
    
    const monthlyButton = screen.getByRole('radio', { name: /monthly billing/i });
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    
    expect(monthlyButton).toBeDisabled();
    expect(annualButton).toBeDisabled();
    
    fireEvent.click(annualButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <BillingToggle value="monthly" onChange={mockOnChange} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows descriptive text about billing options', () => {
    render(<BillingToggle value="monthly" onChange={mockOnChange} />);
    
    expect(screen.getByText('Choose your billing cycle')).toBeInTheDocument();
    expect(screen.getByText('Save up to 20% with annual billing')).toBeInTheDocument();
  });
});