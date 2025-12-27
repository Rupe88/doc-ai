/**
 * AI Code Generator - Generate code using codebase context
 * Uses RAG to understand patterns and generate consistent code
 */

import { getAIProviderWithFallback } from './providers/factory'
import { getRAGEngine } from './rag-engine'
import { ComprehensiveAnalysis } from '../analyzer/comprehensive-analyzer'

export interface CodeGenerationRequest {
  type: 'function' | 'class' | 'component' | 'api' | 'test' | 'service'
  name: string
  description: string
  requirements?: string[]
  repoId: string
  language?: string
  framework?: string
}

export interface GeneratedCode {
  code: string
  explanation: string
  dependencies: string[]
  tests?: string
  documentation?: string
}

export class CodeGenerator {
  private ragEngine = getRAGEngine()

  /**
   * Generate code using codebase context and patterns
   */
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    // Get similar code patterns from the codebase
    const similarPatterns = await this.ragEngine.searchCode(
      `${request.type} ${request.name} ${request.description}`,
      request.repoId,
      5
    )

    // Build context from existing codebase patterns
    const codebaseContext = similarPatterns
      .map(result => `Pattern: ${result.metadata.name}\n${result.content.substring(0, 1000)}`)
      .join('\n\n---\n\n')

    // Generate the code using AI with codebase context
    const prompt = this.buildGenerationPrompt(request, codebaseContext)

    const ai = await getAIProviderWithFallback()
    const generatedCode = await ai.chat(prompt)

    // Parse the response to extract code, dependencies, etc.
    return this.parseGeneratedCode(generatedCode, request.type)
  }

  /**
   * Generate unit tests for existing code
   */
  async generateTests(code: string, language: string, repoId: string): Promise<string> {
    const similarTests = await this.ragEngine.searchCode(
      `test ${language} unit test`,
      repoId,
      3
    )

    const testPatterns = similarTests
      .map(result => result.content.substring(0, 800))
      .join('\n\n')

    const prompt = `Generate comprehensive unit tests for this ${language} code:

CODE TO TEST:
\`\`\`${language}
${code}
\`\`\`

EXISTING TEST PATTERNS IN CODEBASE:
${testPatterns}

Generate:
1. Unit tests covering all functions/methods
2. Edge cases and error scenarios
3. Mock implementations where needed
4. Use the same testing framework as the codebase

Return only the test code with proper imports.`

    const ai = await getAIProviderWithFallback()
    return ai.chat(prompt)
  }

  /**
   * Generate API documentation
   */
  async generateApiDocs(apiCode: string, repoId: string): Promise<string> {
    const similarAPIs = await this.ragEngine.searchCode(
      'API route handler',
      repoId,
      3
    )

    const apiPatterns = similarAPIs
      .map(result => result.content.substring(0, 600))
      .join('\n\n')

    const prompt = `Generate comprehensive API documentation for this endpoint:

API CODE:
\`\`\`typescript
${apiCode}
\`\`\`

SIMILAR API PATTERNS IN CODEBASE:
${apiPatterns}

Generate OpenAPI/Swagger documentation including:
1. Endpoint description
2. Request/response schemas
3. Authentication requirements
4. Error responses
5. Example requests

Format as clean markdown documentation.`

    const ai = await getAIProviderWithFallback()
    return ai.chat(prompt)
  }

  private buildGenerationPrompt(request: CodeGenerationRequest, context: string): string {
    const basePrompts = {
      function: `Generate a ${request.language || 'TypeScript'} function named "${request.name}" that ${request.description}.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate a complete, well-documented function that follows the codebase patterns. Include:
- Proper TypeScript types
- Error handling
- JSDoc comments
- Follow existing naming conventions
- Use similar patterns from the codebase

Return the complete function code only.`,

      class: `Generate a ${request.language || 'TypeScript'} class named "${request.name}" that ${request.description}.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate a complete class with:
- Proper TypeScript types
- Constructor and methods
- Error handling
- JSDoc comments
- Follow existing class patterns in the codebase

Return the complete class code only.`,

      component: `Generate a ${request.framework || 'React'} component named "${request.name}" that ${request.description}.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate a complete React component with:
- Proper TypeScript types
- State management (if needed)
- Event handlers
- Follow existing component patterns
- Include necessary imports

Return the complete component code only.`,

      api: `Generate a ${request.framework || 'Next.js API'} route for "${request.name}" that ${request.description}.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate a complete API route with:
- Proper request/response handling
- Input validation
- Error handling
- Authentication (if needed)
- Follow existing API patterns

Return the complete API route code only.`,

      test: `Generate unit tests for "${request.name}" functionality.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate comprehensive tests covering:
- Happy path scenarios
- Edge cases
- Error conditions
- Use the same testing framework as the codebase

Return the complete test file code only.`,

      service: `Generate a ${request.language || 'TypeScript'} service class named "${request.name}" that ${request.description}.

Requirements:
${request.requirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

CODEBASE PATTERNS TO FOLLOW:
${context}

Generate a complete service class with:
- Proper TypeScript types
- Dependency injection
- Error handling
- Business logic methods
- Follow existing service patterns

Return the complete service class code only.`
    }

    return basePrompts[request.type] || basePrompts.function
  }

  private parseGeneratedCode(response: string, type: string): GeneratedCode {
    // Extract code blocks from the response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/)
    const code = codeMatch ? codeMatch[1].trim() : response

    // Extract dependencies (basic implementation)
    const dependencies: string[] = []
    const importMatches = code.match(/import.*from ['"]([^'"]+)['"]/g)
    if (importMatches) {
      importMatches.forEach(match => {
        const depMatch = match.match(/from ['"]([^'"]+)['"]/)
        if (depMatch && !depMatch[1].startsWith('.')) {
          dependencies.push(depMatch[1])
        }
      })
    }

    return {
      code,
      explanation: `Generated ${type} code following codebase patterns`,
      dependencies: [...new Set(dependencies)], // Remove duplicates
    }
  }
}

// Singleton
let codeGeneratorInstance: CodeGenerator | null = null

export function getCodeGenerator(): CodeGenerator {
  if (!codeGeneratorInstance) {
    codeGeneratorInstance = new CodeGenerator()
  }
  return codeGeneratorInstance
}
