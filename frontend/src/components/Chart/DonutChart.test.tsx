import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DonutChart, MiniDonutChart } from './DonutChart';

describe('DonutChart', () => {
  const mockData = [
    { label: 'Category A', value: 30, color: 'stroke-blue-500' },
    { label: 'Category B', value: 20, color: 'stroke-green-500' },
    { label: 'Category C', value: 50, color: 'stroke-red-500' },
  ];

  it('renders donut chart with data', () => {
    render(
      <DonutChart
        data={mockData}
        data-testid="test-donut"
      />
    );

    expect(screen.getByTestId('test-donut')).toBeInTheDocument();
  });

  it('displays legend with correct percentages', () => {
    render(
      <DonutChart
        data={mockData}
        showLegend={true}
      />
    );

    expect(screen.getByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('30 (30%)')).toBeInTheDocument();
    expect(screen.getByText('Category B')).toBeInTheDocument();
    expect(screen.getByText('20 (20%)')).toBeInTheDocument();
    expect(screen.getByText('Category C')).toBeInTheDocument();
    expect(screen.getByText('50 (50%)')).toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    render(
      <DonutChart
        data={mockData}
        showLegend={false}
      />
    );

    expect(screen.queryByText('Category A')).not.toBeInTheDocument();
  });

  it('displays center text when provided', () => {
    render(
      <DonutChart
        data={mockData}
        centerText="100"
        centerSubtext="total"
      />
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(
      <DonutChart
        data={mockData}
        size="small"
        centerText="Test"
      />
    );

    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(
      <DonutChart
        data={mockData}
        size="large"
        centerText="Test Large"
      />
    );

    expect(screen.getByText('Test Large')).toBeInTheDocument();
  });

  it('provides screen reader accessible content', () => {
    render(
      <DonutChart
        data={mockData}
      />
    );

    expect(screen.getByText(/Chart showing distribution across 3 categories/)).toBeInTheDocument();
    expect(screen.getByText(/Category A: 30 \(30%\)/)).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(
      <DonutChart
        data={[]}
        data-testid="empty-donut"
      />
    );

    expect(screen.getByTestId('empty-donut')).toBeInTheDocument();
    expect(screen.getByText(/Chart showing distribution across 0 categories/)).toBeInTheDocument();
  });

  it('uses default colors when not provided', () => {
    const dataWithoutColors = [
      { label: 'Item 1', value: 40 },
      { label: 'Item 2', value: 60 },
    ];

    render(
      <DonutChart
        data={dataWithoutColors}
        showLegend={true}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('handles animation timing correctly', () => {
    vi.useFakeTimers();
    
    render(
      <DonutChart
        data={mockData}
        animateOnMount={true}
      />
    );

    // Animation should trigger after delay
    vi.advanceTimersByTime(300);
    
    // Chart should be rendered
    expect(screen.getByText('Category A')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('skips animation when animateOnMount is false', () => {
    render(
      <DonutChart
        data={mockData}
        animateOnMount={false}
      />
    );

    expect(screen.getByText('Category A')).toBeInTheDocument();
  });
});

describe('MiniDonutChart', () => {
  it('renders mini donut chart with percentage', () => {
    render(
      <MiniDonutChart
        percentage={75}
        label="Mini Test"
        data-testid="mini-test"
      />
    );

    expect(screen.getByTestId('mini-test')).toBeInTheDocument();
    expect(screen.getByText('Mini Test')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('75.0% used')).toBeInTheDocument();
  });

  it('applies correct color scheme based on percentage', () => {
    const { rerender } = render(
      <MiniDonutChart
        percentage={30}
        label="Low Usage"
      />
    );

    expect(screen.getByText('30')).toBeInTheDocument();

    // Test medium usage
    rerender(
      <MiniDonutChart
        percentage={70}
        label="Medium Usage"
      />
    );

    expect(screen.getByText('70')).toBeInTheDocument();

    // Test high usage
    rerender(
      <MiniDonutChart
        percentage={95}
        label="High Usage"
      />
    );

    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('rounds percentage display correctly', () => {
    render(
      <MiniDonutChart
        percentage={66.67}
        label="Rounded"
      />
    );

    expect(screen.getByText('67')).toBeInTheDocument(); // Rounded percentage in center
    expect(screen.getByText('66.7% used')).toBeInTheDocument(); // Precise percentage in text
  });

  it('handles zero percentage', () => {
    render(
      <MiniDonutChart
        percentage={0}
        label="Zero Usage"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0% used')).toBeInTheDocument();
  });

  it('handles 100 percentage', () => {
    render(
      <MiniDonutChart
        percentage={100}
        label="Full Usage"
      />
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('100.0% used')).toBeInTheDocument();
  });

  it('animates on mount', () => {
    vi.useFakeTimers();
    
    render(
      <MiniDonutChart
        percentage={80}
        label="Animated"
      />
    );

    // Initially should show 0
    expect(screen.getByText('0')).toBeInTheDocument();

    // After animation delay should show target
    vi.advanceTimersByTime(400);
    expect(screen.getByText('80')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('handles edge case percentages correctly', () => {
    const { rerender } = render(
      <MiniDonutChart
        percentage={0.1}
        label="Very Low"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument(); // Rounded to 0
    expect(screen.getByText('0.1% used')).toBeInTheDocument(); // Precise value

    rerender(
      <MiniDonutChart
        percentage={99.9}
        label="Very High"
      />
    );

    expect(screen.getByText('100')).toBeInTheDocument(); // Rounded to 100
    expect(screen.getByText('99.9% used')).toBeInTheDocument(); // Precise value
  });
});