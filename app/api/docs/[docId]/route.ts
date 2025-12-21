import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser, getRouteParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const docIdSchema = z.object({
  docId: z.string().cuid('Invalid document ID'),
})

export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { docId } = getRouteParams(context, docIdSchema)

    // Get doc with repo info
    const doc = await prisma.doc.findUnique({
      where: { id: docId },
      include: {
        repo: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    })

    if (!doc) {
      throw new NotFoundError('Document')
    }

    // Check user has access to the repo
    checkResourceAccess(user.id, doc.repo.userId, 'Document')

    return successResponse({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      type: doc.type,
      filePath: doc.filePath,
      lineStart: doc.lineStart,
      lineEnd: doc.lineEnd,
      version: doc.version,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

