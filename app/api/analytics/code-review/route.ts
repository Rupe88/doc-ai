/**
 * Code Review Analytics API - Real-time Analytics & Insights
 * Provides comprehensive analytics for code review usage and performance
 */

import { NextRequest } from 'next/server'
import { getCodeReviewAnalytics } from '@/lib/analytics/code-review-analytics'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'
import { z } from 'zod'

const analyticsSchema = z.object({
  timeRange: z.enum(['day', 'week', 'month', 'all']).optional().default('month'),
})

// Get comprehensive code review analytics
export const GET = createApiHandler(
  async (context) => {
    await requireUser(context)
    const timeRange = context.request.nextUrl.searchParams.get('timeRange') as 'day' | 'week' | 'month' | 'all' || 'month'

    const analytics = getCodeReviewAnalytics()

    try {
      const [metrics, realTimeMetrics] = await Promise.all([
        analytics.getCodeReviewMetrics(timeRange),
        analytics.getRealTimeMetrics(),
      ])

      return successResponse({
        metrics,
        realTime: realTimeMetrics,
        timeRange,
        generatedAt: new Date(),
      })

    } catch (error) {
      console.error('Failed to get analytics:', error)
      throw new Error('Analytics generation failed')
    }
  },
  { requireAuth: true, methods: ['GET'] }
)

// Track a custom analytics event
export const POST = createApiHandler(
  async (context) => {
    const user = await requireUser(context)
    const { metric, value, metadata } = await context.request.json()

    if (!metric || typeof value !== 'number') {
      throw new Error('Invalid analytics data')
    }

    const analytics = getCodeReviewAnalytics()

    try {
      await analytics.trackMetric(metric, value, {
        ...metadata,
        userId: user.id,
        timestamp: new Date(),
      })

      return successResponse({
        tracked: true,
        metric,
        value,
      })

    } catch (error) {
      console.error('Failed to track analytics:', error)
      throw new Error('Analytics tracking failed')
    }
  },
  { requireAuth: true, methods: ['POST'] }
)
