/**
 * GitHub Copilot-Style Code Intelligence
 *
 * Features:
 * - Real-time code completion
 * - Intelligent refactoring suggestions
 * - Code explanation and documentation
 * - Bug detection and fixes
 * - Performance optimization hints
 * - Best practices recommendations
 */

import { getAIProviderWithFallback } from './providers/factory'
import { getRAGEngine } from './rag/engine'

export interface CodeCompletionRequest {
  code: string
  cursorPosition: number
  filePath: string
  language: string
  context?: {
    imports?: string[]
    functions?: string[]
    classes?: string[]
    repoId?: string
  }
}

export interface CodeCompletionResponse {
  suggestions: Array<{
    completion: string
    confidence: number
    description: string
    kind: 'function' | 'method' | 'variable' | 'class' | 'import' | 'statement'
  }>
  metadata: {
    processingTime: number
    tokensUsed: number
  }
}

export interface RefactoringSuggestion {
  type: 'extract_function' | 'rename_variable' | 'simplify_condition' | 'remove_dead_code' | 'optimize_performance'
  title: string
  description: string
  before: string
  after: string
  lineStart: number
  lineEnd: number
  confidence: number
  impact: 'low' | 'medium' | 'high'
}

export class CopilotEngine {
  private aiPromise = getAIProviderWithFallback()
  private ragEngine = getRAGEngine()

