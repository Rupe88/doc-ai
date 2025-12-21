import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { publicUrl: string } }
) {
  try {
    const doc = await prisma.doc.findUnique({
      where: { publicUrl: params.publicUrl },
      include: {
        repo: {
          select: {
            name: true,
            fullName: true,
          },
        },
      },
    })

    if (!doc || !doc.isPublic) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      type: doc.type,
      repo: doc.repo,
      updatedAt: doc.updatedAt,
    })
  } catch (error) {
    console.error('Get public doc error:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

