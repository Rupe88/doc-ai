'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertCircle, TrendingUp } from 'lucide-react'

interface AnalyticsData {
  repository: {
    id: string
    name: string
    fullName: string
    status: string
    lastSyncedAt: string
  }
  overview?: {
    totalFiles: number
    totalLines: number
    codeLines: number
    functions: number
    classes: number
    components: number
    apiRoutes: number
  }
  stats?: {
    totalFiles: number
    totalLines: number
    codeLines: number
    functions: number
    classes: number
    components: number
    apiEndpoints: number
    services: number
    models: number
  }
  security: {
    score: number
    grade: string
    issues: any[]
    vulnerabilities: any[]
    recommendations: string[]
  }
  quality?: {
    score: number
    grade?: string
    patterns?: string[]
    complexity?: {
      average: number
      hotspots?: any[]
    }
    issues?: any[]
    recommendations?: string[]
    maintainability?: number
    testability?: number
    techDebt?: {
      hours: number
      category: string
      breakdown: any[]
    }
  }
  dependencies?: {
    total: number
    outdated: number
    vulnerable: number
    list: any[]
    production?: any[]
    development?: any[]
  }
  endpoints?: any[]
  patterns?: string[]
  documentation?: {
    totalDocs: number
    byType: Record<string, number>
    lastGenerated: string
    coverage: number
  }
  lastUpdated?: string
}

interface PowerfulAnalyticsDashboardProps {
  repoId: string
}

const gradeColors: Record<string, string> = {
  A: 'from-emerald-500 to-green-600',
  B: 'from-blue-500 to-indigo-600',
  C: 'from-yellow-500 to-amber-600',
  D: 'from-orange-500 to-red-500',
  F: 'from-red-600 to-rose-700',
}

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function getGradeFromScore(score: number): string {
  if (score >= 95) return 'A'
  if (score >= 85) return 'B'
  if (score >= 75) return 'C'
  if (score >= 65) return 'D'
  return 'F'
}

