import type { Meta, StoryObj } from '@storybook/react'
import { TouchJobCard, QuickActions } from './TouchJobCard'
import { JobRecord } from '../../types/jobs'
import { visualDebugger } from '../../utils/visualDebug'

// Mock job data
const mockJob: JobRecord = {
  id: 'JOB-001',
  customer: 'Acme Corporation',
  pickup: {
    address: '123 Main Street, New York, NY 10001',
    coordinates: [-74.006, 40.7128],
    scheduledTime: '2025-01-20T10:00:00Z',
    contactName: 'John Doe',
    contactPhone: '+1-555-0123'
  },
  dropoff: {
    address: '456 Broadway, New York, NY 10013',
    coordinates: [-73.986, 40.7589],
    scheduledTime: '2025-01-20T11:30:00Z',
    contactName: 'Jane Smith',
    contactPhone: '+1-555-0456'
  },
  status: 'assigned',
  assignedDriver: {
    id: 'DRV-001',
    name: 'Mike Johnson',
    phone: '+1-555-0001',
    email: 'mike@logistics.com',
    status: 'en-route',
    vehicle: {
      type: 'van',
      licensePlate: 'NYC-123',
      capacity: 1000
    },
    rating: 4.8,
    completedJobs: 247
  },
  priority: 'high',
  estimatedTime: {
    pickup: '2025-01-20T10:00:00Z',
    delivery: '2025-01-20T11:30:00Z',
    duration: 90
  },
  createdAt: '2025-01-20T09:00:00Z',
  updatedAt: '2025-01-20T09:30:00Z',
  notes: 'Fragile items - handle with care',
  packageInfo: {
    weight: 15.5,
    dimensions: '30x20x10 cm',
    specialHandling: ['Fragile', 'Keep Upright']
  }
}

