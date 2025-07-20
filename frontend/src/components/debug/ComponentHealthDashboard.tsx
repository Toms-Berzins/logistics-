import React, { useState, useEffect, useCallback } from 'react'
import { visualDebugger } from '../../utils/visualDebug'
import { cn } from '../../lib/utils'

interface ComponentHealthDashboardProps {
  isOpen: boolean
  onClose: () => void
}

interface HealthMetric {
  name: string
  value: number
  threshold: number
  status: 'good' | 'warning' | 'error'
  description: string
}

export const ComponentHealthDashboard: React.FC<ComponentHealthDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [report, setReport] = useState<any>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const updateReport = useCallback(() => {
    const healthReport = visualDebugger.generateHealthReport()
    setReport(healthReport)

    // Calculate metrics
    const newMetrics: HealthMetric[] = [
      {
        name: 'Average Render Time',
        value: healthReport.averageRenderTime || 0,
        threshold: 16,
        status: (healthReport.averageRenderTime || 0) <= 16 ? 'good' : (healthReport.averageRenderTime || 0) <= 32 ? 'warning' : 'error',
        description: 'Average component render time in milliseconds'
      },
      {
        name: 'Total Components',
        value: healthReport.totalComponents || 0,
        threshold: 100,
        status: (healthReport.totalComponents || 0) <= 100 ? 'good' : 'warning',
        description: 'Number of unique components rendered'
      },
      {
        name: 'Style Issues',
        value: healthReport.styleIssues || 0,
        threshold: 5,
        status: (healthReport.styleIssues || 0) === 0 ? 'good' : (healthReport.styleIssues || 0) <= 5 ? 'warning' : 'error',
        description: 'Number of detected styling issues'
      },
      {
        name: 'Slow Components',
        value: Object.keys(healthReport.slowComponents || {}).length,
        threshold: 3,
        status: Object.keys(healthReport.slowComponents || {}).length === 0 ? 'good' : Object.keys(healthReport.slowComponents || {}).length <= 3 ? 'warning' : 'error',
        description: 'Components with slow render times'
      }
    ]

    setMetrics(newMetrics)
  }, [])

  useEffect(() => {
    if (isOpen) {
      updateReport()
      
      if (autoRefresh) {
        const interval = setInterval(updateReport, 2000)
        return () => clearInterval(interval)
      }
    }
  }, [isOpen, autoRefresh, updateReport])

  if (!isOpen) return null

  const overallHealth = metrics.every(m => m.status === 'good') ? 'good' :
                       metrics.some(m => m.status === 'error') ? 'error' : 'warning'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-4 h-4 rounded-full',
              overallHealth === 'good' && 'bg-green-500',
              overallHealth === 'warning' && 'bg-yellow-500',
              overallHealth === 'error' && 'bg-red-500'
            )} />
            <h2 className="text-2xl font-bold text-gray-900">Component Health Dashboard</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </label>
            
            <button
              onClick={updateReport}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric) => (
              <div
                key={metric.name}
                className={cn(
                  'p-4 rounded-lg border-2',
                  metric.status === 'good' && 'bg-green-50 border-green-200',
                  metric.status === 'warning' && 'bg-yellow-50 border-yellow-200',
                  metric.status === 'error' && 'bg-red-50 border-red-200'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-900">{metric.name}</h3>
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    metric.status === 'good' && 'bg-green-500',
                    metric.status === 'warning' && 'bg-yellow-500',
                    metric.status === 'error' && 'bg-red-500'
                  )} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value.toFixed(metric.name.includes('Time') ? 1 : 0)}
                  {metric.name.includes('Time') && <span className="text-sm text-gray-500">ms</span>}
                </div>
                <p className="text-xs text-gray-600">{metric.description}</p>
                <div className="mt-2 text-xs">
                  <span className="text-gray-500">Threshold: {metric.threshold}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Slow Components */}
          {report?.slowComponents && Object.keys(report.slowComponents).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Slow Components</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {Object.entries(report.slowComponents).map(([component, count]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{component}</span>
                      <span className="text-sm text-red-600">{count} slow renders</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Issues */}
          {report?.recentIssues && report.recentIssues.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Issues</h3>
              <div className="space-y-3">
                {report.recentIssues.map((issue: any, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border-l-4',
                      issue.severity === 'error' && 'bg-red-50 border-red-500',
                      issue.severity === 'warning' && 'bg-yellow-50 border-yellow-500',
                      issue.severity === 'info' && 'bg-blue-50 border-blue-500'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={cn(
                          'font-semibold text-sm',
                          issue.severity === 'error' && 'text-red-800',
                          issue.severity === 'warning' && 'text-yellow-800',
                          issue.severity === 'info' && 'text-blue-800'
                        )}>
                          {issue.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-700 mt-1">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-gray-600 mt-2">
                            <strong>Suggestion:</strong> {issue.suggestion}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        issue.severity === 'error' && 'bg-red-100 text-red-800',
                        issue.severity === 'warning' && 'bg-yellow-100 text-yellow-800',
                        issue.severity === 'info' && 'bg-blue-100 text-blue-800'
                      )}>
                        {issue.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues by Component */}
          {report?.issuesByComponent && Object.keys(report.issuesByComponent).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues by Component</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(report.issuesByComponent).map(([component, count]) => (
                    <div key={component} className="flex items-center justify-between p-3 bg-white rounded border">
                      <span className="font-mono text-sm">{component}</span>
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        count === 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      )}>
                        {count} issue{count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Debug Actions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Debug Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  const components = document.querySelectorAll('[data-component]')
                  components.forEach(el => {
                    const htmlEl = el as HTMLElement
                    htmlEl.style.outline = '2px solid #3b82f6'
                    setTimeout(() => {
                      htmlEl.style.outline = ''
                    }, 3000)
                  })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Highlight All Components
              </button>
              
              <button
                onClick={() => {
                  const slowComponents = Object.keys(report?.slowComponents || {})
                  slowComponents.forEach(name => {
                    const elements = document.querySelectorAll(`[data-component="${name}"]`)
                    elements.forEach(el => {
                      const htmlEl = el as HTMLElement
                      htmlEl.style.outline = '2px solid #ef4444'
                      setTimeout(() => {
                        htmlEl.style.outline = ''
                      }, 5000)
                    })
                  })
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Highlight Slow Components
              </button>
              
              <button
                onClick={() => {
                  console.log('Full Component Health Report:', report)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Log Full Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for easy dashboard access
export function useComponentHealthDashboard() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  }
}