'use client'

import { useEffect, useState } from 'react'

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  subscriptionTier: string
  subscriptionStatus: string
  githubId: string | null
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.success && data.data?.user ? data.data.user : null
  } catch (error) {
    console.error('Failed to get user:', error)
    return null
  }
}

/**
 * Hook to get current user
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((userData) => {
      setUser(userData)
      setLoading(false)
    })
  }, [])

  return { user, loading, isAuthenticated: !!user }
}

/**
 * Redirect to login if not authenticated
 */
export function redirectToLogin() {
  window.location.href = '/api/github/connect'
}

/**
 * Logout user
 */
export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    window.location.href = '/'
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

