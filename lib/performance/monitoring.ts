/**
 * Real-time Performance Monitoring & Optimization
 * Tracks application performance and provides optimization recommendations
 */

import { getAIProviderWithFallback } from '../ai/providers/factory'
import { prisma } from '../db/prisma'

export interface PerformanceMetrics {
  timestamp: Date
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  memoryUsage: number
  cpuUsage: number
  databaseQueries: number
  databaseQueryTime: number
  cacheHitRate: number
  errorRate: number
}

export interface PerformanceAnalysis {
  overallScore: number
  bottlenecks: PerformanceBottleneck[]
  recommendations: PerformanceRecommendation[]
  trends: PerformanceTrend[]
  alerts: PerformanceAlert[]
}

export interface PerformanceBottleneck {
  type: 'endpoint' | 'database' | 'memory' | 'cpu' | 'cache'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  impact: string
  solution: string
}

export interface PerformanceRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'caching' | 'database' | 'code' | 'infrastructure' | 'architecture'
  title: string
  description: string
  estimatedImpact: string
  implementationEffort: 'low' | 'medium' | 'high'
  code?: string
}

export interface PerformanceTrend {
  metric: string
  current: number
  previous: number
  change: number
  trend: 'improving' | 'stable' | 'degrading'
  timeframe: string
}

export interface PerformanceAlert {
  level: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  affectedEndpoints: string[]
  recommendedAction: string
  triggeredAt: Date
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private readonly MAX_METRICS = 10000 // Keep last 10k metrics

  /**
   * Record performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date(),
    }

    this.metrics.push(fullMetric)

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Check for performance alerts
    await this.checkPerformanceAlerts(fullMetric)

    // Store in database (async, don't wait)
    this.storeMetricInDB(fullMetric).catch(console.error)
  }

  /**
   * Analyze performance data
   */
  async analyzePerformance(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<PerformanceAnalysis> {
    const now = new Date()
    const timeframeMs = this.getTimeframeMs(timeframe)

    const relevantMetrics = this.metrics.filter(
      m => now.getTime() - m.timestamp.getTime() < timeframeMs
    )

    if (relevantMetrics.length === 0) {
      return this.getEmptyAnalysis()
    }

    // Analyze bottlenecks
    const bottlenecks = await this.identifyBottlenecks(relevantMetrics)

    // Generate recommendations
    const recommendations = await this.generateRecommendations(bottlenecks, relevantMetrics)

    // Calculate trends
    const trends = this.calculateTrends(relevantMetrics, timeframe)

    // Calculate overall score
    const overallScore = this.calculatePerformanceScore(relevantMetrics, bottlenecks)

    return {
      overallScore,
      bottlenecks,
      recommendations,
      trends,
      alerts: this.alerts.slice(-10), // Last 10 alerts
    }
  }

  /**
   * Get performance insights for specific endpoint
   */
  async getEndpointInsights(endpoint: string, timeframe: string = '24h'): Promise<{
    metrics: PerformanceMetrics[]
    averageResponseTime: number
    p95ResponseTime: number
    errorRate: number
    throughput: number
    optimizationSuggestions: string[]
  }> {
    const now = new Date()
    const timeframeMs = this.getTimeframeMs(timeframe as any)

    const endpointMetrics = this.metrics.filter(
      m => m.endpoint === endpoint &&
           now.getTime() - m.timestamp.getTime() < timeframeMs
    )

    if (endpointMetrics.length === 0) {
      return {
        metrics: [],
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        optimizationSuggestions: []
      }
    }

    const responseTimes = endpointMetrics.map(m => m.responseTime).sort((a, b) => a - b)
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)]

    const errorCount = endpointMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = (errorCount / endpointMetrics.length) * 100

    const throughput = endpointMetrics.length / (timeframeMs / 1000 / 60 / 60) // requests per hour

    const optimizationSuggestions = await this.getEndpointOptimizations(endpointMetrics, endpoint)

