'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RepoCard } from '@/components/dashboard/RepoCard'
import { Button } from '@/components/ui/button'
import { Plus, Search, Sparkles, TrendingUp } from 'lucide-react'
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-600 bg-gray-900">
        <div className="px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white mb-1">
                  Repositories
                </h1>
                <p className="text-sm text-gray-400">
                  {repos.length} repositories
                </p>
              </div>
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg"
              >
                <a href="/api/github/connect">
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </a>
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-600/30 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 relative max-w-md"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Find a repository..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-8">

        {/* Stats */}
        {repos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {[
              { label: 'Total', value: repos.length, icon: Sparkles, color: 'text-white' },
              { label: 'Documented', value: repos.filter((r) => r.connected && r.status === 'READY').length, icon: TrendingUp, color: 'text-green-400' },
              { label: 'In Progress', value: repos.filter((r) => r.connected && r.status === 'ANALYZING').length, icon: TrendingUp, color: 'text-yellow-400' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-gray-800 border border-gray-600 rounded-md p-4 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
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
              className="w-8 h-8 border-2 border-github-active border-t-transparent rounded-full"
            />
          </div>
        ) : filteredRepos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No repositories</h3>
            <p className="text-gray-400 text-sm mb-6">
              Get started by connecting your first repository.
            </p>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg"
            >
              <a href="/api/github/connect">
                <Plus className="w-4 h-4 mr-2" />
                Add repository
              </a>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {filteredRepos.map((repo, index) => (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
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
