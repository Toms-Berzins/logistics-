import React from 'react'
import { cn } from '../../lib/utils'

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'dots' | 'bars' | 'skeleton'
  text?: string
  color?: 'primary' | 'neutral' | 'white'
  fullScreen?: boolean
}

const Loading: React.FC<LoadingProps> = ({
  className,
  size = 'md',
  variant = 'spinner',
  text,
  color = 'primary',
  fullScreen = false,
  ...props
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const colorMap = {
    primary: 'text-primary-600',
    neutral: 'text-neutral-600',
    white: 'text-white',
  }

  const Spinner = () => (
    <svg
      className={cn(
        'animate-spin',
        sizeMap[size],
        colorMap[color]
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-bounce',
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-4 h-4',
            size === 'xl' && 'w-5 h-5',
            color === 'primary' && 'bg-primary-600',
            color === 'neutral' && 'bg-neutral-600',
            color === 'white' && 'bg-white'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )

  const Bars = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            size === 'sm' && 'w-1 h-4',
            size === 'md' && 'w-2 h-6',
            size === 'lg' && 'w-3 h-8',
            size === 'xl' && 'w-4 h-10',
            color === 'primary' && 'bg-primary-600',
            color === 'neutral' && 'bg-neutral-600',
            color === 'white' && 'bg-white'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )

  const Skeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-neutral-200 rounded w-3/4" />
      <div className="h-4 bg-neutral-200 rounded w-1/2" />
      <div className="h-4 bg-neutral-200 rounded w-5/6" />
    </div>
  )

  const LoadingComponent = () => {
    switch (variant) {
      case 'dots':
        return <Dots />
      case 'bars':
        return <Bars />
      case 'skeleton':
        return <Skeleton />
      default:
        return <Spinner />
    }
  }

  const containerClassName = cn(
    'flex flex-col items-center justify-center gap-3',
    fullScreen && 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50',
    className
  )

  return (
    <div className={containerClassName} {...props}>
      <LoadingComponent />
      {text && (
        <p className={cn(
          'text-sm font-medium',
          color === 'primary' && 'text-primary-600',
          color === 'neutral' && 'text-neutral-600',
          color === 'white' && 'text-white'
        )}>
          {text}
        </p>
      )}
    </div>
  )
}

export const LoadingButton: React.FC<{
  loading?: boolean
  children: React.ReactNode
  className?: string
}> = ({ loading = false, children, className }) => (
  <div className={cn('relative', className)}>
    <div className={cn('transition-opacity', loading && 'opacity-50')}>
      {children}
    </div>
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <Loading size="sm" color="white" />
      </div>
    )}
  </div>
)

export default Loading