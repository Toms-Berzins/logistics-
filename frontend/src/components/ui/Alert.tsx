import React from 'react'
import { cn } from '../../lib/utils'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ReactNode
}

const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'default',
  title,
  dismissible = false,
  onDismiss,
  icon,
  children,
  ...props
}) => {
  const baseStyles = [
    'relative w-full rounded-lg border px-4 py-3',
    '[&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
    '[&>svg~*]:pl-7',
  ]

  const variants = {
    default: [
      'bg-neutral-50 border-neutral-200 text-neutral-900',
      '[&>svg]:text-neutral-600',
    ],
    success: [
      'bg-success-50 border-success-200 text-success-900',
      '[&>svg]:text-success-600',
    ],
    warning: [
      'bg-warning-50 border-warning-200 text-warning-900',
      '[&>svg]:text-warning-600',
    ],
    error: [
      'bg-error-50 border-error-200 text-error-900',
      '[&>svg]:text-error-600',
    ],
    info: [
      'bg-info-50 border-info-200 text-info-900',
      '[&>svg]:text-info-600',
    ],
  }

  const defaultIcons = {
    default: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    error: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  const CloseIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  return (
    <div
      role="alert"
      className={cn(
        baseStyles,
        variants[variant],
        className
      )}
      {...props}
    >
      {icon || defaultIcons[variant]}
      
      <div className="flex-1">
        {title && (
          <h5 className="mb-1 font-medium leading-none tracking-tight">
            {title}
          </h5>
        )}
        {children && (
          <div className="text-sm [&_p]:leading-relaxed">
            {children}
          </div>
        )}
      </div>
      
      {dismissible && (
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-primary-500"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}

export default Alert