import { test, expect } from '@playwright/test';

test.describe('Payment Methods Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to payment methods page
    await page.goto('/dashboard/payment-methods');
  });

  test('should display payment methods grid layout correctly', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    
    await expect(page.locator('[data-testid="add-new-card"]')).toBeVisible();
    await expect(page.locator('[data-testid*="payment-method-"]')).toHaveCount(3);
    
    // Check grid layout (2 columns on desktop)
    const grid = page.locator('[data-testid*="payment-method-"]').first();
    await expect(grid).toHaveClass(/grid-cols-2/);
  });

  test('should show responsive design on mobile', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('[data-testid="add-new-card"]')).toBeVisible();
    
    // Check single column layout on mobile
    const grid = page.locator('[data-testid*="payment-method-"]').first();
    await expect(grid).toHaveClass(/grid-cols-1/);
    
    // Ensure cards are properly sized (320px width)
    const cardWidth = await page.locator('[data-testid="add-new-card"]').boundingBox();
    expect(cardWidth?.width).toBeCloseTo(320, 20); // Allow 20px tolerance
  });

  test('should display card visualizations with correct branding', async ({ page }) => {
    // Check Visa card
    const visaCard = page.locator('[data-testid="payment-method-1"]');
    await expect(visaCard).toBeVisible();
    await expect(visaCard.locator('text=•••• 4242')).toBeVisible();
    
    // Check Mastercard
    const mastercardCard = page.locator('[data-testid="payment-method-2"]');
    await expect(mastercardCard).toBeVisible();
    await expect(mastercardCard.locator('text=•••• 5555')).toBeVisible();
    
    // Check American Express
    const amexCard = page.locator('[data-testid="payment-method-3"]');
    await expect(amexCard).toBeVisible();
    await expect(amexCard.locator('text=•••• 1234')).toBeVisible();
  });

  test('should show default payment indicator correctly', async ({ page }) => {
    const defaultCard = page.locator('[data-testid="payment-method-1"]');
    
    // Check for default badge
    await expect(defaultCard.locator('text=Default')).toBeVisible();
    
    // Check for star icon
    await expect(defaultCard.locator('svg')).toBeVisible();
  });

  test('should handle card actions dropdown menu', async ({ page }) => {
    const cardActionsButton = page.locator('[data-testid="card-actions-trigger"]').first();
    
    // Click to open dropdown
    await cardActionsButton.click();
    
    // Check menu is visible
    const menu = page.locator('[data-testid="card-actions-menu"]');
    await expect(menu).toBeVisible();
    
    // Check menu items
    await expect(menu.locator('[data-testid="edit-action"]')).toBeVisible();
    await expect(menu.locator('[data-testid="delete-action"]')).toBeVisible();
    
    // For non-default cards, should show "Set as Default"
    const nonDefaultCard = page.locator('[data-testid="payment-method-2"] [data-testid="card-actions-trigger"]');
    await nonDefaultCard.click();
    
    const nonDefaultMenu = page.locator('[data-testid="card-actions-menu"]').last();
    await expect(nonDefaultMenu.locator('[data-testid="set-default-action"]')).toBeVisible();
  });

  test('should open add payment method modal', async ({ page }) => {
    const addCardButton = page.locator('[data-testid="add-new-card"]');
    await addCardButton.click();
    
    // Check modal is visible
    const modal = page.locator('[data-testid="payment-modal"]');
    await expect(modal).toBeVisible();
    
    // Check modal title
    await expect(modal.locator('text=Add New Payment Method')).toBeVisible();
    
    // Check form elements
    await expect(modal.locator('[data-testid="cardholder-name-input"]')).toBeVisible();
    await expect(modal.locator('[data-testid="submit-card-form"]')).toBeVisible();
  });

  test('should handle modal accessibility and focus management', async ({ page }) => {
    const addCardButton = page.locator('[data-testid="add-new-card"]');
    await addCardButton.click();
    
    const modal = page.locator('[data-testid="payment-modal"]');
    await expect(modal).toBeVisible();
    
    // Check initial focus is on close button
    const closeButton = modal.locator('[data-testid="close-modal-button"]');
    await expect(closeButton).toBeFocused();
    
    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should show form validation styling', async ({ page }) => {
    const addCardButton = page.locator('[data-testid="add-new-card"]');
    await addCardButton.click();
    
    const modal = page.locator('[data-testid="payment-modal"]');
    const submitButton = modal.locator('[data-testid="submit-card-form"]');
    
    // Try to submit empty form
    await submitButton.click();
    
    // Check for error styling on cardholder name
    const nameInput = modal.locator('[data-testid="cardholder-name-input"]');
    await expect(nameInput).toHaveClass(/border-red-300/);
    
    // Check error message appears
    await expect(modal.locator('text=Cardholder name is required')).toBeVisible();
  });

  test('should display security indicators', async ({ page }) => {
    // Check main security section
    await expect(page.locator('text=Your payment information is secure')).toBeVisible();
    await expect(page.locator('text=Secured by Stripe')).toBeVisible();
    await expect(page.locator('text=SSL Encrypted')).toBeVisible();
    await expect(page.locator('text=PCI Compliant')).toBeVisible();
    
    // Check security features list
    await expect(page.locator('text=All card information is encrypted and stored securely by Stripe')).toBeVisible();
    await expect(page.locator('text=We never store your complete card number or CVV')).toBeVisible();
    await expect(page.locator('text=PCI DSS Level 1 compliant payment processing')).toBeVisible();
  });

  test('should show delete confirmation modal', async ({ page }) => {
    // Open card actions for non-default card
    const cardActionsButton = page.locator('[data-testid="payment-method-2"] [data-testid="card-actions-trigger"]');
    await cardActionsButton.click();
    
    // Click delete
    const deleteAction = page.locator('[data-testid="delete-action"]');
    await deleteAction.click();
    
    // Check confirmation modal
    const confirmModal = page.locator('[data-testid="confirmation-modal"]');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal.locator('text=Delete Payment Method')).toBeVisible();
    await expect(confirmModal.locator('text=ending in 5555')).toBeVisible();
    
    // Check buttons
    await expect(confirmModal.locator('[data-testid="confirmation-cancel-button"]')).toBeVisible();
    await expect(confirmModal.locator('[data-testid="confirmation-confirm-button"]')).toBeVisible();
  });

  test('should handle loading states correctly', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/payment-methods', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }, 2000);
    });
    
    await page.reload();
    
    // Should show skeleton loading
    await expect(page.locator('.animate-pulse')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForTimeout(3000);
    
    // Should show actual content
    await expect(page.locator('text=Payment Methods')).toBeVisible();
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test touch targets are at least 44px
    const touchTargets = await page.locator('button, [role="button"]').all();
    
    for (const target of touchTargets) {
      const box = await target.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should show card brand icons correctly', async ({ page }) => {
    // Check card brand icons are visible and properly sized (32x20px)
    const brandIcons = page.locator('[data-testid*="payment-method-"] svg');
    const iconCount = await brandIcons.count();
    
    expect(iconCount).toBeGreaterThan(0);
    
    // Check first icon dimensions
    const firstIcon = brandIcons.first();
    const iconBox = await firstIcon.boundingBox();
    
    if (iconBox) {
      expect(iconBox.width).toBeCloseTo(32, 4);
      expect(iconBox.height).toBeCloseTo(20, 4);
    }
  });

  test('should animate card entrance with staggered delays', async ({ page }) => {
    await page.reload();
    
    // Check for animation classes
    const cards = page.locator('[data-testid*="payment-method-"]');
    const cardCount = await cards.count();
    
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      // Cards should have animation classes
      await expect(card).toHaveClass(/animate-in/);
    }
  });

  test('should handle card form with Stripe elements', async ({ page }) => {
    const addCardButton = page.locator('[data-testid="add-new-card"]');
    await addCardButton.click();
    
    const modal = page.locator('[data-testid="payment-modal"]');
    
    // Fill cardholder name
    const nameInput = modal.locator('[data-testid="cardholder-name-input"]');
    await nameInput.fill('John Doe');
    
    // Check Stripe elements are present (they load in iframes)
    await expect(modal.locator('iframe')).toHaveCount(3); // Card number, expiry, CVC
    
    // Check submit button is initially disabled
    const submitButton = modal.locator('[data-testid="submit-card-form"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should maintain proper visual hierarchy', async ({ page }) => {
    // Check heading structure
    await expect(page.locator('h1')).toHaveText('Payment Methods');
    await expect(page.locator('h2')).toHaveText('Saved Payment Methods');
    
    // Check card information hierarchy
    const firstCard = page.locator('[data-testid="payment-method-1"]');
    
    // Last 4 digits should be prominent (text-lg)
    const cardNumber = firstCard.locator('text=•••• 4242');
    await expect(cardNumber).toHaveClass(/text-lg/);
  });

  test('should show error states appropriately', async ({ page }) => {
    // Mock API error
    await page.route('/api/payment-methods/add', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });
    
    // Trigger error condition by attempting to add card
    const addCardButton = page.locator('[data-testid="add-new-card"]');
    await addCardButton.click();
    
    // Fill form and submit
    const modal = page.locator('[data-testid="payment-modal"]');
    const nameInput = modal.locator('[data-testid="cardholder-name-input"]');
    await nameInput.fill('John Doe');
    
    // Should show error message
    await expect(page.locator('text=Failed to add payment method')).toBeVisible();
  });

  test('should have accessible color contrast', async ({ page }) => {
    // Test important text elements have sufficient contrast
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    
    for (let i = 0; i < headingCount; i++) {
      const heading = headings.nth(i);
      // Headings should use dark colors for contrast
      await expect(heading).toHaveClass(/text-gray-900/);
    }
    
    // Check error text has proper contrast
    const errorElements = page.locator('.text-red-600, .text-red-700');
    const errorCount = await errorElements.count();
    
    for (let i = 0; i < errorCount; i++) {
      const error = errorElements.nth(i);
      await expect(error).toBeVisible();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    const firstFocusable = page.locator('[data-testid="add-new-card"]');
    await expect(firstFocusable).toBeFocused();
    
    // Continue tabbing to reach card actions
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to open dropdown with Enter
    await page.keyboard.press('Enter');
    const menu = page.locator('[data-testid="card-actions-menu"]');
    await expect(menu).toBeVisible();
  });
});