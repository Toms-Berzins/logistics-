'use client';

import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { MetricCardProps, PerformanceIndicator } from '../../types/analytics';
import { designTokens } from '../../styles/design-system/tokens';
import type { LogisticsProps } from '../../styles/design-system/types';

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

const getTrendColor = (change: number): 'positive' | 'negative' | 'neutral' => {
  if (Math.abs(change) < 0.1) return 'neutral';
  return change > 0 ? 'positive' : 'negative';
};

const getPerformanceIndicator = (value: number, target: number): PerformanceIndicator => {
  const performance = value >= target * 1.1 ? 'excellent' :
                     value >= target ? 'good' :
                     value >= target * 0.8 ? 'average' :
                     value >= target * 0.6 ? 'poor' : 'critical';
  
  const indicators = {
    excellent: { color: designTokens.colors.semantic.success[500], message: 'Exceeding target' },
    good: { color: designTokens.colors.semantic.success[400], message: 'Meeting target' },
    average: { color: designTokens.colors.semantic.warning[500], message: 'Below target' },
    poor: { color: designTokens.colors.semantic.warning[600], message: 'Needs attention' },
    critical: { color: designTokens.colors.semantic.error[500], message: 'Critical' },
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
      container: 'p-component-sm',
      title: 'text-sm font-medium',
      value: 'text-lg font-bold',
      change: 'text-xs',
      icon: 'w-4 h-4',
    },
    medium: {
      container: 'p-dashboard-card-padding',
      title: 'text-base font-medium',
      value: 'text-2xl font-bold',
      change: 'text-sm',
      icon: 'w-5 h-5',
    },
    large: {
      container: 'p-component-xl',
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
        bg-neutral-50 border border-neutral-200 rounded-lg shadow-card
        ${config.container}
        ${isClickable ? 'cursor-pointer hover:shadow-card-hover transition-all duration-normal focus-ring' : ''}
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
      <div className="flex items-start justify-between mb-micro-md">
        <div className="flex-1 min-w-0">
          <h3 className={`${config.title} text-neutral-900 truncate`}>
            {name}
          </h3>
          {description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        
        {/* Performance Indicator */}
        <div 
          className={`
            w-3 h-3 rounded-full flex-shrink-0 ml-3
            ${performance.status === 'excellent' ? 'bg-success-500' : ''}
            ${performance.status === 'good' ? 'bg-success-400' : ''}
            ${performance.status === 'average' ? 'bg-warning-500' : ''}
            ${performance.status === 'poor' ? 'bg-warning-600' : ''}
            ${performance.status === 'critical' ? 'bg-error-500' : ''}
          `}
          title={performance.message}
          aria-label={`Performance: ${performance.message}`}
        />
      </div>
      
      {/* Value and Change */}
      <div className="mb-component-sm">
        <div className={`${config.value} text-neutral-900 mb-micro-xs`}>
          {formattedValue}
        </div>
        
        <div className="flex items-center gap-micro-xs">
          {changeType === 'increase' ? (
            <ArrowUpIcon 
              className={`${config.icon} ${trendColor === 'positive' ? 'text-success-500' : 'text-error-500'}`}
              aria-hidden="true"
            />
          ) : (
            <ArrowDownIcon 
              className={`${config.icon} ${trendColor === 'negative' ? 'text-error-500' : 'text-success-500'}`}
              aria-hidden="true"
            />
          )}
          <span className={`
            ${config.change} font-medium
            ${trendColor === 'positive' ? 'text-success-600' : ''}
            ${trendColor === 'negative' ? 'text-error-600' : ''}
            ${trendColor === 'neutral' ? 'text-neutral-600' : ''}
          `}>
            {formattedChange.toFixed(1)}%
          </span>
          <span className={`${config.change} text-neutral-500`}>
            vs last period
          </span>
        </div>
      </div>
      
      {/* Mini Trend Chart */}
      {showTrend && metric.trend.length > 0 && (
        <div className="mb-micro-md">
          <div className="flex items-center gap-micro-sm mb-micro-sm">
            <ChartBarIcon className="w-4 h-4 text-neutral-400" aria-hidden="true" />
            <span className="text-xs text-neutral-500">7-day trend</span>
          </div>
          <div className="h-8 flex items-end gap-micro-xs" aria-hidden="true">
            {metric.trend.slice(-7).map((point, index) => {
              const height = Math.max(8, (point.value / Math.max(...metric.trend.map(p => p.value))) * 32);
              return (
                <div
                  key={index}
                  className={`
                    flex-1 rounded-sm
                    ${trendColor === 'positive' ? 'bg-success-200' : ''}
                    ${trendColor === 'negative' ? 'bg-error-200' : ''}
                    ${trendColor === 'neutral' ? 'bg-neutral-200' : ''}
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
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-micro-xs">
          <span>Target: {formatValue(target, format, unit)}</span>
          <span className={`font-medium ${
            performance.status === 'excellent' || performance.status === 'good' 
              ? 'text-success-600' 
              : performance.status === 'critical' 
                ? 'text-error-600' 
                : 'text-warning-600'
          }`}>
            {((value / target) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-moderate ease-out
              ${performance.status === 'excellent' ? 'bg-success-500' : ''}
              ${performance.status === 'good' ? 'bg-success-400' : ''}
              ${performance.status === 'average' ? 'bg-warning-500' : ''}
              ${performance.status === 'poor' ? 'bg-warning-600' : ''}
              ${performance.status === 'critical' ? 'bg-error-500' : ''}
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
        <div className="mt-micro-md text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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