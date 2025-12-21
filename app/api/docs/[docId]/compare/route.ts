import { NextRequest, NextResponse } from 'next/server'
import { DocVersionControl } from '@/lib/version-control/doc-version'
import { requireAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const versionControl = new DocVersionControl()

const compareSchema = z.object({
  version1: z.number().int().positive(),
  version2: z.number().int().positive(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const body = await request.json()
    const { version1, version2 } = compareSchema.parse(body)

    // Verify doc ownership
    const doc = await prisma.doc.findUnique({
      where: { id: params.docId },
      include: { repo: true },
    })

    if (!doc || doc.repo.userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const diff = await versionControl.compareVersions(params.docId, version1, version2)

    return NextResponse.json({ diff })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Compare versions error:', error)
    return NextResponse.json({ error: 'Failed to compare versions' }, { status: 500 })
  }
}

