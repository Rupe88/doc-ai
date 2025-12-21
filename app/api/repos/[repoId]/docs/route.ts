import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRouteParams, getQueryParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const repoIdSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
})

export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId } = getRouteParams(context, repoIdSchema)
    
    // Parse query params manually
    const searchParams = context.request.nextUrl.searchParams
    const type = searchParams.get('type') as 'FUNCTION' | 'CLASS' | 'API' | 'ARCHITECTURE' | 'OVERVIEW' | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100)

    // Verify repo exists and user has access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    })

    if (!repo) {
      throw new NotFoundError('Repository')
    }

    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Build where clause
    const where: any = { repoId }
    if (type) {
      where.type = type
    }

    // Get total count
    const total = await prisma.doc.count({ where })

    // Get docs with pagination - INCLUDE CONTENT for display
    const docs = await prisma.doc.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true, // Include content for immediate display
        type: true,
        filePath: true,
        lineStart: true,
        lineEnd: true,
        metadata: true,
        version: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return successResponse({
      docs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

