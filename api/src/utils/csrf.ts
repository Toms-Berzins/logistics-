/**
 * CSRF Utility Functions
 * 
 * Helper functions for working with CSRF tokens in the application
 */

export interface CSRFTokenResponse {
  success: boolean;
  csrfToken?: string;
  message?: string;
}

/**
 * CSRF Configuration
 */
export const CSRF_CONFIG = {
  // Token header names that the middleware accepts
  HEADER_NAMES: [
    'csrf-token',
    'x-csrf-token', 
    'x-xsrf-token'
  ],
  
  // Form field name for CSRF token
  FIELD_NAME: '_csrf',
  
  // Cookie name for CSRF token (for frontend consumption)
  COOKIE_NAME: 'csrf-token',
  
  // Token expiry (matches session expiry)
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Generate meta tags for CSRF token
 * Used in HTML templates to make tokens available to frontend JavaScript
 */
export const generateCSRFMetaTags = (token: string): string => {
  return `
    <meta name="csrf-param" content="${CSRF_CONFIG.FIELD_NAME}">
    <meta name="csrf-token" content="${token}">
  `.trim();
};

/**
 * Generate CSRF token input field for forms
 */
export const generateCSRFInput = (token: string): string => {
  return `<input type="hidden" name="${CSRF_CONFIG.FIELD_NAME}" value="${token}">`;
};

/**
 * Validate CSRF token format
 * Basic validation to ensure token looks correct
 */
export const isValidTokenFormat = (token: string): boolean => {
  // CSRF tokens should be base64-like strings of reasonable length
  const tokenRegex = /^[A-Za-z0-9+/]+=*$/;
  return typeof token === 'string' && 
         token.length >= 20 && 
         token.length <= 128 && 
         tokenRegex.test(token);
};

/**
 * Extract CSRF token from various sources in order of preference
 */
export const extractCSRFToken = (req: any): string | null => {
  // Check body first
  if (req.body && req.body[CSRF_CONFIG.FIELD_NAME]) {
    return req.body[CSRF_CONFIG.FIELD_NAME];
  }
  
  // Check query parameters
  if (req.query && req.query[CSRF_CONFIG.FIELD_NAME]) {
    return req.query[CSRF_CONFIG.FIELD_NAME];
  }
  
  // Check headers
  for (const headerName of CSRF_CONFIG.HEADER_NAMES) {
    const token = req.headers[headerName] || req.headers[headerName.toLowerCase()];
    if (token) {
      return token as string;
    }
  }
  
  return null;
};

/**
 * CSRF token response formatter
 */
export const formatCSRFResponse = (token: string): CSRFTokenResponse => {
  return {
    success: true,
    csrfToken: token
  };
};

/**
 * CSRF error response formatter
 */
export const formatCSRFError = (message: string): CSRFTokenResponse => {
  return {
    success: false,
    message
  };
};

/**
 * Middleware helper to set CSRF token in cookie
 * This allows frontend to access the token via JavaScript
 */
export const setCSRFCookie = (res: any, token: string): void => {
  res.cookie(CSRF_CONFIG.COOKIE_NAME, token, {
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_CONFIG.TOKEN_EXPIRY
  });
};

/**
 * Get JavaScript code to handle CSRF tokens in frontend
 * This code can be included in HTML pages to automatically handle CSRF
 */
export const getCSRFJavaScript = (): string => {
  return `
(function() {
  'use strict';
  
  // CSRF token management
  let csrfToken = null;
  
  // Get CSRF token from meta tag
  function getCSRFTokenFromMeta() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
  }
  
  // Get CSRF token from cookie
  function getCSRFTokenFromCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '${CSRF_CONFIG.COOKIE_NAME}') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }
  
  // Fetch fresh CSRF token from server
  async function fetchCSRFToken() {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
    return null;
  }
  
  // Get CSRF token with fallback chain
  async function getCSRFToken() {
    if (csrfToken) return csrfToken;
    
    // Try meta tag first
    csrfToken = getCSRFTokenFromMeta();
    if (csrfToken) return csrfToken;
    
    // Try cookie
    csrfToken = getCSRFTokenFromCookie();
    if (csrfToken) return csrfToken;
    
    // Fetch from server as last resort
    csrfToken = await fetchCSRFToken();
    return csrfToken;
  }
  
  // Add CSRF token to fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    // Only add CSRF to same-origin POST requests
    if (options.method && options.method.toUpperCase() !== 'GET') {
      if (typeof url === 'string' && (url.startsWith('/') || url.includes(location.origin))) {
        const token = await getCSRFToken();
        if (token) {
          options.headers = options.headers || {};
          options.headers['${CSRF_CONFIG.HEADER_NAMES[0]}'] = token;
        }
      }
    }
    
    return originalFetch.call(this, url, options);
  };
  
  // Add CSRF token to forms on submit
  document.addEventListener('submit', async function(event) {
    const form = event.target;
    if (form.method && form.method.toLowerCase() !== 'get') {
      const token = await getCSRFToken();
      if (token) {
        // Remove existing CSRF input if any
        const existingInput = form.querySelector('input[name="${CSRF_CONFIG.FIELD_NAME}"]');
        if (existingInput) {
          existingInput.remove();
        }
        
        // Add CSRF token input
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '${CSRF_CONFIG.FIELD_NAME}';
        input.value = token;
        form.appendChild(input);
      }
    }
  });
  
  // Expose function globally for manual use
  window.getCSRFToken = getCSRFToken;
})();
  `.trim();
};