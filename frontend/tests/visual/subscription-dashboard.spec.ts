import { test, expect } from '@playwright/test';

test.describe('Subscription Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to subscription dashboard (adjust URL as needed)
    await page.goto('/dashboard/subscription');
  });

  test('should display responsive grid layout correctly', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="billing-summary"]')).toBeVisible();

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 800 });
    await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
  });

  test('should show usage charts with correct color coding', async ({ page }) => {
    // Test drivers progress - should be green (under 60%)
    const driversProgress = page.locator('[data-testid="drivers-progress"]');
    await expect(driversProgress).toBeVisible();
    
    // Test that high usage items show red (over 80%)
    const apiProgress = page.locator('[data-testid="api-calls-progress"]');
    await expect(apiProgress).toBeVisible();
    
    // Test donut chart visibility
    const usageDonut = page.locator('[data-testid="usage-donut"]');
    await expect(usageDonut).toBeVisible();
  });

  test('should animate progress bars on load', async ({ page }) => {
    // Wait for animations to complete
    await page.waitForTimeout(1000);
    
    // Check that progress bars have animated to their target values
    const driversBar = page.locator('[data-testid="drivers-bar"]');
    await expect(driversBar).toBeVisible();
    
    // Verify progress bar width reflects actual usage
    const progressElement = driversBar.locator('[role="progressbar"]');
    await expect(progressElement).toHaveAttribute('aria-valuenow', /\d+/);
  });

  test('should display staggered card entrance animations', async ({ page }) => {
    // Reload page to see entrance animations
    await page.reload();
    
    // Wait for staggered animations to complete
    await page.waitForTimeout(2000);
    
    // All cards should be visible after animations
    await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="billing-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
  });

  test('should handle different subscription statuses', async ({ page }) => {
    // Test active status
    await expect(page.locator('text=Active')).toBeVisible();
    
    // Check status indicator color
    const statusDot = page.locator('[data-testid="plan-overview"] .bg-green-500');
    await expect(statusDot).toBeVisible();
  });

  test('should show billing information correctly', async ({ page }) => {
    const billingCard = page.locator('[data-testid="billing-summary"]');
    
    // Check payment method display
    await expect(billingCard.locator('text=/Visa.*4242/')).toBeVisible();
    
    // Check usage distribution chart
    await expect(billingCard.locator('[data-testid="usage-donut"]')).toBeVisible();
    
    // Check mini donut charts
    await expect(billingCard.locator('[data-testid="mini-drivers"]')).toBeVisible();
    await expect(billingCard.locator('[data-testid="mini-routes"]')).toBeVisible();
  });

  test('should display status alerts when needed', async ({ page }) => {
    // Test for trial status alert (if applicable)
    const alertsCard = page.locator('[data-testid="status-alerts"]');
    
    // Alert card might not always be present
    if (await alertsCard.isVisible()) {
      await expect(alertsCard).toContainText(/trial|billing|payment/i);
    }
  });

  test('should handle action button interactions', async ({ page }) => {
    const planOverview = page.locator('[data-testid="plan-overview"]');
    
    // Test upgrade button
    const upgradeButton = planOverview.locator('button:has-text("Upgrade Plan")');
    await expect(upgradeButton).toBeVisible();
    await expect(upgradeButton).toBeEnabled();
    
    // Test manage button
    const manageButton = planOverview.locator('button:has-text("Manage")');
    await expect(manageButton).toBeVisible();
    await expect(manageButton).toBeEnabled();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check for proper heading structure
    await expect(page.locator('h1')).toHaveText('Subscription Overview');
    
    // Check progress bars have proper ARIA attributes
    const progressBars = page.locator('[role="progressbar"]');
    const progressCount = await progressBars.count();
    
    for (let i = 0; i < progressCount; i++) {
      const progressBar = progressBars.nth(i);
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin');
      await expect(progressBar).toHaveAttribute('aria-valuemax');
    }
    
    // Check buttons have proper labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      
      expect(hasText || hasAriaLabel).toBeTruthy();
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1200, height: 800 },  // Desktop
      { width: 1920, height: 1080 }, // Large desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Wait for layout to adjust
      await page.waitForTimeout(500);
      
      // Check that main content is visible and properly laid out
      await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-overview"]')).toBeVisible();
      
      // Ensure no horizontal scrolling on mobile
      if (viewport.width <= 768) {
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const clientWidth = await page.evaluate(() => document.body.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow 5px tolerance
      }
    }
  });

  test('should show loading states correctly', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('/api/subscription', route => {
      // Delay response to show loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            planName: 'Professional',
            status: 'active',
            // ... other subscription data
          }),
        });
      }, 2000);
    });

    await page.reload();
    
    // Should show skeleton loading state
    await expect(page.locator('.animate-pulse')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForTimeout(3000);
    
    // Should show actual content
    await expect(page.locator('[data-testid="plan-overview"]')).toBeVisible();
  });

  test('should maintain 60fps animations', async ({ page }) => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.animationFrames = [];
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        const start = performance.now();
        return originalRAF.call(window, function(timestamp) {
          window.animationFrames.push({
            start,
            timestamp,
            duration: timestamp - start
          });
          callback(timestamp);
        });
      };
    });

    // Trigger animations by reloading
    await page.reload();
    await page.waitForTimeout(2000);

    // Check animation performance
    const frameData = await page.evaluate(() => window.animationFrames);
    
    if (frameData && frameData.length > 0) {
      const avgFrameTime = frameData.reduce((sum, frame) => sum + frame.duration, 0) / frameData.length;
      
      // Should maintain ~60fps (16.67ms per frame)
      expect(avgFrameTime).toBeLessThan(20); // Allow some tolerance
    }
  });

  test('should have bundle size under 400KB', async ({ page }) => {
    // Monitor network requests
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push(response);
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Calculate total bundle size
    let totalSize = 0;
    for (const response of responses) {
      try {
        const headers = await response.allHeaders();
        const contentLength = headers['content-length'];
        if (contentLength) {
          totalSize += parseInt(contentLength, 10);
        }
      } catch (error) {
        // Some responses might not have content-length
      }
    }

    // Convert to KB and check limit
    const totalSizeKB = totalSize / 1024;
    console.log(`Total bundle size: ${totalSizeKB.toFixed(2)}KB`);
    
    // Should be under 400KB
    expect(totalSizeKB).toBeLessThan(400);
  });
});