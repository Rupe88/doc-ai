/**
 * Voyage AI Embeddings - FREE & Optimized for Code!
 * 
 * Models:
 * - voyage-code-3 (best for code, 1024 dims)
 * - voyage-3-lite (fast, general purpose)
 * 
 * Free tier: 200M tokens/month
 */

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

export class VoyageEmbeddings {
  private apiKey: string
  private model: string
  private baseUrl = 'https://api.voyageai.com/v1'

  constructor() {
    this.apiKey = process.env.VOYAGE_API_KEY || ''
    this.model = process.env.VOYAGE_MODEL || 'voyage-code-3'
    
    if (!this.apiKey) {
      console.warn('[VoyageEmbeddings] No VOYAGE_API_KEY set. Get free key at: https://voyageai.com')
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('VOYAGE_API_KEY not configured')
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        input_type: 'document',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Voyage API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('VOYAGE_API_KEY not configured')
    }

    // Voyage allows up to 128 texts per batch
    const batchSize = 128
    const allEmbeddings: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
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
    }

    return allEmbeddings
  }

  async embedQuery(query: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('VOYAGE_API_KEY not configured')
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: query,
        input_type: 'query', // Important: query type for search
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Voyage API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }
}

// Singleton instance
let voyageInstance: VoyageEmbeddings | null = null

export function getVoyageEmbeddings(): VoyageEmbeddings {
  if (!voyageInstance) {
    voyageInstance = new VoyageEmbeddings()
  }
  return voyageInstance
}

