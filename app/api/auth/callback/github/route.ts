import { NextRequest, NextResponse } from 'next/server'
import { GitHubService } from '@/lib/github/service'
import { prisma } from '@/lib/db/prisma'
import { encrypt } from '@/lib/security/encryption'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    logger.warn('GitHub OAuth error', { error })
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  // Validate code parameter
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    )
  }

  // Validate environment variables
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !clientSecret) {
    logger.error('GitHub OAuth not configured', {
      clientId: clientId ? 'SET' : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
    })
    return NextResponse.redirect(
      new URL('/?error=oauth_not_configured', request.url)
    )
  }

  if (!appUrl) {
    logger.error('NEXT_PUBLIC_APP_URL not configured')
    return NextResponse.redirect(
      new URL('/?error=app_url_not_configured', request.url)
    )
  }

  const redirectUri = `${appUrl}/api/auth/callback/github`

  // Validate redirect URI format
  try {
    new URL(redirectUri)
  } catch {
    logger.error('Invalid redirect URI format', { redirectUri })
    return NextResponse.redirect(
      new URL('/?error=invalid_redirect_uri', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      logger.error('GitHub token exchange failed', {
        status: tokenResponse.status,
      })
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      logger.warn('GitHub token exchange error', { error: tokenData.error })
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(tokenData.error)}`, request.url)
      )
    }

    const accessToken = tokenData.access_token

    if (!accessToken) {
      logger.error('No access token received from GitHub')
      return NextResponse.redirect(
        new URL('/?error=no_access_token', request.url)
      )
    }

    // Get user info from GitHub
    const github = new GitHubService(accessToken)
    const githubUser = await github.getUser()

    // Encrypt and store token
    const encryptedToken = encrypt(accessToken)

    // Create or update user
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id.toString() },
      update: {
        githubToken: encryptedToken,
        name: githubUser.name || undefined,
        image: githubUser.avatar_url,
        email: githubUser.email || undefined,
      },
      create: {
        email: githubUser.email || `${githubUser.login}@github.local`,
        name: githubUser.name,
        image: githubUser.avatar_url,
        githubId: githubUser.id.toString(),
        githubToken: encryptedToken,
      },
    })

    // Create session
    const { createSession } = await import('@/lib/middleware/auth')
    const sessionToken = await createSession(user.id)

    logger.info('User authenticated via GitHub', {
      userId: user.id,
      githubId: githubUser.id,
      email: user.email,
    })

    // Redirect to dashboard with session cookie
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    logger.error('GitHub authentication error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      clientId: clientId ? 'SET' : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      redirectUri,
      code: code ? 'PRESENT' : 'MISSING',
    })

    // Provide more specific error messages
    let errorType = 'auth_failed'
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorType = 'network_error'
      } else if (error.message.includes('invalid_client')) {
        errorType = 'invalid_client'
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorType = 'redirect_uri_mismatch'
      }
    }

    return NextResponse.redirect(
      new URL(`/?error=${errorType}`, request.url)
    )
  }
}

