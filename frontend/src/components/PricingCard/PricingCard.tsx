'use client';

import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { SUBSCRIPTION_PLANS, formatPrice } from '../../lib/stripe';
import { pricingTokens } from '../../styles/design-tokens';
import { PlanBadge, BadgeVariant } from '../Badge/PlanBadge';
import { PrimaryButton } from '../Button/PrimaryButton';
import { BillingCycle } from '../Toggle/BillingToggle';

type PlanTier = 'starter' | 'professional' | 'enterprise';

interface PricingCardProps {
  tier: PlanTier;
  billingCycle: BillingCycle;
  isPopular?: boolean;
  isCurrent?: boolean;
  isLoading?: boolean;
  onSelectPlan: (tier: PlanTier) => void;
  className?: string;
  'data-pricing-card'?: string;
}

// Extended feature comparison matrix
const featureMatrix = {
  starter: {
    included: [
      'Up to 5 drivers',
      'Real-time tracking',
      'Basic route optimization',
      'Email support',
      'Mobile app access',
      'Basic analytics',
    ],
    excluded: [
      'Advanced analytics',
      'Geofencing alerts',
      'Custom reports',
      'API access',
      'Priority support',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
    ],
  },
  professional: {
    included: [
      'Up to 25 drivers',
      'Advanced analytics',
      'Geofencing alerts',
      'Custom reports',
      'Priority support',
      'API access',
      'Route optimization AI',
      'Real-time tracking',
      'Mobile app access',
    ],
    excluded: [
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Custom branding',
      'Multi-tenant support',
    ],
  },
  enterprise: {
    included: [
      'Unlimited drivers',
      'Advanced AI insights',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Custom branding',
      'Multi-tenant support',
      'Advanced security',
      'All Professional features',
    ],
    excluded: [],
  },
} as const;

const FeatureIcon: React.FC<{ included: boolean }> = ({ included }) => (
  included ? (
    <CheckIcon 
      className={`${pricingTokens.icons.size} ${pricingTokens.icons.included}`}
      data-testid="feature-included-icon"
      aria-label="Feature included"
    />
  ) : (
    <XMarkIcon 
      className={`${pricingTokens.icons.size} ${pricingTokens.icons.excluded}`}
      data-testid="feature-excluded-icon"
      aria-label="Feature not included"
    />
  )
);

const PricingSkeleton: React.FC = () => (
  <div className={`${pricingTokens.card.width} ${pricingTokens.card.padding} border rounded-lg`}>
    <div className={pricingTokens.card.spacing}>
      {/* Plan name skeleton */}
      <div className={`${pricingTokens.loading.skeleton} h-8 w-32`} />
      
      {/* Price skeleton */}
      <div className={`${pricingTokens.loading.price} mx-auto`} />
      
      {/* Description skeleton */}
      <div className={`${pricingTokens.loading.skeleton} h-4 w-48`} />
      
      {/* Features skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`${pricingTokens.loading.skeleton} w-5 h-5 rounded`} />
            <div className={`${pricingTokens.loading.feature}`} />
          </div>
        ))}
      </div>
      
      {/* Button skeleton */}
      <div className={`${pricingTokens.loading.skeleton} h-12 w-full rounded-lg`} />
    </div>
  </div>
);

