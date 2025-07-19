import { test, expect, Page } from '@playwright/test'

// Mock data for testing
const mockJobs = [
  {
    id: 'JOB-001',
    customer: 'Acme Corp',
    pickup: {
      address: '123 Main St, New York, NY',
      coordinates: [-74.006, 40.7128],
      scheduledTime: '2025-01-20T10:00:00Z',
      contactName: 'John Doe',
      contactPhone: '+1-555-0123'
    },
    dropoff: {
      address: '456 Broadway, New York, NY',
      coordinates: [-73.986, 40.7589],
      scheduledTime: '2025-01-20T11:00:00Z',
      contactName: 'Jane Smith',
      contactPhone: '+1-555-0456'
    },
    status: 'pending',
    assignedDriver: null,
    priority: 'high',
    estimatedTime: {
      pickup: '2025-01-20T10:00:00Z',
      delivery: '2025-01-20T11:00:00Z',
      duration: 60
    },
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-01-20T09:00:00Z'
  },
  {
    id: 'JOB-002',
    customer: 'Tech Solutions Inc',
    pickup: {
      address: '789 5th Ave, New York, NY',
      coordinates: [-73.975, 40.764],
      scheduledTime: '2025-01-20T14:00:00Z'
    },
    dropoff: {
      address: '321 Park Ave, New York, NY',
      coordinates: [-73.962, 40.768],
      scheduledTime: '2025-01-20T15:30:00Z'
    },
    status: 'assigned',
    assignedDriver: {
      id: 'DRV-001',
      name: 'Mike Johnson',
      status: 'en-route',
      vehicle: { type: 'van', licensePlate: 'NYC-123' }
    },
    priority: 'medium',
    estimatedTime: {
      pickup: '2025-01-20T14:00:00Z',
      delivery: '2025-01-20T15:30:00Z',
      duration: 90
    },
    createdAt: '2025-01-20T13:00:00Z',
    updatedAt: '2025-01-20T13:30:00Z'
  }
]

const mockDrivers = [
  {
    id: 'DRV-001',
    name: 'Mike Johnson',
    phone: '+1-555-0001',
    email: 'mike@logistics.com',
    status: 'en-route',
    vehicle: { type: 'van', licensePlate: 'NYC-123' }
  },
  {
    id: 'DRV-002',
    name: 'Sarah Wilson',
    phone: '+1-555-0002',
    email: 'sarah@logistics.com',
    status: 'available',
    vehicle: { type: 'truck', licensePlate: 'NYC-456' }
  }
]

// Helper to setup page with mock data
async function setupPage(page: Page, viewport?: { width: number; height: number }) {
  if (viewport) {
    await page.setViewportSize(viewport)
  }

  // Mock API responses
  await page.route('**/api/jobs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockJobs)
    })
  })

  await page.route('**/api/drivers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDrivers)
    })
  })

  // Navigate to jobs table page
  await page.goto('/dashboard/jobs')
  await page.waitForLoadState('networkidle')
}

