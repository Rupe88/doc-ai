/**
 * Base interface for AI providers
 */
export interface AIProvider {
  chat(prompt: string, options?: ChatOptions): Promise<string>
  chatWithHistory(messages: ChatMessage[], options?: ChatOptions): Promise<string>
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AIProviderType = 'openai' | 'groq' | 'gemini' | 'together' | 'huggingface' | 'ollama'

