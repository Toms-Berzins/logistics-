import React, { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled'
  inputSize?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  inputSize = 'md',
  fullWidth = true,
  type = 'text',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

  const baseStyles = [
    'border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth && 'w-full'
  ]

  const variants = {
    default: [
      'border-neutral-300 bg-white text-neutral-900',
      'hover:border-neutral-400',
      'focus:border-primary-500',
      'disabled:bg-neutral-50 disabled:border-neutral-200',
    ],
    filled: [
      'border-neutral-200 bg-neutral-50 text-neutral-900',
      'hover:bg-neutral-100',
      'focus:bg-white focus:border-primary-500',
      'disabled:bg-neutral-100 disabled:border-neutral-200',
    ],
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px] rounded-md',
    md: 'px-4 py-2 text-sm min-h-[40px] rounded-md touch-target',
    lg: 'px-5 py-2.5 text-base min-h-[44px] rounded-lg touch-target',
  }

  const hasError = Boolean(error)
  const errorStyles = hasError ? [
    'border-error-300 bg-error-50',
    'hover:border-error-400',
    'focus:border-error-500 focus:ring-error-500',
  ] : []

  return (
    <div className={cn('flex flex-col gap-1', !fullWidth && 'inline-flex')}>
      {label && (
        <label 
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-700 select-none"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            baseStyles,
            variants[variant],
            sizes[inputSize],
            errorStyles,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || hint) && (
        <div className="flex flex-col gap-1">
          {error && (
            <p className="text-sm text-error-600" role="alert">
              {error}
            </p>
          )}
          {hint && !error && (
            <p className="text-sm text-neutral-500">
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input