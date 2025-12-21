import crypto from 'crypto'
import type { GitHubWebhookPayload } from '@/types/github'

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = 'sha256=' + hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export function parseWebhookPayload(payload: any): GitHubWebhookPayload {
  return payload as GitHubWebhookPayload
}

export function extractRepoInfo(payload: GitHubWebhookPayload): {
  repoId: number
  repoName: string
  fullName: string
  commitSha: string | null
} | null {
  if (!payload.repository) {
    return null
  }

  return {
    repoId: payload.repository.id,
    repoName: payload.repository.name,
    fullName: payload.repository.full_name,
    commitSha: payload.head_commit?.id || null,
  }
}

export function hasCodeChanges(payload: GitHubWebhookPayload): boolean {
  if (!payload.commits || payload.commits.length === 0) {
    return false
  }

  return payload.commits.some(commit => 
    commit.added.length > 0 || 
    commit.modified.length > 0 || 
    commit.removed.length > 0
  )
}

