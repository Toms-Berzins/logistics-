'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { PricingPage } from '@/components/PricingPage/PricingPage';

type PlanTier = 'starter' | 'professional' | 'enterprise';

export default function Pricing() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [currentPlan, setCurrentPlan] = useState<PlanTier | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load current plan if user is authenticated
    const loadCurrentPlan = async () => {
      setIsLoading(true);
      
      try {
        // Only try to load plan if auth is loaded and user exists
        if (userLoaded && orgLoaded && user && organization) {
          // In a real app, you'd fetch this from your API or Clerk metadata
          // For now, we'll simulate loading
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (organization?.privateMetadata?.subscriptionTier) {
            setCurrentPlan(organization.privateMetadata.subscriptionTier as PlanTier);
          }
        } else if (userLoaded && orgLoaded) {
          // User not authenticated, just stop loading
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error('Failed to load current plan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for auth to load before trying to load plan
    if (userLoaded && orgLoaded) {
      loadCurrentPlan();
    }
  }, [userLoaded, orgLoaded, user, organization]);

  // Show initial loading state only briefly
  if (!userLoaded || !orgLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PricingPage 
        currentPlan={currentPlan}
        isLoading={isLoading}
      />
    </div>
  );
}