    return {
      metrics: endpointMetrics.slice(-100), // Last 100 metrics
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      throughput,
      optimizationSuggestions,
    }
  }

  /**
   * Generate optimization recommendations using AI
   */
  async generateOptimizations(codeSnippet: string, performanceData: any): Promise<string[]> {
    const ai = await getAIProviderWithFallback()

    const prompt = `Analyze this code for performance optimizations:

CODE:
${codeSnippet}

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

Provide specific optimization recommendations with:
1. Performance impact assessment
2. Implementation difficulty
3. Code examples where helpful

Focus on:
- Algorithm improvements
- Memory optimizations
- Database query optimizations
- Caching strategies
- Async/await optimizations
- Code splitting opportunities`

    const response = await ai.chat(prompt)
    return this.parseOptimizationSuggestions(response)
  }

  private async identifyBottlenecks(metrics: PerformanceMetrics[]): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = []

    // Analyze response times
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    const slowEndpoints = this.groupByEndpoint(metrics)
      .filter(group => {
        const avg = group.metrics.reduce((sum, m) => sum + m.responseTime, 0) / group.metrics.length
        return avg > avgResponseTime * 2 // 2x slower than average
      })

    slowEndpoints.forEach(group => {
      bottlenecks.push({
        type: 'endpoint',
        severity: group.metrics.some(m => m.responseTime > 5000) ? 'high' : 'medium',
        description: `Endpoint ${group.endpoint} has slow response times`,
        location: group.endpoint,
        impact: `${group.metrics.length} requests affected`,
        solution: 'Implement caching, optimize database queries, or add indexing',
      })
    })

    // Analyze memory usage
    const highMemoryUsage = metrics.filter(m => m.memoryUsage > 500 * 1024 * 1024) // > 500MB
    if (highMemoryUsage.length > metrics.length * 0.1) { // > 10% of requests
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: 'High memory usage detected',
        location: 'Application',
        impact: 'Potential memory leaks or inefficient data structures',
        solution: 'Profile memory usage, optimize data structures, implement memory pooling',
      })
    }

    // Analyze database performance
    const slowDBQueries = metrics.filter(m => m.databaseQueryTime > 1000) // > 1 second
    if (slowDBQueries.length > 0) {
      bottlenecks.push({
        type: 'database',
        severity: slowDBQueries.length > metrics.length * 0.05 ? 'high' : 'medium',
        description: 'Slow database queries detected',
        location: 'Database layer',
        impact: `${slowDBQueries.length} slow queries affecting performance`,
        solution: 'Add database indexes, optimize queries, implement query caching',
      })
    }

    return bottlenecks
  }

  private async generateRecommendations(
    bottlenecks: PerformanceBottleneck[],
    metrics: PerformanceMetrics[]
  ): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = []

    // Cache recommendations
    if (bottlenecks.some(b => b.type === 'endpoint' && b.severity === 'high')) {
      recommendations.push({
        priority: 'high',
        category: 'caching',
        title: 'Implement Response Caching',
        description: 'Cache frequently accessed API responses to reduce response times',
        estimatedImpact: '50-80% reduction in response time for cached endpoints',
        implementationEffort: 'medium',
        code: `// Example caching implementation
import { NextResponse } from 'next/server'

export async function GET() {
  // Check cache first
  const cached = await redis.get('cache-key')
  if (cached) {
    return NextResponse.json(JSON.parse(cached))
  }

  // Compute result
  const result = await expensiveOperation()

  // Cache result
  await redis.setex('cache-key', 300, JSON.stringify(result)) // 5 min TTL

  return NextResponse.json(result)
}`,
      })
    }

    // Database optimization recommendations
    if (bottlenecks.some(b => b.type === 'database')) {
      recommendations.push({
        priority: 'high',
        category: 'database',
        title: 'Add Database Indexes',
        description: 'Add indexes on frequently queried columns to improve query performance',
        estimatedImpact: '60-90% improvement in query performance',
        implementationEffort: 'low',
        code: `-- Example index creation
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);`,
      })
    }

    // Memory optimization recommendations
    if (bottlenecks.some(b => b.type === 'memory')) {
      recommendations.push({
        priority: 'medium',
        category: 'code',
        title: 'Optimize Memory Usage',
        description: 'Use streaming for large data, implement pagination, and optimize data structures',
        estimatedImpact: '30-60% reduction in memory usage',
        implementationEffort: 'high',
      })
    }

    // Architecture recommendations
    if (metrics.length > 1000) { // High traffic
      recommendations.push({
        priority: 'high',
        category: 'infrastructure',
        title: 'Implement Load Balancing',
        description: 'Distribute traffic across multiple server instances',
        estimatedImpact: 'Improved scalability and fault tolerance',
        implementationEffort: 'high',
      })
    }

    return recommendations
  }

  private calculateTrends(metrics: PerformanceMetrics[], timeframe: string): PerformanceTrend[] {
    const midPoint = new Date(Date.now() - this.getTimeframeMs(timeframe) / 2)
    const firstHalf = metrics.filter(m => m.timestamp < midPoint)
    const secondHalf = metrics.filter(m => m.timestamp >= midPoint)

    const calculateAverage = (data: PerformanceMetrics[], key: keyof PerformanceMetrics) => {
      if (data.length === 0) return 0
      return data.reduce((sum, m) => sum + (m[key] as number), 0) / data.length
    }

    const trends: PerformanceTrend[] = []

    // Response time trend
    const firstHalfAvg = calculateAverage(firstHalf, 'responseTime')
    const secondHalfAvg = calculateAverage(secondHalf, 'responseTime')
    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

    trends.push({
      metric: 'Average Response Time',
      current: secondHalfAvg,
      previous: firstHalfAvg,
      change,
      trend: Math.abs(change) < 5 ? 'stable' : change < 0 ? 'improving' : 'degrading',
      timeframe,
    })

    // Error rate trend
    const firstHalfErrors = firstHalf.filter(m => m.statusCode >= 400).length / firstHalf.length * 100
    const secondHalfErrors = secondHalf.filter(m => m.statusCode >= 400).length / secondHalf.length * 100

    trends.push({
      metric: 'Error Rate',
      current: secondHalfErrors,
      previous: firstHalfErrors,
      change: secondHalfErrors - firstHalfErrors,
      trend: secondHalfErrors < firstHalfErrors ? 'improving' : 'degrading',
      timeframe,
    })

    return trends
  }

  private async checkPerformanceAlerts(metric: PerformanceMetrics): Promise<void> {
    // Response time alert
    if (metric.responseTime > 10000) { // 10 seconds
      this.addAlert({
        level: 'critical',
        title: 'Critical Response Time',
        description: `${metric.endpoint} took ${metric.responseTime}ms to respond`,
        affectedEndpoints: [metric.endpoint],
        recommendedAction: 'Investigate immediately - check database queries, external API calls, and server resources',
        triggeredAt: new Date(),
      })
    } else if (metric.responseTime > 5000) { // 5 seconds
      this.addAlert({
        level: 'warning',
        title: 'Slow Response Time',
        description: `${metric.endpoint} took ${metric.responseTime}ms to respond`,
        affectedEndpoints: [metric.endpoint],
        recommendedAction: 'Monitor and optimize this endpoint',
        triggeredAt: new Date(),
      })
    }

    // High error rate
    if (metric.statusCode >= 500) {
      this.addAlert({
        level: 'error',
        title: 'Server Error',
        description: `${metric.endpoint} returned ${metric.statusCode}`,
        affectedEndpoints: [metric.endpoint],
        recommendedAction: 'Check server logs and fix the underlying issue',
        triggeredAt: new Date(),
      })
    }

    // High memory usage
    if (metric.memoryUsage > 1024 * 1024 * 1024) { // > 1GB
      this.addAlert({
        level: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage exceeded 1GB (${(metric.memoryUsage / 1024 / 1024 / 1024).toFixed(2)}GB)`,
        affectedEndpoints: [],
        recommendedAction: 'Monitor memory usage and consider optimization',
        triggeredAt: new Date(),
      })
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  private groupByEndpoint(metrics: PerformanceMetrics[]): Array<{ endpoint: string; metrics: PerformanceMetrics[] }> {
    const groups: Record<string, PerformanceMetrics[]> = {}

    metrics.forEach(metric => {
      if (!groups[metric.endpoint]) {
        groups[metric.endpoint] = []
      }
      groups[metric.endpoint].push(metric)
    })

    return Object.entries(groups).map(([endpoint, metrics]) => ({
      endpoint,
      metrics,
    }))
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics[], bottlenecks: PerformanceBottleneck[]): number {
    let score = 100

    // Response time penalties
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    if (avgResponseTime > 2000) score -= 20
    else if (avgResponseTime > 1000) score -= 10

    // Error rate penalties
    const errorRate = metrics.filter(m => m.statusCode >= 400).length / metrics.length
    score -= errorRate * 50

    // Bottleneck penalties
    score -= bottlenecks.length * 5

    return Math.max(0, Math.min(100, score))
  }

  private getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000
      case '24h': return 24 * 60 * 60 * 1000
      case '7d': return 7 * 24 * 60 * 60 * 1000
      case '30d': return 30 * 24 * 60 * 60 * 1000
      default: return 24 * 60 * 60 * 1000
    }
  }

  private async getEndpointOptimizations(metrics: PerformanceMetrics[], endpoint: string): Promise<string[]> {
    const suggestions: string[] = []

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length

    if (avgResponseTime > 2000) {
      suggestions.push('Consider implementing response caching')
      suggestions.push('Optimize database queries with proper indexing')
      suggestions.push('Implement pagination for large result sets')
    }

    const errorRate = metrics.filter(m => m.statusCode >= 400).length / metrics.length
    if (errorRate > 0.05) { // > 5% error rate
      suggestions.push('Improve error handling and input validation')
      suggestions.push('Add comprehensive error logging')
    }

    const highDBQueries = metrics.filter(m => m.databaseQueryTime > 500)
    if (highDBQueries.length > metrics.length * 0.1) {
      suggestions.push('Optimize database queries')
      suggestions.push('Consider implementing query result caching')
      suggestions.push('Review database schema and indexing')
    }

    return suggestions
  }

  private async parseOptimizationSuggestions(response: string): Promise<string[]> {
    // Split by numbered list or bullet points
    const suggestions = response
      .split(/\d+\.\s*/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim())

    return suggestions.length > 0 ? suggestions : [response]
  }

  private async storeMetricInDB(metric: PerformanceMetrics): Promise<void> {
    // Store in database for historical analysis
    await prisma.performanceMetric.create({
      data: {
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime,
        statusCode: metric.statusCode,
        memoryUsage: metric.memoryUsage,
        cpuUsage: metric.cpuUsage,
        databaseQueries: metric.databaseQueries,
        databaseQueryTime: metric.databaseQueryTime,
        cacheHitRate: metric.cacheHitRate,
        errorRate: metric.errorRate,
        recordedAt: metric.timestamp,
      },
    })
  }

  private getEmptyAnalysis(): PerformanceAnalysis {
    return {
      overallScore: 100,
      bottlenecks: [],
      recommendations: [],
      trends: [],
      alerts: [],
    }
  }
}

// Singleton
let performanceMonitorInstance: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor()
  }
  return performanceMonitorInstance
}
