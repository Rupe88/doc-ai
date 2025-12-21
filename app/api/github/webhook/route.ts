import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/**
 * GitHub Webhook Handler
 * Automatically syncs documentation when code is pushed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.warn('[Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    // Handle different event types
    switch (event) {
      case 'push':
        return handlePushEvent(payload)
      case 'pull_request':
        return handlePREvent(payload)
      case 'repository':
        return handleRepoEvent(payload)
      default:
        console.log(`[Webhook] Ignoring event: ${event}`)
        return NextResponse.json({ message: 'Event ignored' })
    }
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePushEvent(payload: any) {
  const { repository, ref, commits, pusher } = payload
  const repoFullName = repository.full_name
  const branch = ref.replace('refs/heads/', '')

  console.log(`[Webhook] Push to ${repoFullName}:${branch} by ${pusher?.name}`)

  // Find the repo in our database
  const repo = await prisma.repo.findFirst({
    where: {
      fullName: repoFullName,
      defaultBranch: branch,
    },
  })

  if (!repo) {
    console.log(`[Webhook] Repo not found: ${repoFullName}`)
    return NextResponse.json({ message: 'Repository not tracked' })
  }

  // Get changed files
  const changedFiles = new Set<string>()
  for (const commit of commits || []) {
    for (const file of [...(commit.added || []), ...(commit.modified || [])]) {
      changedFiles.add(file)
    }
  }

  // Check if any code files changed (not just docs/config)
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java']
  const hasCodeChanges = Array.from(changedFiles).some(f => 
    codeExtensions.some(ext => f.endsWith(ext))
  )

  if (!hasCodeChanges) {
    console.log(`[Webhook] No code changes, skipping sync`)
    return NextResponse.json({ message: 'No code changes detected' })
  }

  // Mark repo for re-sync
  await prisma.repo.update({
    where: { id: repo.id },
    data: {
      status: 'PENDING_SYNC',
      lastSyncedAt: new Date(),
    },
  })

  // Create sync job
  await prisma.analysisJob.create({
    data: {
      repoId: repo.id,
      status: 'PENDING',
      progress: 0,
    },
  })

  console.log(`[Webhook] Created sync job for ${repoFullName}`)

  return NextResponse.json({
    message: 'Sync scheduled',
    changedFiles: changedFiles.size,
    repoId: repo.id,
  })
}

async function handlePREvent(payload: any) {
  const { action, pull_request, repository } = payload
  const repoFullName = repository.full_name

  console.log(`[Webhook] PR ${action} on ${repoFullName}: ${pull_request?.title}`)

  // Could add PR-specific features like:
  // - Generate diff documentation
  // - Security scan on PR changes
  // - Code quality check

  return NextResponse.json({ message: 'PR event received' })
}

async function handleRepoEvent(payload: any) {
  const { action, repository } = payload
  const repoFullName = repository.full_name

  console.log(`[Webhook] Repo ${action}: ${repoFullName}`)

  if (action === 'deleted') {
    // Clean up when repo is deleted
    const repo = await prisma.repo.findFirst({
      where: { fullName: repoFullName },
    })

    if (repo) {
      await prisma.doc.deleteMany({ where: { repoId: repo.id } })
      await prisma.repo.delete({ where: { id: repo.id } })
      console.log(`[Webhook] Cleaned up deleted repo: ${repoFullName}`)
    }
  }

  return NextResponse.json({ message: 'Repo event processed' })
}
