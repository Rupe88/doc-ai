import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/prisma'
import { getAIProviderWithFallback } from '@/lib/ai/providers/factory'
import { getRAGEngine } from '@/lib/ai/rag-engine'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const chatSchema = z.object({
  repoId: z.string().cuid(),
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, message, history = [] } = await getRequestBody(context, chatSchema)

    // Verify repo access
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: {
        docs: {
          select: { id: true, title: true, content: true, type: true, filePath: true },
          take: 50,
        },
      },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Use RAG engine for intelligent code-aware chat
    const rag = getRAGEngine()
    let ragAvailable = await rag.isAvailable(repoId)

    let response = ''
    let sources: Array<{ type: string; name: string; filePath?: string; relevance: number }> = []

    if (ragAvailable) {
      try {
        // Use RAG's answerQuestion method which includes semantic search + AI generation
        const ragContext = {
          query: message,
          repoId,
          repoName: repo.fullName,
          relevantCode: [], // RAG will search internally
          conversationHistory: history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        }

        const ragResponse = await rag.answerQuestion(ragContext)
        response = ragResponse.answer
        sources = ragResponse.sources

        console.log(`[Chat] RAG response generated with ${sources.length} sources`)
      } catch (e) {
        console.warn('[Chat] RAG failed, falling back to general AI:', e instanceof Error ? e.message : String(e))
        ragAvailable = false // Force fallback
      }
    }

    // Fallback to general AI if RAG not available or failed
    if (!ragAvailable) {

      // Fallback to documentation search + general AI
      let contextText = ''

      // Search in documentation
      if (repo.docs.length > 0) {
        const lowerMessage = message.toLowerCase()
        const keywords = lowerMessage.split(' ').filter(w => w.length > 2)

        const relevantDocs = repo.docs
          .filter(doc => {
            const lowerTitle = doc.title.toLowerCase()
            const lowerContent = doc.content?.toLowerCase() || ''
            return keywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))
          })
          .slice(0, 3)

        if (relevantDocs.length > 0) {
          contextText = relevantDocs
            .map(doc => `## ${doc.title}\n${doc.content?.slice(0, 2000) || 'No content'}`)
            .join('\n\n---\n\n')

          sources = relevantDocs.map(doc => ({
            type: doc.type,
            name: doc.title,
            filePath: doc.filePath || undefined,
            relevance: 80,
          }))

          console.log(`[Chat] Found ${relevantDocs.length} relevant docs from DB`)
        }
      }

      // Build enhanced system prompt with better guidance
      const systemPrompt = `You are an expert code documentation assistant for the "${repo.fullName}" repository.

## YOUR CAPABILITIES:
You have knowledge of the codebase and can help with:
- Code structure, functions, classes, and API endpoints
- Backend logic, database models, and services
- Security vulnerabilities and best practices
- Code quality, complexity, and improvements
- Dependencies, configurations, and setup
- Architecture patterns and design decisions

${contextText ? `## AVAILABLE DOCUMENTATION:\n${contextText}` : '## LIMITATION: No specific documentation context available for this query.'}

## RESPONSE GUIDELINES:
1. **Be helpful and specific** - Even without full context, provide valuable guidance
2. **Include code examples** - Use proper TypeScript/JavaScript syntax highlighting
3. **Reference patterns** - Use common best practices when specific code isn't available
4. **Security focus** - Always mention security considerations
5. **Suggest improvements** - Provide actionable recommendations
6. **Honest about limitations** - If you don't have specific info, clearly state it
7. **Markdown formatting** - Use proper formatting for readability
8. **Context-aware** - Adapt to whether documentation context is available

## IF NO CONTEXT IS AVAILABLE:
- Provide general best practices for the technology stack
- Suggest common patterns and implementations
- Guide the user toward finding the relevant code
- Recommend re-generating documentation if needed
- Still be maximally helpful with general programming knowledge`

      // Build message history for AI
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user' as const, content: message },
      ]

      // Get AI response
      const ai = await getAIProviderWithFallback()
      response = await ai.chatWithHistory(messages)

      console.log(`[Chat] Generated response using general AI${contextText ? ' with docs context' : ' (no context)'}`)
    }

    // Save chat history
    try {
      await prisma.chatSession.upsert({
        where: { id: `${repoId}_${user.id}` },
        create: {
          id: `${repoId}_${user.id}`,
          repoId,
          userId: user.id,
          messages: JSON.stringify([
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: response },
          ]),
        },
        update: {
          messages: JSON.stringify([
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: response },
          ]),
          updatedAt: new Date(),
        },
      })
    } catch (e) {
      console.warn('[Chat] Failed to save history:', e)
    }

    return successResponse({
      response,
      sources,
      hasContext: sources.length > 0,
      ragEnabled: ragAvailable,
    })
  },
  { requireAuth: true, methods: ['POST'] }
)
