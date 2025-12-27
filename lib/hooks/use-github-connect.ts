import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function useGitHubConnect() {
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  const connect = async () => {
    if (isConnecting) return

    setIsConnecting(true)
    try {
      // Redirect to GitHub OAuth
      window.location.href = '/api/github/connect'
    } catch (error) {
      console.error('Failed to connect to GitHub:', error)
      setIsConnecting(false)
    }
  }

  return { connect, isConnecting }
}
