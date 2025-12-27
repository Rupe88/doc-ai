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
      // Provide helpful guidance based on query type
      const helpfulResponse = this.generateHelpfulResponse(context.query, context.repoName)
      return {
        answer: helpfulResponse,
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
   * Enhanced search with multiple strategies for maximum relevance
   */
  async searchCode(query: string, repoId: string, limit: number = 15): Promise<SearchResult[]> {
    try {
      // Get semantic search results
      let results = await this.vectorStore.search(query, repoId, limit)

      // If semantic search returns few results, try keyword-based search
      if (results.length < 3) {
        console.log('[RAG] Semantic search returned few results, trying keyword search')
        const keywordResults = await this.keywordSearch(query, repoId, limit)
        results = [...results, ...keywordResults].slice(0, limit)
      }

      // Boost results by type relevance
      results = this.boostResultsByType(results, query)

      // Remove duplicates and sort by relevance
      results = this.deduplicateAndSort(results)

      console.log(`[RAG] Found ${results.length} relevant results for query: "${query}"`)

      return results
    } catch (error) {
      console.error('[RAG] Enhanced search failed:', error)
      return []
    }
  }

  /**
   * Keyword-based search as fallback
   */
  private async keywordSearch(query: string, repoId: string, limit: number): Promise<SearchResult[]> {
    try {
      const keywords = this.extractKeywords(query)

      // Search for each keyword combination
      const allResults: SearchResult[] = []

      for (const keyword of keywords) {
        const results = await this.vectorStore.search(keyword, repoId, Math.ceil(limit / keywords.length))

        // Boost results that contain the actual keyword
        results.forEach(result => {
          if (result.content.toLowerCase().includes(keyword.toLowerCase())) {
            result.score *= 1.5 // Boost exact matches
          }
        })

        allResults.push(...results)
      }

      return allResults
    } catch (error) {
      console.warn('[RAG] Keyword search failed:', error)
      return []
    }
  }

  /**
   * Extract meaningful keywords from query
   */
  private extractKeywords(query: string): string[] {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2) // Remove short words
      .filter(word => !this.isStopWord(word)) // Remove stop words

    // Extract function/class names (camelCase, snake_case)
    const identifiers = query.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []
    const meaningfulIdentifiers = identifiers.filter(id =>
      id.length > 3 && !this.isStopWord(id.toLowerCase())
    )

    return [...new Set([...words, ...meaningfulIdentifiers])].slice(0, 5)
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'an', 'a', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'how', 'what', 'when', 'where', 'why', 'which', 'who', 'that', 'this', 'these', 'those']
    return stopWords.includes(word)
  }

  /**
   * Boost results based on query type and content
   */
  private boostResultsByType(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase()

    return results.map(result => {
      let boost = 1.0

      // Boost based on query type
      if (queryLower.includes('function') && result.metadata.type === 'function') boost *= 1.8
      if (queryLower.includes('class') && result.metadata.type === 'class') boost *= 1.8
      if (queryLower.includes('api') && result.metadata.type === 'api') boost *= 1.8
      if (queryLower.includes('component') && result.metadata.type === 'component') boost *= 1.8

      // Boost exact name matches
      if (result.metadata.name && queryLower.includes(result.metadata.name.toLowerCase())) {
        boost *= 2.0
      }

      // Boost file path relevance
      if (result.metadata.filePath) {
        const fileName = result.metadata.filePath.toLowerCase()
        if (queryLower.includes('route') && fileName.includes('route')) boost *= 1.5
        if (queryLower.includes('model') && fileName.includes('model')) boost *= 1.5
        if (queryLower.includes('service') && fileName.includes('service')) boost *= 1.5
        if (queryLower.includes('controller') && fileName.includes('controller')) boost *= 1.5
      }

      result.score *= boost
      return result
    })
  }

  /**
   * Remove duplicates and sort by relevance
   */
  private deduplicateAndSort(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    const unique: SearchResult[] = []

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    for (const result of results) {
      const key = `${result.metadata.type}-${result.metadata.name}-${result.metadata.filePath}`

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(result)
      }
    }

    return unique.slice(0, 10) // Return top 10
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

  async isAvailable(repoId?: string): Promise<boolean> {
    try {
      // Check if vector store is configured
      const vectorAvailable = this.vectorStore.isAvailable()
      if (!vectorAvailable) return false

      // If repoId provided, check if it has indexed data
      if (repoId) {
        const count = await this.vectorStore.getDocumentCount(repoId)
        return count > 0
      }

      return true
    } catch (error) {
      console.warn('[RAG] Availability check failed:', error)
      return false
    }
  }

  /**
   * Generate helpful response when no code is found
   */
  private generateHelpfulResponse(query: string, repoName: string): string {
    const queryLower = query.toLowerCase()

    // Provide specific guidance based on query type
    if (queryLower.includes('function') || queryLower.includes('method')) {
      return `I couldn't find specific function information in your "${repoName}" codebase. This usually means:\n\n**Possible Issues:**\n• Repository hasn't been indexed yet (run documentation generation)\n• Function name might be different\n• Code might not be analyzed\n\n**Try asking:**\n• "What does the \`createUser\` function do?"\n• "Show me the login function"\n• "What functions handle authentication?"\n\n**To fix:** Generate documentation for your repository first.`
    }

    if (queryLower.includes('api') || queryLower.includes('endpoint') || queryLower.includes('route')) {
      return `I couldn't find API endpoint information in "${repoName}". This could be because:\n\n**Common Issues:**\n• API routes haven't been indexed\n• Different naming conventions\n• Routes defined in separate files\n\n**Try asking:**\n• "What are the API endpoints?"\n• "Show me the user routes"\n• "How do you handle POST /api/users?"\n\n**Solution:** Re-run the repository analysis to index all API routes.`
    }

    if (queryLower.includes('database') || queryLower.includes('model') || queryLower.includes('schema')) {
      return `No database/model information found in "${repoName}". This typically means:\n\n**Possible Causes:**\n• Database models not indexed\n• Different ORM/structure used\n• Models defined differently\n\n**Try asking:**\n• "What does the User model contain?"\n• "Show me the database schema"\n• "How do you create new records?"\n\n**Fix:** Ensure your repository analysis includes database files.`
    }

    if (queryLower.includes('auth') || queryLower.includes('login') || queryLower.includes('security')) {
      return `Couldn't find authentication/security code in "${repoName}". Try:\n\n• "Show me the auth middleware"\n• "What authentication system do you use?"\n• "How do you handle JWT tokens?"\n• "Show me the login logic"\n\n**Note:** Security code might be in separate files or use different naming.`
    }

    // General helpful response
    return `I couldn't find relevant code for "${query}" in your "${repoName}" repository. This usually happens when:\n\n🔍 **Repository not indexed** - Run documentation generation first\n📝 **Different terminology** - Try rephrasing (e.g., "login" vs "authentication")\n🎯 **Too general** - Ask about specific functions/classes/files\n\n**Helpful questions to try:**
• "What functions are available?"
• "Show me the main API routes"
• "What does the User model contain?"
• "How do you handle authentication?"
• "What are the main components?"

**Quick Fix:** Re-analyze your repository to ensure all code is indexed properly.

What specific part of your codebase would you like to know about?`
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
