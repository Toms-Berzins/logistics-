'use client';

import React, { useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { TrendChart } from '../../Charts/TrendChart';
import { DrillDownModalProps, TimeRangeOption } from '../../../types/analytics';
import { getPerformanceColor } from '../../../styles/tokens/charts';

const timeRangeOptions: TimeRangeOption[] = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
];

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  metric,
  isOpen,
  onClose,
  timeRange,
  onTimeRangeChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !metric) return null;

  const formatValue = (value: number) => {
    switch (metric.format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'time':
        if (value < 60) return `${value.toFixed(0)} min`;
        return `${(value / 60).toFixed(1)} hr`;
      default:
        return `${value.toFixed(0)}${metric.unit ? ` ${metric.unit}` : ''}`;
    }
  };

  const performance = getPerformanceColor(metric.value, metric.target);
  const performancePercentage = ((metric.value / metric.target) * 100).toFixed(1);

  const handleExport = async () => {
    try {
      const csvHeaders = ['Date', 'Value', 'Benchmark'];
      const csvRows = metric.trend.map(point => [
        typeof point.date === 'string' ? point.date : point.date.toISOString(),
        point.value.toString(),
        (point.benchmark || '').toString()
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metric.id}-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const trendData = metric.trend.slice(-timeRangeOptions.find(opt => opt.value === timeRange)!.days);
  const avgValue = trendData.reduce((sum, point) => sum + point.value, 0) / trendData.length;
  const minValue = Math.min(...trendData.map(point => point.value));
  const maxValue = Math.max(...trendData.map(point => point.value));

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          ref={modalRef}
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl"
        >
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${performance === 'excellent' ? 'bg-green-100 text-green-600' : ''}
                  ${performance === 'good' ? 'bg-green-100 text-green-600' : ''}
                  ${performance === 'average' ? 'bg-yellow-100 text-yellow-600' : ''}
                  ${performance === 'poor' ? 'bg-orange-100 text-orange-600' : ''}
                  ${performance === 'critical' ? 'bg-red-100 text-red-600' : ''}
                `}>
                  <ChartBarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 
                    id="modal-title" 
                    className="text-lg font-semibold text-gray-900"
                  >
                    {metric.name} Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    {metric.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <select
                    value={timeRange}
                    onChange={(e) => onTimeRangeChange(e.target.value as '7d' | '30d' | '90d')}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timeRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export
                </button>

                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(metric.value)}
                </div>
                <div className="text-sm text-gray-600">Current Value</div>
                <div className="flex items-center gap-1 mt-1">
                  {metric.changeType === 'increase' ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.changeType === 'increase' ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(metric.target)}
                </div>
                <div className="text-sm text-gray-600">Target</div>
                <div className="mt-1">
                  <span className={`text-sm font-medium ${
                    parseFloat(performancePercentage) >= 100 ? 'text-green-600' : 
                    parseFloat(performancePercentage) >= 90 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {performancePercentage}% of target
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(avgValue)}
                </div>
                <div className="text-sm text-gray-600">Average ({timeRange})</div>
                <div className="text-sm text-gray-500 mt-1">
                  Range: {formatValue(minValue)} - {formatValue(maxValue)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className={`
                  text-2xl font-bold
                  ${performance === 'excellent' || performance === 'good' ? 'text-green-600' : ''}
                  ${performance === 'average' ? 'text-yellow-600' : ''}
                  ${performance === 'poor' || performance === 'critical' ? 'text-red-600' : ''}
                `}>
                  {performance.charAt(0).toUpperCase() + performance.slice(1)}
                </div>
                <div className="text-sm text-gray-600">Performance</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`
                      h-full rounded-full
                      ${performance === 'excellent' ? 'bg-green-500' : ''}
                      ${performance === 'good' ? 'bg-green-400' : ''}
                      ${performance === 'average' ? 'bg-yellow-500' : ''}
                      ${performance === 'poor' ? 'bg-orange-500' : ''}
                      ${performance === 'critical' ? 'bg-red-500' : ''}
                    `}
                    style={{ width: `${Math.min(100, parseFloat(performancePercentage))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="mb-6">
              <TrendChart
                data={trendData}
                metric={metric}
                height={400}
                showBenchmark={true}
                showTooltip={true}
                interactive={true}
              />
            </div>

            {/* Insights */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Insights & Recommendations</h4>
              <div className="space-y-2 text-sm text-blue-800">
                {parseFloat(performancePercentage) >= 110 && (
                  <p>✓ Excellent performance! Current value exceeds target by {(parseFloat(performancePercentage) - 100).toFixed(1)}%.</p>
                )}
                {parseFloat(performancePercentage) >= 100 && parseFloat(performancePercentage) < 110 && (
                  <p>✓ Meeting target successfully. Monitor trends to maintain performance.</p>
                )}
                {parseFloat(performancePercentage) >= 90 && parseFloat(performancePercentage) < 100 && (
                  <p>⚠ Slightly below target. Consider optimization strategies to reach {formatValue(metric.target)}.</p>
                )}
                {parseFloat(performancePercentage) < 90 && (
                  <p>⚠ Significantly below target. Immediate attention recommended to improve performance.</p>
                )}
                {metric.changeType === 'increase' && metric.change > 5 && (
                  <p>📈 Strong positive trend with {metric.change.toFixed(1)}% improvement.</p>
                )}
                {metric.changeType === 'decrease' && Math.abs(metric.change) > 5 && (
                  <p>📉 Declining trend detected. Review recent changes that may have impacted performance.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader content */}
      <div className="sr-only">
        Modal showing detailed breakdown for {metric.name}. 
        Current value: {formatValue(metric.value)}. 
        Target: {formatValue(metric.target)}. 
        Performance: {performancePercentage}% of target, {performance} level.
        Trend: {metric.changeType === 'increase' ? 'increasing' : 'decreasing'} by {Math.abs(metric.change)}%.
        Press Escape to close modal.
      </div>
    </div>
  );
};