'use client';

import React, { useEffect, useState } from 'react';
import { dashboardTokens, getUsageColorScheme } from '../../styles/dashboard-tokens';

interface DonutChartData {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: 'small' | 'medium' | 'large';
  centerText?: string;
  centerSubtext?: string;
  showLegend?: boolean;
  className?: string;
  animateOnMount?: boolean;
  'data-testid'?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 'medium',
  centerText,
  centerSubtext,
  showLegend = true,
  className = '',
  animateOnMount = true,
  'data-testid': dataTestId,
}) => {
  const [animatedAngles, setAnimatedAngles] = useState<number[]>([]);
  
  // Size configurations
  const sizeConfig = {
    small: { 
      size: 'w-20 h-20', 
      strokeWidth: 8, 
      radius: 32,
      centerText: 'text-xs',
      centerSubtext: 'text-xs',
    },
    medium: { 
      size: 'w-32 h-32', 
      strokeWidth: 12, 
      radius: 48,
      centerText: 'text-sm',
      centerSubtext: 'text-xs',
    },
    large: { 
      size: 'w-40 h-40', 
      strokeWidth: 16, 
      radius: 64,
      centerText: 'text-base',
      centerSubtext: 'text-sm',
    },
  };
  
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate angles for each segment
  const angles = data.map(item => (item.value / total) * 360);
  
  // Default colors if not provided
  const defaultColors = [
    'stroke-blue-500',
    'stroke-green-500', 
    'stroke-yellow-500',
    'stroke-purple-500',
    'stroke-red-500',
    'stroke-indigo-500',
  ];

  // Animate angles on mount
  useEffect(() => {
    if (animateOnMount) {
      setAnimatedAngles(new Array(data.length).fill(0));
      const timer = setTimeout(() => {
        setAnimatedAngles(angles);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setAnimatedAngles(angles);
    }
  }, [data, animateOnMount, angles]);

  // Calculate stroke dash arrays and offsets
  const segments = data.map((item, index) => {
    const angle = animatedAngles[index] || 0;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (angle / 360) * circumference;
    const rotation = animatedAngles.slice(0, index).reduce((sum, a) => sum + a, 0);
    
    return {
      strokeDasharray,
      strokeDashoffset,
      rotation,
      color: item.color || defaultColors[index % defaultColors.length],
    };
  });

  return (
    <div className={`flex flex-col items-center ${dashboardTokens.spacing.sectionGap} ${className}`} data-testid={dataTestId}>
      {/* Chart */}
      <div className={`relative ${config.size}`}>
        <svg 
          className={config.size}
          viewBox="0 0 128 128"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-gray-200"
          />
          
          {/* Data segments */}
          {segments.map((segment, segmentIndex) => (
            <circle
              key={segmentIndex}
              cx="64"
              cy="64"
              r={config.radius}
              fill="none"
              strokeWidth={config.strokeWidth}
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="round"
              className={`${segment.color} transition-all duration-500 ease-out`}
              style={{
                transformOrigin: '64px 64px',
                transform: `rotate(${segment.rotation}deg)`,
              }}
            />
          ))}
        </svg>
        
        {/* Center content */}
        {(centerText || centerSubtext) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerText && (
              <div className={`font-semibold text-gray-900 ${config.centerText}`}>
                {centerText}
              </div>
            )}
            {centerSubtext && (
              <div className={`text-gray-600 ${config.centerSubtext}`}>
                {centerSubtext}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && data.length > 0 && (
        <div className={`grid grid-cols-1 ${data.length > 2 ? 'sm:grid-cols-2' : ''} ${dashboardTokens.spacing.itemGap} w-full max-w-xs`}>
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const colorClass = item.color || defaultColors[index % defaultColors.length];
            const bgColorClass = colorClass.replace('stroke-', 'bg-');
            
            return (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${bgColorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.value} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screen reader content */}
      <div className="sr-only">
        Chart showing distribution across {data.length} categories:
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return ` ${item.label}: ${item.value} (${percentage.toFixed(0)}%)`;
        }).join(',')}
      </div>
    </div>
  );
};

// Mini donut chart for compact displays
interface MiniDonutChartProps {
  percentage: number;
  label: string;
  className?: string;
  'data-testid'?: string;
}

export const MiniDonutChart: React.FC<MiniDonutChartProps> = ({
  percentage,
  label,
  className = '',
  'data-testid': dataTestId,
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const colorScheme = getUsageColorScheme(percentage);
  
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={`flex items-center ${dashboardTokens.spacing.itemGap} ${className}`} data-testid={dataTestId}>
      {/* Mini chart */}
      <div className="relative w-8 h-8">
        <svg 
          className="w-8 h-8 transform -rotate-90"
          viewBox="0 0 36 36"
        >
          {/* Background */}
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200"
          />
          {/* Progress */}
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${colorScheme.ring.replace('stroke-', 'stroke-')} transition-all duration-300 ease-out`}
          />
        </svg>
        
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-semibold ${colorScheme.text}`}>
            {Math.round(percentage)}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">
          {label}
        </div>
        <div className={`text-xs ${colorScheme.text}`}>
          {percentage.toFixed(1)}% used
        </div>
      </div>
    </div>
  );
};

export default DonutChart;