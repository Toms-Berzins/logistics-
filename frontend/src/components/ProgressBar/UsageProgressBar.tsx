'use client';

import React, { useEffect, useState } from 'react';
import { dashboardTokens, getUsageColorScheme } from '../../styles/dashboard-tokens';

interface UsageProgressBarProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  className?: string;
  showPercentage?: boolean;
  animateOnMount?: boolean;
  'data-testid'?: string;
}

export const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
  label,
  current,
  limit,
  unit = '',
  className = '',
  showPercentage = true,
  animateOnMount = true,
  'data-testid': dataTestId,
}) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const percentage = Math.min((current / limit) * 100, 100);
  const colorScheme = getUsageColorScheme(percentage);
  
  // Animate progress bar on mount
  useEffect(() => {
    if (animateOnMount) {
      const timer = setTimeout(() => {
        setAnimatedWidth(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedWidth(percentage);
    }
  }, [percentage, animateOnMount]);

  const formatValue = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1);
      // Remove trailing .0 for whole numbers
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'k' : formatted + 'k';
    }
    return value.toString();
  };

  return (
    <div className={`${dashboardTokens.progress.container} ${className}`} data-testid={dataTestId}>
      {/* Label and Values */}
      <div className={dashboardTokens.progress.label}>
        <span className={dashboardTokens.typography.metricLabel}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`${dashboardTokens.typography.metricLabel} ${colorScheme.text}`}>
            {formatValue(current)} / {formatValue(limit)} {unit}
          </span>
          {showPercentage && (
            <span 
              className={`${dashboardTokens.progress.percentage} ${colorScheme.text}`}
              aria-label={`${percentage.toFixed(0)} percent used`}
            >
              ({percentage.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className={`${dashboardTokens.progress.track} h-2 mt-2`}>
        <div
          className={`${dashboardTokens.progress.bar} ${colorScheme.bar} h-full`}
          style={{ width: `${animatedWidth}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label}: ${current} of ${limit} ${unit} used`}
        />
      </div>

      {/* Screen reader only percentage announcement */}
      <div className="sr-only" aria-live="polite">
        {label} usage: {percentage.toFixed(0)} percent of limit reached
      </div>
    </div>
  );
};

interface CircularProgressProps {
  label: string;
  current: number;
  limit: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  'data-testid'?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  label,
  current,
  limit,
  size = 'medium',
  className = '',
  'data-testid': dataTestId,
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = Math.min((current / limit) * 100, 100);
  const colorScheme = getUsageColorScheme(percentage);
  
  // Size configurations
  const sizeConfig = {
    small: { size: 'w-12 h-12', strokeWidth: 2, radius: 20 },
    medium: { size: 'w-16 h-16', strokeWidth: 3, radius: 28 },
    large: { size: 'w-20 h-20', strokeWidth: 4, radius: 36 },
  };
  
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div 
      className={`flex flex-col items-center ${dashboardTokens.spacing.textGap} ${className}`}
      data-testid={dataTestId}
    >
      {/* Circular Progress */}
      <div className={`relative ${config.size}`}>
        <svg 
          className={`${config.size} ${dashboardTokens.progress.circle.svg}`}
          viewBox="0 0 64 64"
        >
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r={config.radius}
            className={dashboardTokens.progress.circle.track}
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r={config.radius}
            className={`${dashboardTokens.progress.circle.progress} ${colorScheme.ring}`}
            strokeWidth={config.strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-semibold ${colorScheme.text}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={`${dashboardTokens.typography.metricLabel} text-xs`}>
          {label}
        </p>
        <p className="text-xs text-gray-500">
          {current}/{limit}
        </p>
      </div>

      {/* Screen reader info */}
      <div className="sr-only">
        {label}: {current} of {limit} used, {percentage.toFixed(0)} percent
      </div>
    </div>
  );
};

export default UsageProgressBar;