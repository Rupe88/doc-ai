import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  image: string | null
  subscriptionTier: string
  subscriptionStatus: string
  githubId: string | null
}

export interface AuthResult {
  user: AuthenticatedUser | null
  error?: string
}

/**
 * Get authenticated user from session token
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Try to get session token from cookie
    const sessionToken = request.cookies.get('session')?.value

    if (!sessionToken) {
      // Fallback to Authorization header for API calls
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        return await verifySessionToken(token)
      }
      return { user: null, error: 'No session token' }
    }

    return await verifySessionToken(sessionToken)
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Verify session token and return user
 */
async function verifySessionToken(token: string): Promise<AuthResult> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) {
    return { user: null, error: 'Invalid session' }
  }

  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } })
    return { user: null, error: 'Session expired' }
  }

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    subscriptionTier: session.user.subscriptionTier,
    subscriptionStatus: session.user.subscriptionStatus,
    githubId: session.user.githubId,
  }

  return { user }
}

/**
 * Create a new session for user
 */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return token
}

/**
 * Delete session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  })
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  })
}

/**
 * Refresh session expiration
 */
export async function refreshSession(token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION)
  await prisma.session.updateMany({
    where: { token },
    data: { expiresAt },
  })
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser; response?: NextResponse }> {
  const authResult = await getAuthenticatedUser(request)

  if (!authResult.user) {
    return {
      user: null as any,
      response: NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return { user: authResult.user }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  return result.count
}

