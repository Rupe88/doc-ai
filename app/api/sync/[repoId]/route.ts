import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/security/encryption'
import { GitHubService } from '@/lib/github/service'
import { RepoCloner } from '@/lib/github/repo-cloner'
import { ComprehensiveAnalyzer } from '@/lib/analyzer/comprehensive-analyzer'
import { getAIProviderWithFallback } from '@/lib/ai/providers/factory'
import { getRAGEngine } from '@/lib/ai/rag-engine'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max
export const dynamic = 'force-dynamic'

const repoIdSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
})

// Sync uses SSE streaming just like generate to work on serverless
export async function POST(request: NextRequest, { params }: { params: { repoId: string } }) {
  try {
    // Manual auth check
    const { requireAuth } = await import('@/lib/middleware/auth')
    const authResult = await requireAuth(request)
    if (authResult.response) return authResult.response
    const user = authResult.user!

    // Validate repoId
    const parseResult = repoIdSchema.safeParse(params)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid repository ID' } },
        { status: 400 }
      )
    }
    const { repoId } = parseResult.data

    // Get repository
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: { user: { select: { subscriptionTier: true, githubToken: true } } },
    })

    if (!repo) {
      return NextResponse.json({ success: false, error: { message: 'Repository not found' } }, { status: 404 })
    }

    if (repo.userId !== user.id) {
      return NextResponse.json({ success: false, error: { message: 'Access denied' } }, { status: 403 })
    }

    if (!repo.user.githubToken) {
      return NextResponse.json({ success: false, error: { message: 'GitHub not connected' } }, { status: 400 })
    }

    const [owner, repoName] = repo.fullName.split('/')
    if (!owner || !repoName) {
      return NextResponse.json({ success: false, error: { message: 'Invalid repository format' } }, { status: 400 })
    }

    // Create job with PROCESSING status (inline processing, no queue)
    const analysisJob = await prisma.analysisJob.create({
      data: { repoId: repo.id, status: 'PROCESSING', progress: 5, startedAt: new Date() },
    })

    await prisma.repo.update({ where: { id: repoId }, data: { status: 'ANALYZING' } })

    const accessToken = decrypt(repo.user.githubToken)

    logger.info('[Sync] Starting repository sync', { jobId: analysisJob.id, repo: repo.fullName })

    // Use SSE streaming for real-time progress
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          // Always include jobId for frontend tracking
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...data, jobId: analysisJob.id })}\n\n`))
        }

        try {
          send({ type: 'progress', progress: 5, message: 'Starting sync...' })

          // STEP 1: Clone repository
          send({ type: 'progress', progress: 10, message: 'Connecting to GitHub...' })
          
          const github = new GitHubService(accessToken)
          const cloner = new RepoCloner(github)
          const repoPath = await cloner.cloneRepository(owner, repoName, repo.defaultBranch)
          
          send({ type: 'progress', progress: 25, message: 'Analyzing codebase...' })
          
          const files = await cloner.getFiles(repoPath)
          logger.info(`[Sync] Found ${files.length} files`)
          
          const analyzer = new ComprehensiveAnalyzer(files, repoPath)
          const analysis = await analyzer.analyze()
          
          logger.info(`[Sync] Analysis complete: ${analysis.functions.length} funcs, ${analysis.classes.length} classes`)
          
          send({ type: 'progress', progress: 40, message: `Analyzed ${files.length} files...` })
          
          await prisma.analysisJob.update({
            where: { id: analysisJob.id },
            data: { progress: 40 },
          })

          // STEP 2: Clear old docs and regenerate
          await prisma.doc.deleteMany({ where: { repoId } })
          
          // Index to RAG in background
          indexToRAG(repoId, repoName, analysis).catch(e => logger.warn('[RAG] Indexing failed:', e.message))

          // STEP 3: Get AI provider
          send({ type: 'progress', progress: 45, message: 'Connecting to AI...' })
          
          let ai
          try {
            ai = await getAIProviderWithFallback()
          } catch (aiError: any) {
            logger.error('[Sync] No AI provider available:', aiError.message)
            send({ type: 'error', message: 'No AI provider configured. Please add GEMINI_API_KEY or GROQ_API_KEY to environment.' })
            
            await prisma.analysisJob.update({
              where: { id: analysisJob.id },
              data: { status: 'FAILED', error: 'No AI provider configured' },
            })
            await prisma.repo.update({ where: { id: repoId }, data: { status: 'ERROR' } })
            await cloner.cleanup()
            
            controller.close()
            return
          }

          // STEP 4: Generate documentation
          send({ type: 'progress', progress: 50, message: 'Generating documentation...' })

          // Generate overview
          const overviewPrompt = buildOverviewPrompt(repoName, analysis)
          const overview = await ai.chat(overviewPrompt)
          await saveDoc(repoId, user.id, `${repoName} - Overview`, 'overview', overview, 'OVERVIEW', null, { synced: true })
          
          send({ type: 'progress', progress: 70, message: 'Generating API documentation...' })
          await prisma.analysisJob.update({ where: { id: analysisJob.id }, data: { progress: 70 } })

          // Generate API docs if available
          if (analysis.apiRoutes.length > 0) {
            const apiPrompt = buildApiPrompt(analysis.apiRoutes)
            const apiDoc = await ai.chat(apiPrompt)
            await saveDoc(repoId, user.id, 'API Reference', 'api-reference', apiDoc, 'API', null, { routes: analysis.apiRoutes.length })
          }

          send({ type: 'progress', progress: 90, message: 'Finalizing...' })

          // Cleanup
          await cloner.cleanup()

          // Complete
          await prisma.analysisJob.update({
            where: { id: analysisJob.id },
            data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
          })

          await prisma.repo.update({
            where: { id: repoId },
            data: { status: 'READY', lastSyncedAt: new Date() },
          })

          logger.info('[Sync] Completed successfully', { jobId: analysisJob.id })
          
          send({ type: 'complete', progress: 100, message: 'Sync completed successfully!' })

        } catch (error: any) {
          logger.error('[Sync] Failed:', error)
          
          send({ type: 'error', message: error.message || 'Sync failed' })
          
          await prisma.analysisJob.update({
            where: { id: analysisJob.id },
            data: { status: 'FAILED', error: error.message || 'Unknown error' },
          }).catch(() => {})
          
          await prisma.repo.update({ 
            where: { id: repoId }, 
            data: { status: 'ERROR' } 
          }).catch(() => {})
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    logger.error('[Sync] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    )
  }
}

// Helper functions
async function indexToRAG(repoId: string, repoName: string, analysis: any) {
  try {
    const rag = getRAGEngine()
    if (!rag.isAvailable()) {
      logger.info('[RAG] Vector store not configured - skipping indexing')
      return
    }
    const { indexed, skipped } = await rag.indexRepository(repoId, repoName, analysis)
    logger.info(`[RAG] Indexed ${indexed} chunks (${skipped} skipped)`)
  } catch (error: any) {
    logger.error('[RAG] Indexing error:', { message: error?.message || 'Unknown error' })
  }
}

async function saveDoc(repoId: string, userId: string, title: string, slug: string, content: string, type: string, filePath: string | null, metadata: any) {
  if (!content || content.trim().length < 50) {
    content = `# ${title}\n\nDocumentation generation in progress. Please try regenerating.`
  }
  
  await prisma.doc.create({
    data: { 
      repoId, 
      userId, 
      title, 
      slug: `${slug}-${Date.now()}`, 
      content, 
      type, 
      filePath, 
      metadata: metadata as any 
    },
  })
}

function buildOverviewPrompt(repoName: string, analysis: any): string {
  return `Generate a concise overview documentation for "${repoName}":

## Codebase Stats
- Files: ${analysis.stats?.totalFiles || 'N/A'}
- Functions: ${analysis.functions.length}
- Classes: ${analysis.classes.length}
- Components: ${analysis.components.length}
- API Routes: ${analysis.apiRoutes.length}

## Key Functions
${analysis.functions.slice(0, 10).map((f: any) => `- ${f.name}`).join('\n')}

Generate:
1. Project Overview - What this project does
2. Key Features - Main functionality
3. Architecture - High-level structure
4. Getting Started - Quick start guide

Be concise but comprehensive.`
}

function buildApiPrompt(routes: any[]): string {
  const routeList = routes.slice(0, 20).map((r: any) => 
    `- ${r.method} ${r.path} (${r.isProtected ? 'Protected' : 'Public'})`
  ).join('\n')

  return `Generate API documentation for these endpoints:

${routeList}

For each endpoint, document:
1. Purpose
2. Request format
3. Response format
4. Example usage

Use proper markdown with code examples.`
}
