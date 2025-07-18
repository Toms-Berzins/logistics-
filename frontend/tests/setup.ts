import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
process.env.CLERK_SECRET_KEY = 'sk_test_123';

// Mock Clerk backend
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn(),
      updateUserMetadata: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn()
    },
    organizations: {
      getOrganization: vi.fn(),
      getOrganizationList: vi.fn(),
      getOrganizationMembership: vi.fn(),
      updateOrganizationMetadata: vi.fn(),
      createOrganization: vi.fn()
    },
    sessions: {
      createSession: vi.fn(),
      getSession: vi.fn(),
      revokeSession: vi.fn()
    }
  }))
}));

// Mock Clerk NextJS
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useSession: vi.fn(),
  authMiddleware: vi.fn()
}));

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.performance
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock window.navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'test',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});