export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  billingCycle,
  isPopular = false,
  isCurrent = false,
  isLoading = false,
  onSelectPlan,
  className = '',
  'data-pricing-card': dataPricingCard,
}) => {
  // Remove unused isHovered state for now
  // const [isHovered, setIsHovered] = useState(false);
  
  const plan = SUBSCRIPTION_PLANS[tier.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS];
  const tierConfig = pricingTokens.tiers[tier];
  const features = featureMatrix[tier];
  
  // Calculate pricing based on billing cycle
  const monthlyPrice = plan.price;
  const annualPrice = Math.round(monthlyPrice * 0.8); // 20% discount
  const displayPrice = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const savings = billingCycle === 'annual' ? monthlyPrice - annualPrice : 0;

  if (isLoading) {
    return <PricingSkeleton />;
  }

  const handleSelectPlan = () => {
    onSelectPlan(tier);
  };

  const getBadgeVariant = (): BadgeVariant | null => {
    if (isCurrent) return 'current';
    if (isPopular) return 'popular';
    return null;
  };

  const badgeVariant = getBadgeVariant();

  return (
    <div
      className={`
        relative
        ${pricingTokens.card.width}
        ${tierConfig.card}
        ${pricingTokens.interactions.hover}
        ${pricingTokens.interactions.transition}
        ${pricingTokens.interactions.focus}
        border rounded-lg
        ${className}
      `}
      // onMouseEnter={() => setIsHovered(true)}
      // onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-labelledby={`plan-${tier}-title`}
      tabIndex={0}
      data-pricing-card={dataPricingCard || tier}
    >
      {/* Popular/Current Badge */}
      {badgeVariant && (
        <PlanBadge variant={badgeVariant} />
      )}
      
      <div className={pricingTokens.card.padding}>
        <div className={pricingTokens.card.spacing}>
          {/* Plan Header */}
          <div className="text-center">
            <h3 
              id={`plan-${tier}-title`}
              className={`${pricingTokens.typography.planName} ${tierConfig.text}`}
            >
              {plan.name}
            </h3>
            
            {/* Price Display */}
            <div className="mt-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className={`${pricingTokens.typography.price} ${tierConfig.text}`}>
                  {formatPrice(displayPrice)}
                </span>
                <span className={`${pricingTokens.typography.features} ${tierConfig.accent}`}>
                  /{billingCycle === 'annual' ? 'mo' : 'month'}
                </span>
              </div>
              
              {billingCycle === 'annual' && savings > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(monthlyPrice)}/mo
                  </span>
                  <span className="ml-2 text-sm font-medium text-green-600">
                    Save {formatPrice(savings)}/mo
                  </span>
                </div>
              )}
              
              {billingCycle === 'annual' && (
                <p className="text-xs text-gray-500 mt-1">
                  Billed annually ({formatPrice(displayPrice * 12)})
                </p>
              )}
            </div>
            
            <p className={`${pricingTokens.typography.description} mt-3`}>
              {plan.description}
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Features included:</h4>
            
            {/* Included features */}
            {features.included.map((feature, index) => (
              <div 
                key={`included-${index}`} 
                className="flex items-center gap-3"
                data-testid="feature-included"
              >
                <FeatureIcon included={true} />
                <span className={`${pricingTokens.typography.features} text-gray-700`}>
                  {feature}
                </span>
              </div>
            ))}
            
            {/* Excluded features (only show a few for comparison) */}
            {features.excluded.slice(0, 3).map((feature, index) => (
              <div 
                key={`excluded-${index}`} 
                className="flex items-center gap-3 opacity-50"
                data-testid="feature-excluded"
              >
                <FeatureIcon included={false} />
                <span className={`${pricingTokens.typography.features} text-gray-500`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <PrimaryButton
              variant={isPopular ? 'primary' : 'secondary'}
              isPopular={isPopular}
              onClick={handleSelectPlan}
              disabled={isCurrent}
              ctaText={
                isCurrent 
                  ? 'Current Plan' 
                  : `Get ${plan.name}`
              }
              aria-describedby={`plan-${tier}-description`}
            />
          </div>

          {/* Additional info */}
          <div className="text-center pt-3">
            <p className="text-xs text-gray-500">
              {tier === 'enterprise' ? 'Custom setup included' : 'Setup in minutes'}
            </p>
          </div>
        </div>
      </div>

      {/* Screen reader description */}
      <div id={`plan-${tier}-description`} className="sr-only">
        {plan.name} plan costs {formatPrice(displayPrice)} per {billingCycle === 'annual' ? 'month billed annually' : 'month'}.
        Includes {features.included.length} features such as {features.included.slice(0, 3).join(', ')}.
        {isPopular && ' This is our most popular plan.'}
        {isCurrent && ' This is your current plan.'}
      </div>
    </div>
  );
};

export default PricingCard;