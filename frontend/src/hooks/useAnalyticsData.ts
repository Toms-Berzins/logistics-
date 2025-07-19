'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { subDays, format } from 'date-fns';
import { KPIMetric, ChartDataPoint, AnalyticsData, ExportOptions } from '../types/analytics';

const generateMockData = (timeRange: '7d' | '30d' | '90d'): KPIMetric[] => {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const now = new Date();
  
  const generateTrendData = (baseValue: number, volatility: number = 0.1): ChartDataPoint[] => {
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(now, days - i - 1);
      const randomChange = (Math.random() - 0.5) * volatility;
      const value = baseValue * (1 + randomChange);
      return {
        date: date.toISOString(),
        value: Math.max(0, value),
        benchmark: baseValue * 1.1,
      };
    });
  };

  return [
    {
      id: 'avg-delivery-time',
      name: 'Avg Delivery Time',
      value: 42,
      unit: 'min',
      change: -8.2,
      changeType: 'decrease',
      trend: generateTrendData(45, 0.15),
      target: 45,
      format: 'time',
      description: 'Average time from pickup to delivery completion',
      icon: 'clock',
    },
    {
      id: 'on-time-rate',
      name: 'On-Time Rate',
      value: 94.2,
      unit: '%',
      change: 2.1,
      changeType: 'increase',
      trend: generateTrendData(92, 0.05),
      target: 95,
      format: 'percentage',
      description: 'Percentage of deliveries completed within scheduled timeframe',
      icon: 'check-circle',
    },
    {
      id: 'cost-per-delivery',
      name: 'Cost Per Delivery',
      value: 12.85,
      unit: '$',
      change: 1.5,
      changeType: 'increase',
      trend: generateTrendData(12.5, 0.08),
      target: 12,
      format: 'currency',
      description: 'Average operational cost per completed delivery',
      icon: 'currency-dollar',
    },
    {
      id: 'driver-utilization',
      name: 'Driver Utilization',
      value: 87.3,
      unit: '%',
      change: 3.7,
      changeType: 'increase',
      trend: generateTrendData(85, 0.06),
      target: 85,
      format: 'percentage',
      description: 'Percentage of driver working hours with active deliveries',
      icon: 'truck',
    },
    {
      id: 'customer-satisfaction',
      name: 'Customer Satisfaction',
      value: 4.6,
      unit: '/5',
      change: 0.8,
      changeType: 'increase',
      trend: generateTrendData(4.5, 0.04),
      target: 4.5,
      format: 'number',
      description: 'Average customer rating for delivery experience',
      icon: 'star',
    },
    {
      id: 'delivery-success-rate',
      name: 'Delivery Success Rate',
      value: 98.1,
      unit: '%',
      change: -0.3,
      changeType: 'decrease',
      trend: generateTrendData(98, 0.02),
      target: 99,
      format: 'percentage',
      description: 'Percentage of attempted deliveries completed successfully',
      icon: 'check-badge',
    },
    {
      id: 'fuel-efficiency',
      name: 'Fuel Efficiency',
      value: 24.2,
      unit: 'mpg',
      change: 1.8,
      changeType: 'increase',
      trend: generateTrendData(23.5, 0.07),
      target: 25,
      format: 'number',
      description: 'Average miles per gallon across fleet vehicles',
      icon: 'bolt',
    },
    {
      id: 'route-optimization',
      name: 'Route Efficiency',
      value: 91.4,
      unit: '%',
      change: 4.2,
      changeType: 'increase',
      trend: generateTrendData(88, 0.05),
      target: 90,
      format: 'percentage',
      description: 'Percentage of optimal route adherence by drivers',
      icon: 'map',
    },
  ];
};

const simulateApiDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useAnalyticsData = (timeRange: '7d' | '30d' | '90d' = '7d'): AnalyticsData => {
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      
      await simulateApiDelay(800);
      
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const mockData = generateMockData(timeRange);
      setMetrics(mockData);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch analytics data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    await fetchData(abortControllerRef.current.signal);
  }, [fetchData]);

  const exportData = useCallback(async (options: ExportOptions) => {
    try {
      const { format: exportFormat, metrics: selectedMetrics, timeRange: exportTimeRange } = options;
      
      if (exportFormat === 'csv') {
        const csvHeaders = ['Metric', 'Current Value', 'Target', 'Change %', 'Performance'];
        const csvRows = selectedMetrics.map((metric) => [
          metric.name,
          metric.value.toString(),
          metric.target.toString(),
          `${metric.changeType === 'increase' ? '+' : ''}${metric.change}%`,
          `${((metric.value / metric.target) * 100).toFixed(1)}%`
        ]);
        
        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kpi-dashboard-${exportTimeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'pdf') {
        await import('jspdf').then(({ jsPDF }) => {
          const doc = new jsPDF();
          
          doc.setFontSize(20);
          doc.text('KPI Dashboard Report', 20, 30);
          doc.setFontSize(12);
          doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 20, 45);
          doc.text(`Time Range: ${exportTimeRange}`, 20, 55);
          
          let yPosition = 75;
          selectedMetrics.forEach((metric, index) => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 30;
            }
            
            doc.setFontSize(14);
            doc.text(metric.name, 20, yPosition);
            doc.setFontSize(10);
            doc.text(`Current: ${metric.value}${metric.unit || ''}`, 20, yPosition + 10);
            doc.text(`Target: ${metric.target}${metric.unit || ''}`, 20, yPosition + 20);
            doc.text(`Change: ${metric.changeType === 'increase' ? '+' : ''}${metric.change}%`, 20, yPosition + 30);
            doc.text(`Performance: ${((metric.value / metric.target) * 100).toFixed(1)}%`, 20, yPosition + 40);
            
            yPosition += 55;
          });
          
          doc.save(`kpi-dashboard-${exportTimeRange}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
      throw new Error('Failed to export data');
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const startRealTimeUpdates = () => {
      refreshTimeoutRef.current = setInterval(() => {
        if (!document.hidden) {
          setMetrics(currentMetrics => 
            currentMetrics.map(metric => ({
              ...metric,
              value: metric.value + (Math.random() - 0.5) * 0.5,
              change: metric.change + (Math.random() - 0.5) * 0.1,
            }))
          );
          setLastUpdated(new Date());
        }
      }, 5 * 60 * 1000);
    };

    startRealTimeUpdates();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      } else {
        startRealTimeUpdates();
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, refresh]);

  return {
    metrics,
    lastUpdated,
    isLoading,
    error,
    refresh,
    exportData,
  };
};