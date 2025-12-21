/**
 * Semantic Code Search using NLP
 * Enables natural language queries and intent-based code search
 * 
 * NOTE: This module is experimental and uses the RAG engine for search
 */

import { getVectorStore, SearchResult } from '@/lib/ai/vector-store'
import { getEmbeddingsService } from '@/lib/ai/embeddings'
import { getAIProviderWithFallback } from '@/lib/ai/providers/factory'

export interface SemanticSearchResult {
  code: string
  filePath: string
  lineStart: number
  lineEnd: number
  relevanceScore: number
  explanation: string
  intent: string
}

export interface CodeIntent {
  type: 'validation' | 'authentication' | 'data_processing' | 'api_endpoint' | 'utility' | 'other'
  description: string
  confidence: number
}

export class SemanticCodeSearch {
  private vectorStore = getVectorStore()
  private embeddings = getEmbeddingsService()

  /**
   * Search code by natural language intent
   * Example: "Find functions that validate user input"
   */
  async searchByIntent(
    query: string,
    repoId: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    // Extract intent from natural language query
    const intent = await this.extractIntent(query)

    // Perform semantic search using the vector store
    const results = await this.vectorStore.search(query, repoId, limit)

    // Enhance results with explanations
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const explanation = await this.explainRelevance(result.content, query, intent)
        return {
          code: result.content,
          filePath: result.metadata.filePath || '',
          lineStart: result.metadata.lineStart || 0,
          lineEnd: result.metadata.lineEnd || 0,
          relevanceScore: result.score || 0,
          explanation,
          intent: intent.description,
        }
      })
    )

    return enhancedResults
  }

  /**
   * Search code by concept (e.g., "authentication", "validation", "data processing")
   */
  async searchByConcept(
    concept: string,
    repoId: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    // Map concept to search query
    const conceptQueries: Record<string, string> = {
      authentication: 'authentication login session token verify user',
      validation: 'validate input check error sanitize parse',
      data_processing: 'transform process filter map reduce data',
      api_endpoint: 'route handler endpoint request response API',
      utility: 'helper utility format convert parse',
    }

    const searchQuery = conceptQueries[concept] || concept
    const results = await this.vectorStore.search(searchQuery, repoId, limit)

    return results.map((result) => ({
      code: result.content,
      filePath: result.metadata.filePath || '',
      lineStart: result.metadata.lineStart || 0,
      lineEnd: result.metadata.lineEnd || 0,
      relevanceScore: result.score || 0,
      explanation: `Related to ${concept}`,
      intent: concept,
    }))
  }

  /**
   * Find similar code patterns
   */
  async findSimilarCode(
    codeSnippet: string,
    repoId: string,
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    const results = await this.vectorStore.search(codeSnippet, repoId, limit)

    return results.map((result) => ({
      code: result.content,
      filePath: result.metadata.filePath || '',
      lineStart: result.metadata.lineStart || 0,
      lineEnd: result.metadata.lineEnd || 0,
      relevanceScore: result.score || 0,
      explanation: 'Similar code pattern',
      intent: 'similarity',
    }))
  }

  /**
   * Extract the user's intent from a natural language query
   */
  private async extractIntent(query: string): Promise<CodeIntent> {
    const lowerQuery = query.toLowerCase()

    // Simple keyword-based intent detection
    if (lowerQuery.includes('auth') || lowerQuery.includes('login') || lowerQuery.includes('session')) {
      return { type: 'authentication', description: 'Authentication and authorization', confidence: 0.9 }
    }
    if (lowerQuery.includes('valid') || lowerQuery.includes('check') || lowerQuery.includes('sanitize')) {
      return { type: 'validation', description: 'Input validation and sanitization', confidence: 0.9 }
    }
    if (lowerQuery.includes('api') || lowerQuery.includes('endpoint') || lowerQuery.includes('route')) {
      return { type: 'api_endpoint', description: 'API endpoints and handlers', confidence: 0.9 }
    }
    if (lowerQuery.includes('process') || lowerQuery.includes('transform') || lowerQuery.includes('data')) {
      return { type: 'data_processing', description: 'Data processing and transformation', confidence: 0.8 }
    }
    if (lowerQuery.includes('helper') || lowerQuery.includes('util') || lowerQuery.includes('format')) {
      return { type: 'utility', description: 'Utility functions and helpers', confidence: 0.8 }
    }

    return { type: 'other', description: query, confidence: 0.5 }
  }

  /**
   * Generate an explanation for why a result is relevant
   */
  private async explainRelevance(code: string, query: string, intent: CodeIntent): Promise<string> {
    // Simple explanation based on intent
    const typeDescriptions: Record<string, string> = {
      authentication: 'This code handles authentication/authorization logic',
      validation: 'This code performs input validation or sanitization',
      data_processing: 'This code processes or transforms data',
      api_endpoint: 'This is an API endpoint or route handler',
      utility: 'This is a utility or helper function',
      other: 'This code is related to your query',
    }

    return typeDescriptions[intent.type] || 'Relevant to your search'
  }

  isAvailable(): boolean {
    return this.vectorStore.isAvailable() && this.embeddings.isAvailable()
  }
}

// Singleton
let semanticSearchInstance: SemanticCodeSearch | null = null

export function getSemanticSearch(): SemanticCodeSearch {
  if (!semanticSearchInstance) {
    semanticSearchInstance = new SemanticCodeSearch()
  }
  return semanticSearchInstance
}
