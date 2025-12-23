import { getAIProviderWithFallback } from './providers/factory'
import { logger } from '../utils/logger'

export interface CodeRelationship {
  type: 'imports' | 'extends' | 'implements' | 'calls' | 'uses'
  from: string
  to: string
  line: number
  context?: string
}

export interface ArchitecturePattern {
  pattern: string
  confidence: number
  files: string[]
  description: string
  recommendations: string[]
}

export class EnhancedCodeAnalyzer {
  private aiPromise = getAIProviderWithFallback()

  async analyzeArchitecture(analysis: any): Promise<{
    patterns: ArchitecturePattern[]
    relationships: CodeRelationship[]
    layers: string[]
    complexity: number
  }> {
    try {
      const ai = await this.aiPromise
      const prompt = `Analyze this codebase architecture:

Files: ${analysis.files?.length || 0}
Functions: ${analysis.functions?.length || 0}
Classes: ${analysis.classes?.length || 0}
Components: ${analysis.components?.length || 0}

Top functions:
${analysis.functions?.slice(0, 10).map((f: any) => `- ${f.name} (${f.filePath})`).join('\n')}

Classes:
${analysis.classes?.slice(0, 10).map((c: any) => `- ${c.name} (${c.filePath})`).join('\n')}

Detect:
1. Architecture patterns (MVC, MVVM, Clean Architecture, etc.)
2. Code relationships and dependencies
3. Application layers
4. Complexity hotspots
5. Potential improvements

Return JSON with: patterns[], relationships[], layers[], complexity_score`

      const analysisResult = await ai.chat(prompt)

      // Parse and enhance the analysis
      const architecture = this.parseArchitectureAnalysis(analysisResult)

      logger.info('Enhanced architecture analysis completed', {
        patternsFound: architecture.patterns.length,
        relationshipsFound: architecture.relationships.length
      })

      return architecture
    } catch (error: any) {
      logger.error('Architecture analysis failed:', { message: error?.message || 'Unknown error' })
      const fallback: {
        patterns: ArchitecturePattern[]
        relationships: CodeRelationship[]
        layers: string[]
        complexity: number
      } = {
        patterns: [],
        relationships: [],
        layers: ['Unknown'],
        complexity: 5
      }
      return fallback
    }
  }

  async generateInteractiveExamples(analysis: any): Promise<any[]> {
    const ai = await this.aiPromise
    const examples = []

    // Generate API usage examples
    if (analysis.apiRoutes?.length > 0) {
      for (const route of analysis.apiRoutes.slice(0, 5)) {
        const prompt = `Generate interactive examples for API endpoint:

Method: ${route.method}
Path: ${route.path}
Description: ${route.description || 'API endpoint'}

Create:
1. JavaScript fetch example
2. curl command
3. Python requests example
4. Response examples for success/error
5. Common use cases`

        try {
          const example = await ai.chat(prompt)
          examples.push({
            type: 'api',
            endpoint: route.path,
            examples: example,
            interactive: true
          })
        } catch (error) {
          logger.warn('Failed to generate API example:', route.path)
        }
      }
    }

    return examples
  }

  async detectPerformanceBottlenecks(analysis: any): Promise<any[]> {
    const ai = await this.aiPromise
    const bottlenecks = []

    // Analyze complex functions
    const complexFunctions = analysis.functions?.filter((f: any) =>
      (f.complexity || 0) > 15 || (f.lineEnd - f.lineStart) > 50
    ) || []

    for (const func of complexFunctions.slice(0, 5)) {
      const prompt = `Analyze this function for performance bottlenecks:

Name: ${func.name}
Complexity: ${func.complexity || 'N/A'}
Lines: ${func.lineEnd - func.lineStart}
File: ${func.filePath}

Code: ${func.code?.substring(0, 500) || 'Code not available'}

Identify:
1. Performance issues (loops, recursion, memory usage)
2. Optimization suggestions
3. Best practices violations
4. Potential algorithmic improvements`

      try {
        const analysis = await ai.chat(prompt)
        bottlenecks.push({
          type: 'function',
          name: func.name,
          file: func.filePath,
          severity: func.complexity > 25 ? 'high' : 'medium',
          analysis
        })
      } catch (error) {
        logger.warn('Failed to analyze function:', func.name)
      }
    }

    return bottlenecks
  }

  async generateCodeSuggestions(analysis: any): Promise<any[]> {
    const ai = await this.aiPromise
    const suggestions = []

    // Generate refactoring suggestions
    const longFiles = analysis.files?.filter((f: any) => (f.lines || 0) > 500) || []

    for (const file of longFiles.slice(0, 3)) {
      const prompt = `Suggest refactoring improvements for this large file:

File: ${file.path}
Lines: ${file.lines}
Functions: ${analysis.functions?.filter((f: any) => f.filePath === file.path).length || 0}

Suggest:
1. File splitting strategies
2. Component extraction
3. Utility function separation
4. Performance optimizations`

      try {
        const suggestion = await ai.chat(prompt)
        suggestions.push({
          type: 'refactoring',
          file: file.path,
          priority: 'medium',
          suggestion
        })
      } catch (error) {
        logger.warn('Failed to generate refactoring suggestion:', file.path)
      }
    }

    return suggestions
  }

  private parseArchitectureAnalysis(aiResponse: string): any {
    try {
      // Try to parse JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      logger.warn('Failed to parse architecture analysis JSON')
    }

    // Fallback structure
    return {
      patterns: [{
        pattern: 'Unknown',
        confidence: 0.5,
        files: [],
        description: 'Architecture analysis completed',
        recommendations: ['Consider implementing MVC or similar pattern']
      }],
      relationships: [],
      layers: ['Frontend', 'Backend', 'Database'],
      complexity: 5
    }
  }
}

export async function generateEnhancedDocumentation(repoId: string, analysis: any) {
  const analyzer = new EnhancedCodeAnalyzer()

  try {
    // Run all enhanced analyses in parallel
    const [architecture, examples, bottlenecks, suggestions] = await Promise.all([
      analyzer.analyzeArchitecture(analysis),
      analyzer.generateInteractiveExamples(analysis),
      analyzer.detectPerformanceBottlenecks(analysis),
      analyzer.generateCodeSuggestions(analysis)
    ])

    return {
      architecture,
      examples,
      performance: {
        bottlenecks,
        suggestions
      },
      timestamp: new Date().toISOString(),
      version: 'enhanced'
    }
  } catch (error: any) {
    logger.error('Enhanced documentation generation failed:', { message: error?.message || 'Unknown error' })
    return {
      architecture: {
        patterns: [],
        relationships: [],
        layers: ['Unknown'],
        complexity: 5
      },
      examples: [],
      performance: {
        bottlenecks: [],
        suggestions: []
      },
      timestamp: new Date().toISOString(),
      version: 'fallback'
    }
  }
}

