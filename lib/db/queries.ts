import { prisma } from './prisma'

export async function getUserRepos(userId: string, page: number = 1, pageSize: number = 20) {
  return prisma.repo.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      fullName: true,
      description: true,
      language: true,
      status: true,
      lastSyncedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getRepoWithDocs(repoId: string, userId: string) {
  return prisma.repo.findUnique({
    where: { id: repoId },
    include: {
      docs: {
        take: 50,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          filePath: true,
          isPublic: true,
          publicUrl: true,
          updatedAt: true,
        },
      },
    },
  })
}

export async function getUserStats(userId: string) {
  const [totalDocs, reposWithDocs, totalRepos] = await Promise.all([
    prisma.doc.count({ where: { userId } }),
    prisma.doc.groupBy({
      by: ['repoId'],
      where: { userId },
      _count: true,
    }),
    prisma.repo.count({ where: { userId } }),
  ])

  return {
    totalDocs,
    reposWithDocs: reposWithDocs.length,
    totalRepos,
  }
}

