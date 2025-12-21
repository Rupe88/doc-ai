import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRouteParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const jobIdSchema = z.object({
  jobId: z.string().cuid('Invalid job ID'),
})

export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { jobId } = getRouteParams(context, jobIdSchema)

    // Get job with repo
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        repo: {
          select: {
            id: true,
            userId: true,
            name: true,
            fullName: true,
          },
        },
      },
    })

    if (!job) {
      throw new NotFoundError('Job')
    }

    checkResourceAccess(user.id, job.repo.userId, 'Job')

    return successResponse({
      id: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      repo: {
        id: job.repo.id,
        name: job.repo.name,
        fullName: job.repo.fullName,
      },
    })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

