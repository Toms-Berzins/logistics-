import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class SubscriptionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, 'SUBSCRIPTION_ERROR', details);
  }
}

export class UsageLimitError extends AppError {
  constructor(limitType: string, current: number, limit: number) {
    super(
      `Usage limit exceeded for ${limitType}`,
      403,
      'USAGE_LIMIT_ERROR',
      { limitType, current, limit }
    );
  }
}

export class StripeError extends AppError {
  constructor(message: string, stripeError?: any) {
    super(message, 400, 'STRIPE_ERROR', {
      stripeCode: stripeError?.code,
      stripeType: stripeError?.type,
      stripeDeclineCode: stripeError?.decline_code
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR', {
      originalError: originalError?.message,
      sqlState: originalError?.code
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode: number = 503) {
    super(`${service} service error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

// Error response formatter
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

export const formatErrorResponse = (
  error: AppError | Error,
  req: Request,
  requestId?: string
): ErrorResponse => {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      message: error.message,
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      statusCode: isAppError ? error.statusCode : 500,
      details: isAppError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId
    }
  };
};

// Global error handler middleware
export const globalErrorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  const organizationId = req.user?.organizationId;
  const userId = req.user?.id;

  // Log the error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        `Server error: ${err.message}`,
        err,
        {
          path: req.path,
          method: req.method,
          requestId,
          organizationId,
          userId,
          statusCode: err.statusCode,
          code: err.code,
          details: err.details
        }
      );
    } else {
      logger.warn(
        `Client error: ${err.message}`,
        {
          path: req.path,
          method: req.method,
          requestId,
          organizationId,
          userId,
          statusCode: err.statusCode,
          code: err.code,
          details: err.details
        }
      );
    }
  } else {
    // Unexpected error
    logger.error(
      `Unexpected error: ${err.message}`,
      err,
      {
        path: req.path,
        method: req.method,
        requestId,
        organizationId,
        userId
      }
    );
  }

  // Send error response
  const errorResponse = formatErrorResponse(err, req, requestId);
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error factory functions
export const createValidationError = (field: string, value: any, constraint: string): ValidationError => {
  return new ValidationError(
    `Validation failed for field '${field}'`,
    { field, value, constraint }
  );
};

export const createNotFoundError = (resource: string, id: string): NotFoundError => {
  return new NotFoundError(`${resource} with ID '${id}' not found`);
};

export const createUsageLimitError = (
  limitType: string,
  current: number,
  limit: number,
  upgradeUrl?: string
): UsageLimitError => {
  const error = new UsageLimitError(limitType, current, limit);
  if (upgradeUrl) {
    error.details.upgradeUrl = upgradeUrl;
  }
  return error;
};

export const createStripeError = (stripeError: any): StripeError => {
  let message = 'Payment processing failed';
  
  switch (stripeError.code) {
    case 'card_declined':
      message = 'Your card was declined';
      break;
    case 'expired_card':
      message = 'Your card has expired';
      break;
    case 'insufficient_funds':
      message = 'Insufficient funds';
      break;
    case 'incorrect_cvc':
      message = 'Incorrect security code';
      break;
    case 'processing_error':
      message = 'An error occurred while processing your card';
      break;
    case 'rate_limit':
      message = 'Too many requests. Please try again later';
      break;
    default:
      message = stripeError.message || 'Payment processing failed';
  }

  return new StripeError(message, stripeError);
};

// Database error mapper
export const mapDatabaseError = (error: any): AppError => {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new ConflictError('Resource already exists', {
        constraint: error.constraint,
        detail: error.detail
      });
    case '23503': // foreign_key_violation
      return new ValidationError('Referenced resource does not exist', {
        constraint: error.constraint,
        detail: error.detail
      });
    case '23502': // not_null_violation
      return new ValidationError('Required field is missing', {
        column: error.column,
        table: error.table
      });
    case '42P01': // undefined_table
      return new DatabaseError('Database table not found', error);
    case '42703': // undefined_column
      return new DatabaseError('Database column not found', error);
    case '08000': // connection_exception
    case '08003': // connection_does_not_exist
    case '08006': // connection_failure
      return new ExternalServiceError('Database', 'Connection failed');
    default:
      return new DatabaseError('Database operation failed', error);
  }
};

// Request context enhancer
export const enhanceRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = 
      'req_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Add request start time for performance monitoring
  (req as any).startTime = Date.now();

  // Override res.json to log API responses
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - (req as any).startTime;
    
    logger.apiRequest(
      req.method,
      req.path,
      res.statusCode,
      responseTime,
      req.user?.organizationId,
      req.user?.id,
      req.headers['x-request-id'] as string
    );

    return originalJson.call(this, body);
  };

  next();
};

// Health check for error handling system
export const errorHandlingHealthCheck = (): { status: string; checks: any } => {
  const checks = {
    logger: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    errorClasses: {
      status: 'healthy',
      availableErrors: [
        'AppError',
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError',
        'NotFoundError',
        'ConflictError',
        'RateLimitError',
        'SubscriptionError',
        'UsageLimitError',
        'StripeError',
        'DatabaseError',
        'ExternalServiceError'
      ]
    }
  };

  return {
    status: 'healthy',
    checks
  };
};