export function PowerfulAnalyticsDashboard({ repoId }: PowerfulAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'quality' | 'dependencies'>('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [repoId])

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
        setError(null)
      } else {
        setLoading(true)
      }

      const res = await fetch(`/api/repos/${repoId}/analytics`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load analytics data')
      }

      if (!data.data) {
        throw new Error('No analytics data available')
      }

      // Validate the analytics data structure
      if (!data.data.repository || !data.data.security || !data.data.quality) {
        throw new Error('Invalid analytics data structure')
      }

      setAnalytics(data.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)

      // Only set fallback data on initial load, not on refresh
      if (!isRefresh && !analytics) {
        setAnalytics({
          repository: {
            id: repoId,
            name: 'Repository',
            fullName: 'Unknown',
            status: 'UNKNOWN',
            lastSyncedAt: '',
          },
          overview: {
            totalFiles: 0,
            totalLines: 0,
            codeLines: 0,
            functions: 0,
            classes: 0,
            components: 0,
            apiRoutes: 0,
          },
          stats: {
            totalFiles: 0,
            totalLines: 0,
            codeLines: 0,
            functions: 0,
            classes: 0,
            components: 0,
            apiEndpoints: 0,
            services: 0,
            models: 0,
          },
          security: {
            score: 0,
            grade: 'F',
            issues: [],
            vulnerabilities: [],
            recommendations: [errorMessage],
          },
          quality: {
            score: 0,
            grade: 'F',
            patterns: [],
            complexity: {
              average: 0,
              hotspots: [],
            },
            issues: [],
            recommendations: [errorMessage],
            maintainability: 0,
            testability: 0,
            techDebt: {
              hours: 0,
              category: 'Unknown',
              breakdown: [],
            },
          },
          dependencies: {
            total: 0,
            outdated: 0,
            vulnerable: 0,
            list: [],
            production: [],
            development: [],
          },
          endpoints: [],
          patterns: [],
          documentation: {
            totalDocs: 0,
            byType: {},
            lastGenerated: '',
            coverage: 0,
          },
          lastUpdated: new Date().toISOString(),
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAnalytics(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No analytics available. Generate documentation first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Repository Analytics</h2>
          <p className="text-slate-400">
            Comprehensive analysis of your codebase security, quality, and structure
          </p>
          {analytics?.lastUpdated && (
            <p className="text-xs text-slate-500 mt-1">
              Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold">Analytics Error</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        {(['overview', 'security', 'quality', 'dependencies'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Files',
                value: analytics.overview?.totalFiles || analytics.stats?.totalFiles || 0,
                icon: 'folder',
                color: 'from-blue-500 to-indigo-600'
              },
              {
                label: 'Lines of Code',
                value: analytics.overview?.codeLines || analytics.stats?.codeLines || 0,
                icon: 'code',
                color: 'from-violet-500 to-purple-600'
              },
              {
                label: 'Functions',
                value: analytics.overview?.functions || analytics.stats?.functions || 0,
                icon: 'function',
                color: 'from-green-500 to-emerald-600'
              },
              {
                label: 'API Endpoints',
                value: analytics.overview?.apiRoutes || analytics.stats?.apiEndpoints || analytics.endpoints?.length || 0,
                icon: 'server',
                color: 'from-orange-500 to-amber-600'
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-5"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3`}>
                  <span className="text-lg">{stat.value > 100 ? '100+' : stat.value}</span>
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Score Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Security Score */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Security Score</h3>
                <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradeColors[analytics.security.grade]} flex items-center justify-center text-white font-bold text-xl`}>
                  {analytics.security.grade}
                </span>
              </div>
              <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.security.score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradeColors[analytics.security.grade]} rounded-full`}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Score</span>
                <span className="text-white font-semibold">{analytics.security.score}/100</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-red-400">{analytics.security.vulnerabilities.filter(v => v.severity === 'CRITICAL').length}</div>
                    <div className="text-xs text-slate-500">Critical</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-400">{analytics.security.vulnerabilities.filter(v => v.severity === 'HIGH').length}</div>
                    <div className="text-xs text-slate-500">High</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-400">{analytics.security.issues.length}</div>
                    <div className="text-xs text-slate-500">Issues</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Score */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Code Quality</h3>
                  <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradeColors[analytics.quality?.grade || 'C']} flex items-center justify-center text-white font-bold text-xl`}>
                    {analytics.quality?.grade || 'C'}
                  </span>
              </div>
              <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.quality?.score || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradeColors[analytics.quality?.grade || getGradeFromScore(analytics.quality?.score || 0)]} rounded-full`}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Score</span>
                <span className="text-white font-semibold">{analytics.quality?.score || 70}/100</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-violet-400">
                      {typeof analytics.quality?.complexity === 'number' ? analytics.quality.complexity : analytics.quality?.complexity?.average || 5}
                    </div>
                    <div className="text-xs text-slate-500">Avg Complexity</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">
                      {analytics.quality?.maintainability || 80}
                    </div>
                    <div className="text-xs text-slate-500">Maintainability</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">
                      {analytics.quality?.techDebt?.hours || 0}h
                    </div>
                    <div className="text-xs text-slate-500">Tech Debt</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patterns */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Detected Patterns & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {(analytics.patterns || analytics.quality?.patterns || []).map((pattern, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-500/30"
                >
                  {pattern}
                </span>
              ))}
              {(analytics.patterns || analytics.quality?.patterns || []).length === 0 && (
                <span className="text-slate-500 text-sm">No patterns detected</span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Score Header */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColors[analytics.security.grade]} flex flex-col items-center justify-center text-white`}>
                <span className="text-4xl font-bold">{analytics.security.grade}</span>
                <span className="text-sm opacity-80">{analytics.security.score}/100</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Security Analysis</h2>
                <p className="text-slate-400">
                  Found {analytics.security.issues.length} issues and {analytics.security.vulnerabilities.length} vulnerabilities
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
            <ul className="space-y-3">
              {analytics.security.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Vulnerabilities List */}
          {analytics.security.vulnerabilities.length > 0 && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vulnerabilities</h3>
              <div className="space-y-3">
                {analytics.security.vulnerabilities.map((vuln, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColors[vuln.severity]} border`}>
                      {vuln.severity}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{vuln.name}</h4>
                      <p className="text-sm text-slate-400 mt-1">{vuln.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>{vuln.file}:{vuln.line || '?'}</span>
                        {vuln.cwe && <span className="text-violet-400">{vuln.cwe}</span>}
                      </div>
                      {vuln.fix && (
                        <div className="mt-3 p-2 bg-slate-900 rounded-lg">
                          <span className="text-xs text-green-400 font-semibold">Fix: </span>
                          <code className="text-xs text-slate-300">{vuln.fix}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues List */}
          {analytics.security.issues.length > 0 && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Security Issues</h3>
              <div className="space-y-3">
                {analytics.security.issues.slice(0, 10).map((issue, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColors[issue.severity]} border`}>
                      {issue.severity}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{issue.type.replace(/_/g, ' ')}</h4>
                      <p className="text-sm text-slate-400 mt-1">{issue.message}</p>
                      <div className="text-xs text-slate-500 mt-2">
                        {issue.filePath}:{issue.line || '?'}
                      </div>
                      {issue.recommendation && (
                        <div className="mt-2 text-sm text-green-400">
                          Recommendation: {issue.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Score Header */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColors[analytics.quality?.grade || 'C']} flex flex-col items-center justify-center text-white`}>
                <span className="text-4xl font-bold">{analytics.quality?.grade || 'C'}</span>
                <span className="text-sm opacity-80">{analytics.quality?.score || 75}/100</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Code Quality Report</h2>
                <p className="text-slate-400">
                  Average complexity: {analytics.quality?.complexity?.average || 5} | Tech debt: {analytics.quality?.techDebt?.hours || 0} hours
                </p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-violet-400">{analytics.quality?.complexity?.average || 5}</div>
              <div className="text-sm text-slate-500 mt-1">Avg Complexity</div>
              <div className="text-xs text-slate-600 mt-2">Target: &lt; 10</div>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-blue-400">{analytics.quality?.maintainability || 80}</div>
              <div className="text-sm text-slate-500 mt-1">Maintainability</div>
              <div className="text-xs text-slate-600 mt-2">Target: &gt; 80</div>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-green-400">{analytics.quality?.testability || 75}</div>
              <div className="text-sm text-slate-500 mt-1">Testability</div>
              <div className="text-xs text-slate-600 mt-2">Target: &gt; 70</div>
            </div>
          </div>

          {/* Complexity Distribution */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Complexity Distribution</h3>
            <div className="flex gap-2 h-32">
              {Object.entries((analytics.quality?.complexity as any)?.distribution || {}).map(([level, count]) => {
                const colors: Record<string, string> = {
                  low: 'bg-green-500',
                  medium: 'bg-yellow-500',
                  high: 'bg-orange-500',
                  veryHigh: 'bg-red-500',
                }
                const distribution = (analytics.quality?.complexity as any)?.distribution || {}
                const maxCount = Math.max(...Object.values(distribution as Record<string, number>))
                const height = maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
                
                return (
                  <div key={level} className="flex-1 flex flex-col justify-end items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5 }}
                      className={`w-full max-w-12 ${colors[level]} rounded-t-lg`}
                    />
                    <div className="text-xs text-slate-500 mt-2 capitalize">{level}</div>
                    <div className="text-sm text-white font-semibold">{count as number}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Most Complex Functions */}
          {((analytics.quality?.complexity as any)?.highest?.length || 0) > 0 && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Most Complex Functions</h3>
              <div className="space-y-3">
                {((analytics.quality?.complexity as any)?.highest || []).map((func: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div>
                      <span className="font-mono text-violet-400">{func.name}</span>
                      <div className="text-xs text-slate-500 mt-1">{func.file}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      func.value > 20 ? 'bg-red-500/20 text-red-400' :
                      func.value > 10 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {func.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Debt */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Debt Breakdown</h3>
            <div className="space-y-4">
              {(analytics.quality?.techDebt?.breakdown || []).map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-300">{item.type}</span>
                      <span className="text-sm text-slate-500">{item.hours}h</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.hours / (analytics.quality?.techDebt?.hours || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                      />
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    item.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                    item.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Dependencies Tab */}
      {activeTab === 'dependencies' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-white">
                {analytics.dependencies?.total ||
                 (analytics.dependencies?.production?.length || 0) +
                 (analytics.dependencies?.development?.length || 0) ||
                 analytics.dependencies?.list?.length || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Total Dependencies</div>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400">{analytics.dependencies?.outdated || 0}</div>
              <div className="text-sm text-slate-500 mt-1">Outdated</div>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
              <div className="text-3xl font-bold text-red-400">{analytics.dependencies?.vulnerable || 0}</div>
              <div className="text-sm text-slate-500 mt-1">Vulnerable</div>
            </div>
          </div>

          {/* Dependency List */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Dependencies</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(analytics.dependencies?.list ||
                [...(analytics.dependencies?.production || []).map(d => ({...d, type: 'production'})),
                 ...(analytics.dependencies?.development || []).map(d => ({...d, type: 'development'}))])
                .map((dep, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{dep.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      dep.type === 'production' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {dep.type}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 font-mono">{dep.version}</span>
                </div>
              ))}
              {((analytics.dependencies?.list?.length || 0) === 0 &&
                (analytics.dependencies?.production?.length || 0) === 0 &&
                (analytics.dependencies?.development?.length || 0) === 0) && (
                <div className="text-center py-8 text-slate-500">
                  No dependencies found
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

