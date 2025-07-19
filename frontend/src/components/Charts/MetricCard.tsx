'use client';

import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { MetricCardProps, PerformanceIndicator } from '../../types/analytics';
import { chartTokens, getPerformanceColor, getTrendColor } from '../../styles/tokens/charts';
import { dashboardTokens } from '../../styles/dashboard-tokens';

const formatValue = (value: number, format?: string, unit?: string): string => {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'time':
      if (value < 60) return `${value.toFixed(0)}m`;
      return `${(value / 60).toFixed(1)}h`;
    default:
      return `${value.toFixed(0)}${unit ? ` ${unit}` : ''}`;
  }
};

const getPerformanceIndicator = (value: number, target: number): PerformanceIndicator => {
  const performance = getPerformanceColor(value, target);
  
  const indicators = {
    excellent: { color: chartTokens.colors.performance.excellent, message: 'Exceeding target' },
    good: { color: chartTokens.colors.performance.good, message: 'Meeting target' },
    average: { color: chartTokens.colors.performance.average, message: 'Below target' },
    poor: { color: chartTokens.colors.performance.poor, message: 'Needs attention' },
    critical: { color: chartTokens.colors.performance.critical, message: 'Critical' },
  };
  
  return {
    status: performance,
    ...indicators[performance],
  };
};

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onClick,
  size = 'medium',
  showTrend = true,
  className = '',
}) => {
  const { value, change, changeType, target, format, unit, name, description } = metric;
  
  const formattedValue = formatValue(value, format, unit);
  const formattedChange = Math.abs(change);
  const trendColor = getTrendColor(changeType === 'increase' ? change : -change);
  const performance = getPerformanceIndicator(value, target);
  
  const sizeConfig = {
    small: {
      container: 'p-4',
      title: 'text-sm font-medium',
      value: 'text-lg font-bold',
      change: 'text-xs',
      icon: 'w-4 h-4',
    },
    medium: {
      container: 'p-6',
      title: 'text-base font-medium',
      value: 'text-2xl font-bold',
      change: 'text-sm',
      icon: 'w-5 h-5',
    },
    large: {
      container: 'p-8',
      title: 'text-lg font-semibold',
      value: 'text-3xl font-bold',
      change: 'text-base',
      icon: 'w-6 h-6',
    },
  };
  
  const config = sizeConfig[size];
  const isClickable = !!onClick;
  
  return (
    <div
      className={`
        ${dashboardTokens.cards.base}
        ${config.container}
        ${isClickable ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}
        ${isClickable ? 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none' : ''}
        ${className}
      `}
      onClick={onClick}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${name}: ${formattedValue}, ${changeType === 'increase' ? 'increased' : 'decreased'} by ${formattedChange}% from last period, ${performance.message.toLowerCase()}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`${config.title} text-gray-900 truncate`}>
            {name}
          </h3>
          {description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        
        {/* Performance Indicator */}
        <div 
          className={`
            w-3 h-3 rounded-full flex-shrink-0 ml-3
            ${performance.status === 'excellent' ? 'bg-green-500' : ''}
            ${performance.status === 'good' ? 'bg-green-400' : ''}
            ${performance.status === 'average' ? 'bg-yellow-500' : ''}
            ${performance.status === 'poor' ? 'bg-orange-500' : ''}
            ${performance.status === 'critical' ? 'bg-red-500' : ''}
          `}
          title={performance.message}
          aria-label={`Performance: ${performance.message}`}
        />
      </div>
      
      {/* Value and Change */}
      <div className="mb-4">
        <div className={`${config.value} text-gray-900 mb-1`}>
          {formattedValue}
        </div>
        
        <div className="flex items-center gap-1">
          {changeType === 'increase' ? (
            <ArrowUpIcon 
              className={`${config.icon} ${trendColor === 'positive' ? 'text-green-500' : 'text-red-500'}`}
              aria-hidden="true"
            />
          ) : (
            <ArrowDownIcon 
              className={`${config.icon} ${trendColor === 'negative' ? 'text-red-500' : 'text-green-500'}`}
              aria-hidden="true"
            />
          )}
          <span className={`
            ${config.change} font-medium
            ${trendColor === 'positive' ? 'text-green-600' : ''}
            ${trendColor === 'negative' ? 'text-red-600' : ''}
            ${trendColor === 'neutral' ? 'text-gray-600' : ''}
          `}>
            {formattedChange.toFixed(1)}%
          </span>
          <span className={`${config.change} text-gray-500`}>
            vs last period
          </span>
        </div>
      </div>
      
      {/* Mini Trend Chart */}
      {showTrend && metric.trend.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <span className="text-xs text-gray-500">7-day trend</span>
          </div>
          <div className="h-8 flex items-end gap-1" aria-hidden="true">
            {metric.trend.slice(-7).map((point, index) => {
              const height = Math.max(8, (point.value / Math.max(...metric.trend.map(p => p.value))) * 32);
              return (
                <div
                  key={index}
                  className={`
                    flex-1 rounded-sm
                    ${trendColor === 'positive' ? 'bg-green-200' : ''}
                    ${trendColor === 'negative' ? 'bg-red-200' : ''}
                    ${trendColor === 'neutral' ? 'bg-gray-200' : ''}
                  `}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Target Progress */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Target: {formatValue(target, format, unit)}</span>
          <span className={`font-medium ${
            performance.status === 'excellent' || performance.status === 'good' 
              ? 'text-green-600' 
              : performance.status === 'critical' 
                ? 'text-red-600' 
                : 'text-yellow-600'
          }`}>
            {((value / target) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-300 ease-out
              ${performance.status === 'excellent' ? 'bg-green-500' : ''}
              ${performance.status === 'good' ? 'bg-green-400' : ''}
              ${performance.status === 'average' ? 'bg-yellow-500' : ''}
              ${performance.status === 'poor' ? 'bg-orange-500' : ''}
              ${performance.status === 'critical' ? 'bg-red-500' : ''}
            `}
            style={{ 
              width: `${Math.min(100, (value / target) * 100)}%`,
            }}
            aria-hidden="true"
          />
        </div>
      </div>
      
      {/* Click indicator */}
      {isClickable && (
        <div className="mt-3 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Click for details →
        </div>
      )}
      
      {/* Screen reader content */}
      <div className="sr-only">
        {`${name} metric card. Current value: ${formattedValue}. Target: ${formatValue(target, format, unit)}. Performance: ${performance.message}. Change: ${changeType === 'increase' ? 'increased' : 'decreased'} by ${formattedChange}% from last period.${isClickable ? ' Press Enter or Space to view details.' : ''}`}
      </div>
    </div>
  );
};