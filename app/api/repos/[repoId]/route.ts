import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRouteParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const paramsSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
})

// GET /api/repos/[repoId] - Get single repository
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const params = getRouteParams(context, paramsSchema)

    const repo = await prisma.repo.findUnique({
      where: { id: params.repoId },
      include: {
        _count: {
          select: {
            docs: true,
          },
        },
      },
    })

    if (!repo) {
      throw new NotFoundError('Repository')
    }

    checkResourceAccess(user.id, repo.userId, 'Repository')

    return successResponse({
      id: repo.id,
      githubId: repo.githubRepoId,
      name: repo.name,
      fullName: repo.fullName,
      url: `https://github.com/${repo.fullName}`,
      description: repo.description,
      language: repo.language,
      defaultBranch: repo.defaultBranch,
      status: repo.status,
      lastSyncedAt: repo.lastSyncedAt,
      docsCount: repo._count.docs,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

// DELETE /api/repos/[repoId] - Disconnect repository
export const DELETE = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const params = getRouteParams(context, paramsSchema)

    const repo = await prisma.repo.findUnique({
      where: { id: params.repoId },
    })

    if (!repo) {
      throw new NotFoundError('Repository')
    }

    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Delete all related data
    await prisma.$transaction([
      prisma.doc.deleteMany({ where: { repoId: params.repoId } }),
      prisma.chatSession.deleteMany({ where: { repoId: params.repoId } }),
      prisma.analysisJob.deleteMany({ where: { repoId: params.repoId } }),
      prisma.repo.delete({ where: { id: params.repoId } }),
    ])

    return successResponse({ message: 'Repository disconnected successfully' })
  },
  {
    requireAuth: true,
    methods: ['DELETE'],
  }
)

