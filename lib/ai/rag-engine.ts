/**
 * RAG Engine - Retrieval Augmented Generation
 * 
 * Powers the "Chat with your codebase" feature
 * Uses Voyage AI for embeddings + Qdrant for storage + Gemini for generation
 */

import { getVectorStore, VectorDocument, SearchResult } from './vector-store'
import { getAIProviderWithFallback } from './providers/factory'
import { ComprehensiveAnalysis } from '../analyzer/comprehensive-analyzer'

export interface RAGContext {
  query: string
  repoId: string
  repoName: string
  relevantCode: SearchResult[]
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface RAGResponse {
  answer: string
  sources: Array<{
    type: string
    name: string
    filePath?: string
    relevance: number
  }>
}

export class RAGEngine {
  private vectorStore = getVectorStore()

  /**
   * Index a repository's code for semantic search
   */
  async indexRepository(
    repoId: string,
    repoName: string,
    analysis: ComprehensiveAnalysis
  ): Promise<{ indexed: number; skipped: number }> {
    const documents: VectorDocument[] = []

    // Index functions
    for (const func of analysis.functions) {
      documents.push({
        id: `${repoId}-func-${func.name}-${func.lineStart}`,
        content: this.buildFunctionContext(func),
        metadata: {
          repoId,
          type: 'function',
          name: func.name,
          filePath: func.filePath,
          lineStart: func.lineStart,
          lineEnd: func.lineEnd,
        },
      })
    }

    // Index classes
    for (const cls of analysis.classes) {
      documents.push({
        id: `${repoId}-class-${cls.name}-${cls.lineStart}`,
        content: this.buildClassContext(cls),
        metadata: {
          repoId,
          type: 'class',
          name: cls.name,
          filePath: cls.filePath,
          lineStart: cls.lineStart,
          lineEnd: cls.lineEnd,
        },
      })
    }

    // Index API routes
    for (const api of analysis.apiRoutes) {
      documents.push({
        id: `${repoId}-api-${api.method}-${api.path}`,
        content: this.buildAPIContext(api),
        metadata: {
          repoId,
          type: 'api',
          name: `${api.method} ${api.path}`,
          filePath: api.filePath,
          lineStart: api.lineStart,
        },
      })
    }

    // Index components
    for (const comp of analysis.components) {
      documents.push({
        id: `${repoId}-comp-${comp.name}-${comp.lineStart}`,
        content: this.buildComponentContext(comp),
        metadata: {
          repoId,
          type: 'component',
          name: comp.name,
          filePath: comp.filePath,
          lineStart: comp.lineStart,
        },
      })
    }

    // Index services
    for (const svc of analysis.services) {
      documents.push({
        id: `${repoId}-svc-${svc.name}`,
        content: this.buildServiceContext(svc),
        metadata: {
          repoId,
          type: 'class',
          name: svc.name,
          filePath: svc.filePath,
        },
      })
    }

    // Delete old vectors and upsert new ones
    await this.vectorStore.deleteByRepo(repoId)
    await this.vectorStore.upsert(documents)

    return { indexed: documents.length, skipped: 0 }
  }

  /**
   * Answer a question about the codebase using RAG
   */
  async answerQuestion(context: RAGContext): Promise<RAGResponse> {
    // Check if user is asking for specific code
    if (this.isCodeRequest(context.query)) {
      const exactCode = await this.handleCodeRequest(context.query, context.repoId)
      if (exactCode) {
        return exactCode
      }
    }

    // Search for relevant code
    const results = await this.vectorStore.search(context.query, context.repoId, 8)

    if (results.length === 0) {
      return {
        answer: "I couldn't find relevant code for your question. Try regenerating the documentation or asking a more specific question.",
        sources: [],
      }
    }

    // Build context for LLM
    const codeContext = results
      .map((r, i) => `### ${i + 1}. ${r.metadata.name || 'Code'} (${r.metadata.type})\nFile: ${r.metadata.filePath || 'Unknown'}\n\`\`\`\n${r.content.substring(0, 2000)}\n\`\`\``)
      .join('\n\n')

    const conversationContext = context.conversationHistory
      ?.slice(-5)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') || ''

    const prompt = `You are an expert code assistant for the "${context.repoName}" repository.

${conversationContext ? `## Previous Conversation\n${conversationContext}\n` : ''}

## Relevant Code
${codeContext}

## User Question
${context.query}

## Instructions
1. Answer the question based on the code context above
2. Be specific and reference the actual code/files
3. If showing code, use proper syntax highlighting
4. If the user asks for specific code (like "show me the login function" or "what does the auth code look like"), provide the exact code with line numbers from the repository
5. When providing code, format it as:
   **File:** \`path/to/file.ts\`
   **Lines:** 123-145
   \`\`\`language
   123| exact code from repository
   124| with line numbers
   \`\`\`
6. Explain your reasoning
7. If the code doesn't answer the question, say so honestly

Answer:`

    const ai = await getAIProviderWithFallback()
    const answer = await ai.chat(prompt)

    return {
      answer,
      sources: results.map(r => ({
        type: r.metadata.type,
        name: r.metadata.name || 'Unknown',
        filePath: r.metadata.filePath,
        relevance: Math.round(r.score * 100),
      })),
    }
  }

