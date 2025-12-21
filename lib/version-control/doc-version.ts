import { prisma } from '@/lib/db/prisma'
import { diffLines } from 'diff'

export interface DocVersionInfo {
  id: string
  version: number
  content: string
  commitSha: string | null
  branch: string | null
  changeType: string
  createdAt: Date
  diff?: string
}

export interface VersionDiff {
  added: string[]
  removed: string[]
  modified: string[]
}

export class DocVersionControl {
  /**
   * Create a new version of a document
   */
  async createVersion(
    docId: string,
    content: string,
    commitSha?: string,
    branch?: string
  ): Promise<DocVersionInfo> {
    // Get current doc
    const doc = await prisma.doc.findUnique({
      where: { id: docId },
    })

    if (!doc) {
      throw new Error('Document not found')
    }

    // Get latest version
    const latestVersion = await prisma.docVersion.findFirst({
      where: { docId },
      orderBy: { version: 'desc' },
    })

    const newVersion = (latestVersion?.version || doc.version) + 1

    // Calculate diff
    const oldContent = latestVersion?.content || doc.content
    const changeType = latestVersion ? 'UPDATED' : 'CREATED'
    const diff = this.calculateDiff(oldContent, content)

    // Create version record
    const version = await prisma.docVersion.create({
      data: {
        docId,
        version: newVersion,
        content,
        commitSha: commitSha || null,
        branch: branch || null,
        changeType,
        diff: diff as any,
      },
    })

    // Update doc version
    await prisma.doc.update({
      where: { id: docId },
      data: {
        version: newVersion,
        commitSha: commitSha || null,
        branch: branch || null,
      },
    })

    return {
      id: version.id,
      version: version.version,
      content: version.content,
      commitSha: version.commitSha,
      branch: version.branch,
      changeType: version.changeType,
      createdAt: version.createdAt,
      diff: JSON.stringify(diff),
    }
  }

  /**
   * Get version history for a document
   */
  async getHistory(docId: string): Promise<DocVersionInfo[]> {
    const versions = await prisma.docVersion.findMany({
      where: { docId },
      orderBy: { version: 'desc' },
    })

    return versions.map(v => ({
      id: v.id,
      version: v.version,
      content: v.content,
      commitSha: v.commitSha,
      branch: v.branch,
      changeType: v.changeType,
      createdAt: v.createdAt,
      diff: v.diff ? JSON.stringify(v.diff) : undefined,
    }))
  }

  /**
   * Get a specific version
   */
  async getVersion(docId: string, version: number): Promise<DocVersionInfo | null> {
    const versionRecord = await prisma.docVersion.findUnique({
      where: {
        docId_version: {
          docId,
          version,
        },
      },
    })

    if (!versionRecord) {
      return null
    }

    return {
      id: versionRecord.id,
      version: versionRecord.version,
      content: versionRecord.content,
      commitSha: versionRecord.commitSha,
      branch: versionRecord.branch,
      changeType: versionRecord.changeType,
      createdAt: versionRecord.createdAt,
      diff: versionRecord.diff ? JSON.stringify(versionRecord.diff) : undefined,
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    docId: string,
    version1: number,
    version2: number
  ): Promise<VersionDiff> {
    const v1 = await this.getVersion(docId, version1)
    const v2 = await this.getVersion(docId, version2)

    if (!v1 || !v2) {
      throw new Error('Version not found')
    }

    return this.calculateDiff(v1.content, v2.content)
  }

  /**
   * Revert to a specific version
   */
  async revertToVersion(docId: string, version: number): Promise<void> {
    const versionRecord = await this.getVersion(docId, version)

    if (!versionRecord) {
      throw new Error('Version not found')
    }

    // Create new version with old content
    await this.createVersion(docId, versionRecord.content)
  }

  /**
   * Calculate diff between two content strings
   */
  private calculateDiff(oldContent: string, newContent: string): VersionDiff {
    const changes = diffLines(oldContent, newContent)
    const added: string[] = []
    const removed: string[] = []
    const modified: string[] = []

    for (const change of changes) {
      const lines = change.value.split('\n').filter(l => l !== '')
      
      if (change.added) {
        added.push(...lines)
      } else if (change.removed) {
        removed.push(...lines)
      } else if (change.value.trim()) {
        // Modified lines (simplified - in reality would need more sophisticated diff)
        modified.push(...lines)
      }
    }

    return { added, removed, modified }
  }

  /**
   * Get docs for a specific branch
   */
  async getBranchDocs(repoId: string, branch: string): Promise<any[]> {
    const docs = await prisma.doc.findMany({
      where: {
        repoId,
        branch,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    return docs
  }

  /**
   * Get docs for a specific commit
   */
  async getCommitDocs(repoId: string, commitSha: string): Promise<any[]> {
    const docs = await prisma.doc.findMany({
      where: {
        repoId,
        commitSha,
      },
      include: {
        versions: {
          where: { commitSha },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    return docs
  }
}

