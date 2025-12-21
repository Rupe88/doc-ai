import { GitHubService } from './service'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

/**
 * Setup webhook for a repository
 */
export async function setupRepositoryWebhook(
  repoId: string,
  accessToken: string
): Promise<number | null> {
  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    })

    if (!repo) {
      throw new Error('Repository not found')
    }

    const [owner, repoName] = repo.fullName.split('/')
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.warn('GitHub webhook secret not configured, skipping webhook setup')
      return null
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/webhook`
    const github = new GitHubService(accessToken)

    // Create webhook
    const webhookId = await github.createWebhook(owner, repoName, webhookUrl, webhookSecret)

    // Save webhook ID to database
    await prisma.repo.update({
      where: { id: repoId },
      data: { webhookId },
    })

    logger.info('Webhook created for repository', {
      repoId,
      repoName: repo.fullName,
      webhookId,
    })

    return webhookId
  } catch (error: any) {
    // If webhook already exists, try to get existing webhooks
    if (error.status === 422) {
      logger.warn('Webhook may already exist for repository', {
        repoId,
        error: error.message,
      })
      return null
    }

    logger.error('Failed to setup webhook', {
      repoId,
      error: error.message,
    })
    throw error
  }
}

/**
 * Remove webhook for a repository
 */
export async function removeRepositoryWebhook(
  repoId: string,
  accessToken: string
): Promise<void> {
  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    })

    if (!repo || !repo.webhookId) {
      return
    }

    const [owner, repoName] = repo.fullName.split('/')
    const github = new GitHubService(accessToken)

    await github.deleteWebhook(owner, repoName, repo.webhookId)

    await prisma.repo.update({
      where: { id: repoId },
      data: { webhookId: null },
    })

    logger.info('Webhook removed for repository', {
      repoId,
      repoName: repo.fullName,
    })
  } catch (error: any) {
    logger.error('Failed to remove webhook', {
      repoId,
      error: error.message,
    })
    // Don't throw - webhook removal is not critical
  }
}

