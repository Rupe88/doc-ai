/**
 * RAG-Powered Chat API
 * 
 * Features:
 * - Semantic search through codebase
 * - Context-aware answers
 * - Chat history support
 * - Code reference highlighting
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRAGEngine } from '@/lib/ai/rag/engine'
import { getAIProviderWithFallback } from '@/lib/ai/providers/factory'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const repoId = context.params?.repoId as string
    if (!repoId) throw new NotFoundError('Repository ID required')
    const { message, sessionId, history } = await getRequestBody(context, chatSchema)

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true, fullName: true, name: true },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    const startTime = Date.now()

    // Initialize RAG engine
    const rag = getRAGEngine()
    const ragAvailable = await rag.initialize()

    let answer: string
    let sources: any[] = []
    let searchResults: any[] = []

    if (ragAvailable) {
      // Search for relevant code chunks
      searchResults = await rag.search(message, repoId, 8)
      
      sources = searchResults.map(r => ({
        name: r.payload.name,
        type: r.payload.type,
        filePath: r.payload.filePath,
        lineStart: r.payload.lineStart,
        lineEnd: r.payload.lineEnd,
        score: Math.round(r.score * 100),
        preview: r.payload.content?.substring(0, 200) + '...',
      }))

      // Generate answer with context
      answer = await rag.answerQuestion(message, repoId, history || [])
    } else {
      // Fallback: Use docs from database
      const docs = await prisma.doc.findMany({
        where: { repoId },
        select: { title: true, content: true, type: true, filePath: true },
        take: 5,
      })

      const context = docs.map(d => 
        `## ${d.title} (${d.type})\n${d.content.substring(0, 1000)}`
      ).join('\n\n')

      const ai = await getAIProviderWithFallback()
      
      const prompt = `You are a helpful code assistant for the "${repo.name}" repository.

AVAILABLE DOCUMENTATION:
${context || 'No documentation available yet.'}

USER QUESTION: ${message}

Provide a helpful, accurate answer based on the documentation. If you don't have enough information, say so.`

      answer = await ai.chat(prompt)
    }

    // Save to chat session if sessionId provided
    if (sessionId) {
      await prisma.chatSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          repoId,
          userId: user.id,
          messages: [
            ...(history || []),
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: answer, timestamp: new Date().toISOString(), sources },
          ],
        },
        update: {
          messages: [
            ...(history || []),
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: answer, timestamp: new Date().toISOString(), sources },
          ],
          updatedAt: new Date(),
        },
      })
    }

    return successResponse({
      answer,
      sources,
      ragEnabled: ragAvailable,
      processingTime: Date.now() - startTime,
      sessionId,
    })
  },
  { requireAuth: true, methods: ['POST'] }
)

// Get chat history for a session
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const repoId = context.params?.repoId as string
    if (!repoId) throw new NotFoundError('Repository ID required')
    const sessionId = context.request.nextUrl.searchParams.get('sessionId')

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true, userId: true },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    if (sessionId) {
      // Get specific session
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      })

      return successResponse({ session })
    }

    // Get all sessions for this repo
    const sessions = await prisma.chatSession.findMany({
      where: { repoId, userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        messages: true,
      },
    })

    return successResponse({ sessions })
  },
  { requireAuth: true, methods: ['GET'] }
)

