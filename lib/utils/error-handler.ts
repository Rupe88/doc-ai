import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from './logger'

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service error: ${service}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    )
  }
}

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status: statusCode }
  )
}

/**
 * Create error response
 */
export function errorResponse(
  error: Error | AppError | ZodError | unknown,
  requestId?: string
): NextResponse<ApiResponse> {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', { error: error.errors, requestId })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: 400 }
    )
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    const statusCode = error.statusCode
    logger.error('Application error', {
      code: error.code,
      message: error.message,
      statusCode,
      details: error.details,
      requestId,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'APPLICATION_ERROR',
          message: error.message,
          details: error.details,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: statusCode }
    )
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'Internal server error'
  logger.error('Unknown error', { error: message, stack: error instanceof Error ? error.stack : undefined, requestId })

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    },
    { status: 500 }
  )
}

/**
 * Async handler wrapper with error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const requestId = crypto.randomUUID()
    
    try {
      return await handler(...args)
    } catch (error) {
      return errorResponse(error, requestId)
    }
  }
}

/**
 * Validate and parse request body
 */
export async function parseRequestBody<T>(
  request: Request,
  schema?: any
): Promise<T> {
  try {
    const body = await request.json()
    
    if (schema) {
      return schema.parse(body)
    }
    
    return body as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Invalid request body', error.errors)
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON in request body')
    }
    throw error
  }
}

/**
 * Validate route parameters
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema?: any
): T {
  if (schema) {
    try {
      return schema.parse(params)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid route parameters', error.errors)
      }
      throw error
    }
  }
  return params as T
}

/**
 * Check if user has access to resource
 */
export async function checkResourceAccess(
  userId: string,
  resourceUserId: string,
  resourceName: string = 'Resource'
): Promise<void> {
  if (userId !== resourceUserId) {
    throw new AuthorizationError(`You don't have access to this ${resourceName.toLowerCase()}`)
  }
}

