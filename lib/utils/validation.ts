import { z } from 'zod'

/**
 * Common validation schemas
 */
export const schemas = {
  repoId: z.string().cuid(),
  docId: z.string().cuid(),
  userId: z.string().cuid(),
  jobId: z.string().cuid(),
  
  email: z.string().email(),
  url: z.string().url(),
  
  searchQuery: z.string().min(1).max(200),
  symbolName: z.string().min(1).max(100),
  
  subscriptionTier: z.enum(['FREE', 'PRO', 'TEAM', 'ENTERPRISE']),
  
  docType: z.enum(['FUNCTION', 'CLASS', 'API', 'ARCHITECTURE', 'OVERVIEW']),
  
  version: z.number().int().positive(),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
}

/**
 * Validate and sanitize input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Safe parse with error handling
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: z.ZodError
} {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000) // Limit length
}

/**
 * Sanitize file path
 */
export function sanitizeFilePath(path: string): string {
  // Remove dangerous path components
  return path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/[<>:"|?*]/g, '') // Remove invalid characters
    .slice(0, 500) // Limit length
}

/**
 * Validate GitHub webhook payload
 */
export function validateGitHubWebhook(payload: unknown): boolean {
  // Basic validation - in production, verify signature
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  
  const p = payload as any
  return typeof p.repository === 'object' && typeof p.repository.id === 'number'
}

/**
 * Validate Paddle webhook payload
 */
export function validatePaddleWebhook(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  
  const p = payload as any
  return typeof p.event_type === 'string' && typeof p.data === 'object'
}

