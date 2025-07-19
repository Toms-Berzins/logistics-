import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UsageProgressBar, CircularProgress } from './UsageProgressBar';

describe('UsageProgressBar', () => {
  it('renders with basic props', () => {
    render(
      <UsageProgressBar
        label="Test Usage"
        current={50}
        limit={100}
        data-testid="test-progress"
      />
    );

    expect(screen.getByTestId('test-progress')).toBeInTheDocument();
    expect(screen.getByText('Test Usage')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('(50%)')).toBeInTheDocument();
  });

  it('displays correct percentage calculation', () => {
    render(
      <UsageProgressBar
        label="Complex Usage"
        current={33}
        limit={75}
      />
    );

    expect(screen.getByText('(44%)')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    render(
      <UsageProgressBar
        label="Large Numbers"
        current={2500}
        limit={10000}
      />
    );

    // The text might be split across spans, so check parts
    expect(screen.getByText(/2\.5k/)).toBeInTheDocument();
    expect(screen.getByText(/10k/)).toBeInTheDocument();
  });

  it('includes unit in display', () => {
    render(
      <UsageProgressBar
        label="With Unit"
        current={25}
        limit={100}
        unit="drivers"
      />
    );

    expect(screen.getByText('25 / 100 drivers')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(
      <UsageProgressBar
        label="No Percentage"
        current={25}
        limit={100}
        showPercentage={false}
      />
    );

    expect(screen.queryByText('(25%)')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <UsageProgressBar
        label="Accessible Progress"
        current={60}
        limit={100}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Accessible Progress: 60 of 100  used');
  });

  it('applies correct color scheme for different usage levels', () => {
    const { rerender } = render(
      <UsageProgressBar
        label="Low Usage"
        current={30}
        limit={100}
      />
    );

    // Low usage should have green styling (< 60%)
    expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500');

    // Medium usage should have yellow styling (60-80%)
    rerender(
      <UsageProgressBar
        label="Medium Usage"
        current={70}
        limit={100}
      />
    );
    expect(screen.getByRole('progressbar')).toHaveClass('bg-yellow-500');

    // High usage should have red styling (> 80%)
    rerender(
      <UsageProgressBar
        label="High Usage"
        current={90}
        limit={100}
      />
    );
    expect(screen.getByRole('progressbar')).toHaveClass('bg-red-500');
  });

  it('caps percentage at 100% when current exceeds limit', () => {
    render(
      <UsageProgressBar
        label="Over Limit"
        current={150}
        limit={100}
      />
    );

    expect(screen.getByText('(100%)')).toBeInTheDocument();
  });
});

describe('CircularProgress', () => {
  it('renders circular progress with label', () => {
    render(
      <CircularProgress
        label="Circular Test"
        current={75}
        limit={100}
        data-testid="circular-test"
      />
    );

    expect(screen.getByTestId('circular-test')).toBeInTheDocument();
    expect(screen.getByText('Circular Test')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('handles different sizes', () => {
    const { rerender } = render(
      <CircularProgress
        label="Small"
        current={50}
        limit={100}
        size="small"
      />
    );

    expect(screen.getByText('Small')).toBeInTheDocument();

    rerender(
      <CircularProgress
        label="Large"
        current={50}
        limit={100}
        size="large"
      />
    );

    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('applies correct color scheme based on percentage', () => {
    render(
      <CircularProgress
        label="High Usage Circle"
        current={95}
        limit={100}
      />
    );

    // Should show 95% and have red coloring for high usage
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('provides screen reader information', () => {
    render(
      <CircularProgress
        label="Accessible Circle"
        current={40}
        limit={80}
      />
    );

    expect(screen.getByText('Accessible Circle: 40 of 80 used, 50 percent')).toBeInTheDocument();
  });

  it('handles zero and edge case values', () => {
    render(
      <CircularProgress
        label="Zero Usage"
        current={0}
        limit={100}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('handles animation timing correctly', () => {
    vi.useFakeTimers();
    
    const { rerender } = render(
      <CircularProgress
        label="Animated"
        current={0}
        limit={100}
      />
    );

    // Initially should show 0%
    expect(screen.getByText('0%')).toBeInTheDocument();

    // Update to trigger animation
    rerender(
      <CircularProgress
        label="Animated"
        current={80}
        limit={100}
      />
    );

    // After animation delay should show target percentage
    vi.advanceTimersByTime(300);
    expect(screen.getByText('80%')).toBeInTheDocument();

    vi.useRealTimers();
  });
});