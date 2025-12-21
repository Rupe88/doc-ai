import type { AIProvider } from './base'
import { createGeminiProvider } from './gemini'
import { createGroqProvider } from './groq'
import { createTogetherProvider } from './together'

/**
 * AI Provider Factory with Smart Fallback
 * 
 * Priority order based on FREE tier limits:
 * 1. Gemini - 1.5M tokens/min, 1500 req/day (BEST FREE - RECOMMENDED)
 * 2. Together AI - 25M tokens/month ($5 free credits)
 * 3. Groq - 100K tokens/day (hits limits fast)
 * 
 * Get API keys:
 * - Gemini (FREE): https://aistudio.google.com/apikey
 * - Together (FREE): https://api.together.xyz/
 * - Groq (FREE): https://console.groq.com/
 */

export async function getAIProvider(): Promise<AIProvider> {
  // Try Gemini first (highest free limits - 1.5M tokens/min!)
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    try {
      const provider = createGeminiProvider()
      console.log('[AI] Using Gemini (1.5M tokens/min FREE)')
      return provider
    } catch (e) {
      console.warn('[AI] Gemini init failed:', e)
    }
  }

  // Try Together AI second (good free tier - $5 free credits)
  if (process.env.TOGETHER_API_KEY) {
    try {
      const provider = createTogetherProvider()
      console.log('[AI] Using Together AI')
      return provider
    } catch (e) {
      console.warn('[AI] Together init failed:', e)
    }
  }

  // Try Groq last (limited free tier - 100K tokens/day)
  if (process.env.GROQ_API_KEY) {
    try {
      const provider = createGroqProvider()
      console.log('[AI] Using Groq (100K tokens/day limit)')
      return provider
    } catch (e) {
      console.warn('[AI] Groq init failed:', e)
    }
  }

  throw new Error(
    'No AI provider configured. Set one of:\n' +
    '- GEMINI_API_KEY (FREE - recommended, highest limits)\n' +
    '- TOGETHER_API_KEY (FREE tier available)\n' +
    '- GROQ_API_KEY (FREE but limited)\n\n' +
    'Get free Gemini key: https://aistudio.google.com/apikey'
  )
}

/**
 * Smart provider with automatic fallback on rate limits
 * Falls through to next provider if one fails with 429
 */
export async function getAIProviderWithFallback(): Promise<AIProvider> {
  const providers: { name: string; create: () => AIProvider }[] = []

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    providers.push({ name: 'Gemini', create: createGeminiProvider })
  }
  if (process.env.TOGETHER_API_KEY) {
    providers.push({ name: 'Together', create: createTogetherProvider })
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({ name: 'Groq', create: createGroqProvider })
  }

  if (providers.length === 0) {
    throw new Error(
      'No AI provider configured. Get free Gemini key: https://aistudio.google.com/apikey'
    )
  }

  // Return a wrapper that tries each provider and falls back on rate limit
  return {
    async chat(prompt: string): Promise<string> {
      let lastError: Error | null = null
      
      for (const { name, create } of providers) {
        try {
          const provider = create()
          const result = await provider.chat(prompt)
          return result
        } catch (e: any) {
          console.warn(`[AI] ${name} failed:`, e.message?.substring(0, 100))
          lastError = e
          // If rate limited (429), try next provider
          if (e.message?.includes('429') || e.message?.includes('rate limit') || e.message?.includes('Rate limit')) {
            console.log(`[AI] Rate limited on ${name}, trying next provider...`)
            continue
          }
          // For other errors, still try next provider but log the error
          continue
        }
      }
      
      throw lastError || new Error('All AI providers failed')
    },

    async chatWithHistory(messages: any[]): Promise<string> {
      let lastError: Error | null = null
      
      for (const { name, create } of providers) {
        try {
          const provider = create()
          const result = await provider.chatWithHistory(messages)
          return result
        } catch (e: any) {
          console.warn(`[AI] ${name} failed:`, e.message?.substring(0, 100))
          lastError = e
          if (e.message?.includes('429') || e.message?.includes('rate limit') || e.message?.includes('Rate limit')) {
            console.log(`[AI] Rate limited on ${name}, trying next provider...`)
            continue
          }
          continue
        }
      }
      
      throw lastError || new Error('All AI providers failed')
    },
  }
}

export type { AIProvider }
