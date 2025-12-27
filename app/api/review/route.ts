/**
 * AI Code Review API
 * Automated code review with intelligent suggestions
 */

import { NextRequest } from 'next/server'
import { performAICodeReview } from '@/lib/ai/code-reviewer'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
  repoId: z.string().cuid(),
  filePath: z.string().optional(), // Review specific file or entire repo
  options: z.object({
    includeSecurity: z.boolean().optional(),
    includePerformance: z.boolean().optional(),
    includeMaintainability: z.boolean().optional(),
    maxIssues: z.number().min(1).max(100).optional(),
  }).optional(),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, filePath, options } = await context.request.json()
    const data = reviewSchema.parse({ repoId, filePath, options })

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true, fullName: true },
    })

    if (!repo || repo.userId !== user.id) {
      throw new Error('Repository not found or access denied')
    }

    // Get the latest completed analysis job for the repo
    const analysisJob = await prisma.analysisJob.findFirst({
      where: { repoId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    })

    if (!analysisJob) {
      throw new Error('No completed analysis found. Please generate documentation first.')
    }

    // For now, we'll use a mock analysis result
    // In production, you'd store the actual analysis result
    const mockAnalysisResult = {
      functions: [],
      classes: [],
      apiRoutes: [],
      components: [],
      stats: { totalFiles: 10, totalLines: 1000, codeLines: 800 },
      securityIssues: [],
      vulnerabilities: [],
      securityScore: 85,
      qualityScore: 80,
      patterns: ['typescript', 'react', 'nextjs']
    }

    // Perform AI code review
    const reviewResult = await performAICodeReview(mockAnalysisResult)

    // Save review results
    await prisma.codeReview.create({
      data: {
        repoId,
        userId: user.id,
        filePath,
        overallScore: reviewResult.score,
        grade: reviewResult.grade,
        totalIssues: reviewResult.totalIssues,
        issuesByType: reviewResult.issuesByType as any,
        issuesBySeverity: reviewResult.issuesBySeverity as any,
        topIssues: reviewResult.topIssues as any,
        recommendations: reviewResult.recommendations as any,
        options: (options || {}) as any,
      },
    })

    return successResponse({
      review: reviewResult,
      repoName: repo.fullName,
    })
  },
  { requireAuth: true, methods: ['POST'] }
)

// Get review history for a repository
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const repoId = context.request.nextUrl.searchParams.get('repoId')

    if (!repoId) {
      throw new Error('repoId parameter required')
    }

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true },
    })

    if (!repo || repo.userId !== user.id) {
      throw new Error('Repository not found or access denied')
    }

    const reviews = await prisma.codeReview.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return successResponse({ reviews })
  },
  { requireAuth: true, methods: ['GET'] }
)
