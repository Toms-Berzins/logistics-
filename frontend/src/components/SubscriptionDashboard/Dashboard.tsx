'use client';

import React, { useState } from 'react';
import { DashboardCard } from '../Card/DashboardCard';
import { UsageProgressBar, CircularProgress } from '../ProgressBar/UsageProgressBar';
import { DonutChart, MiniDonutChart } from '../Chart/DonutChart';
import { dashboardTokens, getStatusColorScheme } from '../../styles/dashboard-tokens';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  ArrowUpIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Type definitions
interface SubscriptionData {
  planName: string;
  status: 'active' | 'trial' | 'past_due' | 'canceled';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  trialEnd?: string;
}

interface UsageData {
  drivers: { current: number; limit: number };
  routes: { current: number; limit: number };
  deliveries: { current: number; limit: number };
  apiCalls: { current: number; limit: number };
}

interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface SubscriptionDashboardProps {
  subscription?: SubscriptionData;
  usage?: UsageData;
  paymentMethod?: PaymentMethod;
  isLoading?: boolean;
  onUpgrade?: () => void;
  onCancel?: () => void;
  onManage?: () => void;
  className?: string;
}

// Default data for demo/fallback
const defaultSubscription: SubscriptionData = {
  planName: 'Professional',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  amount: 149,
  currency: 'USD',
  interval: 'month',
};

const defaultUsage: UsageData = {
  drivers: { current: 18, limit: 25 },
  routes: { current: 145, limit: 500 },
  deliveries: { current: 2340, limit: 5000 },
  apiCalls: { current: 8500, limit: 10000 },
};

