'use client';

import React from 'react';
import Button, { ButtonProps } from '../ui/Button';
// import { pricingTokens } from '../../styles/design-tokens'; // Not used currently

interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary';
  ctaText?: string;
  isPopular?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  variant = 'primary',
  ctaText,
  isPopular = false,
  className = '',
  children,
  ...props
}) => {
  const buttonVariant = variant === 'primary' ? 'primary' : 'outline';
  const content = ctaText || children;

  return (
    <Button
      variant={buttonVariant}
      size="lg"
      fullWidth
      className={`
        ${className}
        ${isPopular ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transform hover:scale-105 transition-all duration-200 ease-out
        font-semibold
      `}
      {...props}
    >
      {content}
    </Button>
  );
};

export default PrimaryButton;