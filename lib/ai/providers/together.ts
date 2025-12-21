/**
 * Together AI Provider - FREE TIER!
 * 
 * Get API key: https://api.together.xyz/
 * Free tier: $5 free credits
 * 
 * Supported models (as of 2025):
 * - meta-llama/Llama-3.3-70B-Instruct-Turbo (recommended)
 * - meta-llama/Llama-3.1-8B-Instruct-Turbo (faster, smaller)
 * - mistralai/Mixtral-8x7B-Instruct-v0.1
 * - Qwen/Qwen2.5-72B-Instruct-Turbo
 */
import { ChatOpenAI } from '@langchain/openai'
import type { AIProvider, ChatMessage, ChatOptions } from './base'
export type { AIProvider }

// Default to Llama 3.3 70B - most powerful free option
const DEFAULT_TOGETHER_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo'

export class TogetherProvider implements AIProvider {
  private client: ChatOpenAI

  constructor() {
    const apiKey = process.env.TOGETHER_API_KEY
    if (!apiKey) {
      throw new Error('TOGETHER_API_KEY is not set. Get free API key at https://api.together.xyz/')
    }

    const model = process.env.TOGETHER_MODEL || DEFAULT_TOGETHER_MODEL
    console.log(`[TogetherProvider] Using model: ${model}`)

    this.client = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: 0.3,
      configuration: {
        baseURL: 'https://api.together.xyz/v1',
      },
    } as any)
  }

  async chat(prompt: string, options?: ChatOptions): Promise<string> {
    const response = await this.client.invoke(prompt, {
      maxTokens: options?.maxTokens,
    } as any)
    return response.content as string
  }

  async chatWithHistory(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role,
      content: msg.content,
    }))

    const response = await this.client.invoke(formattedMessages, {
      maxTokens: options?.maxTokens,
    } as any)
    return response.content as string
  }
}

export function createTogetherProvider(): AIProvider {
  return new TogetherProvider()
}

