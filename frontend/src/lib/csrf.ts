/**
 * Frontend CSRF Token Management
 * 
 * Utilities for handling CSRF tokens in the frontend application
 */

export interface CSRFTokenResponse {
  success: boolean;
  csrfToken?: string;
  message?: string;
}

// CSRF configuration constants
export const CSRF_CONFIG = {
  HEADER_NAME: 'csrf-token',
  COOKIE_NAME: 'csrf-token',
  TOKEN_ENDPOINT: '/api/csrf-token',
  FIELD_NAME: '_csrf'
} as const;

/**
 * CSRF Token Manager Class
 * Handles fetching, caching, and using CSRF tokens
 */
export class CSRFTokenManager {
  private token: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  /**
   * Get CSRF token from cookie
   */
  private getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_CONFIG.COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Get CSRF token from meta tag
   */
  private getTokenFromMeta(): string | null {
    if (typeof document === 'undefined') return null;
    
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchTokenFromServer(): Promise<string | null> {
    try {
      const response = await fetch(CSRF_CONFIG.TOKEN_ENDPOINT, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CSRFTokenResponse = await response.json();
      
      if (data.success && data.csrfToken) {
        return data.csrfToken;
      } else {
        throw new Error(data.message || 'Failed to get CSRF token');
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token from server:', error);
      return null;
    }
  }

  /**
   * Get CSRF token with caching and multiple fallback sources
   */
  public async getToken(): Promise<string | null> {
    // Return cached token if available
    if (this.token) {
      return this.token;
    }

    // Return existing promise if fetch is in progress
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Start new fetch with fallback chain
    this.tokenPromise = this.fetchToken();
    const token = await this.tokenPromise;
    this.tokenPromise = null;

    return token;
  }

  /**
   * Internal method to fetch token with fallback chain
   */
  private async fetchToken(): Promise<string | null> {
    // Try meta tag first (fastest)
    let token = this.getTokenFromMeta();
    if (token) {
      this.token = token;
      return token;
    }

    // Try cookie next
    token = this.getTokenFromCookie();
    if (token) {
      this.token = token;
      return token;
    }

    // Fetch from server as last resort
    token = await this.fetchTokenFromServer();
    if (token) {
      this.token = token;
      return token;
    }

    return null;
  }

  /**
   * Clear cached token (useful when token becomes invalid)
   */
  public clearToken(): void {
    this.token = null;
    this.tokenPromise = null;
  }

  /**
   * Manually set token (useful for SSR or when token is provided externally)
   */
  public setToken(token: string): void {
    this.token = token;
  }

  /**
   * Check if token is likely valid (basic format validation)
   */
  public isValidToken(token: string): boolean {
    const tokenRegex = /^[A-Za-z0-9+/]+=*$/;
    return typeof token === 'string' && 
           token.length >= 20 && 
           token.length <= 128 && 
           tokenRegex.test(token);
  }
}

// Global CSRF token manager instance
export const csrfTokenManager = new CSRFTokenManager();

/**
 * Enhanced fetch function with automatic CSRF token handling
 */
export async function fetchWithCSRF(
  url: string | URL, 
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  
  // Only add CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    // Only add CSRF for same-origin requests
    const urlStr = typeof url === 'string' ? url : url.toString();
    const isRelativeUrl = urlStr.startsWith('/');
    const isSameOrigin = urlStr.includes(window.location.origin);
    
    if (isRelativeUrl || isSameOrigin) {
      const token = await csrfTokenManager.getToken();
      if (token) {
        options.headers = {
          ...options.headers,
          [CSRF_CONFIG.HEADER_NAME]: token,
        };
      } else {
        console.warn('CSRF token not available for request:', urlStr);
      }
    }
  }

  // Ensure credentials are included for same-origin requests
  if (!options.credentials) {
    options.credentials = 'same-origin';
  }

  return fetch(url, options);
}

/**
 * Add CSRF token to form data
 */
export async function addCSRFToFormData(formData: FormData): Promise<FormData> {
  const token = await csrfTokenManager.getToken();
  if (token) {
    formData.set(CSRF_CONFIG.FIELD_NAME, token);
  }
  return formData;
}

/**
 * Create form data with CSRF token
 */
export async function createFormDataWithCSRF(data: Record<string, any>): Promise<FormData> {
  const formData = new FormData();
  
  // Add all data fields
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  }
  
  // Add CSRF token
  return addCSRFToFormData(formData);
}

/**
 * Add CSRF token to URLSearchParams
 */
export async function addCSRFToURLSearchParams(params: URLSearchParams): Promise<URLSearchParams> {
  const token = await csrfTokenManager.getToken();
  if (token) {
    params.set(CSRF_CONFIG.FIELD_NAME, token);
  }
  return params;
}

/**
 * React hook for using CSRF tokens
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshToken = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      csrfTokenManager.clearToken();
      const newToken = await csrfTokenManager.getToken();
      setToken(newToken);
      
      if (!newToken) {
        setError('Failed to obtain CSRF token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken
  };
}

// Auto-setup CSRF handling when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Override global fetch to automatically include CSRF tokens
  const originalFetch = window.fetch;
  window.fetch = fetchWithCSRF;

  // Add CSRF token to forms on submit
  document.addEventListener('submit', async (event) => {
    const form = event.target as HTMLFormElement;
    if (form.method && form.method.toLowerCase() !== 'get') {
      const token = await csrfTokenManager.getToken();
      if (token) {
        // Remove existing CSRF input if any
        const existingInput = form.querySelector(`input[name="${CSRF_CONFIG.FIELD_NAME}"]`);
        if (existingInput) {
          existingInput.remove();
        }

        // Add CSRF token input
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = CSRF_CONFIG.FIELD_NAME;
        input.value = token;
        form.appendChild(input);
      }
    }
  });
}

// Note: React import is conditional for environments that don't have it
let React: any;
try {
  React = require('react');
} catch {
  // React not available, hook won't work but other functions will
}