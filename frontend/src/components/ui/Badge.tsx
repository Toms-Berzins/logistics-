import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  dot?: boolean
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  pulse = false,
  dot = false,
  children,
  ...props
}) => {
  const baseStyles = [
    'inline-flex items-center gap-1 font-medium',
    'rounded-full border',
    'select-none',
    pulse && 'animate-pulse-soft',
  ]

  const variants = {
    default: [
      'bg-neutral-100 text-neutral-800 border-neutral-200',
    ],
    success: [
      'bg-success-100 text-success-800 border-success-200',
    ],
    warning: [
      'bg-warning-100 text-warning-800 border-warning-200',
    ],
    error: [
      'bg-error-100 text-error-800 border-error-200',
    ],
    info: [
      'bg-info-100 text-info-800 border-info-200',
    ],
    neutral: [
      'bg-neutral-100 text-neutral-700 border-neutral-200',
    ],
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs min-h-[20px]',
    md: 'px-2.5 py-1 text-xs min-h-[24px]',
    lg: 'px-3 py-1.5 text-sm min-h-[28px]',
  }

  const dotColors = {
    default: 'bg-neutral-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
    neutral: 'bg-neutral-500',
  }

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span 
          className={cn(
            'w-2 h-2 rounded-full',
            dotColors[variant],
            pulse && 'animate-pulse-soft'
          )}
        />
      )}
      {children}
    </span>
  )
}

// Specialized badges for logistics status
export const DriverStatusBadge: React.FC<{
  status: 'available' | 'busy' | 'offline' | 'en-route'
  pulse?: boolean
  className?: string
}> = ({ status, pulse = false, className }) => {
  const statusConfig = {
    available: { variant: 'success' as const, label: 'Available', dot: true },
    busy: { variant: 'warning' as const, label: 'Busy', dot: true },
    offline: { variant: 'error' as const, label: 'Offline', dot: true },
    'en-route': { variant: 'info' as const, label: 'En Route', dot: true },
  }

  const config = statusConfig[status]

  return (
    <Badge 
      variant={config.variant} 
      dot={config.dot}
      pulse={pulse}
      className={className}
    >
      {config.label}
    </Badge>
  )
}

export const PriorityBadge: React.FC<{
  priority: 'high' | 'medium' | 'low'
  className?: string
}> = ({ priority, className }) => {
  const priorityConfig = {
    high: { variant: 'error' as const, label: 'High Priority' },
    medium: { variant: 'warning' as const, label: 'Medium Priority' },
    low: { variant: 'success' as const, label: 'Low Priority' },
  }

  const config = priorityConfig[priority]

  return (
    <Badge 
      variant={config.variant}
      size="sm"
      className={className}
    >
      {config.label}
    </Badge>
  )
}

export default Badge