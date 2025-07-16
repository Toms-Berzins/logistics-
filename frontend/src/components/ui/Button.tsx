import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyles = [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'relative overflow-hidden',
    fullWidth && 'w-full'
  ]

  const variants = {
    primary: [
      'bg-primary-600 text-white shadow-sm',
      'hover:bg-primary-700',
      'active:bg-primary-800',
      'disabled:bg-primary-300',
    ],
    secondary: [
      'bg-neutral-100 text-neutral-900 shadow-sm',
      'hover:bg-neutral-200',
      'active:bg-neutral-300',
      'disabled:bg-neutral-50',
    ],
    ghost: [
      'bg-transparent text-neutral-700',
      'hover:bg-neutral-100',
      'active:bg-neutral-200',
    ],
    outline: [
      'border border-neutral-300 bg-white text-neutral-700 shadow-sm',
      'hover:bg-neutral-50',
      'active:bg-neutral-100',
      'disabled:border-neutral-200',
    ],
    destructive: [
      'bg-error-600 text-white shadow-sm',
      'hover:bg-error-700',
      'active:bg-error-800',
      'disabled:bg-error-300',
    ],
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px] rounded-md',
    md: 'px-4 py-2 text-sm min-h-[40px] rounded-md touch-target',
    lg: 'px-5 py-2.5 text-base min-h-[44px] rounded-lg touch-target',
    xl: 'px-6 py-3 text-base min-h-[48px] rounded-lg touch-target',
  }

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
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

  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {!loading && leftIcon}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {loading && loadingText ? loadingText : children}
      </span>
      {!loading && rightIcon}
    </button>
  )
})

Button.displayName = 'Button'

export default Button