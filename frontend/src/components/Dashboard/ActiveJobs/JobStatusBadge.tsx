import React from 'react'
import { JobStatus, JobPriority } from '../../../types/jobs'
import { cn } from '../../../lib/utils'

interface JobStatusBadgeProps {
  status: JobStatus
  className?: string
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  status,
  className,
  pulse = false,
  size = 'md'
}) => {
  const statusConfig = {
    pending: {
      backgroundColor: '#6C757D',
      textColor: '#FFFFFF',
      borderColor: '#5A6268',
      label: 'Pending',
      ariaLabel: 'Status: Pending - Waiting for assignment'
    },
    assigned: {
      backgroundColor: '#1C4E80',
      textColor: '#FFFFFF', 
      borderColor: '#0C8CE8',
      label: 'Assigned',
      ariaLabel: 'Status: Assigned - Driver assigned'
    },
    'in-transit': {
      backgroundColor: '#FFB400',
      textColor: '#000000',
      borderColor: '#FF9500',
      label: 'In Transit',
      ariaLabel: 'Status: In Transit - Driver en route'
    },
    delivered: {
      backgroundColor: '#28A745',
      textColor: '#FFFFFF',
      borderColor: '#1E7E34',
      label: 'Delivered',
      ariaLabel: 'Status: Delivered - Successfully completed'
    },
    delayed: {
      backgroundColor: '#DC3545',
      textColor: '#FFFFFF',
      borderColor: '#C82333',
      label: 'Delayed',
      ariaLabel: 'Status: Delayed - Behind schedule'
    }
  }

  const config = statusConfig[status]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs min-h-[20px]',
    md: 'px-2.5 py-1 text-xs min-h-[24px]',
    lg: 'px-3 py-1.5 text-sm min-h-[28px]'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border select-none',
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        borderColor: config.borderColor
      }}
      role="status"
      aria-label={config.ariaLabel}
    >
      <span 
        className={cn(
          'w-2 h-2 rounded-full',
          pulse && 'animate-pulse'
        )}
        style={{ backgroundColor: config.textColor }}
      />
      {config.label}
    </span>
  )
}

interface JobPriorityBadgeProps {
  priority: JobPriority
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const JobPriorityBadge: React.FC<JobPriorityBadgeProps> = ({
  priority,
  className,
  size = 'sm'
}) => {
  const priorityConfig = {
    low: {
      backgroundColor: '#28A745',
      textColor: '#FFFFFF',
      label: 'Low',
      ariaLabel: 'Priority: Low'
    },
    medium: {
      backgroundColor: '#FFB400',
      textColor: '#000000',
      label: 'Medium',
      ariaLabel: 'Priority: Medium'
    },
    high: {
      backgroundColor: '#FF6B35',
      textColor: '#FFFFFF',
      label: 'High',
      ariaLabel: 'Priority: High'
    },
    urgent: {
      backgroundColor: '#DC3545',
      textColor: '#FFFFFF',
      label: 'Urgent',
      ariaLabel: 'Priority: Urgent - Immediate attention required'
    }
  }

  const config = priorityConfig[priority]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs min-h-[20px]',
    md: 'px-2.5 py-1 text-xs min-h-[24px]',
    lg: 'px-3 py-1.5 text-sm min-h-[28px]'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border select-none',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        borderColor: config.backgroundColor
      }}
      role="status"
      aria-label={config.ariaLabel}
    >
      {config.label}
    </span>
  )
}