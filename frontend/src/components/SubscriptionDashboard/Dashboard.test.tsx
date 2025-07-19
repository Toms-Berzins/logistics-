import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionDashboard } from './Dashboard';

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ 
    user: { id: 'user_123', firstName: 'John' }, 
    isLoaded: true 
  }),
  useOrganization: () => ({ 
    organization: { id: 'org_123', name: 'Test Org' }, 
    isLoaded: true 
  }),
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  CreditCardIcon: () => <div data-testid="credit-card-icon" />,
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  ArrowUpIcon: () => <div data-testid="arrow-up-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  CogIcon: () => <div data-testid="cog-icon" />,
  ChartBarIcon: () => <div data-testid="chart-bar-icon" />,
}));

describe('SubscriptionDashboard', () => {
  const mockSubscription = {
    planName: 'Professional',
    status: 'active' as const,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    amount: 149,
    currency: 'USD',
    interval: 'month' as const,
  };

  const mockUsage = {
    drivers: { current: 18, limit: 25 },
    routes: { current: 145, limit: 500 },
    deliveries: { current: 2340, limit: 5000 },
    apiCalls: { current: 8500, limit: 10000 },
  };

  const mockPaymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with all main sections', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('Subscription Overview')).toBeInTheDocument();
    expect(screen.getByTestId('plan-overview')).toBeInTheDocument();
    expect(screen.getByTestId('usage-overview')).toBeInTheDocument();
    expect(screen.getByTestId('billing-summary')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('displays subscription information correctly', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('$149')).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows usage metrics with correct values', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    // Check circular progress components
    expect(screen.getByTestId('drivers-progress')).toBeInTheDocument();
    expect(screen.getByTestId('routes-progress')).toBeInTheDocument();
    expect(screen.getByTestId('deliveries-progress')).toBeInTheDocument();
    expect(screen.getByTestId('api-calls-progress')).toBeInTheDocument();

    // Check progress bars
    expect(screen.getByTestId('drivers-bar')).toBeInTheDocument();
    expect(screen.getByTestId('routes-bar')).toBeInTheDocument();
    expect(screen.getByTestId('deliveries-bar')).toBeInTheDocument();
    expect(screen.getByTestId('api-bar')).toBeInTheDocument();
  });

  it('displays billing information', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText(/Visa.*4242/)).toBeInTheDocument();
    expect(screen.getByText('Expires 12/2025')).toBeInTheDocument();
    expect(screen.getByTestId('usage-donut')).toBeInTheDocument();
  });

  it('handles action button clicks', async () => {
    const onUpgrade = vi.fn();
    const onCancel = vi.fn();
    const onManage = vi.fn();

    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
        onUpgrade={onUpgrade}
        onCancel={onCancel}
        onManage={onManage}
      />
    );

    // Test upgrade button
    const upgradeButton = screen.getByText('Upgrade Plan');
    fireEvent.click(upgradeButton);
    await waitFor(() => {
      expect(onUpgrade).toHaveBeenCalledTimes(1);
    });

    // Test manage button
    const manageButton = screen.getByText('Manage');
    fireEvent.click(manageButton);
    await waitFor(() => {
      expect(onManage).toHaveBeenCalledTimes(1);
    });

    // Test cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('shows trial status alert', () => {
    const trialSubscription = {
      ...mockSubscription,
      status: 'trial' as const,
    };

    render(
      <SubscriptionDashboard
        subscription={trialSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByTestId('status-alerts')).toBeInTheDocument();
    expect(screen.getByText('Trial Period Active')).toBeInTheDocument();
  });

  it('shows past due status alert', () => {
    const pastDueSubscription = {
      ...mockSubscription,
      status: 'past_due' as const,
    };

    render(
      <SubscriptionDashboard
        subscription={pastDueSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByTestId('status-alerts')).toBeInTheDocument();
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
  });

  it('shows upcoming billing alert for near-term renewals', () => {
    const nearTermSubscription = {
      ...mockSubscription,
      currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    };

    render(
      <SubscriptionDashboard
        subscription={nearTermSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByTestId('status-alerts')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Billing')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(
      <SubscriptionDashboard
        isLoading={true}
      />
    );

    expect(screen.getAllByRole('generic').some(el => 
      el.className.includes('animate-pulse')
    )).toBe(true);
  });

  it('handles canceled subscription state', () => {
    const canceledSubscription = {
      ...mockSubscription,
      status: 'canceled' as const,
      cancelAtPeriodEnd: true,
    };

    render(
      <SubscriptionDashboard
        subscription={canceledSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
  });

  it('shows correct usage color coding', () => {
    const highUsageData = {
      drivers: { current: 23, limit: 25 }, // 92% - should be red
      routes: { current: 350, limit: 500 }, // 70% - should be yellow
      deliveries: { current: 1000, limit: 5000 }, // 20% - should be green
      apiCalls: { current: 9500, limit: 10000 }, // 95% - should be red
    };

    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={highUsageData}
        paymentMethod={mockPaymentMethod}
      />
    );

    // Progress bars should be rendered with appropriate test IDs
    expect(screen.getByTestId('drivers-bar')).toBeInTheDocument();
    expect(screen.getByTestId('routes-bar')).toBeInTheDocument();
    expect(screen.getByTestId('deliveries-bar')).toBeInTheDocument();
    expect(screen.getByTestId('api-bar')).toBeInTheDocument();
  });

  it('calculates days until billing correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    
    const subscriptionWithFutureDate = {
      ...mockSubscription,
      currentPeriodEnd: futureDate.toISOString(),
    };

    render(
      <SubscriptionDashboard
        subscription={subscriptionWithFutureDate}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText(/15 days/)).toBeInTheDocument();
  });

  it('handles quick action button interactions', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByText('View Analytics')).toBeInTheDocument();
    expect(screen.getByText('Billing History')).toBeInTheDocument();
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  it('displays mini donut charts in billing summary', () => {
    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
      />
    );

    expect(screen.getByTestId('mini-drivers')).toBeInTheDocument();
    expect(screen.getByTestId('mini-routes')).toBeInTheDocument();
  });

  it('handles button loading states', async () => {
    const slowOnUpgrade = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <SubscriptionDashboard
        subscription={mockSubscription}
        usage={mockUsage}
        paymentMethod={mockPaymentMethod}
        onUpgrade={slowOnUpgrade}
      />
    );

    const upgradeButton = screen.getByText('Upgrade Plan');
    fireEvent.click(upgradeButton);

    // Should show loading state
    await waitFor(() => {
      expect(upgradeButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});