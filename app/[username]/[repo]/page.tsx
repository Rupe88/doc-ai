import { prisma } from '@/lib/db/prisma'
import { DocViewer } from '@/components/docs/DocViewer'
import { notFound } from 'next/navigation'

export const revalidate = 86400

export default async function PublicDocPage({
  params,
}: {
  params: { username: string; repo: string }
}) {
  const doc = await prisma.doc.findFirst({
    where: {
      publicUrl: `${params.username}/${params.repo}`,
      isPublic: true,
    },
    include: {
      repo: true,
    },
  })

  if (!doc) {
    notFound()
  }

  return (
    <div className="container mx-auto p-8">
      <DocViewer content={doc.content} title={doc.title} />
    </div>
  )
}

