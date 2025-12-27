'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/crypto/subscription', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscription(data.success ? data.data : null)
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: string) => {
    try {
      const response = await fetch('/api/crypto/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout')
      }

      const data = await response.json()
      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      }
    } catch (error) {
      console.error('Failed to create crypto checkout:', error)
      alert('Failed to create crypto payment. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-foreground">{subscription?.tier || 'FREE'}</p>
                <span className={`px-2 py-1 text-xs rounded ${
                  subscription?.status === 'ACTIVE' 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                }`}>
                  {subscription?.status || 'INACTIVE'}
                </span>
              </div>
              {subscription?.endsAt && (
                <p className="text-sm text-muted-foreground">
                  Renews: {new Date(subscription.endsAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {subscription?.tier === 'FREE' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Upgrade Plans</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    onClick={() => handleUpgrade('PRO')} 
                    disabled={loading}
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {loading ? 'Loading...' : 'Upgrade to Pro'}
                  </Button>
                  <Button 
                    onClick={() => handleUpgrade('TEAM')} 
                    disabled={loading}
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {loading ? 'Loading...' : 'Upgrade to Team'}
                  </Button>
                  <Button 
                    onClick={() => handleUpgrade('ENTERPRISE')} 
                    disabled={loading}
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {loading ? 'Loading...' : 'Upgrade to Enterprise'}
                  </Button>
                </div>
              </div>
            )}

            {subscription?.tier !== 'FREE' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You're currently on the <strong className="text-foreground">{subscription?.tier}</strong> plan.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  To change your plan, contact support or cancel and resubscribe.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

