/**
 * User Analytics API - Personal Code Review Insights
 * Provides personalized analytics for individual users
 */

import { NextRequest } from 'next/server'
import { getCodeReviewAnalytics } from '@/lib/analytics/code-review-analytics'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'

export const GET = createApiHandler(
  async (context) => {
    const user = await requireUser(context)

    const analytics = getCodeReviewAnalytics()

    try {
      const userAnalytics = await analytics.getUserAnalytics(user.id)

      return successResponse({
        userAnalytics,
        userId: user.id,
        generatedAt: new Date(),
      })

    } catch (error) {
      console.error('Failed to get user analytics:', error)
      throw new Error('User analytics generation failed')
    }
  },
  { requireAuth: true, methods: ['GET'] }
)
