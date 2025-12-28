import { NextRequest, NextResponse } from 'next/server'
import { GitHubService } from '@/lib/github/service'
import { prisma } from '@/lib/db/prisma'
import { encrypt } from '@/lib/security/encryption'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  // Declare variables outside try block for error logging
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`

  try {

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

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.redirect(new URL(`/login?error=${tokenData.error}`, request.url))
    }

    const accessToken = tokenData.access_token
    const github = new GitHubService(accessToken)
    const githubUser = await github.getUser()

    const encryptedToken = encrypt(accessToken)

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

    // Redirect with session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('GitHub authentication error:', {
      error: error instanceof Error ? error.message : String(error),
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

