/**
 * Qdrant Vector Store - FREE Cloud Tier!
 * 
 * Get free cluster: https://cloud.qdrant.io/
 * Free tier: 1GB storage, 1M vectors
 */

export interface VectorPoint {
  id: string
  vector: number[]
  payload: Record<string, any>
}

export interface SearchResult {
  id: string
  score: number
  payload: Record<string, any>
}

export class QdrantStore {
  private url: string
  private apiKey: string
  private collectionName: string

  constructor(collectionName: string = 'code_docs') {
    this.url = process.env.QDRANT_URL || ''
    this.apiKey = process.env.QDRANT_API_KEY || ''
    this.collectionName = collectionName

    if (!this.url) {
      console.warn('[QdrantStore] No QDRANT_URL set. Get free cluster at: https://cloud.qdrant.io/')
    }
  }

  isAvailable(): boolean {
    return !!this.url
  }

  private async request(path: string, method: string = 'GET', body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (this.apiKey) {
      headers['api-key'] = this.apiKey
    }

    const response = await fetch(`${this.url}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Qdrant API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  async ensureCollection(vectorSize: number = 1024): Promise<void> {
    try {
      // Check if collection exists
      await this.request(`/collections/${this.collectionName}`)
    } catch (error: any) {
      if (error.message.includes('404')) {
        // Create collection
        await this.request(`/collections/${this.collectionName}`, 'PUT', {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            indexing_threshold: 0, // Index immediately
          },
        })
        console.log(`[QdrantStore] Created collection: ${this.collectionName}`)
      } else {
        throw error
      }
    }
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('[QdrantStore] Not available, skipping upsert')
      return
    }

    // Batch upsert (max 100 at a time)
    const batchSize = 100
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      
      await this.request(`/collections/${this.collectionName}/points`, 'PUT', {
        points: batch.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      })
    }

    console.log(`[QdrantStore] Upserted ${points.length} points`)
  }

  async search(queryVector: number[], limit: number = 10, filter?: any): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      console.warn('[QdrantStore] Not available, returning empty results')
      return []
    }

    const result = await this.request(`/collections/${this.collectionName}/points/search`, 'POST', {
      vector: queryVector,
      limit,
      with_payload: true,
      filter,
    })

    return result.result.map((r: any) => ({
      id: r.id,
      score: r.score,
      payload: r.payload,
    }))
  }

  async searchByRepoId(queryVector: number[], repoId: string, limit: number = 10): Promise<SearchResult[]> {
    return this.search(queryVector, limit, {
      must: [
        { key: 'repoId', match: { value: repoId } },
      ],
    })
  }

  async deleteByRepoId(repoId: string): Promise<void> {
    if (!this.isAvailable()) return

    await this.request(`/collections/${this.collectionName}/points/delete`, 'POST', {
      filter: {
        must: [
          { key: 'repoId', match: { value: repoId } },
        ],
      },
    })

    console.log(`[QdrantStore] Deleted points for repo: ${repoId}`)
  }

  async getCollectionInfo(): Promise<any> {
    if (!this.isAvailable()) return null
    return this.request(`/collections/${this.collectionName}`)
  }
}

// Singleton instance
let qdrantInstance: QdrantStore | null = null

export function getQdrantStore(collectionName?: string): QdrantStore {
  if (!qdrantInstance || collectionName) {
    qdrantInstance = new QdrantStore(collectionName)
  }
  return qdrantInstance
}

