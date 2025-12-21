/**
 * RAG Engine - Retrieval Augmented Generation
 * 
 * Powers the "Chat with your codebase" feature
 * Uses Voyage AI for embeddings + Qdrant for storage + Gemini for generation
 */

import { getVectorStore, VectorDocument, SearchResult } from './vector-store'
import { getAIProviderWithFallback } from './providers/factory'
import { ComprehensiveAnalysis } from '../analyzer/comprehensive-analyzer'

export interface RAGContext {
  query: string
  repoId: string
  repoName: string
  relevantCode: SearchResult[]
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface RAGResponse {
  answer: string
  sources: Array<{
    type: string
    name: string
    filePath?: string
    relevance: number
  }>
}

export class RAGEngine {
  private vectorStore = getVectorStore()

  /**
   * Index a repository's code for semantic search
   */
  async indexRepository(
    repoId: string,
    repoName: string,
    analysis: ComprehensiveAnalysis
  ): Promise<{ indexed: number; skipped: number }> {
    const documents: VectorDocument[] = []

    // Index functions
    for (const func of analysis.functions) {
      documents.push({
        id: `${repoId}-func-${func.name}-${func.lineStart}`,
        content: this.buildFunctionContext(func),
        metadata: {
          repoId,
          type: 'function',
          name: func.name,
          filePath: func.filePath,
          lineStart: func.lineStart,
          lineEnd: func.lineEnd,
        },
      })
    }

    // Index classes
    for (const cls of analysis.classes) {
      documents.push({
        id: `${repoId}-class-${cls.name}-${cls.lineStart}`,
        content: this.buildClassContext(cls),
        metadata: {
          repoId,
          type: 'class',
          name: cls.name,
          filePath: cls.filePath,
          lineStart: cls.lineStart,
          lineEnd: cls.lineEnd,
        },
      })
    }

    // Index API routes
    for (const api of analysis.apiRoutes) {
      documents.push({
        id: `${repoId}-api-${api.method}-${api.path}`,
        content: this.buildAPIContext(api),
        metadata: {
          repoId,
          type: 'api',
          name: `${api.method} ${api.path}`,
          filePath: api.filePath,
          lineStart: api.lineStart,
        },
      })
    }

    // Index components
    for (const comp of analysis.components) {
      documents.push({
        id: `${repoId}-comp-${comp.name}-${comp.lineStart}`,
        content: this.buildComponentContext(comp),
        metadata: {
          repoId,
          type: 'component',
          name: comp.name,
          filePath: comp.filePath,
          lineStart: comp.lineStart,
        },
      })
    }

    // Index services
    for (const svc of analysis.services) {
      documents.push({
        id: `${repoId}-svc-${svc.name}`,
        content: this.buildServiceContext(svc),
        metadata: {
          repoId,
          type: 'class',
          name: svc.name,
          filePath: svc.filePath,
        },
      })
    }

    // Delete old vectors and upsert new ones
    await this.vectorStore.deleteByRepo(repoId)
    await this.vectorStore.upsert(documents)

    return { indexed: documents.length, skipped: 0 }
  }

  /**
   * Answer a question about the codebase using RAG
   */
  async answerQuestion(context: RAGContext): Promise<RAGResponse> {
    // Search for relevant code
    const results = await this.vectorStore.search(context.query, context.repoId, 8)

    if (results.length === 0) {
      return {
        answer: "I couldn't find relevant code for your question. Try regenerating the documentation or asking a more specific question.",
        sources: [],
      }
    }

    // Build context for LLM
    const codeContext = results
      .map((r, i) => `### ${i + 1}. ${r.metadata.name || 'Code'} (${r.metadata.type})\nFile: ${r.metadata.filePath || 'Unknown'}\n\`\`\`\n${r.content.substring(0, 2000)}\n\`\`\``)
      .join('\n\n')

    const conversationContext = context.conversationHistory
      ?.slice(-5)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') || ''

    const prompt = `You are an expert code assistant for the "${context.repoName}" repository.

${conversationContext ? `## Previous Conversation\n${conversationContext}\n` : ''}

## Relevant Code
${codeContext}

## User Question
${context.query}

## Instructions
1. Answer the question based on the code context above
2. Be specific and reference the actual code/files
3. If showing code, use proper syntax highlighting
4. Explain your reasoning
5. If the code doesn't answer the question, say so honestly

Answer:`

    const ai = await getAIProviderWithFallback()
    const answer = await ai.chat(prompt)

    return {
      answer,
      sources: results.map(r => ({
        type: r.metadata.type,
        name: r.metadata.name || 'Unknown',
        filePath: r.metadata.filePath,
        relevance: Math.round(r.score * 100),
      })),
    }
  }

  /**
   * Search for code semantically
   */
  async searchCode(query: string, repoId: string, limit: number = 10): Promise<SearchResult[]> {
    return this.vectorStore.search(query, repoId, limit)
  }

  // Build context strings for different code types
  private buildFunctionContext(func: any): string {
    const params = func.parameters?.map((p: any) => `${p.name}: ${p.type || 'any'}`).join(', ') || ''
    return `Function: ${func.name}
File: ${func.filePath}
Signature: ${func.isAsync ? 'async ' : ''}function ${func.name}(${params}): ${func.returnType || 'void'}
Exported: ${func.isExported}
Complexity: ${func.complexity}

Code:
${func.code?.substring(0, 3000) || 'N/A'}`
  }

  private buildClassContext(cls: any): string {
    const methods = cls.methods?.map((m: any) => m.name).join(', ') || ''
    return `Class: ${cls.name}
File: ${cls.filePath}
Extends: ${cls.extends || 'None'}
Implements: ${cls.implements?.join(', ') || 'None'}
Methods: ${methods}

Code:
${cls.code?.substring(0, 3000) || 'N/A'}`
  }

  private buildAPIContext(api: any): string {
    return `API Endpoint: ${api.method} ${api.path}
File: ${api.filePath}
Protected: ${api.isProtected}
Parameters: ${api.parameters?.map((p: any) => p.name).join(', ') || 'None'}

Code:
${api.code?.substring(0, 3000) || 'N/A'}`
  }

  private buildComponentContext(comp: any): string {
    const props = comp.props?.map((p: any) => p.name).join(', ') || ''
    return `React Component: ${comp.name}
File: ${comp.filePath}
Client Component: ${comp.isClientComponent}
Props: ${props}
Hooks Used: ${comp.hooks?.join(', ') || 'None'}

Code:
${comp.code?.substring(0, 3000) || 'N/A'}`
  }

  private buildServiceContext(svc: any): string {
    const methods = svc.methods?.map((m: any) => m.name).join(', ') || ''
    return `Service: ${svc.name}
File: ${svc.filePath}
Methods: ${methods}
Dependencies: ${svc.dependencies?.join(', ') || 'None'}`
  }

  isAvailable(): boolean {
    return this.vectorStore.isAvailable()
  }
}

// Singleton
let ragEngineInstance: RAGEngine | null = null

export function getRAGEngine(): RAGEngine {
  if (!ragEngineInstance) {
    ragEngineInstance = new RAGEngine()
  }
  return ragEngineInstance
}

// Factory function for creating new instances
export function createRAGEngine(): RAGEngine {
  return new RAGEngine()
}
