export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  change: number;
  changeType: 'increase' | 'decrease';
  trend: ChartDataPoint[];
  target: number;
  format?: 'number' | 'percentage' | 'currency' | 'time';
  description?: string;
  icon?: string;
}

export interface ChartDataPoint {
  date: string | Date;
  value: number;
  benchmark?: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface KPIOverviewProps {
  metrics: KPIMetric[];
  timeRange: '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void;
  onMetricClick?: (metric: KPIMetric) => void;
  isLoading?: boolean;
  error?: string;
  lastUpdated?: Date;
  className?: string;
}

export interface MetricCardProps {
  metric: KPIMetric;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
  className?: string;
}

export interface TrendChartProps {
  data: ChartDataPoint[];
  metric: KPIMetric;
  height?: number;
  showBenchmark?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  className?: string;
}

export interface DrillDownModalProps {
  metric: KPIMetric | null;
  isOpen: boolean;
  onClose: () => void;
  timeRange: '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  metrics: KPIMetric[];
  timeRange: '7d' | '30d' | '90d';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeCharts?: boolean;
  includeBreakdown?: boolean;
}

export interface AnalyticsData {
  metrics: KPIMetric[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  exportData: (options: ExportOptions) => Promise<void>;
}

export interface PerformanceIndicator {
  status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  color: string;
  message: string;
}

export type TimeRangeOption = {
  value: '7d' | '30d' | '90d';
  label: string;
  days: number;
};