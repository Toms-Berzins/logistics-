import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardCard } from './DashboardCard';

describe('DashboardCard', () => {
  it('renders with basic content', () => {
    render(
      <DashboardCard>
        <div>Test content</div>
      </DashboardCard>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('displays title and subtitle when provided', () => {
    render(
      <DashboardCard title="Test Title" subtitle="Test Subtitle">
        <div>Content</div>
      </DashboardCard>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    
    render(
      <DashboardCard onClick={handleClick} data-testid="clickable-card">
        <div>Clickable content</div>
      </DashboardCard>
    );

    const card = screen.getByTestId('clickable-card');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as button when clickable', () => {
    const handleClick = vi.fn();
    
    render(
      <DashboardCard onClick={handleClick}>
        <div>Button content</div>
      </DashboardCard>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders as div when not clickable', () => {
    render(
      <DashboardCard data-testid="static-card">
        <div>Static content</div>
      </DashboardCard>
    );

    const card = screen.getByTestId('static-card');
    expect(card.tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    render(
      <DashboardCard className="custom-class" data-testid="custom-card">
        <div>Content</div>
      </DashboardCard>
    );

    const card = screen.getByTestId('custom-card');
    expect(card).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes when clickable', () => {
    const handleClick = vi.fn();
    
    render(
      <DashboardCard 
        onClick={handleClick} 
        aria-label="Custom aria label"
        data-testid="accessible-card"
      >
        <div>Accessible content</div>
      </DashboardCard>
    );

    const card = screen.getByTestId('accessible-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'Custom aria label');
  });

  it('supports keyboard navigation when clickable', () => {
    const handleClick = vi.fn();
    
    render(
      <DashboardCard onClick={handleClick} data-testid="keyboard-card">
        <div>Keyboard accessible</div>
      </DashboardCard>
    );

    const card = screen.getByTestId('keyboard-card');
    
    // Should be focusable
    card.focus();
    expect(document.activeElement).toBe(card);
  });
});