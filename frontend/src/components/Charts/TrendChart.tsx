'use client';

import React, { useState, useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { TrendChartProps } from '../../types/analytics';
import { chartTokens } from '../../styles/tokens/charts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      value: number;
      benchmark?: number;
      [key: string]: unknown;
    };
  }>;
  label?: string;
  metric: TrendChartProps['metric'];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, metric }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const date = typeof label === 'string' ? parseISO(label) : new Date(label);
  const formattedDate = isValid(date) ? format(date, 'MMM dd, yyyy') : label;

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

  return (
    <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 max-w-xs">
      <p className="text-sm font-medium mb-2">{formattedDate}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300">{metric.name}:</span>
          <span className="text-sm font-semibold text-blue-300">
            {formatValue(data.value)}
          </span>
        </div>
        {data.benchmark !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-300">Target:</span>
            <span className="text-sm text-gray-200">
              {formatValue(data.benchmark)}
            </span>
          </div>
        )}
        {data.benchmark !== undefined && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-600">
            <span className="text-xs text-gray-300">vs Target:</span>
            <span className={`text-sm font-medium ${
              data.value >= data.benchmark ? 'text-green-400' : 'text-red-400'
            }`}>
              {((data.value / data.benchmark - 1) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  metric,
  height = 300,
  showBenchmark = true,
  showTooltip = true,
  interactive = true,
  className = '',
}) => {
  const [, setHoveredPoint] = useState<number | null>(null);

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      date: typeof point.date === 'string' ? point.date : point.date.toISOString(),
      formattedDate: typeof point.date === 'string' 
        ? format(parseISO(point.date), 'MMM dd')
        : format(point.date, 'MMM dd'),
    }));
  }, [data]);

  const { minValue, maxValue, targetLine } = useMemo(() => {
    const values = data.map(d => d.value);
    const benchmarks = data.map(d => d.benchmark).filter(Boolean) as number[];
    const allValues = [...values, ...benchmarks];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    
    return {
      minValue: Math.max(0, min - padding),
      maxValue: max + padding,
      targetLine: metric.target,
    };
  }, [data, metric.target]);

  const lineColor = useMemo(() => {
    const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const performance = (avgValue / metric.target) * 100;
    
    if (performance >= 100) return chartTokens.colors.performance.excellent;
    if (performance >= 90) return chartTokens.colors.performance.good;
    if (performance >= 70) return chartTokens.colors.performance.average;
    return chartTokens.colors.performance.poor;
  }, [data, metric.target]);

  const gradientId = `gradient-${metric.id}`;

  return (
    <div className={`w-full ${className}`}>
      {/* Chart Title */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-1">
          {metric.name} Trend
        </h4>
        <p className="text-sm text-gray-600">
          Performance over time with target comparison
        </p>
      </div>

      {/* Chart Container */}
      <div 
        className="w-full bg-white rounded-lg border border-gray-200 p-4"
        style={{ height: height + 80 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            onMouseMove={(state) => {
              if (interactive && state && state.activeTooltipIndex !== undefined) {
                setHoveredPoint(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => {
              if (interactive) {
                setHoveredPoint(null);
              }
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={chartTokens.colors.chart.grid}
              opacity={0.5}
            />
            
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 12, 
                fill: chartTokens.colors.chart.text,
                textAnchor: 'middle'
              }}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 12, 
                fill: chartTokens.colors.chart.text 
              }}
              domain={[minValue, maxValue]}
              tickFormatter={(value) => {
                switch (metric.format) {
                  case 'percentage':
                    return `${value.toFixed(0)}%`;
                  case 'currency':
                    return `$${value.toFixed(0)}`;
                  case 'time':
                    return value < 60 ? `${value}m` : `${(value/60).toFixed(1)}h`;
                  default:
                    return value.toFixed(0);
                }
              }}
            />
            
            {showTooltip && (
              <Tooltip 
                content={(props) => (
                  <CustomTooltip {...props} metric={metric} />
                )}
              />
            )}
            
            {/* Target Reference Line */}
            {showBenchmark && targetLine && (
              <ReferenceLine
                y={targetLine}
                stroke={chartTokens.colors.neutral}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: "Target",
                  position: "insideTopRight",
                  style: { 
                    fontSize: 12, 
                    fill: chartTokens.colors.chart.text 
                  }
                }}
              />
            )}
            
            {/* Benchmark Line */}
            {showBenchmark && data.some(d => d.benchmark !== undefined) && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={chartTokens.colors.neutral}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                connectNulls={false}
              />
            )}
            
            {/* Main Area */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{
                fill: lineColor,
                strokeWidth: 2,
                stroke: '#ffffff',
                r: 4,
              }}
              activeDot={{
                r: 6,
                stroke: lineColor,
                strokeWidth: 2,
                fill: '#ffffff',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900">
            {data.length > 0 ? (
              metric.format === 'percentage' ? `${data[data.length - 1].value.toFixed(1)}%` :
              metric.format === 'currency' ? `$${data[data.length - 1].value.toFixed(2)}` :
              metric.format === 'time' ? 
                data[data.length - 1].value < 60 ? `${data[data.length - 1].value.toFixed(0)}m` : `${(data[data.length - 1].value / 60).toFixed(1)}h` :
              `${data[data.length - 1].value.toFixed(0)}${metric.unit ? ` ${metric.unit}` : ''}`
            ) : '-'}
          </div>
          <div className="text-gray-500">Current</div>
        </div>
        
        <div className="text-center">
          <div className="font-medium text-gray-900">
            {metric.format === 'percentage' ? `${metric.target.toFixed(1)}%` :
             metric.format === 'currency' ? `$${metric.target.toFixed(2)}` :
             metric.format === 'time' ? 
               metric.target < 60 ? `${metric.target.toFixed(0)}m` : `${(metric.target / 60).toFixed(1)}h` :
             `${metric.target.toFixed(0)}${metric.unit ? ` ${metric.unit}` : ''}`}
          </div>
          <div className="text-gray-500">Target</div>
        </div>
        
        <div className="text-center">
          <div className={`font-medium ${metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {metric.changeType === 'increase' ? '+' : ''}{metric.change.toFixed(1)}%
          </div>
          <div className="text-gray-500">Change</div>
        </div>
        
        <div className="text-center">
          <div className="font-medium text-gray-900">
            {data.length > 0 && metric.target ? (
              `${((data[data.length - 1].value / metric.target) * 100).toFixed(0)}%`
            ) : '-'}
          </div>
          <div className="text-gray-500">vs Target</div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="sr-only">
        <p>
          {`Trend chart for ${metric.name}. Shows ${data.length} data points over time. `}
          {data.length > 0 && `Current value: ${data[data.length - 1].value}. `}
          {`Target value: ${metric.target}. `}
          {`Performance change: ${metric.changeType === 'increase' ? 'increased' : 'decreased'} by ${Math.abs(metric.change)}%.`}
        </p>
        <table>
          <caption>Data table for {metric.name} trend chart</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              {showBenchmark && <th>Benchmark</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={index}>
                <td>
                  {typeof point.date === 'string' 
                    ? format(parseISO(point.date), 'yyyy-MM-dd')
                    : format(point.date, 'yyyy-MM-dd')
                  }
                </td>
                <td>{point.value}</td>
                {showBenchmark && <td>{point.benchmark || '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};