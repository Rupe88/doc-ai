'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RepoCard } from '@/components/dashboard/RepoCard'
import { Button } from '@/components/ui/button'
import { Plus, Search, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useAuth, redirectToLogin } from '@/lib/utils/auth-client'

export default function DashboardPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin()
      return
    }

    if (isAuthenticated) {
      fetchRepos()
    }
  }, [authLoading, isAuthenticated])

  const fetchRepos = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/github/repos', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to fetch repositories')
      }
      
      const data = await response.json()
      setRepos(data.success ? (data.data?.repos || []) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Your Repositories
              </h1>
              <p className="text-muted-foreground">
                Connect repositories and generate documentation automatically
              </p>
            </div>
            <Button
              asChild
              className="bg-foreground hover:bg-foreground/90 text-background"
            >
              <Link href="/api/github/connect">
                <Plus className="w-4 h-4 mr-2" />
                Connect Repo
              </Link>
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              {error}
            </div>
          )}

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/50 transition-colors"
            />
          </motion.div>
        </motion.div>

        {/* Stats */}
        {repos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            {[
              { label: 'Total Repos', value: repos.length, icon: Sparkles },
              { label: 'Documented', value: repos.filter((r) => r.connected && r.status === 'READY').length, icon: TrendingUp },
              { label: 'In Progress', value: repos.filter((r) => r.connected && r.status === 'ANALYZING').length, icon: TrendingUp },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-card border border-border rounded-xl p-6 shadow-github"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-foreground" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Repositories Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full"
            />
          </div>
        ) : filteredRepos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Sparkles className="w-16 h-16 text-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">No repositories yet</h3>
            <p className="text-muted-foreground mb-6">
              Connect your first GitHub repository to get started
            </p>
            <Button
              asChild
              className="bg-foreground hover:bg-foreground/90 text-background"
            >
              <Link href="/api/github/connect">
                <Plus className="w-4 h-4 mr-2" />
                Connect Repository
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredRepos.map((repo, index) => (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <RepoCard repo={repo} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
