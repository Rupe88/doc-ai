import { NextRequest } from 'next/server'
import { CodeSearch } from '@/lib/search/code-search'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const codeSearch = new CodeSearch()

const definitionSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
  symbolName: z.string().min(1, 'Symbol name cannot be empty').max(100, 'Symbol name too long'),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, symbolName } = await getRequestBody(context, definitionSchema)

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

    // Find definition
    const location = await codeSearch.findDefinition(repoId, symbolName)

    if (!location) {
      throw new NotFoundError('Symbol')
    }

    return successResponse({
      location,
      symbol: symbolName,
    })
  },
  {
    requireAuth: true,
    methods: ['POST'],
  }
)

