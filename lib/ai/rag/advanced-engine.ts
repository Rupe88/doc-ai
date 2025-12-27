/**
 * Advanced RAG Engine - Next Level Intelligence
 *
 * Features:
 * - Multi-hop reasoning and chain-of-thought
 * - Code-aware chunking with semantic boundaries
 * - Dynamic retrieval with query expansion
 * - Hybrid search with re-ranking
 * - Memory and context management
 * - Cross-repository knowledge sharing
 */

import { getRAGEngine, RAGEngine } from './engine'
import { getAIProviderWithFallback } from '../providers/factory'

export interface AdvancedRAGQuery {
  question: string
  context: {
    repoId: string
    recentFiles?: string[]
    currentFile?: string
    selectedCode?: string
    conversationHistory?: any[]
  }
  options: {
    maxHops?: number
    includeRelatedRepos?: boolean
    reasoningDepth?: 'shallow' | 'medium' | 'deep'
    confidenceThreshold?: number
  }
}

export interface RAGReasoningStep {
  step: number
  question: string
  retrievedChunks: any[]
  reasoning: string
  confidence: number
  answer?: string
}

export class AdvancedRAGEngine {
  private baseEngine: RAGEngine
  private aiPromise = getAIProviderWithFallback()
  private ai: any = null

  constructor() {
    this.baseEngine = getRAGEngine()
    // Initialize AI provider
    this.aiPromise.then(provider => {
      this.ai = provider
    }).catch(error => {
      console.error('Failed to initialize AI provider:', error)
    })
  }

  async advancedQuery(query: AdvancedRAGQuery): Promise<{
    finalAnswer: string
    reasoningChain: RAGReasoningStep[]
    sources: any[]
    confidence: number
    relatedQuestions: string[]
  }> {
    if (!this.ai) {
      await this.aiPromise.then(provider => { this.ai = provider })
    }
    const reasoningChain: RAGReasoningStep[] = []
    let currentQuestion = query.question
    let accumulatedContext = ''

    const maxHops = query.options.maxHops || 3

    // Multi-hop reasoning loop
    for (let hop = 0; hop < maxHops; hop++) {
      // Expand query based on context
      const expandedQuery = await this.expandQuery(currentQuestion, accumulatedContext)

      // Retrieve relevant chunks
      const chunks = await this.baseEngine.search(expandedQuery, query.context.repoId, 5)

      // Re-rank chunks based on relevance
      const rankedChunks = await this.reRankChunks(expandedQuery, chunks)

      // Generate reasoning for this step
      const reasoning = await this.generateReasoning(currentQuestion, rankedChunks, accumulatedContext)

      const step: RAGReasoningStep = {
        step: hop + 1,
        question: currentQuestion,
        retrievedChunks: rankedChunks,
        reasoning: reasoning.reasoning,
        confidence: reasoning.confidence
      }

      reasoningChain.push(step)

      // Check if we have enough confidence
      if (reasoning.confidence > (query.options.confidenceThreshold || 0.8)) {
        step.answer = reasoning.answer
        break
      }

      // Generate follow-up question for next hop
      currentQuestion = await this.generateFollowUpQuestion(reasoning, rankedChunks)
      accumulatedContext += reasoning.reasoning + '\n'
    }

    // Synthesize final answer
    const finalAnswer = await this.synthesizeAnswer(reasoningChain, query)

    // Generate related questions
    const relatedQuestions = await this.generateRelatedQuestions(finalAnswer, query.context)

    return {
      finalAnswer,
      reasoningChain,
      sources: reasoningChain.flatMap(step => step.retrievedChunks),
      confidence: Math.max(...reasoningChain.map(s => s.confidence)),
      relatedQuestions
    }
  }

  private async expandQuery(question: string, context: string): Promise<string> {
    if (!context) return question

    const prompt = `Expand this question with additional context for better code search:

Original: "${question}"
Context: ${context.substring(0, 500)}

Generate an expanded query that includes:
- Technical terms and concepts
- Related functionality
- Implementation details
- Error patterns or edge cases

Return only the expanded query.`

    try {
      return await this.ai.chat(prompt)
    } catch (error: any) {
      console.warn('Query expansion failed:', error?.message)
      return question
    }
  }

  private async reRankChunks(query: string, inputChunks: any[]): Promise<any[]> {
    if (inputChunks.length <= 1) return inputChunks

    const chunkTexts = inputChunks.map(c => c.payload.content?.substring(0, 200) || '')

    const prompt = `Re-rank these code snippets by relevance to: "${query}"

Snippets:
${chunkTexts.map((text, i) => `${i + 1}. ${text}`).join('\n\n')}

Return ranking as: "1,3,2,4,5" (most to least relevant)`

    try {
      const rankingStr = await this.ai.chat(prompt)
      const rankingIndices = rankingStr.split(',').map((n: string) => parseInt(n.trim()) - 1)

      return rankingIndices
        .filter((index: number) => index >= 0 && index < inputChunks.length)
        .map((index: number) => inputChunks[index])
    } catch (error: any) {
      console.warn('Chunk re-ranking failed:', error?.message)
      return inputChunks
    }
  }