test.describe('Active Jobs Table - Visual Tests', () => {
  test('renders empty state correctly', async ({ page }) => {
    await page.route('**/api/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/dashboard/jobs')
    await page.waitForLoadState('networkidle')

    // Take screenshot of empty state
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('empty-state.png')
  })

  test('renders loading state correctly', async ({ page }) => {
    // Delay the API response to capture loading state
    await page.route('**/api/jobs', async (route) => {
      await page.waitForTimeout(2000)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJobs)
      })
    })

    await page.goto('/dashboard/jobs')
    
    // Capture loading state
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('loading-state.png')
  })

  test('renders desktop table with jobs correctly', async ({ page }) => {
    await setupPage(page, { width: 1280, height: 800 })

    // Wait for jobs to load
    await expect(page.locator('text=JOB-001')).toBeVisible()
    await expect(page.locator('text=JOB-002')).toBeVisible()

    // Take full table screenshot
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('desktop-table-with-jobs.png')
  })

  test('renders mobile view correctly', async ({ page }) => {
    await setupPage(page, { width: 375, height: 667 }) // iPhone dimensions

    // Wait for mobile cards to load
    await expect(page.locator('[data-testid="mobile-job-card"]').first()).toBeVisible()

    // Take mobile view screenshot
    await expect(page.locator('[data-testid="mobile-jobs-list"]')).toHaveScreenshot('mobile-job-cards.png')
  })

  test('renders tablet view correctly', async ({ page }) => {
    await setupPage(page, { width: 768, height: 1024 }) // iPad dimensions

    // Should show condensed table or mobile view
    await page.waitForLoadState('networkidle')
    
    await expect(page.locator('[data-testid="jobs-container"]')).toHaveScreenshot('tablet-view.png')
  })

  test('shows status badges with correct colors', async ({ page }) => {
    await setupPage(page)

    // Wait for status badges to be visible
    await expect(page.locator('[data-testid="status-badge-pending"]')).toBeVisible()
    await expect(page.locator('[data-testid="status-badge-assigned"]')).toBeVisible()

    // Take screenshot focusing on status badges
    await expect(page.locator('[data-testid="status-badges-container"]')).toHaveScreenshot('status-badges.png')
  })

  test('shows priority badges correctly', async ({ page }) => {
    await setupPage(page)

    // Check different priority badges
    await expect(page.locator('[data-testid="priority-badge-high"]')).toBeVisible()
    await expect(page.locator('[data-testid="priority-badge-medium"]')).toBeVisible()

    await expect(page.locator('[data-testid="priority-badges-container"]')).toHaveScreenshot('priority-badges.png')
  })

  test('shows drag and drop states correctly', async ({ page }) => {
    await setupPage(page)

    // Start dragging a driver badge
    const driverBadge = page.locator('[data-testid="draggable-driver-badge"]').first()
    await driverBadge.hover()
    
    // Capture hover state
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('driver-badge-hover.png')

    // Simulate drag start (visual feedback)
    await driverBadge.dispatchEvent('dragstart')
    await page.waitForTimeout(100)
    
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('drag-in-progress.png')
  })

  test('shows search and filter interface', async ({ page }) => {
    await setupPage(page)

    // Focus on search input
    await page.locator('[data-testid="jobs-search-input"]').focus()
    await page.locator('[data-testid="jobs-search-input"]').fill('Acme')

    // Open filter dropdown if it exists
    const filterButton = page.locator('[data-testid="filter-button"]')
    if (await filterButton.isVisible()) {
      await filterButton.click()
    }

    await expect(page.locator('[data-testid="search-filter-interface"]')).toHaveScreenshot('search-and-filters.png')
  })

  test('shows bulk selection interface', async ({ page }) => {
    await setupPage(page)

    // Select multiple jobs
    await page.locator('[data-testid="job-checkbox"]').first().check()
    await page.locator('[data-testid="job-checkbox"]').nth(1).check()

    // Wait for bulk actions toolbar to appear
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible()

    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toHaveScreenshot('bulk-selection.png')
  })

  test('shows websocket connection status', async ({ page }) => {
    await setupPage(page)

    // Check connection status indicator
    await expect(page.locator('[data-testid="websocket-status"]')).toBeVisible()

    // Test both connected and disconnected states
    await expect(page.locator('[data-testid="websocket-status"]')).toHaveScreenshot('websocket-connected.png')

    // Simulate disconnection
    await page.evaluate(() => {
      // Mock websocket disconnection
      window.dispatchEvent(new CustomEvent('websocket-disconnect'))
    })

    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="websocket-status"]')).toHaveScreenshot('websocket-disconnected.png')
  })

  test('handles 500+ jobs performance test', async ({ page }) => {
    // Generate large dataset
    const largeJobsDataset = Array.from({ length: 500 }, (_, i) => ({
      ...mockJobs[0],
      id: `JOB-${String(i + 1).padStart(3, '0')}`,
      customer: `Customer ${i + 1}`,
      createdAt: new Date(Date.now() - i * 60000).toISOString()
    }))

    await page.route('**/api/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeJobsDataset)
      })
    })

    await page.goto('/dashboard/jobs')
    await page.waitForLoadState('networkidle')

    // Wait for virtualization to kick in
    await page.waitForTimeout(1000)

    // Scroll to test virtualization
    await page.locator('[data-testid="virtualized-table"]').hover()
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)

    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('large-dataset-500-jobs.png')
  })

  test('shows mobile swipe gestures interface', async ({ page }) => {
    await setupPage(page, { width: 375, height: 667 })

    // Wait for mobile cards
    const jobCard = page.locator('[data-testid="mobile-job-card"]').first()
    await expect(jobCard).toBeVisible()

    // Simulate swipe gesture visualization
    await jobCard.hover()
    
    // Take screenshot showing swipe indicators
    await expect(page.locator('[data-testid="mobile-jobs-list"]')).toHaveScreenshot('mobile-swipe-interface.png')
  })

  test('shows accessibility focus states', async ({ page }) => {
    await setupPage(page)

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    
    // Capture focus on first focusable element
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('keyboard-focus-first.png')

    // Navigate to job row
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('keyboard-focus-job-row.png')
  })

  test('shows high contrast mode compatibility', async ({ page }) => {
    // Enable high contrast mode simulation
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    
    await setupPage(page)

    // Test with high contrast
    await expect(page.locator('[data-testid="jobs-table"]')).toHaveScreenshot('high-contrast-mode.png')
  })

  test('shows responsive breakpoint transitions', async ({ page }) => {
    await setupPage(page, { width: 1280, height: 800 })
    
    // Desktop view
    await expect(page.locator('[data-testid="jobs-container"]')).toHaveScreenshot('breakpoint-desktop.png')

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="jobs-container"]')).toHaveScreenshot('breakpoint-tablet.png')

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="jobs-container"]')).toHaveScreenshot('breakpoint-mobile.png')
  })
})

