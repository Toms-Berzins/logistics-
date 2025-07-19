'use client';

import React from 'react';
import { dashboardTokens } from '../../styles/dashboard-tokens';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  animationDelay?: number;
  onClick?: () => void;
  'data-testid'?: string;
  'aria-label'?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  animationDelay = 0,
  onClick,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
}) => {
  const isClickable = !!onClick;
  
  // Get animation class based on delay
  const animationClass = animationDelay > 0 ? 
    Object.values(dashboardTokens.animations.stagger)[Math.min(animationDelay - 1, 2)] :
    dashboardTokens.animations.fadeIn;

  const cardClasses = `
    ${dashboardTokens.cards.base}
    ${dashboardTokens.cards.padding}
    ${dashboardTokens.cards.hover}
    ${dashboardTokens.cards.focus}
    ${animationClass}
    ${isClickable ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  const CardWrapper = isClickable ? 'button' : 'div';

  return (
    <CardWrapper
      className={cardClasses}
      onClick={onClick}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={dashboardTokens.cards.spacing}>
        {/* Header */}
        {(title || subtitle) && (
          <div className={dashboardTokens.spacing.textGap}>
            {title && (
              <h3 className={dashboardTokens.typography.cardTitle}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={dashboardTokens.typography.cardSubtitle}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </CardWrapper>
  );
};

export default DashboardCard;