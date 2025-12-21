/**
 * Embeddings Service - Voyage AI (FREE for code!)
 * 
 * Voyage AI is the best for code embeddings:
 * - voyage-code-2: Optimized for code
 * - voyage-2: General purpose
 * 
 * FREE tier: 200M tokens/month
 * Get key: https://www.voyageai.com/
 */

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  totalTokens: number
}

class EmbeddingsService {
  private voyageApiKey: string | null
  private baseUrl = 'https://api.voyageai.com/v1'
  private model = 'voyage-code-2' // Best for code!

  constructor() {
    this.voyageApiKey = process.env.VOYAGE_API_KEY || null
    
    if (!this.voyageApiKey) {
      console.warn('[Embeddings] VOYAGE_API_KEY not set. Get free key at: https://www.voyageai.com/')
    } else {
      console.log('[Embeddings] Using Voyage AI (voyage-code-2)')
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.voyageApiKey) {
      // Return zero vector if no API key
      return { embedding: new Array(1024).fill(0), tokens: 0 }
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.voyageApiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text.substring(0, 8000), // Limit to 8K chars
          input_type: 'document',
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Voyage API error: ${response.status} ${error}`)
      }

      const data = await response.json()
      return {
        embedding: data.data[0].embedding,
        tokens: data.usage?.total_tokens || 0,
      }
    } catch (error: any) {
      console.error('[Embeddings] Error:', error.message)
      return { embedding: new Array(1024).fill(0), tokens: 0 }
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.voyageApiKey || texts.length === 0) {
      return { 
        embeddings: texts.map(() => new Array(1024).fill(0)), 
        totalTokens: 0 
      }
    }

    try {
      // Voyage AI supports up to 128 texts per batch
      const batchSize = 64
      const allEmbeddings: number[][] = []
      let totalTokens = 0

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize).map(t => t.substring(0, 8000))
        
        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.voyageApiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            input: batch,
            input_type: 'document',
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Voyage API error: ${response.status} ${error}`)
        }

        const data = await response.json()
        const embeddings = data.data.map((d: any) => d.embedding)
        allEmbeddings.push(...embeddings)
        totalTokens += data.usage?.total_tokens || 0
      }

      return { embeddings: allEmbeddings, totalTokens }
    } catch (error: any) {
      console.error('[Embeddings] Batch error:', error.message)
      return { 
        embeddings: texts.map(() => new Array(1024).fill(0)), 
        totalTokens: 0 
      }
    }
  }

  async embedQuery(query: string): Promise<EmbeddingResult> {
    if (!this.voyageApiKey) {
      return { embedding: new Array(1024).fill(0), tokens: 0 }
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.voyageApiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: query.substring(0, 4000),
          input_type: 'query', // Optimized for search queries
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Voyage API error: ${response.status} ${error}`)
      }

      const data = await response.json()
      return {
        embedding: data.data[0].embedding,
        tokens: data.usage?.total_tokens || 0,
      }
    } catch (error: any) {
      console.error('[Embeddings] Query error:', error.message)
      return { embedding: new Array(1024).fill(0), tokens: 0 }
    }
  }

  isAvailable(): boolean {
    return !!this.voyageApiKey
  }
}

// Singleton
let embeddingsInstance: EmbeddingsService | null = null

export function getEmbeddingsService(): EmbeddingsService {
  if (!embeddingsInstance) {
    embeddingsInstance = new EmbeddingsService()
  }
  return embeddingsInstance
}

export { EmbeddingsService }
