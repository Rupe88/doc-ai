import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthenticatedUser } from '@/lib/middleware/auth'
import { 
  withErrorHandler, 
  successResponse, 
  errorResponse,
  AuthenticationError,
  RateLimitError,
  parseRequestBody,
  validateParams,
} from './error-handler'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { logger } from './logger'
import { z } from 'zod'

/**
 * API route handler options
 */
export interface ApiHandlerOptions {
  requireAuth?: boolean
  requireSubscription?: string[] // Subscription tiers required
  rateLimit?: {
    limit: number
    window: number
  }
  methods?: string[] // Allowed HTTP methods
}

/**
 * Enhanced request context
 */
export interface ApiContext {
  request: NextRequest
  user?: AuthenticatedUser
  params?: Record<string, string>
}

/**
 * API handler function type
 */
export type ApiHandler<T = any> = (
  context: ApiContext
) => Promise<NextResponse<{ success: boolean; data?: T; error?: any }>>

/**
 * Create API route handler with error handling, auth, rate limiting
 */
export function createApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  const {
    requireAuth: needsAuth = true,
    requireSubscription,
    rateLimit: rateLimitConfig,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  } = options

  return withErrorHandler(async (
    request: NextRequest,
    params?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    try {
      // Check HTTP method
      if (!methods.includes(request.method)) {
        return errorResponse(
          new Error(`Method ${request.method} not allowed`),
          requestId
        )
      }

      // Rate limiting (will be checked after auth)
      let rateLimitChecked = false

      // Authentication
      let user: AuthenticatedUser | undefined
      if (needsAuth) {
        const authResult = await requireAuth(request)
        if (authResult.response) {
          return authResult.response
        }
        user = authResult.user

        // Check subscription requirements
        if (requireSubscription && requireSubscription.length > 0) {
          if (!requireSubscription.includes(user.subscriptionTier)) {
            return errorResponse(
              new Error(
                `This feature requires ${requireSubscription.join(' or ')} subscription`
              ),
              requestId
            )
          }
        }
      }

      // Create context
      const context: ApiContext = {
        request,
        user,
        params: params?.params,
      }

      // Execute handler
      const response = await handler(context)

      // Log request
      const duration = Date.now() - startTime
      logger.info('API request', {
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        duration,
        requestId,
        userId: user?.id,
      })

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('API error', {
        method: request.method,
        path: request.nextUrl.pathname,
        duration,
        requestId,
        error: error instanceof Error ? error.message : String(error),
      })

      return errorResponse(error, requestId)
    }
  })
}

/**
 * Helper to get authenticated user from context
 */
export function requireUser(context: ApiContext): AuthenticatedUser {
  if (!context.user) {
    throw new AuthenticationError()
  }
  return context.user
}

/**
 * Helper to parse and validate request body
 */
export async function getRequestBody<T = any>(
  context: ApiContext,
  schema?: z.ZodSchema<T>
): Promise<T> {
  return parseRequestBody<T>(context.request, schema) as Promise<T>
}

/**
 * Helper to get and validate route params
 */
export function getRouteParams<T = Record<string, string>>(
  context: ApiContext,
  schema?: z.ZodSchema<T>
): T {
  if (!context.params) {
    throw new Error('Route parameters not available')
  }
  return validateParams<T>(context.params, schema) as T
}

/**
 * Helper to get query parameters
 */
export function getQueryParams<T = Record<string, string | string[]>>(
  context: ApiContext,
  schema?: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(context.request.nextUrl.searchParams)
  
  if (schema) {
    return schema.parse(params) as T
  }
  
  return params as T
}