  /**
   * Handle requests for specific code with exact snippets
   */
  private async handleCodeRequest(query: string, repoId: string): Promise<RAGResponse | null> {
    // Try to extract function/class name from the query
    const patterns = [
      /show me (?:the )?(?:code for |implementation of )?["']?([\w\d_]+)["']?/i,
      /what does (?:the )?["']?([\w\d_]+)["']? (?:function|class|method|component)(?: do)?/i,
      /give me (?:the )?(?:code for |implementation of )?["']?([\w\d_]+)["']?/i,
      /(?:find|get) (?:the )?["']?([\w\d_]+)["']? (?:function|class|method|component)/i,
      /code for ["']?([\w\d_]+)["']?/i,
      /(?:the )?["']?([\w\d_]+)["']? (?:function|class|method|component)/i,
      /([\w\d_]+) function/i,
      /([\w\d_]+) class/i,
      /([\w\d_]+) component/i,
    ]

    let targetName = null
    for (const pattern of patterns) {
      const match = query.match(pattern)
      if (match && match[1]) {
        targetName = match[1]
        break
      }
    }

    if (!targetName) return null

    // Try different types
    const types = ['function', 'class', 'component', 'api']
    for (const type of types) {
      const exactCode = await this.getExactCode(targetName, type, repoId)
      if (exactCode) {
        // Format code with line numbers
        const lines = exactCode.code.split('\n')
        const numberedLines = lines.map((line, index) =>
          `${(exactCode.lineStart + index).toString().padStart(4, ' ')}| ${line}`
        ).join('\n')

        const answer = `Here's the exact code for \`${targetName}\`:

**File:** \`${exactCode.filePath}\`
**Lines:** ${exactCode.lineStart}-${exactCode.lineEnd}
**Type:** ${type}

\`\`\`${this.getLanguageFromFile(exactCode.filePath)}
${numberedLines}
\`\`\`

This is the complete implementation from your codebase.`

        return {
          answer,
          sources: [{
            type,
            name: targetName,
            filePath: exactCode.filePath,
            relevance: 100,
          }],
        }
      }
    }

    return null
  }

  /**
   * Get language for syntax highlighting based on file extension
   */
  private getLanguageFromFile(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts': return 'typescript'
      case 'tsx': return 'typescript'
      case 'js': return 'javascript'
      case 'jsx': return 'javascript'
      case 'py': return 'python'
      case 'java': return 'java'
      case 'cpp': case 'cc': case 'cxx': return 'cpp'
      case 'c': return 'c'
      case 'go': return 'go'
      case 'rs': return 'rust'
      case 'php': return 'php'
      case 'rb': return 'ruby'
      case 'swift': return 'swift'
      case 'kt': return 'kotlin'
      case 'scala': return 'scala'
      default: return ''
    }
  }

  /**
   * Search for code semantically
   */
  async searchCode(query: string, repoId: string, limit: number = 10): Promise<SearchResult[]> {
    return this.vectorStore.search(query, repoId, limit)
  }

  /**
   * Get exact code with line numbers for a specific function/class
   */
  async getExactCode(name: string, type: string, repoId: string): Promise<{ code: string; filePath: string; lineStart: number; lineEnd: number } | null> {
    // Search for exact matches
    const results = await this.vectorStore.search(`"${name}" ${type}`, repoId, 5)

    // Find the best match
    for (const result of results) {
      if (result.metadata.name === name && result.metadata.type === type) {
        // Extract the full code from the stored content
        const content = result.content
        const codeMatch = content.match(/Full Code:\n([\s\S]*)$/)
        if (codeMatch) {
          return {
            code: codeMatch[1].trim(),
            filePath: result.metadata.filePath || 'Unknown',
            lineStart: result.metadata.lineStart || 0,
            lineEnd: result.metadata.lineEnd || 0,
          }
        }
      }
    }

    return null
  }

  /**
   * Detect if user is asking for specific code
   */
  private isCodeRequest(query: string): boolean {
    const codeKeywords = [
      'show me', 'give me', 'what does', 'what is the',
      'code for', 'implementation of', 'definition of',
      'how does', 'where is', 'find the', 'get the',
      'source code', 'function code', 'class code',
      'let me see', 'can you show', 'display the',
      'print the', 'output the', 'the code of',
      'exact code', 'full code', 'complete code',
      'what\'s the', 'what is', 'how is', 'let me see the'
    ]

    const lowerQuery = query.toLowerCase()

    // Check for code keywords
    const hasCodeKeyword = codeKeywords.some(keyword => lowerQuery.includes(keyword))

    // Also check for specific patterns like "auth function" or "login class"
    const hasCodePattern = /\b\w+\s+(function|class|component|method|service)\b/i.test(query)

    return hasCodeKeyword || hasCodePattern
  }

  // Build context strings for different code types
  private buildFunctionContext(func: any): string {
    const params = func.parameters?.map((p: any) => `${p.name}: ${p.type || 'any'}`).join(', ') || ''
    return `Function: ${func.name}
File: ${func.filePath}
Lines: ${func.lineStart}-${func.lineEnd}
Signature: ${func.isAsync ? 'async ' : ''}function ${func.name}(${params}): ${func.returnType || 'void'}
Exported: ${func.isExported}
Complexity: ${func.complexity}

Full Code:
${func.code || 'N/A'}`
  }

  private buildClassContext(cls: any): string {
    const methods = cls.methods?.map((m: any) => m.name).join(', ') || ''
    return `Class: ${cls.name}
File: ${cls.filePath}
Lines: ${cls.lineStart}-${cls.lineEnd}
Extends: ${cls.extends || 'None'}
Implements: ${cls.implements?.join(', ') || 'None'}
Methods: ${methods}

Full Code:
${cls.code || 'N/A'}`
  }

  private buildAPIContext(api: any): string {
    return `API Endpoint: ${api.method} ${api.path}
File: ${api.filePath}
Lines: ${api.lineStart}-${api.lineEnd}
Protected: ${api.isProtected}
Parameters: ${api.parameters?.map((p: any) => p.name).join(', ') || 'None'}

Full Code:
${api.code || 'N/A'}`
  }

  private buildComponentContext(comp: any): string {
    const props = comp.props?.map((p: any) => p.name).join(', ') || ''
    return `React Component: ${comp.name}
File: ${comp.filePath}
Lines: ${comp.lineStart}-${comp.lineEnd}
Client Component: ${comp.isClientComponent}
Props: ${props}
Hooks Used: ${comp.hooks?.join(', ') || 'None'}

Full Code:
${comp.code || 'N/A'}`
  }

  private buildServiceContext(svc: any): string {
    const methods = svc.methods?.map((m: any) => m.name).join(', ') || ''
    return `Service: ${svc.name}
File: ${svc.filePath}
Lines: ${svc.lineStart}-${svc.lineEnd}
Methods: ${methods}
Dependencies: ${svc.dependencies?.join(', ') || 'None'}

Full Code:
${svc.code || 'N/A'}`
  }

  isAvailable(): boolean {
    return this.vectorStore.isAvailable()
  }
}

// Singleton
let ragEngineInstance: RAGEngine | null = null

export function getRAGEngine(): RAGEngine {
  if (!ragEngineInstance) {
    ragEngineInstance = new RAGEngine()
  }
  return ragEngineInstance
}

// Factory function for creating new instances
export function createRAGEngine(): RAGEngine {
  return new RAGEngine()
}
