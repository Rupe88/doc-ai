import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = `${appUrl}/api/auth/callback/github`
  const scope = 'repo read:user user:email'

  // Validate environment variables
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID in environment variables.' },
      { status: 500 }
    )
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_APP_URL not configured. Please set your app URL in environment variables.' },
      { status: 500 }
    )
  }

  // Validate URL format
  try {
    new URL(redirectUri)
  } catch {
    return NextResponse.json(
      { error: 'Invalid NEXT_PUBLIC_APP_URL format. Must be a valid URL.' },
      { status: 500 }
    )
  }
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`

  logger.info('GitHub OAuth initiated', {
    redirectUri,
    scope,
    clientId: clientId ? 'SET' : 'MISSING',
    appUrl: appUrl ? 'SET' : 'MISSING',
  })

  return NextResponse.redirect(authUrl)
}

