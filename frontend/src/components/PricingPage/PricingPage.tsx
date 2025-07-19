'use client';

import React, { useState } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { pricingTokens } from '../../styles/design-tokens';
import { BillingToggle, BillingCycle } from '../Toggle/BillingToggle';
import { PricingCard } from '../PricingCard/PricingCard';

type PlanTier = 'starter' | 'professional' | 'enterprise';

interface PricingPageProps {
  currentPlan?: PlanTier;
  isLoading?: boolean;
  className?: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentPlan,
  isLoading = false,
  className = '',
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const router = useRouter();

  // Handle plan selection
  const handleSelectPlan = async (tier: PlanTier) => {
    if (!userLoaded || !orgLoaded) {
      return; // Still loading
    }
    
    if (!user || !organization) {
      router.push('/sign-in');
      return;
    }

    if (tier === currentPlan) {
      return; // Already on this plan
    }

    setSelectedPlan(tier);
    setIsCheckoutLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: tier,
          billingCycle,
          organizationId: organization.id,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setIsCheckoutLoading(false);
      setSelectedPlan(null);
      // TODO: Show error toast/notification
    }
  };

  // Handle billing cycle change
  const handleBillingCycleChange = (cycle: BillingCycle) => {
    setBillingCycle(cycle);
  };

  // Keyboard navigation for cards
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const cards = Array.from(document.querySelectorAll('[data-pricing-card]'));
      const currentIndex = cards.findIndex(card => card === event.target);
      
      if (currentIndex !== -1) {
        const nextIndex = event.key === 'ArrowLeft' 
          ? Math.max(0, currentIndex - 1)
          : Math.min(cards.length - 1, currentIndex + 1);
        
        (cards[nextIndex] as HTMLElement)?.focus();
      }
    }
  };

  return (
    <div className={`${pricingTokens.responsive.section} ${className}`}>
      <div className={pricingTokens.responsive.container}>
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            Choose Your Plan
          </h1>
          <p className="mt-6 text-xl text-gray-600 leading-8">
            Scale your logistics operations with flexible pricing that grows with your business.
            From small fleets to enterprise operations, we have the right plan for you.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <BillingToggle
            value={billingCycle}
            onChange={handleBillingCycleChange}
            disabled={isLoading || isCheckoutLoading}
          />
        </div>

        {/* Pricing Cards Grid */}
        <div 
          className={`
            ${pricingTokens.responsive.grid}
            justify-center items-start
            ${pricingTokens.card.gap}
          `}
          role="group"
          aria-label="Pricing plans"
          onKeyDown={handleKeyDown}
        >
          <PricingCard
            tier="starter"
            billingCycle={billingCycle}
            isPopular={false}
            isCurrent={currentPlan === 'starter'}
            isLoading={isLoading}
            onSelectPlan={handleSelectPlan}
            data-pricing-card="starter"
            className={`
              ${selectedPlan === 'starter' && isCheckoutLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
          />
          
          <PricingCard
            tier="professional"
            billingCycle={billingCycle}
            isPopular={true}
            isCurrent={currentPlan === 'professional'}
            isLoading={isLoading}
            onSelectPlan={handleSelectPlan}
            data-pricing-card="professional"
            className={`
              ${selectedPlan === 'professional' && isCheckoutLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
          />
          
          <PricingCard
            tier="enterprise"
            billingCycle={billingCycle}
            isPopular={false}
            isCurrent={currentPlan === 'enterprise'}
            isLoading={isLoading}
            onSelectPlan={handleSelectPlan}
            data-pricing-card="enterprise"
            className={`
              ${selectedPlan === 'enterprise' && isCheckoutLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
          />
        </div>

        {/* Features Comparison Link */}
        <div className="text-center mt-12">
          <button
            type="button"
            className="text-blue-600 hover:text-blue-500 font-medium text-sm underline decoration-2 underline-offset-4"
            onClick={() => {
              // TODO: Implement feature comparison modal or scroll to comparison table
              console.log('Show detailed feature comparison');
            }}
          >
            Compare all features →
          </button>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 pt-16 border-t border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Trusted by logistics companies worldwide
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">99.9% Uptime</h4>
                <p className="text-sm text-gray-600 mt-1">Reliable tracking for your fleet</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">24/7 Support</h4>
                <p className="text-sm text-gray-600 mt-1">Always here when you need us</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Fast Setup</h4>
                <p className="text-sm text-gray-600 mt-1">Get started in under 5 minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section Preview */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Check out our FAQ or contact our sales team for a custom quote.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View FAQ
            </button>
            <button
              type="button"
              className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Contact Sales
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isCheckoutLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-gray-900 font-medium">Redirecting to checkout...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skip links for accessibility */}
      <div className="sr-only">
        <a href="#pricing-cards" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded">
          Skip to pricing options
        </a>
      </div>
    </div>
  );
};

export default PricingPage;