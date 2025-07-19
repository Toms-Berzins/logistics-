import { test, expect } from '@playwright/test';

test.describe('Pricing Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('pricing cards layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Wait for pricing cards to be visible
    await expect(page.locator('[data-pricing-card]')).toHaveCount(3);
    
    // Check that cards are displayed in a row on desktop
    const cards = page.locator('[data-pricing-card]');
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    const thirdCard = cards.nth(2);
    
    await expect(firstCard).toBeVisible();
    await expect(secondCard).toBeVisible();
    await expect(thirdCard).toBeVisible();
    
    // Verify horizontal layout (cards should be side by side)
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    const thirdCardBox = await thirdCard.boundingBox();
    
    expect(firstCardBox!.x).toBeLessThan(secondCardBox!.x);
    expect(secondCardBox!.x).toBeLessThan(thirdCardBox!.x);
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('pricing-desktop-layout.png');
  });

  test('pricing cards hover states', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    const professionalCard = page.locator('[data-pricing-card="professional"]');
    
    // Take screenshot before hover
    await expect(page).toHaveScreenshot('pricing-before-hover.png');
    
    // Hover over professional card (most popular)
    await professionalCard.hover();
    
    // Wait for hover animation
    await page.waitForTimeout(300);
    
    // Take screenshot with hover state
    await expect(page).toHaveScreenshot('pricing-card-hover.png');
  });

  test('mobile responsive stacking', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for responsive layout
    await page.waitForTimeout(500);
    
    const cards = page.locator('[data-pricing-card]');
    
    // Verify all cards are still visible
    await expect(cards).toHaveCount(3);
    
    // Check vertical stacking on mobile
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    const thirdCard = cards.nth(2);
    
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    const thirdCardBox = await thirdCard.boundingBox();
    
    // Cards should be stacked vertically (y position should increase)
    expect(firstCardBox!.y).toBeLessThan(secondCardBox!.y);
    expect(secondCardBox!.y).toBeLessThan(thirdCardBox!.y);
    
    // Take screenshot for mobile layout
    await expect(page).toHaveScreenshot('pricing-mobile-layout.png');
  });

  test('tablet responsive layout', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForTimeout(500);
    
    const cards = page.locator('[data-pricing-card]');
    await expect(cards).toHaveCount(3);
    
    // Take screenshot for tablet layout
    await expect(page).toHaveScreenshot('pricing-tablet-layout.png');
  });

  test('billing toggle interaction', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    const monthlyButton = page.locator('button:has-text("Monthly")');
    const annualButton = page.locator('button:has-text("Annual")');
    
    // Verify monthly is selected by default
    await expect(monthlyButton).toHaveClass(/text-blue-600/);
    
    // Take screenshot with monthly selected
    await expect(page).toHaveScreenshot('billing-toggle-monthly.png');
    
    // Click annual button
    await annualButton.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Verify annual is now selected
    await expect(annualButton).toHaveClass(/text-blue-600/);
    
    // Take screenshot with annual selected
    await expect(page).toHaveScreenshot('billing-toggle-annual.png');
  });

  test('popular badge visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Check that professional plan has "Most Popular" badge
    const professionalCard = page.locator('[data-pricing-card="professional"]');
    const popularBadge = professionalCard.locator('text=Most Popular');
    
    await expect(popularBadge).toBeVisible();
    
    // Verify badge positioning
    const badgeBox = await popularBadge.boundingBox();
    const cardBox = await professionalCard.boundingBox();
    
    // Badge should be positioned at the top-right of the card
    expect(badgeBox!.y).toBeLessThan(cardBox!.y + 10); // Near the top
    expect(badgeBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width - 100); // Near the right
  });

  test('loading skeleton states', async ({ page }) => {
    // Mock slow API response to see loading states
    await page.route('/api/pricing', async route => {
      await page.waitForTimeout(2000); // Simulate slow response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plans: [] }),
      });
    });
    
    await page.goto('/pricing?loading=true');
    
    // Check for skeleton loading elements
    await expect(page.locator('.animate-pulse')).toHaveCount.atLeast(3);
    
    // Take screenshot of loading state
    await expect(page).toHaveScreenshot('pricing-loading-skeleton.png');
  });

  test('accessibility focus states', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Tab through pricing cards
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Find focused element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Take screenshot showing focus ring
    await expect(page).toHaveScreenshot('pricing-focus-state.png');
  });

  test('feature comparison icons', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Check for checkmark icons (included features)
    const checkIcons = page.locator('svg').filter({ hasText: '' }).first(); // CheckIcon
    await expect(checkIcons).toBeVisible();
    
    // Check for X mark icons (excluded features)
    const xIcons = page.locator('svg').filter({ hasText: '' }).first(); // XMarkIcon
    
    // Verify color coding
    await expect(page.locator('.text-green-500')).toBeVisible(); // Included features
    await expect(page.locator('.text-red-400')).toBeVisible(); // Excluded features
  });
});

test.describe('Pricing Page Performance', () => {
  test('page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('bundle size check', async ({ page }) => {
    // Monitor network requests
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url(),
          size: response.headers()['content-length'],
        });
      }
    });
    
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Calculate total bundle size
    const totalSize = responses.reduce((sum, response) => {
      return sum + (parseInt(response.size) || 0);
    }, 0);
    
    // Should be under 500KB
    expect(totalSize).toBeLessThan(500 * 1024);
  });
});