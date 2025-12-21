import { NextRequest, NextResponse } from 'next/server'
import { GitHubService } from '@/lib/github/service'
import { prisma } from '@/lib/db/prisma'
import { encrypt } from '@/lib/security/encryption'
import { logger } from '@/lib/utils/logger'

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

  if (!clientId || !clientSecret) {
    logger.error('GitHub OAuth not configured')
    return NextResponse.redirect(
      new URL('/?error=oauth_not_configured', request.url)
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`

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
    })

    return NextResponse.redirect(
      new URL('/?error=auth_failed', request.url)
    )
  }
}

