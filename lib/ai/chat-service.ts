import { getRAGEngine, RAGEngine, RAGContext } from './rag-engine'
import { prisma } from '@/lib/db/prisma'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ChatService {
  private ragEngine: RAGEngine

  constructor() {
    this.ragEngine = getRAGEngine()
  }

  async chat(
    userId: string,
    repoId: string,
    repoName: string,
    message: string,
    sessionId?: string
  ): Promise<{ response: string; sources: Array<{ type: string; name: string; filePath?: string; relevance: number }>; sessionId: string }> {
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          repoId,
          messages: [],
        },
      })
    }

    const messages = (session.messages as any[]) || []
    const conversationHistory = messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const context: RAGContext = {
      query: message,
      repoId,
      repoName,
      relevantCode: [],
      conversationHistory,
    }

    const { answer, sources } = await this.ragEngine.answerQuestion(context)

    const updatedMessages = [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: answer },
    ]

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        messages: updatedMessages,
        updatedAt: new Date(),
      },
    })

    return {
      response: answer,
      sources,
      sessionId: session.id,
    }
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return []
    }

    return (session.messages as any[]) || []
  }
}
