import { NextRequest } from 'next/server'
import { CodeSearch } from '@/lib/search/code-search'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const codeSearch = new CodeSearch()

const searchSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
  query: z.string().min(1, 'Search query cannot be empty').max(200, 'Search query too long'),
  type: z.enum(['function', 'class', 'file', 'all']).optional().default('all'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  useSemantic: z.boolean().optional().default(true),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, query, type, limit, useSemantic } = await getRequestBody(context, searchSchema)

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

    if (repo.status !== 'READY') {
      throw new Error('Repository documentation is not ready. Please generate docs first.')
    }

    // Perform search
    const results = await codeSearch.search(repoId, query, {
      type,
      limit,
      useSemantic,
    })

    return successResponse({
      results,
      count: results.length,
      query,
      filters: {
        type,
        limit,
        useSemantic,
      },
    })
  },
  {
    requireAuth: true,
    methods: ['POST'],
  }
)

