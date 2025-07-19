import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PricingPageRoute from '../../app/pricing/page';

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useOrganization: vi.fn(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the pricing page components to avoid deep dependency issues
vi.mock('../PricingPage/PricingPage', () => ({
  PricingPage: ({ isLoading, currentPlan }: any) => (
    <div data-testid="pricing-page">
      <h1>Choose Your Plan</h1>
      <div data-testid="loading">{isLoading ? 'Loading...' : 'Ready'}</div>
      <div data-testid="current-plan">{currentPlan || 'No current plan'}</div>
      
      {/* Mock pricing cards */}
      <div data-testid="pricing-cards">
        <div data-testid="starter-card">Starter Plan</div>
        <div data-testid="professional-card">Professional Plan</div>
        <div data-testid="enterprise-card">Enterprise Plan</div>
      </div>

      {/* Mock billing toggle */}
      <div data-testid="billing-toggle">
        <button data-testid="monthly-btn">Monthly</button>
        <button data-testid="annual-btn">Annual</button>
      </div>
    </div>
  ),
}));

import { useUser, useOrganization } from '@clerk/nextjs';

const mockUseUser = useUser as vi.MockedFunction<typeof useUser>;
const mockUseOrganization = useOrganization as vi.MockedFunction<typeof useOrganization>;

describe('Pricing Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when Clerk data is not loaded', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isSignedIn: false,
      isLoaded: false,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: null,
      isLoaded: false,
    } as any);

    render(<PricingPageRoute />);
    
    // Should show loading spinner
    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  it('renders pricing page when Clerk data is loaded', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' },
      isSignedIn: true,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123' },
      isLoaded: true,
    } as any);

    render(<PricingPageRoute />);
    
    // Should render the pricing page
    await waitFor(() => {
      expect(screen.getByTestId('pricing-page')).toBeInTheDocument();
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    });
  });

  it('shows current plan when organization has subscription', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' },
      isSignedIn: true,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: { 
        id: 'org-123',
        privateMetadata: {
          subscriptionTier: 'professional'
        }
      },
      isLoaded: true,
    } as any);

    render(<PricingPageRoute />);
    
    // Wait for loading to complete and check current plan
    await waitFor(() => {
      expect(screen.getByTestId('current-plan')).toHaveTextContent('professional');
    }, { timeout: 2000 });
  });

  it('handles loading state correctly', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' },
      isSignedIn: true,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123' },
      isLoaded: true,
    } as any);

    render(<PricingPageRoute />);
    
    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    
    // Should finish loading after timeout
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    }, { timeout: 2000 });
  });

  it('renders all required pricing components', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' },
      isSignedIn: true,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123' },
      isLoaded: true,
    } as any);

    render(<PricingPageRoute />);
    
    await waitFor(() => {
      // Check for pricing cards
      expect(screen.getByTestId('pricing-cards')).toBeInTheDocument();
      expect(screen.getByTestId('starter-card')).toBeInTheDocument();
      expect(screen.getByTestId('professional-card')).toBeInTheDocument();
      expect(screen.getByTestId('enterprise-card')).toBeInTheDocument();
      
      // Check for billing toggle
      expect(screen.getByTestId('billing-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-btn')).toBeInTheDocument();
      expect(screen.getByTestId('annual-btn')).toBeInTheDocument();
    });
  });
});