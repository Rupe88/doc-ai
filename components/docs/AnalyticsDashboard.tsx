'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'

interface AnalyticsData {
  hasAnalysis: boolean
  repoName?: string
  analytics?: {
    dependencyGraph: {
      stats: {
        totalFiles: number
        totalDependencies: number
        circularDependencies: string[][]
        orphanFiles: string[]
        mostDependent: { file: string; count: number }[]
        mostImported: { file: string; count: number }[]
      }
      mermaidDiagram: string
    }
    security: {
      summary: {
        score: number
        grade: string
        totalIssues: number
        bySeverity: {
          critical: number
          high: number
          medium: number
          low: number
        }
      }
      issues: any[]
      markdownReport: string
    }
    codeQuality: {
      metrics: {
        overall: { score: number; grade: string }
        maintainability: { score: number }
        complexity: { average: number }
        documentation: { coverage: number }
        duplication: { percentage: number }
        technicalDebt: { minutes: number; rating: string }
        lineMetrics: { total: number; code: number; comments: number }
      }
      markdownReport: string
    }
    api: {
      endpoints: any[]
      markdownDocs: string
    }
  }
}

interface AnalyticsDashboardProps {
  repoId: string
}

export function AnalyticsDashboard({ repoId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'quality' | 'api' | 'dependencies'>('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [repoId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/repos/${repoId}/analytics`, {
        credentials: 'include',
      })
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error?.message || 'Failed to load analytics')
      }
    } catch (err) {
      setError('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (error || !data?.hasAnalysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {error || 'No analytics available. Generate documentation first.'}
          </p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  const { analytics } = data

  if (!analytics) return null

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'security', label: 'Security' },
    { id: 'quality', label: 'Code Quality' },
    { id: 'api', label: 'API Docs' },
    { id: 'dependencies', label: 'Dependencies' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Security Score */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{analytics.security.summary.score}</span>
                <span className="text-2xl text-green-500">{analytics.security.summary.grade}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {analytics.security.summary.totalIssues} issues found
              </p>
            </CardContent>
          </Card>

          {/* Code Quality Score */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Code Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{analytics.codeQuality.metrics.overall.score}</span>
                <span className="text-2xl text-blue-500">{analytics.codeQuality.metrics.overall.grade}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Maintainability: {analytics.codeQuality.metrics.maintainability.score}%
              </p>
            </CardContent>
          </Card>

          {/* Documentation Coverage */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Doc Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{analytics.codeQuality.metrics.documentation.coverage}</span>
                <span className="text-lg text-purple-500">%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {analytics.codeQuality.metrics.lineMetrics.comments} comment lines
              </p>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{analytics.api.endpoints.length}</span>
                <span className="text-lg text-orange-500">endpoints</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Auto-documented
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Security Report</span>
              <span className={`text-2xl font-bold ${
                analytics.security.summary.grade === 'A' ? 'text-green-500' :
                analytics.security.summary.grade === 'B' ? 'text-blue-500' :
                analytics.security.summary.grade === 'C' ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                Grade: {analytics.security.summary.grade}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{analytics.security.summary.bySeverity.critical}</div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-500">{analytics.security.summary.bySeverity.high}</div>
                <div className="text-sm text-muted-foreground">High</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-500">{analytics.security.summary.bySeverity.medium}</div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-500">{analytics.security.summary.bySeverity.low}</div>
                <div className="text-sm text-muted-foreground">Low</div>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{analytics.security.markdownReport}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Quality Tab */}
      {activeTab === 'quality' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Code Quality Metrics</span>
              <span className={`text-2xl font-bold ${
                analytics.codeQuality.metrics.overall.grade === 'A' ? 'text-green-500' :
                analytics.codeQuality.metrics.overall.grade === 'B' ? 'text-blue-500' :
                analytics.codeQuality.metrics.overall.grade === 'C' ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                Score: {analytics.codeQuality.metrics.overall.score}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Complexity</div>
                <div className="text-2xl font-bold">{analytics.codeQuality.metrics.complexity.average}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Duplication</div>
                <div className="text-2xl font-bold">{analytics.codeQuality.metrics.duplication.percentage}%</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Tech Debt</div>
                <div className="text-2xl font-bold">{Math.round(analytics.codeQuality.metrics.technicalDebt.minutes / 60)}h</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Lines of Code</div>
                <div className="text-2xl font-bold">{analytics.codeQuality.metrics.lineMetrics.code}</div>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{analytics.codeQuality.markdownReport}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Docs Tab */}
      {activeTab === 'api' && (
        <Card>
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.api.endpoints.length > 0 ? (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{analytics.api.markdownDocs}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground">No API endpoints detected.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dependencies Tab */}
      {activeTab === 'dependencies' && (
        <Card>
          <CardHeader>
            <CardTitle>Dependency Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Files</div>
                <div className="text-2xl font-bold">{analytics.dependencyGraph.stats.totalFiles}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Dependencies</div>
                <div className="text-2xl font-bold">{analytics.dependencyGraph.stats.totalDependencies}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Circular Deps</div>
                <div className="text-2xl font-bold text-red-500">{analytics.dependencyGraph.stats.circularDependencies.length}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Orphan Files</div>
                <div className="text-2xl font-bold">{analytics.dependencyGraph.stats.orphanFiles.length}</div>
              </div>
            </div>

            {analytics.dependencyGraph.stats.mostImported.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Most Imported Files</h4>
                <div className="space-y-1">
                  {analytics.dependencyGraph.stats.mostImported.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">{item.file}</span>
                      <span className="font-mono">{item.count} imports</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.dependencyGraph.stats.circularDependencies.length > 0 && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="font-semibold text-red-500 mb-2">Circular Dependencies Detected</h4>
                {analytics.dependencyGraph.stats.circularDependencies.slice(0, 3).map((cycle, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {cycle.join(' -> ')} {'->'} {cycle[0]}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

