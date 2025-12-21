import { NextRequest, NextResponse } from 'next/server'
import { DocVersionControl } from '@/lib/version-control/doc-version'
import { requireAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'

const versionControl = new DocVersionControl()

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    // Verify doc ownership
    const doc = await prisma.doc.findUnique({
      where: { id: params.docId },
      include: { repo: true },
    })

    if (!doc || doc.repo.userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const history = await versionControl.getHistory(params.docId)

    return NextResponse.json({ versions: history })
  } catch (error) {
    console.error('Get versions error:', error)
    return NextResponse.json({ error: 'Failed to get versions' }, { status: 500 })
  }
}

