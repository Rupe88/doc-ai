import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Temporary: allow access in production for debugging
  const isDev = process.env.NODE_ENV === 'development'
  const debugKey = request.nextUrl.searchParams.get('key')

  // Allow access if in dev OR if key matches OR if no key restriction (temporary for debugging)
  if (!isDev && debugKey !== process.env.DEBUG_KEY && debugKey !== 'temp-debug-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const envStatus = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? 'SET' : 'MISSING',
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'SET' : 'MISSING',
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'MISSING',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'MISSING',
  }

  const urls = {
    connectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/connect`,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`,
    homeUrl: process.env.NEXT_PUBLIC_APP_URL,
  }

  return NextResponse.json({
    environment: envStatus,
    urls,
    timestamp: new Date().toISOString(),
  })
}
