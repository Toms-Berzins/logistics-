import { test, expect } from '@playwright/test';

test.describe('KPI Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display KPI dashboard with all metrics', async ({ page }) => {
    await expect(page.locator('[data-testid="kpi-overview"]')).toBeVisible();
    
    await expect(page.locator('text=KPI Dashboard')).toBeVisible();
    
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    await expect(metricCards).toHaveCount(8);
    
    for (let i = 0; i < 8; i++) {
      const card = metricCards.nth(i);
      await expect(card).toBeVisible();
      await expect(card.locator('.font-bold')).toBeVisible(); // Value
      await expect(card.locator('text=%')).toBeVisible(); // Change percentage
    }
  });

  test('should show loading state', async ({ page }) => {
    await page.route('/api/analytics/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.reload();
    await expect(page.locator('.animate-pulse')).toBeVisible();
    
    const skeletonCards = page.locator('.animate-pulse');
    await expect(skeletonCards).toHaveCount(8);
  });

  test('should handle error state gracefully', async ({ page }) => {
    await page.route('/api/analytics/**', route => 
      route.fulfill({ status: 500, body: 'Server Error' })
    );

    await page.reload();
    await expect(page.locator('text=Failed to load analytics data')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const grid = page.locator('[data-testid="kpi-grid"]');
    await expect(grid).toHaveCSS('grid-template-columns', '1fr');
    
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    for (let i = 0; i < Math.min(4, await metricCards.count()); i++) {
      const card = metricCards.nth(i);
      const boundingBox = await card.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const grid = page.locator('[data-testid="kpi-grid"]');
    await expect(grid).toHaveCSS('grid-template-columns', 'repeat(2, minmax(0, 1fr))');
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const grid = page.locator('[data-testid="kpi-grid"]');
    await expect(grid).toHaveCSS('grid-template-columns', 'repeat(4, minmax(0, 1fr))');
  });

  test('should open drill-down modal when metric is clicked', async ({ page }) => {
    const firstMetricCard = page.locator('[data-testid^="metric-card-"]').first();
    await firstMetricCard.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Details')).toBeVisible();
    
    const closeButton = modal.locator('button[aria-label="Close modal"]');
    await expect(closeButton).toBeVisible();
  });

  test('should close drill-down modal with Escape key', async ({ page }) => {
    const firstMetricCard = page.locator('[data-testid^="metric-card-"]').first();
    await firstMetricCard.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should display trend charts in drill-down modal', async ({ page }) => {
    const firstMetricCard = page.locator('[data-testid^="metric-card-"]').first();
    await firstMetricCard.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    const trendChart = modal.locator('[data-testid="trend-chart"]');
    await expect(trendChart).toBeVisible();
    
    const summaryCards = modal.locator('.bg-gray-50');
    await expect(summaryCards).toHaveCount(4);
  });

  test('should export data functionality', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    const exportButton = page.locator('button:has-text("Export")');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/kpi-dashboard-.*\.csv$/);
  });

  test('should refresh data', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();
    
    await expect(refreshButton.locator('.animate-spin')).toBeVisible();
    
    await page.waitForTimeout(1000);
    await expect(refreshButton.locator('.animate-spin')).not.toBeVisible();
  });

  test('should change time range', async ({ page }) => {
    const timeRangeSelect = page.locator('select[aria-label="Select time range"]');
    
    await timeRangeSelect.selectOption('30d');
    await expect(timeRangeSelect).toHaveValue('30d');
    
    await timeRangeSelect.selectOption('90d');
    await expect(timeRangeSelect).toHaveValue('90d');
  });

  test('should display performance indicators correctly', async ({ page }) => {
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    
    for (let i = 0; i < Math.min(4, await metricCards.count()); i++) {
      const card = metricCards.nth(i);
      
      const performanceIndicator = card.locator('.w-3.h-3.rounded-full');
      await expect(performanceIndicator).toBeVisible();
      
      const progressBar = card.locator('.bg-gray-200.rounded-full .h-full.rounded-full');
      await expect(progressBar).toBeVisible();
    }
  });

  test('should show proper accessibility attributes', async ({ page }) => {
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    
    for (let i = 0; i < Math.min(3, await metricCards.count()); i++) {
      const card = metricCards.nth(i);
      
      await expect(card).toHaveAttribute('role', 'button');
      await expect(card).toHaveAttribute('tabindex', '0');
      
      const ariaLabel = await card.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('metric');
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const metricCard = page.locator('[data-testid^="metric-card-"]:focus');
    if (await metricCard.count() > 0) {
      await page.keyboard.press('Enter');
      
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
    }
  });

  test('should show real-time status indicator', async ({ page }) => {
    const liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible();
    
    const pulsingDot = page.locator('.animate-pulse.bg-green-500');
    await expect(pulsingDot).toBeVisible();
  });

  test('should display last updated timestamp', async ({ page }) => {
    const lastUpdated = page.locator('text=Last updated:');
    await expect(lastUpdated).toBeVisible();
    
    const timestamp = page.locator('text=/Last updated: .*\\d{2}:\\d{2}:\\d{2}/');
    await expect(timestamp).toBeVisible();
  });

  test('should handle high contrast mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    
    for (let i = 0; i < Math.min(2, await metricCards.count()); i++) {
      const card = metricCards.nth(i);
      await expect(card).toBeVisible();
      
      const bgColor = await card.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).toBeTruthy();
    }
  });

  test('should animate metric cards on load', async ({ page }) => {
    await page.reload();
    
    const firstCard = page.locator('[data-testid^="metric-card-"]').first();
    
    await expect(firstCard).toHaveClass(/animate-in/);
    
    await page.waitForTimeout(500);
    
    const cards = page.locator('[data-testid^="metric-card-"]');
    for (let i = 0; i < Math.min(4, await cards.count()); i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });
});