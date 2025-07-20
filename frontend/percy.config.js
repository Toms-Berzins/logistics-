module.exports = {
  version: 2,
  discovery: {
    allowedHostnames: ['localhost'],
    networkIdleTimeout: 500,
    disableCache: false
  },
  snapshot: {
    widths: [375, 768, 1280, 1920],
    minHeight: 1024,
    percyCSS: `
      /* Hide dynamic content that changes between snapshots */
      [data-testid*="timestamp"],
      [data-testid*="random"],
      .animate-pulse,
      .animate-spin {
        animation: none !important;
      }
      
      /* Standardize cursor for consistent snapshots */
      * {
        cursor: default !important;
      }
      
      /* Hide scrollbars */
      ::-webkit-scrollbar {
        display: none;
      }
      
      /* Ensure fonts are loaded */
      * {
        font-display: block;
      }
    `
  },
  storybook: {
    url: 'http://localhost:6006',
    waitForTimeout: 15000,
    waitForSelector: '[data-story]',
    additionalSnapshots: [
      {
        prefix: 'Mobile - ',
        widths: [375],
        minHeight: 667
      },
      {
        prefix: 'Tablet - ',
        widths: [768],
        minHeight: 1024
      },
      {
        prefix: 'Desktop - ',
        widths: [1280, 1920],
        minHeight: 800
      }
    ]
  },
  // Percy project settings
  defer: {
    enabled: true,
    assumeComplete: true
  }
}