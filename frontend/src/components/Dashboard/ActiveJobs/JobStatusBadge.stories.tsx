import type { Meta, StoryObj } from '@storybook/react'
import { JobStatusBadge, JobPriorityBadge } from './JobStatusBadge'
import { visualDebugger } from '../../../utils/visualDebug'

const meta: Meta<typeof JobStatusBadge> = {
  title: 'Logistics/JobStatusBadge',
  component: JobStatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Status badges for job tracking with color-coded indicators and optional pulse animation for in-transit jobs.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'assigned', 'in-transit', 'delivered', 'delayed'],
      description: 'Current job status'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size variant'
    },
    pulse: {
      control: 'boolean',
      description: 'Enable pulsing animation for active states'
    }
  },
  decorators: [
    (Story, context) => {
      // Add visual debugging
      React.useEffect(() => {
        const element = document.querySelector('[data-testid*="jobstatusbadge"]') as HTMLElement
        if (element) {
          visualDebugger.addDebugAttributes(element, 'JobStatusBadge', context.args)
        }
      })
      
      return (
        <div className="p-8 bg-gray-50 rounded-lg">
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof meta>

// Basic status badges
export const Pending: Story = {
  args: {
    status: 'pending',
    size: 'md'
  }
}

export const Assigned: Story = {
  args: {
    status: 'assigned',
    size: 'md'
  }
}

export const InTransit: Story = {
  args: {
    status: 'in-transit',
    size: 'md',
    pulse: true
  }
}

export const Delivered: Story = {
  args: {
    status: 'delivered',
    size: 'md'
  }
}

export const Delayed: Story = {
  args: {
    status: 'delayed',
    size: 'md'
  }
}

// Size variations
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-x-4">
        <span className="text-sm font-medium">Small:</span>
        <JobStatusBadge status="pending" size="sm" />
        <JobStatusBadge status="assigned" size="sm" />
        <JobStatusBadge status="in-transit" size="sm" pulse />
        <JobStatusBadge status="delivered" size="sm" />
        <JobStatusBadge status="delayed" size="sm" />
      </div>
      <div className="space-x-4">
        <span className="text-sm font-medium">Medium:</span>
        <JobStatusBadge status="pending" size="md" />
        <JobStatusBadge status="assigned" size="md" />
        <JobStatusBadge status="in-transit" size="md" pulse />
        <JobStatusBadge status="delivered" size="md" />
        <JobStatusBadge status="delayed" size="md" />
      </div>
      <div className="space-x-4">
        <span className="text-sm font-medium">Large:</span>
        <JobStatusBadge status="pending" size="lg" />
        <JobStatusBadge status="assigned" size="lg" />
        <JobStatusBadge status="in-transit" size="lg" pulse />
        <JobStatusBadge status="delivered" size="lg" />
        <JobStatusBadge status="delayed" size="lg" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All badge sizes showcasing the complete status workflow'
      }
    }
  }
}

// Animation states
export const PulseAnimation: Story = {
  render: () => (
    <div className="space-x-4">
      <JobStatusBadge status="in-transit" pulse />
      <JobStatusBadge status="assigned" pulse />
      <span className="text-sm text-gray-600">← Pulse animation for active states</span>
    </div>
  )
}

// Priority badges
const PriorityMeta: Meta<typeof JobPriorityBadge> = {
  title: 'Logistics/JobPriorityBadge',
  component: JobPriorityBadge,
  parameters: {
    layout: 'centered'
  }
}

export const LowPriority: StoryObj<typeof JobPriorityBadge> = {
  args: {
    priority: 'low',
    size: 'sm'
  }
}

export const MediumPriority: StoryObj<typeof JobPriorityBadge> = {
  args: {
    priority: 'medium',
    size: 'sm'
  }
}

export const HighPriority: StoryObj<typeof JobPriorityBadge> = {
  args: {
    priority: 'high',
    size: 'sm'
  }
}

export const UrgentPriority: StoryObj<typeof JobPriorityBadge> = {
  args: {
    priority: 'urgent',
    size: 'sm'
  }
}

// Combined status and priority
export const StatusWithPriority: Story = {
  render: () => (
    <div className="space-y-3">
      {(['pending', 'assigned', 'in-transit', 'delivered', 'delayed'] as const).map(status => (
        <div key={status} className="flex items-center space-x-3">
          <JobStatusBadge status={status} pulse={status === 'in-transit'} />
          <JobPriorityBadge priority="high" />
          <span className="text-sm text-gray-600 capitalize">{status} job with high priority</span>
        </div>
      ))}
    </div>
  )
}

// Dark theme variants
export const DarkTheme: Story = {
  render: () => (
    <div className="bg-gray-900 p-6 rounded-lg space-y-4">
      <div className="space-x-4">
        <JobStatusBadge status="pending" />
        <JobStatusBadge status="assigned" />
        <JobStatusBadge status="in-transit" pulse />
        <JobStatusBadge status="delivered" />
        <JobStatusBadge status="delayed" />
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' }
  }
}

// Accessibility test
export const AccessibilityTest: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Color Contrast Test</h3>
        <div className="space-x-4">
          <JobStatusBadge status="pending" />
          <JobStatusBadge status="assigned" />
          <JobStatusBadge status="in-transit" />
          <JobStatusBadge status="delivered" />
          <JobStatusBadge status="delayed" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Screen Reader Test</h3>
        <p className="text-sm text-gray-600">
          Each badge includes proper ARIA labels for screen readers.
          Use a screen reader to verify accessibility.
        </p>
      </div>
    </div>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          }
        ]
      }
    }
  }
}

// Performance test with many badges
export const PerformanceTest: Story = {
  render: () => {
    const badges = Array.from({ length: 100 }, (_, i) => {
      const statuses = ['pending', 'assigned', 'in-transit', 'delivered', 'delayed'] as const
      const status = statuses[i % statuses.length]
      return (
        <JobStatusBadge 
          key={i} 
          status={status} 
          pulse={status === 'in-transit'}
        />
      )
    })

    return (
      <div className="grid grid-cols-10 gap-2 p-4">
        {badges}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 status badges to verify rendering efficiency'
      }
    }
  }
}

import React from 'react'