test.describe('Active Jobs Table - Interaction Tests', () => {
  test('drag and drop driver assignment works', async ({ page }) => {
    await setupPage(page)

    // Drag driver to unassigned job
    const driverBadge = page.locator('[data-testid="draggable-driver-badge"]').first()
    const unassignedJob = page.locator('[data-testid="job-row-unassigned"]').first()

    await driverBadge.dragTo(unassignedJob)
    
    // Verify assignment happened
    await expect(page.locator('[data-testid="assignment-success-feedback"]')).toBeVisible()
  })

  test('keyboard shortcuts work correctly', async ({ page }) => {
    await setupPage(page)

    // Select a job
    await page.locator('[data-testid="job-checkbox"]').first().check()

    // Test Ctrl+D for dispatch
    await page.keyboard.press('Control+d')
    await expect(page.locator('[data-testid="dispatch-modal"]')).toBeVisible()

    // Test Ctrl+R for reassign
    await page.keyboard.press('Escape') // Close modal
    await page.keyboard.press('Control+r')
    await expect(page.locator('[data-testid="reassign-modal"]')).toBeVisible()
  })

  test('search functionality works', async ({ page }) => {
    await setupPage(page)

    // Search for specific job
    await page.locator('[data-testid="jobs-search-input"]').fill('Acme')
    await page.waitForTimeout(300) // Debounce delay

    // Verify filtering
    await expect(page.locator('text=Acme Corp')).toBeVisible()
    await expect(page.locator('text=Tech Solutions Inc')).not.toBeVisible()
  })

  test('sorting works correctly', async ({ page }) => {
    await setupPage(page)

    // Click on Customer column header to sort
    await page.locator('[data-testid="column-header-customer"]').click()
    
    // Verify sorting applied
    const firstCustomer = await page.locator('[data-testid="customer-cell"]').first().textContent()
    expect(firstCustomer).toBe('Acme Corp') // Should be alphabetically first
  })
})