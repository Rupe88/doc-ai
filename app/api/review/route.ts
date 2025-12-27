/**
 * AI Code Review API - Advanced Code Analysis & Recommendations
 * Provides comprehensive code review with security, quality, and performance analysis
 * Includes real-time analytics and AI-powered improvement suggestions
 */

import { NextRequest } from 'next/server'
import { getAICodeReviewer } from '@/lib/ai/code-reviewer'
import { getCodeReviewAnalytics } from '@/lib/analytics/code-review-analytics'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const reviewSchema = z.object({
  repoId: z.string().cuid(),
  analysis: z.any(), // ComprehensiveAnalysis object
  options: z.object({
    includeAISuggestions: z.boolean().optional().default(true),
    severityThreshold: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
    categories: z.array(z.string()).optional(),
    maxIssues: z.number().optional(),
    includeTrends: z.boolean().optional().default(false),
  }).optional(),
})

// Get existing code review for a repository
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const repoId = context.params?.repoId

    if (!repoId) {
      throw new Error('Repository ID is required')
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true, fullName: true },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Check if we have a cached review result
    const cachedReview = await prisma.codeReview.findFirst({
      where: {
        repoId,
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (cachedReview) {
      return successResponse({
        reviewResult: JSON.parse(cachedReview.result as string),
        cached: true,
        lastReviewed: cachedReview.createdAt,
      })
    }

    return successResponse({
      message: 'No cached review found. Please run a new code review.',
      cached: false,
    })
  },
  { requireAuth: true, methods: ['GET'] }
)

// Run comprehensive AI code review
export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, analysis, options = {} } = await getRequestBody(context, reviewSchema)

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true, fullName: true },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    logger.info('🚀 Starting comprehensive AI code review', {
      repoId,
      repoName: repo.fullName,
      userId: user.id,
      options
    })

    const reviewer = getAICodeReviewer()

    try {
      const reviewResult = await reviewer.reviewCodebase(
        repoId,
        repo.fullName,
        analysis,
        {
          includeAISuggestions: options.includeAISuggestions ?? true,
          severityThreshold: options.severityThreshold,
          categories: options.categories,
          maxIssues: options.maxIssues,
          includeTrends: options.includeTrends ?? false,
        }
      )

      // Cache the review result
      await prisma.codeReview.create({
        data: {
          repoId,
          userId: user.id,
          result: JSON.stringify(reviewResult),
          summary: {
            totalIssues: reviewResult.summary.totalIssues,
            criticalIssues: reviewResult.summary.criticalCount,
            highIssues: reviewResult.summary.highCount,
            securityScore: reviewResult.summary.securityScore,
            qualityScore: reviewResult.summary.qualityScore,
          },
        },
      })

      // Track analytics
      const analytics = getCodeReviewAnalytics()
      await analytics.trackCodeReview({
        repoId,
        userId: user.id,
        reviewResult,
        analysisTime: reviewResult.analysis.analysisTime,
      })

      logger.info('✅ AI code review completed and cached', {
        repoId,
        totalIssues: reviewResult.summary.totalIssues,
        analysisTime: reviewResult.analysis.analysisTime,
        aiSuggestions: reviewResult.analysis.aiSuggestionsCount,
      })

      return successResponse({
        reviewResult,
        cached: false,
        analysisTime: reviewResult.analysis.analysisTime,
      })

    } catch (error) {
      logger.error('❌ AI code review failed', {
        error: error instanceof Error ? error.message : String(error),
        repoId,
        userId: user.id,
      })

      throw new Error('Code review analysis failed. Please try again.')
    }
  },
  { requireAuth: true, methods: ['POST'] }
)