  async getCodeCompletions(request: CodeCompletionRequest): Promise<CodeCompletionResponse> {
    const startTime = Date.now()

    try {
      const ai = await this.aiPromise

      // Build rich context
      const context = await this.buildCompletionContext(request)

      // Generate completions
      const prompt = `Complete this ${request.language} code:

File: ${request.filePath}
Context: ${context}

Code before cursor:
${request.code.substring(0, request.cursorPosition)}

Code after cursor:
${request.code.substring(request.cursorPosition)}

Provide 3-5 completion suggestions. Each should include:
- The completed code snippet
- A brief description
- Confidence score (0-1)
- Type of completion

Format: COMPLETION: [code]
DESCRIPTION: [description]
CONFIDENCE: [score]
TYPE: [function|method|variable|class|import|statement]`

      const response = await ai.chat(prompt)
      const suggestions = this.parseCompletions(response)

      return {
        suggestions: suggestions.slice(0, 5),
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: this.estimateTokens(response)
        }
      }
    } catch (error) {
      console.error('Code completion failed:', error)
      return {
        suggestions: [],
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0
        }
      }
    }
  }

  async getRefactoringSuggestions(
    code: string,
    filePath: string,
    repoId: string
  ): Promise<RefactoringSuggestion[]> {
    try {
      const ai = await this.aiPromise
      // Get similar code patterns from RAG
      const similarCode = await this.ragEngine.search(
        `refactoring patterns ${code.substring(0, 200)}`,
        repoId,
        3
      )

      const context = similarCode
        .map(s => s.payload.content?.substring(0, 300))
        .join('\n\n')

      const prompt = `Analyze this code for refactoring opportunities:

File: ${filePath}
Code:
${code}

Similar patterns in codebase:
${context}

Suggest specific refactoring improvements:
1. Extract functions/methods
2. Rename variables for clarity
3. Simplify complex conditions
4. Remove dead code
5. Performance optimizations
6. Best practices improvements

For each suggestion, provide:
- Type of refactoring
- Title and description
- Before/after code
- Line numbers
- Confidence and impact

Return as structured suggestions.`

      const response = await ai.chat(prompt)
      return this.parseRefactoringSuggestions(response, code)
    } catch (error) {
      console.error('Refactoring analysis failed:', error)
      return []
    }
  }

  async explainCode(
    code: string,
    filePath: string,
    repoId: string
  ): Promise<{
    explanation: string
    complexity: string
    suggestions: string[]
    relatedCode: string[]
  }> {
    try {
      const ai = await this.aiPromise
      // Get related code from RAG
      const related = await this.ragEngine.search(
        `explain ${code.substring(0, 100)}`,
        repoId,
        3
      )

      const context = related
        .map(s => `Related: ${s.payload.content?.substring(0, 200)}`)
        .join('\n')

      const prompt = `Explain this code in detail:

File: ${filePath}
Code:
${code}

Related code in project:
${context}

Provide:
1. Plain English explanation
2. Complexity analysis
3. Usage examples
4. Potential improvements
5. Related functions/classes

Make it educational and comprehensive.`

      const explanation = await ai.chat(prompt)

      // Parse structured response
      return {
        explanation: explanation.split('COMPLEXITY:')[0]?.trim() || explanation,
        complexity: explanation.match(/COMPLEXITY:\s*(.+?)(?=SUGGESTIONS:|$)/s)?.[1]?.trim() || 'Medium',
        suggestions: explanation.match(/SUGGESTIONS:\s*(.+?)(?=RELATED:|$)/s)?.[1]
          ?.split('\n')
          ?.filter(line => line.trim().startsWith('-'))
          ?.map(line => line.replace(/^-\s*/, '').trim()) || [],
        relatedCode: explanation.match(/RELATED:\s*(.+)$/s)?.[1]
          ?.split('\n')
          ?.filter(line => line.trim())
          ?.map(line => line.trim()) || []
      }
    } catch (error) {
      console.error('Code explanation failed:', error)
      return {
        explanation: 'Unable to analyze code at this time.',
        complexity: 'Unknown',
        suggestions: [],
        relatedCode: []
      }
    }
  }

  async detectBugs(code: string, filePath: string): Promise<Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    line: number
    suggestion: string
  }>> {
    try {
      const ai = await this.aiPromise
      const prompt = `Analyze this code for potential bugs and issues:

File: ${filePath}
Language: ${filePath.split('.').pop()}
Code:
${code}

Look for:
1. Logic errors
2. Null pointer exceptions
3. Type errors
4. Race conditions
5. Memory leaks
6. Security vulnerabilities
7. Performance issues

For each issue found, provide:
- Type of bug
- Severity level
- Detailed message
- Line number (approximate)
- Fix suggestion

Return as structured list.`

      const response = await ai.chat(prompt)
      return this.parseBugReports(response, code)
    } catch (error) {
      console.error('Bug detection failed:', error)
      return []
    }
  }

  private async buildCompletionContext(request: CodeCompletionRequest): Promise<string> {
    let context = `Language: ${request.language}\nFile: ${request.filePath}\n`

    if (request.context?.imports?.length) {
      context += `Imports: ${request.context.imports.join(', ')}\n`
    }

    if (request.context?.functions?.length) {
      context += `Available functions: ${request.context.functions.join(', ')}\n`
    }

    if (request.context?.classes?.length) {
      context += `Available classes: ${request.context.classes.join(', ')}\n`
    }

    // Get similar code patterns from RAG if repoId provided
    if (request.context?.repoId) {
      try {
        const similar = await this.ragEngine.search(
          request.code.substring(Math.max(0, request.cursorPosition - 50), request.cursorPosition),
          request.context.repoId,
          2
        )

        if (similar.length > 0) {
          context += '\nSimilar patterns in codebase:\n'
          similar.forEach(s => {
            context += `- ${s.payload.content?.substring(0, 100)}...\n`
          })
        }
      } catch (error) {
        // Continue without RAG context
      }
    }

    return context
  }

  private parseCompletions(response: string): CodeCompletionResponse['suggestions'] {
    const suggestions = []
    const sections = response.split(/COMPLETION:/)

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i]
      const completion = section.match(/^(.*?)(?=DESCRIPTION:|$)/s)?.[1]?.trim()
      const description = section.match(/DESCRIPTION:\s*(.+?)(?=CONFIDENCE:|$)/s)?.[1]?.trim()
      const confidenceMatch = section.match(/CONFIDENCE:\s*([0-9.]+)/)
      const typeMatch = section.match(/TYPE:\s*(.+?)(?=\n|$)/)

      if (completion) {
        suggestions.push({
          completion,
          confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
          description: description || 'Code completion suggestion',
          kind: (typeMatch?.[1]?.toLowerCase() as any) || 'statement'
        })
      }
    }

    return suggestions
  }

  private parseRefactoringSuggestions(response: string, originalCode: string): RefactoringSuggestion[] {
    // Simple parsing - in production, use structured output
    const suggestions: RefactoringSuggestion[] = []

    // Extract suggestions from response
    const lines = response.split('\n')
    let currentSuggestion: Partial<RefactoringSuggestion> | null = null

    for (const line of lines) {
      if (line.toLowerCase().includes('extract function') ||
          line.toLowerCase().includes('rename variable') ||
          line.toLowerCase().includes('simplify')) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion as RefactoringSuggestion)
        }
        currentSuggestion = {
          type: this.inferRefactoringType(line),
          title: line.trim(),
          description: '',
          before: '',
          after: '',
          lineStart: 0,
          lineEnd: 0,
          confidence: 0.7,
          impact: 'medium'
        }
      } else if (currentSuggestion && line.trim()) {
        currentSuggestion.description += line.trim() + ' '
      }
    }

    if (currentSuggestion) {
      suggestions.push(currentSuggestion as RefactoringSuggestion)
    }

    return suggestions.slice(0, 5)
  }

  private parseBugReports(response: string, code: string): Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    line: number
    suggestion: string
  }> {
    const bugs = []
    const lines = response.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.toLowerCase().includes('bug') ||
          line.toLowerCase().includes('error') ||
          line.toLowerCase().includes('issue') ||
          line.toLowerCase().includes('vulnerability')) {

        // Estimate line number based on code content
        const estimatedLine = this.estimateLineNumber(line, code)

        bugs.push({
          type: this.inferBugType(line),
          severity: this.inferSeverity(line),
          message: line.trim(),
          line: estimatedLine,
          suggestion: lines[i + 1]?.trim() || 'Review and fix the issue'
        })
      }
    }

    return bugs.slice(0, 10)
  }

  private inferRefactoringType(line: string): RefactoringSuggestion['type'] {
    const lower = line.toLowerCase()
    if (lower.includes('extract function')) return 'extract_function'
    if (lower.includes('rename')) return 'rename_variable'
    if (lower.includes('simplify')) return 'simplify_condition'
    if (lower.includes('dead code')) return 'remove_dead_code'
    if (lower.includes('performance') || lower.includes('optimize')) return 'optimize_performance'
    return 'extract_function'
  }

  private inferBugType(line: string): string {
    const lower = line.toLowerCase()
    if (lower.includes('null') || lower.includes('undefined')) return 'null_pointer'
    if (lower.includes('type')) return 'type_error'
    if (lower.includes('race') || lower.includes('async')) return 'concurrency'
    if (lower.includes('memory')) return 'memory_leak'
    if (lower.includes('security') || lower.includes('vulnerability')) return 'security'
    return 'logic_error'
  }

  private inferSeverity(line: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = line.toLowerCase()
    if (lower.includes('critical') || lower.includes('security')) return 'critical'
    if (lower.includes('high') || lower.includes('memory') || lower.includes('crash')) return 'high'
    if (lower.includes('medium') || lower.includes('logic')) return 'medium'
    return 'low'
  }

  private estimateLineNumber(message: string, code: string): number {
    // Simple estimation - look for keywords in code
    const keywords = message.toLowerCase().split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3)

    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (keywords.some(keyword => line.includes(keyword))) {
        return i + 1
      }
    }

    return 1
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
}

// Global copilot instance
let copilotInstance: CopilotEngine | null = null

export function getCopilotEngine(): CopilotEngine {
  if (!copilotInstance) {
    copilotInstance = new CopilotEngine()
  }
  return copilotInstance
}

// Convenience functions
export async function getCodeCompletions(request: CodeCompletionRequest) {
  const copilot = getCopilotEngine()
  return copilot.getCodeCompletions(request)
}

export async function getRefactoringSuggestions(code: string, filePath: string, repoId: string) {
  const copilot = getCopilotEngine()
  return copilot.getRefactoringSuggestions(code, filePath, repoId)
}

export async function explainCode(code: string, filePath: string, repoId: string) {
  const copilot = getCopilotEngine()
  return copilot.explainCode(code, filePath, repoId)
}

export async function detectBugs(code: string, filePath: string) {
  const copilot = getCopilotEngine()
  return copilot.detectBugs(code, filePath)
}
