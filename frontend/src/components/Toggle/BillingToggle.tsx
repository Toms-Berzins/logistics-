'use client';

import React, { useState, useEffect } from 'react';
import { billingToggleTokens } from '../../styles/design-tokens';

export type BillingCycle = 'monthly' | 'annual';

interface BillingToggleProps {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  className?: string;
  disabled?: boolean;
}

export const BillingToggle: React.FC<BillingToggleProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const [indicatorOffset, setIndicatorOffset] = useState(0);

  useEffect(() => {
    // Calculate indicator position and width
    const updateIndicator = () => {
      const container = document.getElementById('billing-toggle-container');
      const activeButton = document.getElementById(`billing-${value}`);
      
      if (container && activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        setIndicatorWidth(buttonRect.width);
        setIndicatorOffset(buttonRect.left - containerRect.left - 4); // Account for padding
      }
    };

    updateIndicator();
    
    // Update on window resize
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value]);

  const handleToggle = (cycle: BillingCycle) => {
    if (!disabled && cycle !== value) {
      onChange(cycle);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, cycle: BillingCycle) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(cycle);
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Choose your billing cycle</h3>
        <p className="text-sm text-gray-600 mt-1">
          Save up to 20% with annual billing
        </p>
      </div>
      
      <div
        id="billing-toggle-container"
        className={`
          relative inline-flex
          ${billingToggleTokens.container}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="radiogroup"
        aria-label="Billing cycle selection"
      >
        {/* Sliding indicator */}
        <div
          className={`
            ${billingToggleTokens.indicator}
            ${billingToggleTokens.indicatorSize}
          `}
          style={{
            width: `${indicatorWidth}px`,
            transform: `translateX(${indicatorOffset}px)`,
          }}
          aria-hidden="true"
        />
        
        {/* Monthly button */}
        <button
          id="billing-monthly"
          type="button"
          className={`
            ${billingToggleTokens.button}
            ${value === 'monthly' 
              ? billingToggleTokens.activeButton 
              : billingToggleTokens.inactiveButton
            }
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full
          `}
          onClick={() => handleToggle('monthly')}
          onKeyDown={(e) => handleKeyDown(e, 'monthly')}
          disabled={disabled}
          role="radio"
          aria-checked={value === 'monthly'}
          aria-label="Monthly billing"
        >
          Monthly
        </button>
        
        {/* Annual button */}
        <button
          id="billing-annual"
          type="button"
          className={`
            ${billingToggleTokens.button}
            ${value === 'annual' 
              ? billingToggleTokens.activeButton 
              : billingToggleTokens.inactiveButton
            }
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full
          `}
          onClick={() => handleToggle('annual')}
          onKeyDown={(e) => handleKeyDown(e, 'annual')}
          disabled={disabled}
          role="radio"
          aria-checked={value === 'annual'}
          aria-label="Annual billing"
        >
          <span className="flex items-center gap-2">
            Annual
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
              20% off
            </span>
          </span>
        </button>
      </div>
      
      {/* Accessibility announcement for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {value === 'monthly' ? 'Monthly billing selected' : 'Annual billing selected with 20% savings'}
      </div>
    </div>
  );
};

export default BillingToggle;