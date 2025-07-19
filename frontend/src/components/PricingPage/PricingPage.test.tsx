import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PricingPage } from './PricingPage';
import { useUser, useOrganization } from '@clerk/nextjs';

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

const mockUseUser = useUser as vi.MockedFunction<typeof useUser>;
const mockUseOrganization = useOrganization as vi.MockedFunction<typeof useOrganization>;

describe('PricingPage', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' } as any,
      isSignedIn: true,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123' } as any,
      isLoaded: true,
    } as any);

    // Mock fetch for checkout session
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://checkout.stripe.com/test' }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders pricing page with three pricing cards', () => {
    render(<PricingPage />);
    
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('displays billing toggle with monthly and annual options', () => {
    render(<PricingPage />);
    
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('20% off')).toBeInTheDocument();
  });

  it('switches between monthly and annual billing', async () => {
    render(<PricingPage />);
    
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    const monthlyButton = screen.getByRole('radio', { name: /monthly billing/i });
    
    // Monthly should be selected by default
    expect(monthlyButton).toHaveAttribute('aria-checked', 'true');
    expect(annualButton).toHaveAttribute('aria-checked', 'false');
    
    // Click annual
    fireEvent.click(annualButton);
    
    await waitFor(() => {
      expect(annualButton).toHaveAttribute('aria-checked', 'true');
      expect(monthlyButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('shows popular badge on professional plan', () => {
    render(<PricingPage />);
    
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('displays feature icons correctly', () => {
    render(<PricingPage />);
    
    // Should have checkmark icons for included features
    const checkIcons = document.querySelectorAll('svg');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<PricingPage isLoading={true} />);
    
    // Should show loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles plan selection for authenticated users', async () => {
    render(<PricingPage />);
    
    const starterButton = screen.getByRole('button', { name: /get starter/i });
    fireEvent.click(starterButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'starter',
          billingCycle: 'monthly',
          organizationId: 'org-123',
          userId: 'user-123',
        }),
      });
    });
  });

  it('shows current plan badge when user has active subscription', () => {
    render(<PricingPage currentPlan="professional" />);
    
    // Professional plan should show as current
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  it('supports keyboard navigation between cards', () => {
    render(<PricingPage />);
    
    const pricingCards = screen.getAllByRole('article');
    expect(pricingCards).toHaveLength(3);
    
    // Cards should be focusable
    pricingCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('provides proper accessibility labels and descriptions', () => {
    render(<PricingPage />);
    
    // Check for ARIA labels
    expect(screen.getByRole('group', { name: /pricing plans/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /billing cycle selection/i })).toBeInTheDocument();
    
    // Check for plan descriptions
    expect(screen.getByText(/starter plan costs/i)).toBeInTheDocument();
    expect(screen.getByText(/professional plan costs/i)).toBeInTheDocument();
    expect(screen.getByText(/enterprise plan costs/i)).toBeInTheDocument();
  });

  it('calculates annual pricing with discount correctly', async () => {
    render(<PricingPage />);
    
    // Switch to annual billing
    const annualButton = screen.getByRole('radio', { name: /annual billing/i });
    fireEvent.click(annualButton);
    
    await waitFor(() => {
      // Should show discounted prices
      expect(screen.getByText(/save.*\/mo/i)).toBeInTheDocument();
      expect(screen.getByText(/billed annually/i)).toBeInTheDocument();
    });
  });

  it('handles unauthenticated users by redirecting to sign-in', async () => {
    mockUseUser.mockReturnValue({
      user: null,
      isSignedIn: false,
      isLoaded: true,
    } as any);

    mockUseOrganization.mockReturnValue({
      organization: null,
      isLoaded: true,
    } as any);

    // Mock window.location.href
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(<PricingPage />);
    
    const starterButton = screen.getByRole('button', { name: /get starter/i });
    fireEvent.click(starterButton);
    
    await waitFor(() => {
      expect(mockLocation.href).toBe('/sign-in');
    });
  });
});