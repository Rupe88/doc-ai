'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, GitBranch, Clock, Sparkles, Plus, Loader2, RefreshCw } from 'lucide-react'

interface RepoCardProps {
  repo: {
    id: number  // GitHub repo ID
    name: string
    fullName: string
    description?: string
    language?: string
    status?: string
    lastSyncedAt?: string
    connected?: boolean
    internalId?: string | null  // Internal database ID (CUID)
  }
}

export function RepoCard({ repo }: RepoCardProps) {
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)

      const response = await fetch('/api/repos/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          githubRepoId: repo.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to connect repository')
      }

      const data = await response.json()

      // Trigger parent component refresh instead of full reload
      if (data.success) {
        // Dispatch custom event for parent to refresh
        window.dispatchEvent(new CustomEvent('repo-connected', {
          detail: { repoId: repo.id }
        }))
        setConnecting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository')
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    if (!repo.internalId) return

    try {
      setSyncing(true)
      setError(null)

      const response = await fetch(`/api/sync/${repo.internalId}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error?.message || 'Failed to sync repository')
      }

      // Handle SSE stream for real-time progress
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('Failed to get response stream')
        }

        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'complete') {
                  // Reload page on completion
                  window.location.reload()
                  return
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (parseError) {
                // Continue on parse errors
              }
            }
          }
        }
        
        // Stream ended - reload to show updated status
        window.location.reload()
      } else {
        // Fallback to JSON response
        const data = await response.json()
        if (data.success) {
          window.location.reload()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync repository')
      setSyncing(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'READY':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
      case 'ANALYZING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800'
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
      default:
        return 'text-muted-foreground bg-card border-border'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'READY':
        return 'Ready'
      case 'ANALYZING':
        return 'Analyzing'
      case 'ERROR':
        return 'Error'
      default:
        return 'Not Connected'
    }
  }

  return (
    <motion.div
      whileHover={{ backgroundColor: '#2d2d2d' }}
      transition={{ duration: 0.2 }}
      className="bg-gray-800 border border-gray-600 rounded-md p-4 hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Repository name and owner */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-gray-400 text-sm truncate">{repo.fullName?.split('/')[0] || 'Unknown'}</span>
            <span className="text-gray-400 text-sm">/</span>
            <h3 className="text-white font-semibold text-base hover:text-blue-400 cursor-pointer truncate">
              {repo.name}
            </h3>
          </div>

          {/* Description */}
          {repo.description && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">{repo.description}</p>
          )}

          {/* Metadata row */}
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            {repo.language && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span>{repo.language}</span>
              </div>
            )}
            {repo.lastSyncedAt && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Updated {new Date(repo.lastSyncedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex flex-col items-end space-y-2 ml-4">
          {/* Status Badge */}
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(repo.status)}`}>
            {getStatusLabel(repo.status)}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {repo.connected && repo.internalId ? (
              <>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-600"
                >
                  <Link href={`/repos/${repo.internalId}`}>
                    <FileText className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-600"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                size="sm"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-600/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}
    </motion.div>
  )
}
