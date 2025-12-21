import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { GitHubService } from '@/lib/github/service'
import { decrypt } from '@/lib/security/encryption'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse, ValidationError, ExternalServiceError } from '@/lib/utils/error-handler'

export const dynamic = 'force-dynamic'

export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)

    // Check if GitHub is connected
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { githubToken: true },
    })

    if (!userData || !userData.githubToken) {
      throw new ValidationError('GitHub account not connected. Please connect your GitHub account first.')
    }

    try {
      // Decrypt and use GitHub token
      const accessToken = decrypt(userData.githubToken)
      const github = new GitHubService(accessToken)
      const repos = await github.getRepositories()

      // Get user's connected repos with their internal IDs
      const userRepos = await prisma.repo.findMany({
        where: { userId: user.id },
        select: { 
          id: true,           // Internal database ID (CUID)
          githubRepoId: true, // GitHub repo ID (number)
          status: true,
          lastSyncedAt: true,
        },
      })

      // Create a map: GitHub repo ID -> Internal repo data
      const connectedReposMap = new Map(
        userRepos.map(r => [r.githubRepoId, r])
      )

      // Add connection status and internal ID to each repo
      const reposWithStatus = repos.map(repo => {
        const connectedRepo = connectedReposMap.get(repo.id)
        return {
          ...repo,
          connected: !!connectedRepo,
          internalId: connectedRepo?.id || null, // Internal database ID
          status: connectedRepo?.status || null,
          lastSyncedAt: connectedRepo?.lastSyncedAt || null,
        }
      })

      return successResponse({
        repos: reposWithStatus,
        count: reposWithStatus.length,
        connected: connectedReposMap.size,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('GitHub')) {
        throw new ExternalServiceError('GitHub', error.message)
      }
      throw error
    }
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

