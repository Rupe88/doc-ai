import { NextRequest, NextResponse } from 'next/server'
import { DocVersionControl } from '@/lib/version-control/doc-version'
import { requireAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const versionControl = new DocVersionControl()

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string; version: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const version = parseInt(params.version)
    if (isNaN(version)) {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
    }

    // Verify doc ownership
    const doc = await prisma.doc.findUnique({
      where: { id: params.docId },
      include: { repo: true },
    })

    if (!doc || doc.repo.userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const versionData = await versionControl.getVersion(params.docId, version)

    if (!versionData) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({ version: versionData })
  } catch (error) {
    console.error('Get version error:', error)
    return NextResponse.json({ error: 'Failed to get version' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { docId: string; version: string } }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.response) {
      return authResult.response
    }

    const version = parseInt(params.version)
    if (isNaN(version)) {
      return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
    }

    // Verify doc ownership
    const doc = await prisma.doc.findUnique({
      where: { id: params.docId },
      include: { repo: true },
    })

    if (!doc || doc.repo.userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await versionControl.revertToVersion(params.docId, version)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revert version error:', error)
    return NextResponse.json({ error: 'Failed to revert version' }, { status: 500 })
  }
}

