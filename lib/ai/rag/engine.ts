/**
 * Powerful RAG Engine
 * 
 * Combines:
 * - Voyage AI embeddings (code-optimized)
 * - Qdrant vector store (fast search)
 * - Smart chunking (context-aware)
 * - Hybrid search (semantic + keyword)
 */

import { getVoyageEmbeddings, VoyageEmbeddings } from './voyage-embeddings'
import { getQdrantStore, QdrantStore, SearchResult } from './qdrant-store'
import { getAIProviderWithFallback } from '../providers/factory'
import * as crypto from 'crypto'

export interface CodeChunk {
  id: string
  repoId: string
  type: 'function' | 'class' | 'component' | 'api' | 'service' | 'model' | 'hook' | 'file'
  name: string
  filePath: string
  content: string
  lineStart: number
  lineEnd: number
  metadata: Record<string, any>
}

export interface RAGContext {
  chunks: SearchResult[]
  query: string
  repoId: string
}

export class RAGEngine {
  private embeddings: VoyageEmbeddings
  private vectorStore: QdrantStore
  private isInitialized: boolean = false

  constructor() {
    this.embeddings = getVoyageEmbeddings()
    this.vectorStore = getQdrantStore('code_docs')
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    if (!this.embeddings.isAvailable()) {
      console.warn('[RAGEngine] Embeddings not available (no VOYAGE_API_KEY)')
      return false
    }

    if (!this.vectorStore.isAvailable()) {
      console.warn('[RAGEngine] Vector store not available (no QDRANT_URL)')
      return false
    }

    try {
      await this.vectorStore.ensureCollection(1024) // voyage-code-3 uses 1024 dims
      this.isInitialized = true
      console.log('[RAGEngine] Initialized successfully')
      return true
    } catch (error) {
      console.error('[RAGEngine] Initialization failed:', error)
      return false
    }
  }

  isAvailable(): boolean {
    return this.embeddings.isAvailable() && this.vectorStore.isAvailable()
  }

  /**
   * Index code chunks for a repository
   */
  async indexCodeChunks(chunks: CodeChunk[]): Promise<void> {
    if (!await this.initialize()) {
      console.warn('[RAGEngine] Cannot index - not initialized')
      return
    }

    console.log(`[RAGEngine] Indexing ${chunks.length} chunks...`)

    // Prepare texts for embedding
    const texts = chunks.map(chunk => this.formatChunkForEmbedding(chunk))

    // Get embeddings in batches
    const embeddings = await this.embeddings.embedBatch(texts)

    // Prepare points for Qdrant
    const points = chunks.map((chunk, i) => ({
      id: chunk.id,
      vector: embeddings[i],
      payload: {
        repoId: chunk.repoId,
        type: chunk.type,
        name: chunk.name,
        filePath: chunk.filePath,
        content: chunk.content.substring(0, 5000), // Limit content size
        lineStart: chunk.lineStart,
        lineEnd: chunk.lineEnd,
        ...chunk.metadata,
      },
    }))

    // Upsert to vector store
    await this.vectorStore.upsert(points)
    console.log(`[RAGEngine] Indexed ${chunks.length} chunks successfully`)
  }

  /**
   * Search for relevant code chunks
   */
  async search(query: string, repoId: string, limit: number = 10): Promise<SearchResult[]> {
    if (!await this.initialize()) {
      return []
    }

    const queryVector = await this.embeddings.embedQuery(query)
    return this.vectorStore.searchByRepoId(queryVector, repoId, limit)
  }

  /**
   * Answer a question about the codebase using RAG
   */
  async answerQuestion(question: string, repoId: string, chatHistory: any[] = []): Promise<string> {
    // Search for relevant context
    const results = await this.search(question, repoId, 8)

    if (results.length === 0) {
      // Fallback to general answer
      const ai = await getAIProviderWithFallback()
      return ai.chat(`Answer this question about a codebase: ${question}\n\nNote: No specific code context is available. Provide a general helpful response.`)
    }

    // Build context from search results
    const context = results.map((r, i) => {
      const p = r.payload
      return `### ${i + 1}. ${p.type}: ${p.name} (${p.filePath}:${p.lineStart}-${p.lineEnd})
Score: ${(r.score * 100).toFixed(1)}%

\`\`\`
${p.content.substring(0, 1500)}
\`\`\`
`
    }).join('\n\n')

    // Build chat prompt with history
    const systemPrompt = `You are an expert code assistant analyzing a codebase. You have access to relevant code snippets.

RELEVANT CODE CONTEXT:
${context}

RULES:
- Answer based on the code context provided
- Reference specific files and line numbers
- Explain code clearly and concisely
- If the answer isn't in the context, say so
- Use markdown formatting with code blocks
- Be helpful and thorough`

    const ai = await getAIProviderWithFallback()
    
    if (chatHistory.length > 0) {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...chatHistory.slice(-10), // Last 10 messages for context
        { role: 'user' as const, content: question },
      ]
      return ai.chatWithHistory(messages)
    }

    return ai.chat(`${systemPrompt}\n\nQUESTION: ${question}`)
  }

  /**
   * Generate documentation with RAG context
   */
  async generateDocWithContext(
    type: string,
    name: string,
    code: string,
    repoId: string
  ): Promise<string> {
    // Search for related code
    const relatedQuery = `${type} ${name} usage examples implementation`
    const related = await this.search(relatedQuery, repoId, 5)

    const relatedContext = related.map(r => 
      `${r.payload.type} ${r.payload.name}: ${r.payload.content.substring(0, 500)}`
    ).join('\n\n')

    const ai = await getAIProviderWithFallback()
    
    return ai.chat(`Generate professional documentation for this ${type}:

NAME: ${name}

CODE:
\`\`\`
${code.substring(0, 3000)}
\`\`\`

RELATED CODE IN CODEBASE:
${relatedContext || 'No related code found'}

Generate comprehensive markdown documentation with:
1. Brief description
2. Parameters/Props (if applicable)
3. Return value (if applicable)
4. Usage examples
5. Related code references
6. Notes and caveats`)
  }

  /**
   * Clear index for a repository
   */
  async clearRepoIndex(repoId: string): Promise<void> {
    if (!await this.initialize()) return
    await this.vectorStore.deleteByRepoId(repoId)
  }

  /**
   * Format a code chunk for embedding
   */
  private formatChunkForEmbedding(chunk: CodeChunk): string {
    return `${chunk.type} ${chunk.name}
File: ${chunk.filePath}
Lines: ${chunk.lineStart}-${chunk.lineEnd}

${chunk.content}`
  }

  /**
   * Create chunk ID from content
   */
  static createChunkId(repoId: string, type: string, name: string, filePath: string): string {
    const hash = crypto.createHash('md5').update(`${repoId}:${type}:${name}:${filePath}`).digest('hex')
    return hash.substring(0, 16)
  }
}

// Singleton instance
let ragEngineInstance: RAGEngine | null = null

export function getRAGEngine(): RAGEngine {
  if (!ragEngineInstance) {
    ragEngineInstance = new RAGEngine()
  }
  return ragEngineInstance
}

