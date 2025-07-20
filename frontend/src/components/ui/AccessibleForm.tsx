/**
 * Accessible form components for logistics platform
 * WCAG 2.1 AA compliant with validation, error handling, and screen reader support
 */

'use client';

import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { createFieldDescription, createAccessibleError } from '@/lib/accessibility/screen-reader';
import { announceToLiveRegion } from '@/lib/accessibility/live-regions';

// Base field props
export interface BaseFieldProps {
  id?: string;
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  description?: string;
}

// Input field component
export interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  pattern?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  showPasswordToggle?: boolean;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder,
  autoComplete,
  maxLength,
  pattern,
  step,
  min,
  max,
  className = '',
  labelClassName = '',
  inputClassName = '',
  description,
  showPasswordToggle = false,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const fieldId = id || `field-${React.useId()}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const descId = `${fieldId}-desc`;

  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Create field description for screen readers
  const fieldDescription = createFieldDescription({
    label,
    type: type === 'password' ? 'password' : type,
    required,
    error,
    hint,
    value,
  });

  // Announce errors to screen readers
  useEffect(() => {
    if (error) {
      const accessibleError = createAccessibleError(error, label, hint);
      announceToLiveRegion(accessibleError, {
        priority: 'assertive',
        category: 'error',
        immediate: true,
      });
    }
  }, [error, label, hint]);

  const hasError = !!error;
  const hasHint = !!hint;
  const hasDescription = !!description;

  // Build aria-describedby attribute
  const describedBy = [
    hasDescription && descId,
    hasHint && hintId,
    hasError && errorId,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      <label
        htmlFor={fieldId}
        className={`
          block text-sm font-medium text-gray-700
          ${hasError ? 'text-red-700' : ''}
          ${labelClassName}
        `}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Description */}
      {hasDescription && (
        <div id={descId} className="text-sm text-gray-600">
          {description}
        </div>
      )}

      {/* Input container */}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          step={step}
          min={min}
          max={max}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm text-sm
            placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${type === 'password' && showPasswordToggle ? 'pr-10' : ''}
            ${inputClassName}
          `}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          aria-required={required}
        />

        {/* Password toggle */}
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="
              absolute inset-y-0 right-0 flex items-center pr-3
              text-gray-400 hover:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              rounded-md
            "
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Error icon */}
        {hasError && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Hint */}
      {hasHint && !hasError && (
        <div id={hintId} className="flex items-start gap-1 text-sm text-gray-600">
          <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{hint}</span>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div
          id={errorId}
          className="flex items-start gap-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

InputField.displayName = 'InputField';

// Textarea field component
export interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder,
  rows = 3,
  maxLength,
  resize = 'vertical',
  className = '',
  labelClassName = '',
  inputClassName = '',
  description,
}, ref) => {
  const fieldId = id || `field-${React.useId()}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const descId = `${fieldId}-desc`;

  const hasError = !!error;
  const hasHint = !!hint;
  const hasDescription = !!description;

  // Build aria-describedby attribute
  const describedBy = [
    hasDescription && descId,
    hasHint && hintId,
    hasError && errorId,
  ].filter(Boolean).join(' ') || undefined;

  // Character count
  const characterCount = value.length;
  const showCharacterCount = maxLength && maxLength > 0;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      <div className="flex justify-between items-center">
        <label
          htmlFor={fieldId}
          className={`
            block text-sm font-medium text-gray-700
            ${hasError ? 'text-red-700' : ''}
            ${labelClassName}
          `}
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {showCharacterCount && (
          <span 
            className={`text-xs ${
              characterCount > maxLength! ? 'text-red-600' : 'text-gray-500'
            }`}
            aria-label={`${characterCount} of ${maxLength} characters used`}
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>

      {/* Description */}
      {hasDescription && (
        <div id={descId} className="text-sm text-gray-600">
          {description}
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={ref}
          id={fieldId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm text-sm
            placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${resize === 'none' ? 'resize-none' : ''}
            ${resize === 'vertical' ? 'resize-y' : ''}
            ${resize === 'horizontal' ? 'resize-x' : ''}
            ${inputClassName}
          `}
          style={{ resize: resize === 'both' ? 'both' : undefined }}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          aria-required={required}
        />

        {/* Error icon */}
        {hasError && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Hint */}
      {hasHint && !hasError && (
        <div id={hintId} className="flex items-start gap-1 text-sm text-gray-600">
          <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{hint}</span>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div
          id={errorId}
          className="flex items-start gap-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

TextareaField.displayName = 'TextareaField';

// Select field component
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(({
  id,
  name,
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder,
  multiple = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  description,
}, ref) => {
  const fieldId = id || `field-${React.useId()}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const descId = `${fieldId}-desc`;

  const hasError = !!error;
  const hasHint = !!hint;
  const hasDescription = !!description;

  // Build aria-describedby attribute
  const describedBy = [
    hasDescription && descId,
    hasHint && hintId,
    hasError && errorId,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      <label
        htmlFor={fieldId}
        className={`
          block text-sm font-medium text-gray-700
          ${hasError ? 'text-red-700' : ''}
          ${labelClassName}
        `}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Description */}
      {hasDescription && (
        <div id={descId} className="text-sm text-gray-600">
          {description}
        </div>
      )}

      {/* Select */}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          multiple={multiple}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm text-sm
            bg-white
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${inputClassName}
          `}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          aria-required={required}
        >
          {placeholder && !multiple && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Error icon */}
        {hasError && (
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Hint */}
      {hasHint && !hasError && (
        <div id={hintId} className="flex items-start gap-1 text-sm text-gray-600">
          <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{hint}</span>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div
          id={errorId}
          className="flex items-start gap-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

SelectField.displayName = 'SelectField';

// Checkbox field component
export interface CheckboxFieldProps extends Omit<BaseFieldProps, 'required'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(({
  id,
  name,
  label,
  checked,
  onChange,
  disabled = false,
  error,
  hint,
  indeterminate = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  description,
}, ref) => {
  const fieldId = id || `field-${React.useId()}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const descId = `${fieldId}-desc`;

  const hasError = !!error;
  const hasHint = !!hint;
  const hasDescription = !!description;

  // Build aria-describedby attribute
  const describedBy = [
    hasDescription && descId,
    hasHint && hintId,
    hasError && errorId,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={`
              h-4 w-4 text-blue-600 border-gray-300 rounded
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${hasError ? 'border-red-300' : ''}
              ${inputClassName}
            `}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            ref={(input) => {
              if (input) {
                input.indeterminate = indeterminate;
              }
              if (typeof ref === 'function') {
                ref(input);
              } else if (ref) {
                ref.current = input;
              }
            }}
          />
        </div>
        
        <div className="ml-3">
          <label
            htmlFor={fieldId}
            className={`
              text-sm font-medium text-gray-700 cursor-pointer
              ${hasError ? 'text-red-700' : ''}
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              ${labelClassName}
            `}
          >
            {label}
          </label>

          {/* Description */}
          {hasDescription && (
            <div id={descId} className="text-sm text-gray-600 mt-1">
              {description}
            </div>
          )}

          {/* Hint */}
          {hasHint && !hasError && (
            <div id={hintId} className="flex items-start gap-1 text-sm text-gray-600 mt-1">
              <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{hint}</span>
            </div>
          )}

          {/* Error message */}
          {hasError && (
            <div
              id={errorId}
              className="flex items-start gap-1 text-sm text-red-600 mt-1"
              role="alert"
              aria-live="polite"
            >
              <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CheckboxField.displayName = 'CheckboxField';

// Form component with validation
export interface FormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  noValidate?: boolean;
  title?: string;
  description?: string;
}

export function AccessibleForm({
  children,
  onSubmit,
  className = '',
  noValidate = true,
  title,
  description,
}: FormProps) {
  const formId = `form-${React.useId()}`;
  const titleId = title ? `${formId}-title` : undefined;
  const descId = description ? `${formId}-desc` : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      className={`space-y-6 ${className}`}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {title && (
        <h2 id={titleId} className="text-lg font-medium text-gray-900">
          {title}
        </h2>
      )}
      
      {description && (
        <p id={descId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      {children}
    </form>
  );
}

// Form section for grouping related fields
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className = '',
}: FormSectionProps) {
  const sectionId = `section-${React.useId()}`;
  const titleId = title ? `${sectionId}-title` : undefined;
  const descId = description ? `${sectionId}-desc` : undefined;

  return (
    <fieldset
      className={`space-y-4 ${className}`}
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {title && (
        <legend id={titleId} className="text-base font-medium text-gray-900">
          {title}
        </legend>
      )}
      
      {description && (
        <p id={descId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  );
}