/**
 * Vector Store - Qdrant Cloud (FREE tier!)
 * 
 * Qdrant is a powerful vector database for semantic search
 * FREE tier: 1GB storage, unlimited queries
 * Get free cluster: https://cloud.qdrant.io/
 */

import { getEmbeddingsService } from './embeddings'

export interface VectorDocument {
  id: string
  content: string
  metadata: {
    repoId: string
    type: 'function' | 'class' | 'api' | 'component' | 'doc' | 'code'
    filePath?: string
    name?: string
    lineStart?: number
    lineEnd?: number
    [key: string]: any
  }
}

export interface SearchResult {
  id: string
  content: string
  score: number
  metadata: VectorDocument['metadata']
}

class VectorStore {
  private qdrantUrl: string | null
  private qdrantApiKey: string | null
  private collectionName = 'code_docs'

  constructor() {
    this.qdrantUrl = process.env.QDRANT_URL || null
    this.qdrantApiKey = process.env.QDRANT_API_KEY || null

    if (!this.qdrantUrl) {
      console.warn('[VectorStore] QDRANT_URL not set. Get free cluster at: https://cloud.qdrant.io/')
    } else {
      console.log('[VectorStore] Using Qdrant Cloud')
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.qdrantApiKey) {
      headers['api-key'] = this.qdrantApiKey
    }
    return headers
  }

  async ensureCollection(): Promise<void> {
    if (!this.qdrantUrl) return

    try {
      // Check if collection exists
      const checkResponse = await fetch(
        `${this.qdrantUrl}/collections/${this.collectionName}`,
        { headers: this.getHeaders() }
      )

      if (checkResponse.status === 404) {
        // Create collection with 1024 dimensions (Voyage code-2 output size)
        const createResponse = await fetch(
          `${this.qdrantUrl}/collections/${this.collectionName}`,
          {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
              vectors: {
                size: 1024,
                distance: 'Cosine',
              },
              optimizers_config: {
                indexing_threshold: 0, // Index immediately
              },
            }),
          }
        )

        if (!createResponse.ok) {
          const error = await createResponse.text()
          throw new Error(`Failed to create collection: ${error}`)
        }

        console.log('[VectorStore] Created collection:', this.collectionName)
      }
    } catch (error: any) {
      console.error('[VectorStore] Collection error:', error.message)
    }
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (!this.qdrantUrl || documents.length === 0) return

    await this.ensureCollection()

    const embeddings = getEmbeddingsService()
    const texts = documents.map(doc => doc.content)
    
    console.log(`[VectorStore] Embedding ${documents.length} documents...`)
    const { embeddings: vectors } = await embeddings.embedBatch(texts)

    // Prepare points for Qdrant
    const points = documents.map((doc, index) => ({
      id: this.hashId(doc.id),
      vector: vectors[index],
      payload: {
        content: doc.content.substring(0, 10000), // Limit payload size
        ...doc.metadata,
      },
    }))

    // Upsert in batches of 100
    const batchSize = 100
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      
      const response = await fetch(
        `${this.qdrantUrl}/collections/${this.collectionName}/points?wait=true`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ points: batch }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('[VectorStore] Upsert error:', error)
      }
    }

    console.log(`[VectorStore] Indexed ${documents.length} documents`)
  }

  async search(query: string, repoId: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.qdrantUrl) {
      console.warn('[VectorStore] Qdrant not configured')
      return []
    }

    const embeddings = getEmbeddingsService()
    const { embedding } = await embeddings.embedQuery(query)

    try {
      const response = await fetch(
        `${this.qdrantUrl}/collections/${this.collectionName}/points/search`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            vector: embedding,
            limit,
            with_payload: true,
            filter: {
              must: [
                { key: 'repoId', match: { value: repoId } },
              ],
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Search error: ${error}`)
      }

      const data = await response.json()
      
      return data.result.map((hit: any) => ({
        id: hit.id.toString(),
        content: hit.payload.content,
        score: hit.score,
        metadata: {
          repoId: hit.payload.repoId,
          type: hit.payload.type,
          filePath: hit.payload.filePath,
          name: hit.payload.name,
          lineStart: hit.payload.lineStart,
          lineEnd: hit.payload.lineEnd,
        },
      }))
    } catch (error: any) {
      console.error('[VectorStore] Search error:', error.message)
      return []
    }
  }

  async deleteByRepo(repoId: string): Promise<void> {
    if (!this.qdrantUrl) return

    try {
      const response = await fetch(
        `${this.qdrantUrl}/collections/${this.collectionName}/points/delete`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            filter: {
              must: [
                { key: 'repoId', match: { value: repoId } },
              ],
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Delete error: ${error}`)
      }

      console.log(`[VectorStore] Deleted vectors for repo: ${repoId}`)
    } catch (error: any) {
      console.error('[VectorStore] Delete error:', error.message)
    }
  }

  // Convert string ID to numeric hash for Qdrant
  private hashId(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  async getDocumentCount(repoId: string): Promise<number> {
    try {
      const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/count`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: 'repoId',
                match: { value: repoId }
              }
            ]
          }
        })
      })

      if (!response.ok) return 0

      const data = await response.json()
      return data.result?.count || 0
    } catch (error) {
      console.warn('[VectorStore] Failed to count documents:', error)
      return 0
    }
  }

  isAvailable(): boolean {
    return !!this.qdrantUrl
  }
}

// Singleton
let vectorStoreInstance: VectorStore | null = null

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore()
  }
  return vectorStoreInstance
}

export { VectorStore }
