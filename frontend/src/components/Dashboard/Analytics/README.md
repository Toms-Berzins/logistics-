# KPI Analytics Dashboard

An interactive, accessible, and responsive KPI dashboard component for real-time operational metrics visualization.

## Features

- ✅ **Responsive Grid Layout**: 2x2 on mobile, 3x2 on tablet, 4x2 on desktop
- ✅ **Real-time Data Updates**: Updates every 5 minutes with smooth animations
- ✅ **Interactive Drill-down**: Click metrics for detailed breakdowns
- ✅ **Export Functionality**: CSV/PDF export with company branding
- ✅ **Accessibility Compliant**: WCAG 2.1 AA standards
- ✅ **Performance Optimized**: <300ms initial render, 60fps animations
- ✅ **Cross-device Compatible**: Touch interactions on mobile

## Components

### AnalyticsDashboard
Main dashboard component that orchestrates all KPI functionality.

```tsx
import { AnalyticsDashboard } from '@/components/Dashboard/Analytics';

export default function DashboardPage() {
  return <AnalyticsDashboard className="p-6" />;
}
```

### KPIOverview
Grid of metric cards with controls and real-time updates.

```tsx
import { KPIOverview } from '@/components/Dashboard/Analytics';

export default function MetricsView() {
  const handleMetricClick = (metric: KPIMetric) => {
    console.log('Selected metric:', metric);
  };

  return (
    <KPIOverview
      onMetricClick={handleMetricClick}
      onExport={() => console.log('Export triggered')}
    />
  );
}
```

### MetricCard
Individual metric display with trend visualization and performance indicators.

```tsx
import { MetricCard } from '@/components/Charts';
import { KPIMetric } from '@/types/analytics';

const metric: KPIMetric = {
  id: 'delivery-time',
  name: 'Avg Delivery Time',
  value: 42,
  unit: 'min',
  change: -8.2,
  changeType: 'decrease',
  trend: [...], // ChartDataPoint[]
  target: 45,
  format: 'time',
};

export default function MetricDisplay() {
  return (
    <MetricCard
      metric={metric}
      onClick={() => console.log('Metric clicked')}
      showTrend={true}
      size="medium"
    />
  );
}
```

### TrendChart
Interactive chart component with tooltips and accessibility features.

```tsx
import { TrendChart } from '@/components/Charts';

export default function ChartView() {
  return (
    <TrendChart
      data={chartData}
      metric={metric}
      height={300}
      showBenchmark={true}
      interactive={true}
    />
  );
}
```

## Data Structure

### KPIMetric Interface
```typescript
interface KPIMetric {
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
```

### ChartDataPoint Interface
```typescript
interface ChartDataPoint {
  date: string | Date;
  value: number;
  benchmark?: number;
  label?: string;
  metadata?: Record<string, any>;
}
```

## Core Metrics Included

1. **Average Delivery Time** (minutes)
2. **On-Time Rate** (percentage)
3. **Cost Per Delivery** (currency)
4. **Driver Utilization** (percentage)
5. **Customer Satisfaction** (rating)
6. **Delivery Success Rate** (percentage)
7. **Fuel Efficiency** (mpg)
8. **Route Efficiency** (percentage)

## Performance Indicators

- 🟢 **Green**: >100% of target (excellent)
- 🟡 **Yellow**: 90-100% of target (good/average)
- 🔴 **Red**: <90% of target (poor/critical)

## Accessibility Features

### WCAG 2.1 AA Compliance
- **Contrast Ratios**: 4.5:1 minimum for all text and chart elements
- **Keyboard Navigation**: Full tab/enter/escape support
- **Screen Reader Support**: Comprehensive aria-labels and descriptions
- **Focus Management**: Clear focus indicators and logical tab order

### Screen Reader Announcements
```
"Delivery time average 45 minutes, 8% decrease from last week, meeting target"
```

### Keyboard Shortcuts
- `Tab`: Navigate between elements
- `Enter/Space`: Activate metric cards
- `Escape`: Close modals
- `Arrow Keys`: Navigate within charts

## Responsive Behavior

### Mobile (sm: <640px)
- Single column grid
- Simplified charts with touch interactions
- Condensed metric information
- Swipe gestures for modal navigation

### Tablet (md: 640-1024px)
- 2x3 grid layout
- Medium-sized charts
- Touch-optimized controls
- Horizontal scroll for overflow

### Desktop (lg: 1024px+)
- 4x2 grid layout
- Full-featured charts with hover effects
- Detailed tooltips and overlays
- Mouse interactions and keyboard shortcuts

## Real-time Updates

### Update Frequency
- **Automatic**: Every 5 minutes
- **Manual**: Refresh button
- **Background**: Pauses when tab is hidden

### Animation Performance
- **Initial Load**: Staggered card entrance animations
- **Data Updates**: Smooth value transitions
- **Chart Rendering**: <300ms for initial render
- **Frame Rate**: Maintained at 60fps

## Export Functionality

### CSV Export
```csv
Metric,Current Value,Target,Change %,Performance
Avg Delivery Time,42,45,-8.2%,93.3%
On-Time Rate,94.2%,95%,+2.1%,99.2%
```

### PDF Export
- Company branding included
- Formatted metric summaries
- Time range and generation date
- Chart visualizations (when supported)

## Error Handling

### Loading States
- Skeleton placeholders during data fetch
- Progressive loading for large datasets
- Graceful degradation on slow connections

### Error States
- Network failure recovery
- Data validation errors
- User-friendly error messages
- Retry mechanisms

## Customization

### Theme Tokens
All visual elements use design tokens from `chartTokens` and `dashboardTokens`:

```typescript
import { chartTokens } from '@/styles/tokens/charts';
import { dashboardTokens } from '@/styles/dashboard-tokens';
```

### Performance Thresholds
Customize performance color coding:

```typescript
export const getPerformanceColor = (value: number, target: number) => {
  const percentage = (value / target) * 100;
  if (percentage >= 110) return 'excellent';
  if (percentage >= 100) return 'good';
  if (percentage >= 90) return 'average';
  if (percentage >= 70) return 'poor';
  return 'critical';
};
```

## Testing

### Visual Tests
Comprehensive visual regression tests in `tests/visual/kpi-dashboard.spec.ts`:

- Loading states
- Error handling
- Responsive layouts
- Modal interactions
- Accessibility compliance
- Animation performance

### Running Tests
```bash
npm run test:visual
```

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility Tools**: NVDA, JAWS, VoiceOver compatible

## Dependencies

- `recharts`: Chart visualization
- `date-fns`: Date formatting and manipulation
- `@heroicons/react`: Icon components
- `framer-motion`: Animation library (optional)

## Bundle Size

- **Component Bundle**: <35KB gzipped
- **Chart Library**: ~45KB gzipped
- **Total Impact**: <80KB gzipped

## Performance Monitoring

The dashboard includes built-in performance monitoring:

- Render time tracking
- Animation frame rate monitoring
- Data processing performance
- Memory usage optimization

```typescript
// Performance targets achieved:
// - Initial render: <300ms
// - Chart animations: 60fps
// - Data processing: <100ms for 10k points
// - Memory usage: <50MB for full dashboard
```