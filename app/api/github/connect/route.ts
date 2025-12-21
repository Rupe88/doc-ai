import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`
  const scope = 'repo read:user user:email'
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID in environment variables.' },
      { status: 500 }
    )
  }
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`
  
  return NextResponse.redirect(authUrl)
}

