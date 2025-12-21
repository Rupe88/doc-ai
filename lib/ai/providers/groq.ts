/**
 * Groq AI Provider - FREE & FAST!
 * 
 * Get API key: https://console.groq.com/
 * Free tier: Very generous, fast inference
 * Models: Llama 3.3, Mixtral, etc.
 * 
 * Supported models (as of 2025):
 * - llama-3.3-70b-versatile (recommended, most powerful)
 * - llama-3.1-8b-instant (faster, smaller)
 * - mixtral-8x7b-32768
 * - gemma2-9b-it
 */
import { ChatGroq } from '@langchain/groq'
import type { AIProvider, ChatMessage, ChatOptions } from './base'
export type { AIProvider }

// Default to the latest recommended model
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'

export class GroqProvider implements AIProvider {
  private client: ChatGroq

  constructor() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set. Get free API key at https://console.groq.com/')
    }

    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
    console.log(`[GroqProvider] Using model: ${model}`)

    this.client = new ChatGroq({
      apiKey,
      model,
      temperature: 0.3,
    })
  }

  async chat(prompt: string, options?: ChatOptions): Promise<string> {
    const response = await this.client.invoke(prompt)
    return response.content as string
  }

  async chatWithHistory(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role,
      content: msg.content,
    }))

    const response = await this.client.invoke(formattedMessages)
    return response.content as string
  }
}

export function createGroqProvider(): AIProvider {
  return new GroqProvider()
}