const meta: Meta<typeof TouchJobCard> = {
  title: 'Mobile/TouchJobCard',
  component: TouchJobCard,
  parameters: {
    layout: 'centered',
    viewport: {
      defaultViewport: 'mobile'
    },
    docs: {
      description: {
        component: 'Touch-optimized job card with gesture support for mobile devices. Supports swipe gestures, haptic feedback, and accessibility features.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    job: {
      description: 'Job record data'
    },
    enableGestures: {
      control: 'boolean',
      description: 'Enable touch gesture interactions'
    },
    showGestureHints: {
      control: 'boolean',
      description: 'Show visual hints for available gestures'
    },
    isSelected: {
      control: 'boolean',
      description: 'Selection state for bulk operations'
    }
  },
  decorators: [
    (Story, context) => {
      // Add visual debugging
      React.useEffect(() => {
        const element = document.querySelector('[data-testid="touch-job-card"]') as HTMLElement
        if (element) {
          visualDebugger.addDebugAttributes(element, 'TouchJobCard', context.args)
        }
      })
      
      return (
        <div className="max-w-sm mx-auto p-4 bg-gray-50">
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof meta>

// Basic states
export const Default: Story = {
  args: {
    job: mockJob,
    enableGestures: true,
    showGestureHints: true,
    isSelected: false
  }
}

export const Selected: Story = {
  args: {
    job: mockJob,
    enableGestures: true,
    showGestureHints: true,
    isSelected: true
  }
}

export const WithoutGestures: Story = {
  args: {
    job: mockJob,
    enableGestures: false,
    showGestureHints: false,
    isSelected: false
  }
}

// Different job statuses
export const PendingJob: Story = {
  args: {
    job: {
      ...mockJob,
      status: 'pending',
      assignedDriver: null
    },
    enableGestures: true,
    showGestureHints: true
  }
}

export const InTransitJob: Story = {
  args: {
    job: {
      ...mockJob,
      status: 'in-transit'
    },
    enableGestures: true,
    showGestureHints: true
  }
}

export const DelayedJob: Story = {
  args: {
    job: {
      ...mockJob,
      status: 'delayed',
      priority: 'urgent'
    },
    enableGestures: true,
    showGestureHints: true
  }
}

export const DeliveredJob: Story = {
  args: {
    job: {
      ...mockJob,
      status: 'delivered'
    },
    enableGestures: true,
    showGestureHints: true
  }
}

// Priority variations
export const UrgentPriority: Story = {
  args: {
    job: {
      ...mockJob,
      priority: 'urgent',
      status: 'pending',
      assignedDriver: null
    },
    enableGestures: true,
    showGestureHints: true
  }
}

export const LowPriority: Story = {
  args: {
    job: {
      ...mockJob,
      priority: 'low'
    },
    enableGestures: true,
    showGestureHints: true
  }
}

// Unassigned job
export const UnassignedJob: Story = {
  args: {
    job: {
      ...mockJob,
      status: 'pending',
      assignedDriver: null
    },
    enableGestures: true,
    showGestureHints: true
  }
}

// Different driver statuses
export const DriverAvailable: Story = {
  args: {
    job: {
      ...mockJob,
      assignedDriver: {
        ...mockJob.assignedDriver!,
        status: 'available'
      }
    },
    enableGestures: true,
    showGestureHints: true
  }
}

export const DriverOffline: Story = {
  args: {
    job: {
      ...mockJob,
      assignedDriver: {
        ...mockJob.assignedDriver!,
        status: 'offline'
      }
    },
    enableGestures: true,
    showGestureHints: true
  }
}

// With special handling
export const SpecialHandling: Story = {
  args: {
    job: {
      ...mockJob,
      packageInfo: {
        weight: 25.0,
        dimensions: '40x30x20 cm',
        specialHandling: ['Fragile', 'Keep Upright', 'Temperature Sensitive', 'Signature Required']
      }
    },
    enableGestures: true,
    showGestureHints: true
  }
}

// Multiple cards for list view
export const MultipleCards: Story = {
  render: () => {
    const jobs = [
      { ...mockJob, id: 'JOB-001', status: 'pending' as const, assignedDriver: null },
      { ...mockJob, id: 'JOB-002', status: 'assigned' as const, customer: 'Tech Solutions Inc' },
      { ...mockJob, id: 'JOB-003', status: 'in-transit' as const, customer: 'Global Logistics', priority: 'urgent' as const },
      { ...mockJob, id: 'JOB-004', status: 'delayed' as const, customer: 'Fast Delivery Co', priority: 'high' as const },
      { ...mockJob, id: 'JOB-005', status: 'delivered' as const, customer: 'Local Business' }
    ]

    return (
      <div className="space-y-3 max-w-sm">
        {jobs.map((job, index) => (
          <TouchJobCard
            key={job.id}
            job={job}
            enableGestures={true}
            showGestureHints={true}
            isSelected={index === 1}
            onComplete={() => console.log('Complete:', job.id)}
            onViewDetails={() => console.log('View details:', job.id)}
            onAssign={() => console.log('Assign:', job.id)}
          />
        ))}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple job cards showing different states in a list view'
      }
    }
  }
}

// Gesture interaction demo
export const GestureDemo: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Touch Gestures</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Swipe right → Complete job</li>
          <li>• Swipe left → View details</li>
          <li>• Long press → Assign/reassign driver</li>
          <li>• Tap → Select/navigate</li>
        </ul>
      </div>
      <TouchJobCard
        job={mockJob}
        enableGestures={true}
        showGestureHints={true}
        onComplete={() => alert('Job completed!')}
        onViewDetails={() => alert('Viewing details...')}
        onAssign={() => alert('Assigning driver...')}
      />
    </div>
  )
}

// Quick Actions component
export const QuickActionsDemo: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <TouchJobCard
        job={mockJob}
        enableGestures={false}
        showGestureHints={false}
      />
      <QuickActions
        job={mockJob}
        onComplete={() => console.log('Complete')}
        onAssign={() => console.log('Assign')}
        onViewDetails={() => console.log('View details')}
      />
    </div>
  )
}

// Performance test
export const PerformanceTest: Story = {
  render: () => {
    const jobs = Array.from({ length: 20 }, (_, i) => ({
      ...mockJob,
      id: `JOB-${String(i + 1).padStart(3, '0')}`,
      customer: `Customer ${i + 1}`,
      status: (['pending', 'assigned', 'in-transit', 'delivered', 'delayed'] as const)[i % 5]
    }))

    return (
      <div className="space-y-2 max-w-sm max-h-96 overflow-y-auto">
        {jobs.map(job => (
          <TouchJobCard
            key={job.id}
            job={job}
            enableGestures={true}
            showGestureHints={false}
          />
        ))}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 20 job cards in a scrollable container'
      }
    }
  }
}

// Accessibility test
export const AccessibilityTest: Story = {
  args: {
    job: mockJob,
    enableGestures: true,
    showGestureHints: true
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'touch-target-size',
            enabled: true
          },
          {
            id: 'color-contrast',
            enabled: true
          }
        ]
      }
    },
    docs: {
      description: {
        story: 'Accessibility test ensuring WCAG 2.1 AA compliance with 44px touch targets and proper contrast ratios'
      }
    }
  }
}

// Dark theme
export const DarkTheme: Story = {
  args: {
    job: mockJob,
    enableGestures: true,
    showGestureHints: true
  },
  decorators: [
    (Story) => (
      <div className="bg-gray-900 p-4 rounded-lg">
        <Story />
      </div>
    )
  ],
  parameters: {
    backgrounds: { default: 'dark' }
  }
}

import React from 'react'