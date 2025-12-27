/**
 * Code Review Analytics - Real-time Analytics & Insights
 * Tracks code review metrics, user behavior, and system performance
 */

import { prisma } from '../db/prisma'
import { logger } from '../utils/logger'

export interface AnalyticsData {
  timestamp: Date
  metric: string
  value: number
  metadata?: Record<string, any>
  userId?: string
  repoId?: string
}

export interface CodeReviewMetrics {
  totalReviews: number
  averageSecurityScore: number
  averageQualityScore: number
  averagePerformanceScore: number
  averageMaintainabilityScore: number
  totalIssuesFound: number
  issuesBySeverity: Record<string, number>
  issuesByType: Record<string, number>
  mostCommonIssues: Array<{ issue: string; count: number }>
  reviewTrends: Array<{ date: string; reviews: number; avgScore: number }>
  userEngagement: {
    activeUsers: number
    averageReviewsPerUser: number
    topContributors: Array<{ userId: string; reviewCount: number }>
  }
}

export interface RealTimeMetrics {
  activeReviews: number
  reviewsInLastHour: number
  reviewsInLastDay: number
  averageReviewTime: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  recentIssues: Array<{
    repoId: string
    issueType: string
    severity: string
    timestamp: Date
  }>
}

export class CodeReviewAnalytics {
  private metricsBuffer: AnalyticsData[] = []
  private readonly BATCH_SIZE = 50

  /**
   * Track a code review event
   */
  async trackCodeReview(reviewData: {
    repoId: string
    userId: string
    reviewResult: any
    analysisTime: number
  }) {
    const { repoId, userId, reviewResult, analysisTime } = reviewData

    // Track main review metrics
    await this.trackMetric('code_review.completed', 1, {
      repoId,
      userId,
      totalIssues: reviewResult.summary.totalIssues,
      securityScore: reviewResult.summary.securityScore,
      qualityScore: reviewResult.summary.qualityScore,
      analysisTime,
    })

    // Track issue metrics
    await this.trackMetric('code_review.issues_found', reviewResult.summary.totalIssues, {
      repoId,
      userId,
      critical: reviewResult.summary.criticalCount,
      high: reviewResult.summary.highCount,
      medium: reviewResult.summary.mediumCount,
      low: reviewResult.summary.lowCount,
    })

    // Track AI suggestions
    if (reviewResult.analysis.aiSuggestionsCount > 0) {
      await this.trackMetric('code_review.ai_suggestions', reviewResult.analysis.aiSuggestionsCount, {
        repoId,
        userId,
      })
    }

    // Track individual issue types
    for (const issue of reviewResult.issues) {
      await this.trackMetric(`code_review.issue.${issue.type}`, 1, {
        repoId,
        userId,
        severity: issue.severity,
        category: issue.category,
      })
    }

    logger.info('📊 Code review analytics tracked', {
      repoId,
      userId,
      issuesFound: reviewResult.summary.totalIssues,
      analysisTime,
    })
  }

  /**
   * Track a generic metric
   */
  async trackMetric(
    metric: string,
    value: number,
    metadata: Record<string, any> = {}
  ) {
    const data: AnalyticsData = {
      timestamp: new Date(),
      metric,
      value,
      metadata,
      userId: metadata.userId,
      repoId: metadata.repoId,
    }

    this.metricsBuffer.push(data)

    // Batch insert when buffer is full
    if (this.metricsBuffer.length >= this.BATCH_SIZE) {
      await this.flushMetrics()
    }
  }

  /**
   * Flush metrics buffer to database
   */
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return

