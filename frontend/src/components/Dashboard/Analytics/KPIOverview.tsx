'use client';

import React, { useState } from 'react';
import { 
  ArrowPathIcon, 
  ArrowDownTrayIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { MetricCard } from '../../Charts/MetricCard';
import { useAnalyticsData } from '../../../hooks/useAnalyticsData';
import { KPIMetric, TimeRangeOption } from '../../../types/analytics';
import { dashboardTokens } from '../../../styles/dashboard-tokens';

const timeRangeOptions: TimeRangeOption[] = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
];

interface KPIOverviewProps {
  onMetricClick?: (metric: KPIMetric) => void;
  onExport?: () => void;
  className?: string;
}

export const KPIOverview: React.FC<KPIOverviewProps> = ({
  onMetricClick,
  onExport,
  className = '',
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const { metrics, isLoading, error, lastUpdated, refresh, exportData } = useAnalyticsData(timeRange);

  const handleExport = async () => {
    try {
      await exportData({
        format: 'csv',
        metrics,
        timeRange,
        dateRange: {
          start: new Date(Date.now() - timeRangeOptions.find(opt => opt.value === timeRange)!.days * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        includeCharts: true,
        includeBreakdown: true,
      });
      onExport?.();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  if (error) {
    return (
      <div className={`${dashboardTokens.cards.base} ${dashboardTokens.cards.padding} ${className}`}>
        <div className="flex items-center gap-3 text-red-600">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <div>
            <h3 className="font-medium">Failed to load analytics data</h3>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={handleRefresh}
              className={`${dashboardTokens.buttons.secondary} mt-2`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              KPI Dashboard
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time operational metrics and performance indicators
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select time range"
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`
                inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                bg-white border border-gray-300 rounded-lg hover:bg-gray-50 
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isLoading ? 'cursor-not-allowed' : ''}
              `}
              aria-label="Refresh data"
            >
              <ArrowPathIcon 
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
              />
              Refresh
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isLoading || metrics.length === 0}
              className={`
                inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="Export data"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <ClockIcon className="w-4 h-4" />
          <span>
            Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}
          </span>
          {!isLoading && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && metrics.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={`${dashboardTokens.cards.base} ${dashboardTokens.cards.padding} animate-pulse`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="w-3 h-3 bg-gray-200 rounded-full" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      {!isLoading || metrics.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={metric.id}
              className={`
                ${dashboardTokens.animations.slideUp}
                ${index > 0 ? 'delay-75' : ''}
                ${index > 1 ? 'delay-150' : ''}
                ${index > 2 ? 'delay-300' : ''}
              `}
              style={{
                animationDelay: `${index * 75}ms`,
              }}
            >
              <MetricCard
                metric={metric}
                onClick={onMetricClick ? () => onMetricClick(metric) : undefined}
                showTrend={true}
                className="h-full"
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty State */}
      {!isLoading && metrics.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No metrics available
          </h3>
          <p className="text-gray-600 mb-4">
            Analytics data will appear here once your system starts collecting metrics.
          </p>
          <button
            onClick={handleRefresh}
            className={dashboardTokens.buttons.primary}
          >
            Refresh Data
          </button>
        </div>
      )}

      {/* Grid Responsive Info for Screen Readers */}
      <div className="sr-only">
        <p>
          KPI Dashboard with {metrics.length} metrics displayed in a responsive grid. 
          On mobile: 1 column, tablet: 2 columns, desktop: 3 columns, large screens: 4 columns.
          Each metric card shows current value, target, performance indicator, and trend.
          {onMetricClick && ' Press Enter or Space on any metric card to view detailed breakdown.'}
        </p>
      </div>
    </div>
  );
};