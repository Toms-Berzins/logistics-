import type { Preview } from '@storybook/react'
import { themes } from '@storybook/theming'
import '../src/app/globals.css'

// Mock Next.js router for Storybook
import { NextRouter } from 'next/router'

const mockRouter: Partial<NextRouter> = {
  push: () => Promise.resolve(true),
  replace: () => Promise.resolve(true),
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  reload: () => {},
  asPath: '/storybook',
  pathname: '/storybook',
  query: {},
  route: '/storybook',
  basePath: '',
}

// Mock Clerk authentication
const mockUser = {
  id: 'user_storybook',
  firstName: 'Storybook',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'storybook@logistics.com' }],
  imageUrl: 'https://images.clerk.dev/default-avatar.png',
}

const mockAuth = {
  isSignedIn: true,
  isLoaded: true,
  user: mockUser,
  signOut: () => Promise.resolve(),
}

// Setup global mocks
if (typeof window !== 'undefined') {
  ;(window as any).__NEXT_DATA__ = {
    props: {},
    page: '/storybook',
    query: {},
    buildId: 'storybook',
  }

  // Mock router
  require('next/router').__setMockRouter(mockRouter)
  
  // Mock Clerk
  ;(window as any).__clerk_ssr_state = mockAuth
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: themes.light,
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
        wide: {
          name: 'Wide Desktop',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
      defaultViewport: 'desktop',
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'logistics-bg',
          value: '#f8f9fa',
        },
      ],
    },
    layout: 'padded',
  },
  decorators: [
    (Story, context) => {
      // Add visual debugging data attributes
      const storyElement = document.querySelector('#storybook-root')
      if (storyElement) {
        storyElement.setAttribute('data-story', context.title)
        storyElement.setAttribute('data-story-name', context.name)
      }

      return Story()
    },
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
          { value: 'fr', title: 'Français' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Component density for touch/desktop',
      defaultValue: 'comfortable',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compact' },
          { value: 'comfortable', title: 'Comfortable' },
          { value: 'spacious', title: 'Spacious' },
        ],
        dynamicTitle: true,
      },
    },
  },
  tags: ['autodocs'],
}

export default preview