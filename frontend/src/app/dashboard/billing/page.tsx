'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface SubscriptionData {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  plan: {
    nickname: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

function BillingPageContent() {
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [subscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // Handle successful checkout
      console.log('Checkout completed with session:', sessionId);
      // You could show a success message or fetch subscription details
    }
    
    // Simulate loading subscription data
    // In a real app, you'd fetch this from your API
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [sessionId]);

  if (!isLoaded) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isSignedIn) {
    return <div className="container mx-auto px-4 py-8">Please sign in to view billing.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {sessionId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Subscription Activated!</h3>
                <p className="text-green-700">
                  Welcome to LogiTrack! Your subscription is now active and you have access to all premium features.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>
          
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : subscription ? (
            <div className="space-y-6">
              {/* Current Plan */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-blue-900">{subscription.plan.nickname}</h3>
                      <p className="text-blue-700">
                        ${(subscription.plan.amount / 100).toFixed(2)} / {subscription.plan.interval}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Status: <span className="capitalize">{subscription.status}</span>
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Cycle */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Cycle</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Current Period Start</h3>
                    <p className="text-gray-600">
                      {new Date(subscription.current_period_start * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Next Billing Date</h3>
                    <p className="text-gray-600">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h2>
              <p className="text-gray-600 mb-6">
                You don&apos;t have an active subscription. Choose a plan to get started with LogiTrack.
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                View Pricing Plans
              </a>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Manage Subscription"
            description="Update payment method, change plan, or cancel subscription"
            action="Manage"
            onClick={() => {
              // In a real app, this would open Stripe Customer Portal
              alert('This would open the Stripe Customer Portal to manage your subscription');
            }}
          />
          
          <ActionCard
            title="Download Invoices"
            description="Access and download your billing history"
            action="Download"
            onClick={() => {
              alert('This would open invoice download functionality');
            }}
          />
          
          <ActionCard
            title="Usage & Limits"
            description="View your current usage and plan limits"
            action="View Details"
            onClick={() => {
              alert('This would show detailed usage statistics');
            }}
          />
        </div>

        {/* Support */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h2>
          <p className="text-gray-600 mb-4">
            If you have questions about billing or need to make changes to your subscription, our support team is here to help.
          </p>
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <BillingPageContent />
    </Suspense>
  );
}

function ActionCard({ 
  title, 
  description, 
  action, 
  onClick 
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <button
        onClick={onClick}
        className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
      >
        {action} →
      </button>
    </div>
  );
}