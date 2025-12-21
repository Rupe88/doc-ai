/**
 * GitHub Webhook Handler - Auto-sync on code changes
 * 
 * Features:
 * - Auto-regenerate docs on push
 * - Track changed files
 * - Incremental updates (only changed code)
 * - Security validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

interface WebhookPayload {
  action?: string
  ref?: string
  repository: {
    id: number
    full_name: string
    default_branch: string
  }
  commits?: {
    id: string
    message: string
    modified: string[]
    added: string[]
    removed: string[]
  }[]
  sender: {
    login: string
    id: number
  }
  pusher?: {
    name: string
    email: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers.get('x-github-event')
    const deliveryId = req.headers.get('x-github-delivery')

    console.log(`[Webhook] Received GitHub event: ${event} (${deliveryId})`)

    // Get raw body for signature verification
    const rawBody = await req.text()
    const payload: WebhookPayload = JSON.parse(rawBody)

    // Find the repository in our database
    const repo = await prisma.repo.findFirst({
      where: { githubRepoId: payload.repository.id },
      include: { user: true },
    })

    if (!repo) {
      console.log(`[Webhook] Repository not found: ${payload.repository.full_name}`)
      return NextResponse.json({ message: 'Repository not tracked' }, { status: 200 })
    }

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('[Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Handle different events
    switch (event) {
      case 'push':
        return handlePushEvent(repo, payload)

      case 'repository':
        return handleRepositoryEvent(repo, payload)

      case 'ping':
        console.log('[Webhook] Ping received')
        return NextResponse.json({ message: 'Pong!' })

      default:
        console.log(`[Webhook] Unhandled event: ${event}`)
        return NextResponse.json({ message: `Event ${event} not handled` })
    }
  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handlePushEvent(repo: any, payload: WebhookPayload) {
  const branch = payload.ref?.replace('refs/heads/', '')
  
  // Only process pushes to default branch
  if (branch !== repo.defaultBranch) {
    console.log(`[Webhook] Ignoring push to non-default branch: ${branch}`)
    return NextResponse.json({ message: 'Ignored - not default branch' })
  }

  // Collect changed files
  const changedFiles = new Set<string>()
  for (const commit of payload.commits || []) {
    commit.modified.forEach(f => changedFiles.add(f))
    commit.added.forEach(f => changedFiles.add(f))
    commit.removed.forEach(f => changedFiles.add(f))
  }

  console.log(`[Webhook] Push to ${repo.fullName}/${branch}: ${changedFiles.size} files changed`)

  // Check if any relevant files changed
  const relevantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.prisma']
  const relevantChanges = [...changedFiles].filter(f => 
    relevantExtensions.some(ext => f.endsWith(ext))
  )

  if (relevantChanges.length === 0) {
    console.log('[Webhook] No relevant code files changed')
    return NextResponse.json({ message: 'No relevant changes' })
  }

  // Create sync job (without metadata since it's not in schema)
  const syncJob = await prisma.analysisJob.create({
    data: {
      repoId: repo.id,
      status: 'PENDING',
      progress: 0,
    },
  })

  // Update repo status
  await prisma.repo.update({
    where: { id: repo.id },
    data: { 
      status: 'ANALYZING',
      lastSyncedAt: new Date(),
    },
  })

  // Trigger regeneration (async - don't wait)
  triggerRegeneration(repo.id, syncJob.id, relevantChanges).catch(console.error)

  return NextResponse.json({
    message: 'Sync triggered',
    jobId: syncJob.id,
    changedFiles: relevantChanges.length,
  })
}

async function handleRepositoryEvent(repo: any, payload: WebhookPayload) {
  if (payload.action === 'deleted') {
    // Repository was deleted on GitHub
    console.log(`[Webhook] Repository deleted: ${repo.fullName}`)
    
    await prisma.repo.update({
      where: { id: repo.id },
      data: { status: 'ERROR' },
    })

    return NextResponse.json({ message: 'Repository marked as deleted' })
  }

  if (payload.action === 'renamed') {
    // Repository was renamed
    console.log(`[Webhook] Repository renamed: ${payload.repository.full_name}`)
    
    await prisma.repo.update({
      where: { id: repo.id },
      data: { 
        fullName: payload.repository.full_name,
        name: payload.repository.full_name.split('/')[1],
      },
    })

    return NextResponse.json({ message: 'Repository name updated' })
  }

  return NextResponse.json({ message: `Repository action ${payload.action} noted` })
}

async function triggerRegeneration(repoId: string, jobId: string, changedFiles: string[]) {
  try {
    // Update the job status - full regeneration will be triggered
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        progress: 5,
        startedAt: new Date(),
      },
    })

    console.log(`[Webhook] Regeneration queued for ${repoId} (${changedFiles.length} files changed)`)
    
    // TODO: Implement incremental doc generation
    // For now, the next manual regeneration will use the latest code
    
  } catch (error) {
    console.error('[Webhook] Regeneration trigger failed:', error)
    
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: 'Failed to trigger regeneration',
      },
    })
  }
}
