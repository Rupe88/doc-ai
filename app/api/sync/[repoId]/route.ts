import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { JobProcessor } from '@/lib/queue/job-processor'
import { decrypt } from '@/lib/security/encryption'
import { createApiHandler, requireUser, getRouteParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, ValidationError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const jobProcessor = new JobProcessor()

const repoIdSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId } = getRouteParams(context, repoIdSchema)

    // Verify repo exists and user has access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: {
        user: {
          select: {
            subscriptionTier: true,
            githubToken: true,
          },
        },
      },
    })

    if (!repo) {
      throw new NotFoundError('Repository')
    }

    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Check if GitHub is connected
    if (!repo.user.githubToken) {
      throw new ValidationError('GitHub account not connected. Please connect your GitHub account first.')
    }

    // Parse repo owner and name
    const [owner, repoName] = repo.fullName.split('/')
    if (!owner || !repoName) {
      throw new ValidationError('Invalid repository format')
    }

    // Decrypt GitHub token
    const accessToken = decrypt(repo.user.githubToken)

    // Create analysis job
    const analysisJob = await prisma.analysisJob.create({
      data: {
        repoId: repo.id,
        status: 'PENDING',
        progress: 0,
      },
    })

    // Update repo status
    await prisma.repo.update({
      where: { id: repo.id },
      data: { status: 'ANALYZING' },
    })

    // Determine priority based on subscription tier
    const priority =
      repo.user.subscriptionTier === 'FREE' ? 3 :
      repo.user.subscriptionTier === 'PRO' ? 2 : 1

    // Enqueue sync job
    await jobProcessor.enqueue({
      type: 'sync',
      data: {
        jobId: analysisJob.id,
        repoId: repo.id,
        owner,
        repoName,
        branch: repo.defaultBranch,
        accessToken,
      },
      priority,
      maxAttempts: 3,
    })

    return successResponse({
      jobId: analysisJob.id,
      status: 'PENDING',
      message: 'Sync started successfully',
    })
  },
  {
    requireAuth: true,
    methods: ['POST'],
  }
)