const defaultPaymentMethod: PaymentMethod = {
  brand: 'Visa',
  last4: '4242',
  expMonth: 12,
  expYear: 2025,
};

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  subscription = defaultSubscription,
  usage = defaultUsage,
  paymentMethod = defaultPaymentMethod,
  isLoading = false,
  onUpgrade,
  onCancel,
  onManage,
  className = '',
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statusScheme = getStatusColorScheme(subscription.status);
  const billingDate = new Date(subscription.currentPeriodEnd);
  const daysUntilBilling = Math.ceil((billingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Usage overview data for donut chart
  const usageOverviewData = [
    { label: 'Drivers', value: usage.drivers.current, color: 'stroke-blue-500' },
    { label: 'Routes', value: usage.routes.current, color: 'stroke-green-500' },
    { label: 'Deliveries', value: Math.round(usage.deliveries.current / 100), color: 'stroke-purple-500' },
  ];

  const handleAction = async (action: string, callback?: () => void) => {
    if (!callback) return;
    
    setActionLoading(action);
    try {
      await callback();
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton className={className} />;
  }

  return (
    <div className={`${dashboardTokens.layout.container} ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Subscription Overview
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor your plan usage and manage your subscription settings
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className={`
        ${dashboardTokens.layout.grid}
        ${dashboardTokens.layout.gridCols.mobile}
        ${dashboardTokens.layout.gridCols.tablet}
        ${dashboardTokens.layout.gridCols.desktop}
      `}>
        
        {/* Plan Overview Card */}
        <DashboardCard
          title="Current Plan"
          subtitle="Your subscription details"
          animationDelay={1}
          className={dashboardTokens.cards.planOverview}
          data-testid="plan-overview"
        >
          <div className={dashboardTokens.spacing.sectionGap}>
            {/* Plan Name & Status */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className={dashboardTokens.typography.planName}>
                  {subscription.planName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`${dashboardTokens.icons.status} ${statusScheme.dot}`} />
                  <span className={`${dashboardTokens.typography.statusText} ${statusScheme.text} capitalize`}>
                    {subscription.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              {subscription.status === 'trial' && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusScheme.bg} ${statusScheme.text}`}>
                  Trial
                </div>
              )}
            </div>

            {/* Billing Amount */}
            <div className="text-center py-4">
              <div className={dashboardTokens.typography.billingAmount}>
                ${subscription.amount}
              </div>
              <div className={dashboardTokens.typography.billingCycle}>
                per {subscription.interval}
              </div>
            </div>

            {/* Next Billing */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${statusScheme.bg}`}>
              <CalendarIcon className={`${dashboardTokens.icons.size} ${statusScheme.text}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {subscription.cancelAtPeriodEnd ? 'Expires' : 'Next billing'}
                </div>
                <div className="text-sm text-gray-600">
                  {billingDate.toLocaleDateString()} ({daysUntilBilling} days)
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-col gap-2 ${dashboardTokens.spacing.itemGap}`}>
              {subscription.status !== 'canceled' && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={() => handleAction('upgrade', onUpgrade)}
                  disabled={actionLoading === 'upgrade'}
                  className={dashboardTokens.buttons.primary}
                >
                  {actionLoading === 'upgrade' ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <ArrowUpIcon className={dashboardTokens.icons.small} />
                  )}
                  Upgrade Plan
                </button>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('manage', onManage)}
                  disabled={actionLoading === 'manage'}
                  className={dashboardTokens.buttons.tertiary}
                >
                  <CogIcon className={dashboardTokens.icons.small} />
                  Manage
                </button>
                
                {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() => handleAction('cancel', onCancel)}
                    disabled={actionLoading === 'cancel'}
                    className={dashboardTokens.buttons.destructive}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Usage Metrics Card */}
        <DashboardCard
          title="Usage Overview"
          subtitle="Current period usage"
          animationDelay={2}
          className="lg:col-span-2"
          data-testid="usage-overview"
        >
          <div className={dashboardTokens.spacing.sectionGap}>
            {/* Circular Progress Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CircularProgress
                label="Drivers"
                current={usage.drivers.current}
                limit={usage.drivers.limit}
                data-testid="drivers-progress"
              />
              <CircularProgress
                label="Routes"
                current={usage.routes.current}
                limit={usage.routes.limit}
                data-testid="routes-progress"
              />
              <CircularProgress
                label="Deliveries"
                current={usage.deliveries.current}
                limit={usage.deliveries.limit}
                data-testid="deliveries-progress"
              />
              <CircularProgress
                label="API Calls"
                current={usage.apiCalls.current}
                limit={usage.apiCalls.limit}
                data-testid="api-calls-progress"
              />
            </div>

            {/* Detailed Progress Bars */}
            <div className={dashboardTokens.spacing.sectionGap}>
              <UsageProgressBar
                label="Active Drivers"
                current={usage.drivers.current}
                limit={usage.drivers.limit}
                unit="drivers"
                data-testid="drivers-bar"
              />
              <UsageProgressBar
                label="Routes This Month"
                current={usage.routes.current}
                limit={usage.routes.limit}
                unit="routes"
                data-testid="routes-bar"
              />
              <UsageProgressBar
                label="Deliveries Completed"
                current={usage.deliveries.current}
                limit={usage.deliveries.limit}
                unit="deliveries"
                data-testid="deliveries-bar"
              />
              <UsageProgressBar
                label="API Requests"
                current={usage.apiCalls.current}
                limit={usage.apiCalls.limit}
                unit="calls"
                data-testid="api-bar"
              />
            </div>
          </div>
        </DashboardCard>

        {/* Billing Summary Card */}
        <DashboardCard
          title="Billing Summary"
          subtitle="Payment information"
          animationDelay={3}
          className={dashboardTokens.cards.billingSummary}
          data-testid="billing-summary"
        >
          <div className={dashboardTokens.spacing.sectionGap}>
            {/* Payment Method */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CreditCardIcon className={`${dashboardTokens.icons.size} text-gray-600`} />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {paymentMethod.brand} •••• {paymentMethod.last4}
                </div>
                <div className="text-sm text-gray-600">
                  Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                </div>
              </div>
            </div>

            {/* Usage Summary Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Distribution</h4>
              <DonutChart
                data={usageOverviewData}
                size="small"
                centerText={`${Math.round((usage.drivers.current + usage.routes.current) / 2)}`}
                centerSubtext="avg usage"
                showLegend={false}
                data-testid="usage-donut"
              />
            </div>

            {/* Mini Usage Indicators */}
            <div className={dashboardTokens.spacing.itemGap}>
              <MiniDonutChart
                percentage={(usage.drivers.current / usage.drivers.limit) * 100}
                label="Drivers"
                data-testid="mini-drivers"
              />
              <MiniDonutChart
                percentage={(usage.routes.current / usage.routes.limit) * 100}
                label="Routes"
                data-testid="mini-routes"
              />
            </div>
          </div>
        </DashboardCard>

        {/* Quick Actions Card */}
        <DashboardCard
          title="Quick Actions"
          animationDelay={4}
          data-testid="quick-actions"
        >
          <div className={dashboardTokens.spacing.itemGap}>
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <ChartBarIcon className={`${dashboardTokens.icons.size} text-blue-600`} />
              <div>
                <div className="text-sm font-medium text-gray-900">View Analytics</div>
                <div className="text-xs text-gray-600">Detailed usage reports</div>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <CreditCardIcon className={`${dashboardTokens.icons.size} text-green-600`} />
              <div>
                <div className="text-sm font-medium text-gray-900">Billing History</div>
                <div className="text-xs text-gray-600">Download invoices</div>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <CogIcon className={`${dashboardTokens.icons.size} text-purple-600`} />
              <div>
                <div className="text-sm font-medium text-gray-900">Account Settings</div>
                <div className="text-xs text-gray-600">Manage preferences</div>
              </div>
            </button>
          </div>
        </DashboardCard>

        {/* Status Alerts */}
        {(subscription.status === 'trial' || subscription.status === 'past_due' || daysUntilBilling <= 3) && (
          <DashboardCard
            title="Important Notices"
            animationDelay={5}
            className="lg:col-span-3"
            data-testid="status-alerts"
          >
            <div className={dashboardTokens.spacing.itemGap}>
              {subscription.status === 'trial' && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-orange-900">
                      Trial Period Active
                    </div>
                    <div className="text-sm text-orange-700">
                      Your trial ends in {daysUntilBilling} days. Add a payment method to continue using LogiTrack.
                    </div>
                  </div>
                </div>
              )}
              
              {subscription.status === 'past_due' && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-900">
                      Payment Failed
                    </div>
                    <div className="text-sm text-red-700">
                      Please update your payment method to restore full access to your account.
                    </div>
                  </div>
                </div>
              )}
              
              {subscription.status === 'active' && daysUntilBilling <= 3 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      Upcoming Billing
                    </div>
                    <div className="text-sm text-blue-700">
                      Your next payment of ${subscription.amount} will be processed in {daysUntilBilling} days.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        )}
      </div>
    </div>
  );
};

// Loading skeleton component
const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`${dashboardTokens.layout.container} ${className}`}>
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
      
      <div className={`
        ${dashboardTokens.layout.grid}
        ${dashboardTokens.layout.gridCols.mobile}
        ${dashboardTokens.layout.gridCols.tablet}
        ${dashboardTokens.layout.gridCols.desktop}
      `}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-20 bg-gray-200 rounded mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;