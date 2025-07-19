import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import { setCSRFCookie, formatCSRFResponse, formatCSRFError } from '../utils/csrf';

// Create CSRF token generator
const tokens = new csrf();

// Types are defined in src/types/session.d.ts

// CSRF configuration options
interface CSRFOptions {
  secretLength?: number;
  saltLength?: number;
  ignoreMethods?: string[];
  skipFailedRequests?: boolean;
}

/**
 * CSRF Protection Middleware
 * 
 * Provides Cross-Site Request Forgery protection by:
 * 1. Generating a secret for each session
 * 2. Creating tokens for each request that require CSRF protection
 * 3. Validating tokens on state-changing requests
 */
export class CSRFProtection {
  private tokens: csrf;
  private options: Required<CSRFOptions>;

  constructor(options: CSRFOptions = {}) {
    this.tokens = new csrf();
    this.options = {
      secretLength: options.secretLength || 18,
      saltLength: options.saltLength || 8,
      ignoreMethods: options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS'],
      skipFailedRequests: options.skipFailedRequests || false
    };
  }

  /**
   * Generate or retrieve CSRF secret for the session
   */
  private getSecret(req: Request): string {
    if (!req.session) {
      throw new Error('Session not initialized');
    }
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = this.tokens.secretSync();
    }
    return req.session.csrfSecret;
  }

  /**
   * Create a CSRF token for the current request
   */
  private createToken(req: Request): string {
    const secret = this.getSecret(req);
    return this.tokens.create(secret);
  }

  /**
   * Verify a CSRF token against the session secret
   */
  private verifyToken(req: Request, token: string): boolean {
    const secret = this.getSecret(req);
    return this.tokens.verify(secret, token);
  }

  /**
   * Extract CSRF token from request
   * Checks in order: body._csrf, query._csrf, headers['csrf-token'], headers['x-csrf-token']
   */
  private extractToken(req: Request): string | undefined {
    return (
      req.body && req.body._csrf ||
      req.query && req.query._csrf ||
      req.headers['csrf-token'] ||
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token']
    ) as string | undefined;
  }

  /**
   * Check if request should be ignored based on method
   */
  private shouldIgnoreRequest(req: Request): boolean {
    return this.options.ignoreMethods.includes(req.method.toUpperCase());
  }

  /**
   * CSRF middleware function
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Ensure session exists
      if (!req.session) {
        return next(new Error('CSRF protection requires session middleware'));
      }

      // Add token generation function to request
      req.csrfToken = () => this.createToken(req);

      // Skip validation for ignored methods
      if (this.shouldIgnoreRequest(req)) {
        return next();
      }

      // Extract token from request
      const token = this.extractToken(req);

      if (!token) {
        const error = new Error('CSRF token missing');
        (error as any).code = 'EBADCSRFTOKEN';
        (error as any).status = 403;
        return next(error);
      }

      // Verify token
      if (!this.verifyToken(req, token)) {
        const error = new Error('CSRF token invalid');
        (error as any).code = 'EBADCSRFTOKEN';
        (error as any).status = 403;
        return next(error);
      }

      next();
    };
  }

  /**
   * Middleware to add CSRF token generation function to request
   * This makes the token function available without validation
   */
  public tokenMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Ensure session exists
      if (!req.session) {
        return next(new Error('CSRF protection requires session middleware'));
      }

      // Add token generation function to request
      req.csrfToken = () => this.createToken(req);
      
      // Also add to response locals for template use
      res.locals.csrfToken = req.csrfToken();
      
      next();
    };
  }
}

// Create default CSRF protection instance
export const csrfProtection = new CSRFProtection();

// Export middleware functions
export const csrfMiddleware = csrfProtection.middleware();
export const csrfTokenMiddleware = csrfProtection.tokenMiddleware();

/**
 * CSRF Token endpoint handler
 * Provides an endpoint to fetch CSRF tokens for AJAX requests
 */
export const csrfTokenHandler = (req: Request, res: Response) => {
  if (!req.csrfToken) {
    return res.status(500).json(formatCSRFError('CSRF protection not properly configured'));
  }

  const token = req.csrfToken();
  
  // Set token in cookie for easier frontend access
  setCSRFCookie(res, token);
  
  res.json(formatCSRFResponse(token));
};

/**
 * Error handler for CSRF errors
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  next(err);
};