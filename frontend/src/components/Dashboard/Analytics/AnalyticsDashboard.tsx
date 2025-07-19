'use client';

import React, { useState } from 'react';
import { KPIOverview } from './KPIOverview';
import { DrillDownModal } from './DrillDownModal';
import { KPIMetric } from '../../../types/analytics';

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
}) => {
  const [selectedMetric, setSelectedMetric] = useState<KPIMetric | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const handleMetricClick = (metric: KPIMetric) => {
    setSelectedMetric(metric);
  };

  const handleCloseModal = () => {
    setSelectedMetric(null);
  };

  const handleExport = () => {
    console.log('Export triggered from KPI Overview');
  };

  return (
    <div className={`w-full ${className}`}>
      <KPIOverview
        onMetricClick={handleMetricClick}
        onExport={handleExport}
      />
      
      <DrillDownModal
        metric={selectedMetric}
        isOpen={!!selectedMetric}
        onClose={handleCloseModal}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    </div>
  );
};