import { test, expect } from '@playwright/test';

test.describe('Bundle Size Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to load main application bundle
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard bundle size should be under 400KB', async ({ page }) => {
    // Monitor network requests for JS and CSS files
    const responses: any[] = [];
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
        // Some responses might not have content-length header
        console.warn(`Could not get size for ${response.url()}`);
      }
    }

    // Convert to KB and check limit
    const totalSizeKB = totalSize / 1024;
    console.log(`Dashboard bundle size: ${totalSizeKB.toFixed(2)}KB`);
    
    // Should be under 400KB for good performance
    expect(totalSizeKB).toBeLessThan(400);
  });

  test('pricing page bundle size should be under 300KB', async ({ page }) => {
    // Monitor network requests for JS and CSS files
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push(response);
      }
    });

    await page.goto('/pricing');
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
        // Some responses might not have content-length header
        console.warn(`Could not get size for ${response.url()}`);
      }
    }

    // Convert to KB and check limit
    const totalSizeKB = totalSize / 1024;
    console.log(`Pricing page bundle size: ${totalSizeKB.toFixed(2)}KB`);
    
    // Pricing page should be lighter than dashboard
    expect(totalSizeKB).toBeLessThan(300);
  });

  test('initial page load time should be under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('subscription components should render within 1 second', async ({ page }) => {
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    
    // Wait for key subscription elements to be visible
    await expect(page.locator('[data-testid="subscription-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-metrics"]')).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    console.log(`Subscription components render time: ${renderTime}ms`);
    
    // Should render within 1 second
    expect(renderTime).toBeLessThan(1000);
  });
});