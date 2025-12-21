'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, GitBranch, Clock, Sparkles, Plus, Loader2 } from 'lucide-react'

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
      
      // Reload page to show updated status
      if (data.success) {
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository')
      setConnecting(false)
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
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-card border-border hover:border-foreground/50 transition-all h-full flex flex-col shadow-github">
        <div className="p-6 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-foreground font-semibold text-lg mb-1">{repo.name}</h3>
              <p className="text-muted-foreground text-sm">{repo.fullName}</p>
            </div>
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="w-5 h-5 text-foreground" />
            </motion.div>
          </div>

          {/* Description */}
          {repo.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{repo.description}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center space-x-4 mb-4 text-sm text-muted-foreground">
            {repo.language && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-foreground" />
                <span>{repo.language}</span>
              </div>
            )}
            {repo.lastSyncedAt && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(repo.lastSyncedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(repo.status)}`}>
            {getStatusLabel(repo.status)}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex items-center space-x-2">
          {repo.connected && repo.internalId ? (
            <>
              <Button
                asChild
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-card"
              >
                <Link href={`/repos/${repo.internalId}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Docs
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-border text-foreground hover:bg-card"
              >
                <Link href={`/api/sync/${repo.internalId}`}>
                  <GitBranch className="w-4 h-4" />
                </Link>
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
