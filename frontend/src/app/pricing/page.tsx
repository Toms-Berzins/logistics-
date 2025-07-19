'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { SUBSCRIPTION_PLANS, formatPrice } from '@/lib/stripe';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, priceId: string | undefined, planName: string) => {
    if (!isSignedIn) {
      // Redirect to sign-in
      window.location.href = '/';
      return;
    }

    if (!priceId) {
      alert('Price ID not configured for this plan');
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planName,
        }),
      });

      const { sessionId } = await response.json();

      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe redirect error:', error);
          alert('Failed to redirect to checkout');
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to create subscription');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your LogiTrack Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Scale your logistics operations with the right plan for your business size and needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <PricingCard
              key={key}
              plan={plan}
              planId={key.toLowerCase()}
              onSubscribe={handleSubscribe}
              loading={loading === key.toLowerCase()}
              isPopular={key === 'PROFESSIONAL'}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Feature Comparison
          </h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">Starter</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">Professional</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <FeatureRow feature="Max Drivers" starter="5" professional="25" enterprise="Unlimited" />
                  <FeatureRow feature="Real-time Tracking" starter="✓" professional="✓" enterprise="✓" />
                  <FeatureRow feature="Route Optimization" starter="Basic" professional="Advanced" enterprise="AI-Powered" />
                  <FeatureRow feature="Analytics" starter="Basic" professional="Advanced" enterprise="AI Insights" />
                  <FeatureRow feature="Geofencing" starter="—" professional="✓" enterprise="✓" />
                  <FeatureRow feature="API Access" starter="—" professional="✓" enterprise="✓" />
                  <FeatureRow feature="Custom Integrations" starter="—" professional="—" enterprise="✓" />
                  <FeatureRow feature="Support" starter="Email" professional="Priority" enterprise="Dedicated" />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <FAQItem
              question="Can I change my plan anytime?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle."
            />
            <FAQItem
              question="What happens if I exceed my driver limit?"
              answer="You'll receive notifications when approaching your limit. You can upgrade your plan or contact us for custom pricing."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="Yes! All plans come with a 14-day free trial. No credit card required to start."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, ACH transfers, and wire transfers for annual plans."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ 
  plan, 
  planId, 
  onSubscribe, 
  loading, 
  isPopular 
}: {
  plan: any;
  planId: string;
  onSubscribe: (planId: string, priceId: string | undefined, planName: string) => void;
  loading: boolean;
  isPopular?: boolean;
}) {
  return (
    <div className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${isPopular ? 'ring-2 ring-blue-500' : ''}`}>
      {isPopular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="px-6 py-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 mb-4">{plan.description}</p>
        
        <div className="mb-6">
          <span className="text-4xl font-bold text-gray-900">
            {formatPrice(plan.price)}
          </span>
          <span className="text-gray-600 ml-2">/{plan.interval}</span>
        </div>

        <button
          onClick={() => onSubscribe(planId, plan.stripePriceId, plan.name)}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isPopular
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Processing...' : 'Start Free Trial'}
        </button>

        <ul className="mt-6 space-y-3">
          {plan.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeatureRow({ feature, starter, professional, enterprise }: {
  feature: string;
  starter: string;
  professional: string;
  enterprise: string;
}) {
  return (
    <tr>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{feature}</td>
      <td className="px-6 py-4 text-sm text-gray-600 text-center">{starter}</td>
      <td className="px-6 py-4 text-sm text-gray-600 text-center">{professional}</td>
      <td className="px-6 py-4 text-sm text-gray-600 text-center">{enterprise}</td>
    </tr>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-gray-200 pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  );
}