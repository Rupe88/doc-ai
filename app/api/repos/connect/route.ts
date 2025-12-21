import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { GitHubService } from '@/lib/github/service'
import { decrypt } from '@/lib/security/encryption'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, ValidationError, ExternalServiceError, NotFoundError } from '@/lib/utils/error-handler'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { TIER_LIMITS } from '@/lib/paddle/subscriptions'

const connectRepoSchema = z.object({
  githubRepoId: z.number().int().positive('Invalid repository ID'),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)

    // Check if GitHub is connected
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { githubToken: true, subscriptionTier: true },
    })

    if (!userData || !userData.githubToken) {
      throw new ValidationError('GitHub account not connected. Please connect your GitHub account first.')
    }

    // Parse request body
    const body = await getRequestBody(context, connectRepoSchema)
    const { githubRepoId } = body

    // Check subscription limits
    const tier = userData.subscriptionTier as keyof typeof TIER_LIMITS
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE
    const userRepoCount = await prisma.repo.count({
      where: { userId: user.id },
    })

    if (limits.repos !== -1 && userRepoCount >= limits.repos) {
      throw new ValidationError(
        `You've reached your repository limit (${limits.repos}) for the ${tier} plan. Upgrade to connect more repositories.`
      )
    }

    // Check if repo is already connected
    const existingRepo = await prisma.repo.findFirst({
      where: {
        userId: user.id,
        githubRepoId,
      },
    })

    if (existingRepo) {
      return successResponse({
        repo: existingRepo,
        message: 'Repository already connected',
      })
    }

    try {
      // Decrypt GitHub token
      const accessToken = decrypt(userData.githubToken)
      const github = new GitHubService(accessToken)

      // Get repository details from GitHub
      const githubRepos = await github.getRepositories()
      const githubRepo = githubRepos.find(r => r.id === githubRepoId)

      if (!githubRepo) {
        throw new NotFoundError('GitHub repository')
      }

      // Parse owner and repo name from full_name
      const [owner, repoName] = githubRepo.full_name.split('/')
      if (!owner || !repoName) {
        throw new ValidationError('Invalid repository format')
      }

      // Get default branch
      const repoDetails = await github.getRepository(owner, repoName)
      const defaultBranch = repoDetails.default_branch || 'main'

      // Create repository record
      const repo = await prisma.repo.create({
        data: {
          userId: user.id,
          githubRepoId: githubRepo.id,
          name: githubRepo.name,
          fullName: githubRepo.full_name,
          description: githubRepo.description || null,
          language: githubRepo.language || null,
          isPrivate: githubRepo.private,
          defaultBranch,
          status: 'PENDING',
        },
      })

      logger.info('Repository connected', {
        userId: user.id,
        repoId: repo.id,
        githubRepoId,
        repoName: githubRepo.full_name,
      })

      // Optionally setup webhook (async, don't wait)
      if (process.env.GITHUB_WEBHOOK_SECRET) {
        try {
          const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/webhook`
          const webhookId = await github.createWebhook(
            owner,
            repoName,
            webhookUrl,
            process.env.GITHUB_WEBHOOK_SECRET
          )

          await prisma.repo.update({
            where: { id: repo.id },
            data: { webhookId },
          })

          logger.info('Webhook created for repository', {
            repoId: repo.id,
            webhookId,
          })
        } catch (webhookError) {
          // Log but don't fail - webhook is optional
          logger.warn('Failed to create webhook', {
            repoId: repo.id,
            error: webhookError instanceof Error ? webhookError.message : String(webhookError),
          })
        }
      }

      return successResponse({
        repo,
        message: 'Repository connected successfully',
      })
    } catch (error) {
      logger.error('Failed to connect repository', {
        userId: user.id,
        githubRepoId,
        error: error instanceof Error ? error.message : String(error),
      })

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }

      throw new ExternalServiceError('GitHub', 'Failed to connect repository')
    }
  },
  {
    requireAuth: true,
    methods: ['POST'],
  }
)

