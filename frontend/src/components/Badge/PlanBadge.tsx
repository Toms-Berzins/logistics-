'use client';

import React from 'react';
import { pricingTokens } from '../../styles/design-tokens';

export type BadgeVariant = 'popular' | 'current' | 'recommended';

interface PlanBadgeProps {
  variant: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

const badgeConfig = {
  popular: {
    text: 'Most Popular',
    styles: pricingTokens.badges.popular,
    ariaLabel: 'Most popular plan',
  },
  current: {
    text: 'Current Plan',
    styles: pricingTokens.badges.current,
    ariaLabel: 'Your current plan',
  },
  recommended: {
    text: 'Recommended',
    styles: {
      base: 'absolute -top-3 right-4 bg-purple-600 text-white',
      size: 'px-3 py-1 text-xs font-medium',
      shape: 'rounded-full',
    },
    ariaLabel: 'Recommended plan',
  },
} as const;

export const PlanBadge: React.FC<PlanBadgeProps> = ({
  variant,
  className = '',
  children,
}) => {
  const config = badgeConfig[variant];
  const displayText = children || config.text;

  return (
    <div
      className={`
        ${config.styles.base}
        ${config.styles.size}
        ${config.styles.shape}
        ${className}
        shadow-sm
        transform hover:scale-105 transition-transform duration-150
        z-10
      `}
      role="status"
      aria-label={config.ariaLabel}
    >
      <span className="font-medium">
        {displayText}
      </span>
    </div>
  );
};

// Predefined badge components for convenience
export const PopularBadge: React.FC<Omit<PlanBadgeProps, 'variant'>> = (props) => (
  <PlanBadge variant="popular" {...props} />
);

export const CurrentPlanBadge: React.FC<Omit<PlanBadgeProps, 'variant'>> = (props) => (
  <PlanBadge variant="current" {...props} />
);

export const RecommendedBadge: React.FC<Omit<PlanBadgeProps, 'variant'>> = (props) => (
  <PlanBadge variant="recommended" {...props} />
);

export default PlanBadge;