  private async generateReasoning(
    question: string,
    chunks: any[],
    accumulatedContext: string
  ): Promise<{ reasoning: string; confidence: number; answer?: string }> {
    const contextText = chunks
      .map(c => `File: ${c.payload.filePath}\n${c.payload.content}`)
      .join('\n\n')

    const prompt = `Analyze this code context to answer: "${question}"

Code Context:
${contextText}

Previous reasoning: ${accumulatedContext}

Provide:
1. Step-by-step reasoning about the code
2. Answer to the question (if possible)
3. Confidence score (0.0-1.0)

Format: REASONING: [your analysis]
ANSWER: [direct answer]
CONFIDENCE: [0.0-1.0]`

    try {
      const response = await this.ai.chat(prompt)

      const reasoning = response.match(/REASONING:\s*(.+?)(?=ANSWER:|$)/)?.[1]?.trim() || response
      const answer = response.match(/ANSWER:\s*(.+?)(?=CONFIDENCE:|$)/)?.[1]?.trim()
      const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9.]+)/)
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5

      return { reasoning, confidence, answer }
    } catch (error: any) {
      console.warn('Reasoning generation failed:', error?.message)
      return {
        reasoning: 'Unable to analyze code context',
        confidence: 0.3
      }
    }
  }

  private async generateFollowUpQuestion(reasoning: any, chunks: any[]): Promise<string> {
    const prompt = `Based on this analysis, what additional information do we need?

Current reasoning: ${reasoning.reasoning}
Available code: ${chunks.map(c => c.payload.name).join(', ')}

Generate a specific follow-up question to gather more information.
Return only the question.`

    try {
      return await this.ai.chat(prompt)
    } catch (error: any) {
      console.warn('Follow-up question generation failed:', error?.message)
      return reasoning.question + ' (continued)'
    }
  }

  private async synthesizeAnswer(reasoningChain: RAGReasoningStep[], query: AdvancedRAGQuery): Promise<string> {
    const allReasoning = reasoningChain.map(step =>
      `Step ${step.step}: ${step.reasoning}${step.answer ? `\nAnswer: ${step.answer}` : ''}`
    ).join('\n\n')

    const prompt = `Synthesize a comprehensive answer from this reasoning chain:

Question: ${query.question}

Reasoning Chain:
${allReasoning}

Provide a clear, well-structured final answer that combines all insights.`

    try {
      return await this.ai.chat(prompt)
    } catch (error: any) {
      console.warn('Answer synthesis failed:', error?.message)
      // Fallback to last step's answer
      const lastStep = reasoningChain[reasoningChain.length - 1]
      return lastStep.answer || lastStep.reasoning
    }
  }

  private async generateRelatedQuestions(answer: string, context: any): Promise<string[]> {
    const prompt = `Based on this answer, generate 3 related questions a developer might ask:

Answer: ${answer.substring(0, 500)}

Context: Working with ${context.repoId}

Return as a numbered list.`

    try {
      const response = await this.ai.chat(prompt)
      return response.split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 3)
    } catch (error: any) {
      console.warn('Related questions generation failed:', error?.message)
      return []
    }
  }

  // Advanced code-aware chunking
  async smartChunkCode(code: string, filePath: string): Promise<any[]> {
    const chunks = []

    // Split by semantic boundaries (functions, classes, etc.)
    const lines = code.split('\n')

    let currentChunk = ''
    let currentType = 'unknown'
    let braceDepth = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Detect semantic boundaries
      if (trimmed.startsWith('function ') || trimmed.startsWith('const ') || trimmed.startsWith('class ')) {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            type: currentType,
            startLine: i - currentChunk.split('\n').length,
            endLine: i - 1
          })
        }
        currentChunk = line + '\n'
        currentType = trimmed.startsWith('function ') ? 'function' :
                     trimmed.startsWith('class ') ? 'class' : 'variable'
        braceDepth = 0
      } else {
        currentChunk += line + '\n'

        // Track brace depth for block boundaries
        braceDepth += (line.match(/\{/g) || []).length
        braceDepth -= (line.match(/\}/g) || []).length
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        type: currentType,
        startLine: lines.length - currentChunk.split('\n').length,
        endLine: lines.length - 1
      })
    }

    return chunks
  }
}

// Enhanced RAG with reasoning capabilities
export async function advancedRAGQuery(query: AdvancedRAGQuery) {
  const engine = new AdvancedRAGEngine()
  return engine.advancedQuery(query)
}