    try {
      const metrics = [...this.metricsBuffer]
      this.metricsBuffer = []

      // In a real implementation, you'd batch insert to a metrics table
      // For now, we'll log them (you can extend this to save to database)

      for (const metric of metrics) {
        logger.debug('📊 Metric tracked', {
          metric: metric.metric,
          value: metric.value,
          metadata: metric.metadata,
        })
      }

    } catch (error) {
      logger.error('Failed to flush metrics', { error })
      // Re-add failed metrics to buffer for retry
      this.metricsBuffer.unshift(...this.metricsBuffer.slice(-this.BATCH_SIZE))
    }
  }

  /**
   * Get comprehensive code review metrics
   */
  async getCodeReviewMetrics(
    timeRange: 'day' | 'week' | 'month' | 'all' = 'month'
  ): Promise<CodeReviewMetrics> {
    try {
      // Calculate date range
      const now = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'all':
          startDate.setFullYear(2020) // Far in the past
          break
      }

      // Get code reviews in time range
      const reviews = await prisma.codeReview.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          result: true,
          userId: true,
          repoId: true,
          createdAt: true,
        },
      })

      if (reviews.length === 0) {
        return this.getEmptyMetrics()
      }

      // Process review data
      const processedReviews = reviews.map(review => ({
        ...JSON.parse(review.result as string),
        userId: review.userId,
        repoId: review.repoId,
        createdAt: review.createdAt,
      }))

      return this.processReviewData(processedReviews, startDate)

    } catch (error) {
      logger.error('Failed to get code review metrics', { error })
      return this.getEmptyMetrics()
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Get recent reviews
      const recentReviews = await prisma.codeReview.findMany({
        where: {
          createdAt: {
            gte: oneDayAgo,
          },
        },
        select: {
          result: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      })

      const reviewsInLastHour = recentReviews.filter(r => r.createdAt >= oneHourAgo).length
      const reviewsInLastDay = recentReviews.length

      // Calculate average review time
      const reviewsWithTime = recentReviews
        .map(r => JSON.parse(r.result as string))
        .filter(r => r.analysis?.analysisTime)

      const averageReviewTime = reviewsWithTime.length > 0
        ? reviewsWithTime.reduce((sum, r) => sum + r.analysis.analysisTime, 0) / reviewsWithTime.length
        : 0

      // Determine system health
      const systemHealth = this.determineSystemHealth(reviewsInLastHour, averageReviewTime)

      // Get recent critical issues
      const recentIssues = this.extractRecentIssues(recentReviews.slice(0, 10))

      return {
        activeReviews: 0, // Would need to track active processes
        reviewsInLastHour,
        reviewsInLastDay,
        averageReviewTime: Math.round(averageReviewTime),
        systemHealth,
        recentIssues,
      }

    } catch (error) {
      logger.error('Failed to get real-time metrics', { error })
      return {
        activeReviews: 0,
        reviewsInLastHour: 0,
        reviewsInLastDay: 0,
        averageReviewTime: 0,
        systemHealth: 'critical',
        recentIssues: [],
      }
    }
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId: string): Promise<{
    totalReviews: number
    averageScore: number
    favoriteCategories: string[]
    reviewStreak: number
    improvement: number // Percentage improvement over time
  }> {
    try {
      const userReviews = await prisma.codeReview.findMany({
        where: { userId },
        select: { result: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })

      if (userReviews.length === 0) {
        return {
          totalReviews: 0,
          averageScore: 0,
          favoriteCategories: [],
          reviewStreak: 0,
          improvement: 0,
        }
      }

      const processedReviews = userReviews.map(review =>
        JSON.parse(review.result as string)
      )

      // Calculate metrics
      const totalReviews = processedReviews.length
      const averageScore = processedReviews.reduce((sum, r) =>
        sum + r.summary.overallScore, 0
      ) / totalReviews

      // Find favorite categories (most reviewed)
      const categoryCount: Record<string, number> = {}
      processedReviews.forEach(review => {
        review.issues.forEach((issue: any) => {
          categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1
        })
      })

      const favoriteCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category)

      // Calculate improvement (comparing first half vs second half)
      const midpoint = Math.floor(totalReviews / 2)
      const firstHalf = processedReviews.slice(0, midpoint)
      const secondHalf = processedReviews.slice(midpoint)

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, r) => sum + r.summary.overallScore, 0) / firstHalf.length
        : 0

      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, r) => sum + r.summary.overallScore, 0) / secondHalf.length
        : 0

      const improvement = firstHalfAvg > 0
        ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        : 0

      return {
        totalReviews,
        averageScore: Math.round(averageScore),
        favoriteCategories,
        reviewStreak: this.calculateStreak(userReviews),
        improvement,
      }

    } catch (error) {
      logger.error('Failed to get user analytics', { error, userId })
      return {
        totalReviews: 0,
        averageScore: 0,
        favoriteCategories: [],
        reviewStreak: 0,
        improvement: 0,
      }
    }
  }

  // Helper methods

  private getEmptyMetrics(): CodeReviewMetrics {
    return {
      totalReviews: 0,
      averageSecurityScore: 0,
      averageQualityScore: 0,
      averagePerformanceScore: 0,
      averageMaintainabilityScore: 0,
      totalIssuesFound: 0,
      issuesBySeverity: {},
      issuesByType: {},
      mostCommonIssues: [],
      reviewTrends: [],
      userEngagement: {
        activeUsers: 0,
        averageReviewsPerUser: 0,
        topContributors: [],
      },
    }
  }

  private processReviewData(reviews: any[], startDate: Date): CodeReviewMetrics {
    const totalReviews = reviews.length

    if (totalReviews === 0) return this.getEmptyMetrics()

    // Calculate averages
    const averageSecurityScore = reviews.reduce((sum, r) => sum + r.summary.securityScore, 0) / totalReviews
    const averageQualityScore = reviews.reduce((sum, r) => sum + r.summary.qualityScore, 0) / totalReviews
    const averagePerformanceScore = reviews.reduce((sum, r) => sum + r.summary.performanceScore, 0) / totalReviews
    const averageMaintainabilityScore = reviews.reduce((sum, r) => sum + r.summary.maintainabilityScore, 0) / totalReviews

    const totalIssuesFound = reviews.reduce((sum, r) => sum + r.summary.totalIssues, 0)

    // Aggregate issues by severity and type
    const issuesBySeverity: Record<string, number> = {}
    const issuesByType: Record<string, number> = {}
    const issueCount: Record<string, number> = {}

    reviews.forEach(review => {
      issuesBySeverity.critical = (issuesBySeverity.critical || 0) + review.summary.criticalCount
      issuesBySeverity.high = (issuesBySeverity.high || 0) + review.summary.highCount
      issuesBySeverity.medium = (issuesBySeverity.medium || 0) + review.summary.mediumCount
      issuesBySeverity.low = (issuesBySeverity.low || 0) + review.summary.lowCount

      review.issues.forEach((issue: any) => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1
        const issueKey = `${issue.type}:${issue.category}`
        issueCount[issueKey] = (issueCount[issueKey] || 0) + 1
      })
    })

    const mostCommonIssues = Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }))

    // Generate review trends (daily)
    const reviewTrends = this.generateReviewTrends(reviews, startDate)

    // User engagement metrics
    const userStats = this.calculateUserEngagement(reviews)

    return {
      totalReviews,
      averageSecurityScore: Math.round(averageSecurityScore),
      averageQualityScore: Math.round(averageQualityScore),
      averagePerformanceScore: Math.round(averagePerformanceScore),
      averageMaintainabilityScore: Math.round(averageMaintainabilityScore),
      totalIssuesFound,
      issuesBySeverity,
      issuesByType,
      mostCommonIssues,
      reviewTrends,
      userEngagement: userStats,
    }
  }

  private generateReviewTrends(reviews: any[], startDate: Date): Array<{ date: string; reviews: number; avgScore: number }> {
    const trends: Record<string, { count: number; totalScore: number }> = {}

    reviews.forEach(review => {
      const date = review.createdAt.toISOString().split('T')[0]
      if (!trends[date]) {
        trends[date] = { count: 0, totalScore: 0 }
      }
      trends[date].count++
      trends[date].totalScore += review.summary.overallScore
    })

    return Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        reviews: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
  }

  private calculateUserEngagement(reviews: any[]) {
    const userReviewCount: Record<string, number> = {}

    reviews.forEach(review => {
      userReviewCount[review.userId] = (userReviewCount[review.userId] || 0) + 1
    })

    const activeUsers = Object.keys(userReviewCount).length
    const totalReviews = reviews.length
    const averageReviewsPerUser = activeUsers > 0 ? totalReviews / activeUsers : 0

    const topContributors = Object.entries(userReviewCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, reviewCount: count }))

    return {
      activeUsers,
      averageReviewsPerUser: Math.round(averageReviewsPerUser * 10) / 10,
      topContributors,
    }
  }

  private calculateStreak(reviews: any[]): number {
    if (reviews.length === 0) return 0

    // Sort by date descending
    const sortedReviews = reviews.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const review of sortedReviews) {
      const reviewDate = new Date(review.createdAt)
      reviewDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - streak)

      if (reviewDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  private determineSystemHealth(reviewsInLastHour: number, averageReviewTime: number): 'healthy' | 'warning' | 'critical' {
    if (reviewsInLastHour === 0 && averageReviewTime === 0) return 'healthy'
    if (averageReviewTime > 300000) return 'critical' // 5+ minutes
    if (averageReviewTime > 120000) return 'warning'  // 2+ minutes
    return 'healthy'
  }

  private extractRecentIssues(recentReviews: any[]): Array<{
    repoId: string
    issueType: string
    severity: string
    timestamp: Date
  }> {
    const issues: Array<{
      repoId: string
      issueType: string
      severity: string
      timestamp: Date
    }> = []

    recentReviews.forEach(review => {
      const reviewData = JSON.parse(review.result as string)
      reviewData.issues.slice(0, 3).forEach((issue: any) => {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          issues.push({
            repoId: reviewData.metadata.repositoryId,
            issueType: issue.type,
            severity: issue.severity,
            timestamp: new Date(review.createdAt),
          })
        }
      })
    })

    return issues.slice(0, 10)
  }
}

// Singleton
let analyticsInstance: CodeReviewAnalytics | null = null

export function getCodeReviewAnalytics(): CodeReviewAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new CodeReviewAnalytics()

    // Flush metrics on process exit
    process.on('exit', () => {
      analyticsInstance?.flushMetrics()
    })

    // Flush metrics periodically (every 5 minutes)
    setInterval(() => {
      analyticsInstance?.flushMetrics()
    }, 5 * 60 * 1000)
  }

  return analyticsInstance
}
