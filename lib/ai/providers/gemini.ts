/**
 * Gemini AI Provider - HIGHEST FREE LIMITS!
 * 
 * Get API key: https://aistudio.google.com/apikey
 * Free tier: 1.5M tokens/minute, 1500 requests/day
 * 
 * Supported models:
 * - gemini-1.5-flash (fast, recommended)
 * - gemini-1.5-pro (more powerful)
 * - gemini-2.0-flash-exp (experimental, very fast)
 */
import type { AIProvider, ChatMessage, ChatOptions } from './base'

export class GeminiProvider implements AIProvider {
  name = 'gemini'
  private apiKey: string
  private model: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    this.model = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    
    if (!this.apiKey) {
      throw new Error('Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY. Get free key at: https://aistudio.google.com/apikey')
    }
    
    console.log(`[GeminiProvider] Using model: ${this.model}`)
  }

  async chat(prompt: string, options?: ChatOptions): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 8192,
          topP: 0.95,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  async chatWithHistory(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`
    
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 8192,
          topP: 0.95,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }
}

export function createGeminiProvider(apiKey?: string, model?: string): AIProvider {
  return new GeminiProvider(apiKey, model)
}
