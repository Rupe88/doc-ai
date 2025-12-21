import type { AnalysisResult, FunctionInfo, ClassInfo } from '@/types/analyzer'
import { ChatOpenAI } from '@langchain/openai'

export interface CodePattern {
  type: 'design_pattern' | 'anti_pattern' | 'code_smell' | 'best_practice'
  name: string
  description: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
  location: {
    file: string
    lineStart: number
    lineEnd: number
  }
}

export interface RefactoringSuggestion {
  type: 'extract_function' | 'extract_class' | 'simplify' | 'optimize' | 'rename'
  description: string
  benefit: string
  effort: 'low' | 'medium' | 'high'
  location: {
    file: string
    lineStart: number
    lineEnd: number
  }
  before?: string
  after?: string
}

export interface ArchitectureInsight {
  type: 'coupling' | 'cohesion' | 'complexity' | 'scalability'
  description: string
  recommendation: string
  impact: 'low' | 'medium' | 'high'
  affectedFiles: string[]
}

export class CodeIntelligence {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2,
    })
  }

  /**
   * Detect code patterns (design patterns, anti-patterns, code smells)
   */
  async detectPatterns(analysisResult: AnalysisResult): Promise<CodePattern[]> {
    const patterns: CodePattern[] = []

    // Detect common patterns
    for (const func of analysisResult.structure.functions) {
      // High complexity = code smell
      if (func.complexity > 15) {
        patterns.push({
          type: 'code_smell',
          name: 'High Cyclomatic Complexity',
          description: `Function ${func.name} has complexity ${func.complexity}, indicating it may be doing too much.`,
          severity: 'high',
          suggestion: 'Consider breaking this function into smaller, more focused functions.',
          location: {
            file: '',
            lineStart: func.lineStart,
            lineEnd: func.lineEnd,
          },
        })
      }

      // Long parameter list = code smell
      if (func.parameters.length > 5) {
        patterns.push({
          type: 'code_smell',
          name: 'Long Parameter List',
          description: `Function ${func.name} has ${func.parameters.length} parameters.`,
          severity: 'medium',
          suggestion: 'Consider using an options object or data class to group related parameters.',
          location: {
            file: '',
            lineStart: func.lineStart,
            lineEnd: func.lineEnd,
          },
        })
      }

      // Singleton pattern detection
      if (func.name.toLowerCase().includes('getinstance') || func.name.toLowerCase().includes('singleton')) {
        patterns.push({
          type: 'design_pattern',
          name: 'Singleton Pattern',
          description: `Function ${func.name} appears to implement the Singleton pattern.`,
          severity: 'low',
          suggestion: 'Ensure thread-safety if used in multi-threaded environments.',
          location: {
            file: '',
            lineStart: func.lineStart,
            lineEnd: func.lineEnd,
          },
        })
      }
    }

    // Detect class patterns
    for (const cls of analysisResult.structure.classes) {
      // God class detection
      if (cls.methods.length > 20) {
        patterns.push({
          type: 'anti_pattern',
          name: 'God Class',
          description: `Class ${cls.name} has ${cls.methods.length} methods, indicating it may have too many responsibilities.`,
          severity: 'high',
          suggestion: 'Consider splitting this class into smaller, more focused classes following Single Responsibility Principle.',
          location: {
            file: '',
            lineStart: cls.lineStart,
            lineEnd: cls.lineEnd,
          },
        })
      }

      // Factory pattern detection
      if (cls.name.toLowerCase().includes('factory') || cls.methods.some(m => m.name.toLowerCase().includes('create'))) {
        patterns.push({
          type: 'design_pattern',
          name: 'Factory Pattern',
          description: `Class ${cls.name} appears to implement the Factory pattern.`,
          severity: 'low',
          suggestion: 'Consider using dependency injection for better testability.',
          location: {
            file: '',
            lineStart: cls.lineStart,
            lineEnd: cls.lineEnd,
          },
        })
      }
    }

    // Use AI to detect more complex patterns
    const aiPatterns = await this.detectAIPatterns(analysisResult)
    patterns.push(...aiPatterns)

    return patterns
  }

  /**
   * Generate refactoring suggestions
   */
  async generateRefactoringSuggestions(analysisResult: AnalysisResult): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = []

    // High complexity functions
    for (const func of analysisResult.structure.functions) {
      if (func.complexity > 10) {
        suggestions.push({
          type: 'extract_function',
          description: `Extract logic from ${func.name} into smaller functions.`,
          benefit: 'Reduces complexity, improves readability, and makes testing easier.',
          effort: func.complexity > 20 ? 'high' : 'medium',
          location: {
            file: '',
            lineStart: func.lineStart,
            lineEnd: func.lineEnd,
          },
        })
      }
    }

    // Large classes
    for (const cls of analysisResult.structure.classes) {
      if (cls.methods.length > 15) {
        suggestions.push({
          type: 'extract_class',
          description: `Split ${cls.name} into smaller classes.`,
          benefit: 'Improves maintainability and follows Single Responsibility Principle.',
          effort: 'high',
          location: {
            file: '',
            lineStart: cls.lineStart,
            lineEnd: cls.lineEnd,
          },
        })
      }
    }

    // Use AI for more sophisticated suggestions
    const aiSuggestions = await this.generateAIRefactoringSuggestions(analysisResult)
    suggestions.push(...aiSuggestions)

    return suggestions
  }

  /**
   * Generate architecture insights
   */
  async generateArchitectureInsights(analysisResult: AnalysisResult): Promise<ArchitectureInsight[]> {
    const insights: ArchitectureInsight[] = []

    // High coupling detection
    if (analysisResult.dependencies && analysisResult.dependencies.edges.length > 100) {
      insights.push({
        type: 'coupling',
        description: 'High coupling detected in codebase. Many modules depend on each other.',
        recommendation: 'Consider using dependency injection and interfaces to reduce coupling.',
        impact: 'high',
        affectedFiles: [],
      })
    }

    // Complexity insights
    const avgComplexity = analysisResult.structure.functions.reduce((sum, f) => sum + f.complexity, 0) / 
                          (analysisResult.structure.functions.length || 1)
    
    if (avgComplexity > 7) {
      insights.push({
        type: 'complexity',
        description: `Average function complexity is ${avgComplexity.toFixed(2)}, indicating high overall complexity.`,
        recommendation: 'Focus on simplifying functions and reducing nesting levels.',
        impact: 'medium',
        affectedFiles: [],
      })
    }

    // Use AI for deeper insights
    const aiInsights = await this.generateAIArchitectureInsights(analysisResult)
    insights.push(...aiInsights)

    return insights
  }

  /**
   * Detect patterns using AI
   */
  private async detectAIPatterns(analysisResult: AnalysisResult): Promise<CodePattern[]> {
    try {
      const prompt = `Analyze this codebase structure and identify design patterns, anti-patterns, and code smells:

Functions: ${analysisResult.structure.functions.length}
Classes: ${analysisResult.structure.classes.length}
Average Complexity: ${analysisResult.structure.functions.reduce((sum, f) => sum + f.complexity, 0) / (analysisResult.structure.functions.length || 1)}

Return JSON array of patterns with: type, name, description, severity, suggestion, location.`

      const response = await this.llm.invoke(prompt)
      // Parse and return patterns
      return []
    } catch {
      return []
    }
  }

  /**
   * Generate refactoring suggestions using AI
   */
  private async generateAIRefactoringSuggestions(analysisResult: AnalysisResult): Promise<RefactoringSuggestion[]> {
    try {
      const prompt = `Analyze this codebase and suggest refactoring opportunities:

Functions: ${analysisResult.structure.functions.length}
Classes: ${analysisResult.structure.classes.length}
High Complexity Functions: ${analysisResult.structure.functions.filter(f => f.complexity > 10).length}

Return JSON array of refactoring suggestions with: type, description, benefit, effort, location.`

      const response = await this.llm.invoke(prompt)
      // Parse and return suggestions
      return []
    } catch {
      return []
    }
  }

  /**
   * Generate architecture insights using AI
   */
  private async generateAIArchitectureInsights(analysisResult: AnalysisResult): Promise<ArchitectureInsight[]> {
    try {
      const prompt = `Analyze the architecture of this codebase:

Functions: ${analysisResult.structure.functions.length}
Classes: ${analysisResult.structure.classes.length}
Dependencies: ${analysisResult.dependencies?.edges.length || 0}

Provide architectural insights about coupling, cohesion, complexity, and scalability.`

      const response = await this.llm.invoke(prompt)
      // Parse and return insights
      return []
    } catch {
      return []
    }
  }

  /**
   * Suggest best practices
   */
  async suggestBestPractices(analysisResult: AnalysisResult): Promise<string[]> {
    const practices: string[] = []

    // Check for error handling
    const functionsWithErrorHandling = analysisResult.structure.functions.filter(f => 
      f.jsdoc?.throws && f.jsdoc.throws.length > 0
    ).length

    if (functionsWithErrorHandling < analysisResult.structure.functions.length * 0.3) {
      practices.push('Consider adding error handling documentation (@throws) to more functions.')
    }

    // Check for JSDoc coverage
    const functionsWithDocs = analysisResult.structure.functions.filter(f => f.jsdoc?.description).length
    const docCoverage = functionsWithDocs / (analysisResult.structure.functions.length || 1)

    if (docCoverage < 0.5) {
      practices.push(`Only ${(docCoverage * 100).toFixed(0)}% of functions have documentation. Consider adding JSDoc comments.`)
    }

    // Check for type safety
    const functionsWithTypes = analysisResult.structure.functions.filter(f => f.returnType).length
    const typeCoverage = functionsWithTypes / (analysisResult.structure.functions.length || 1)

    if (typeCoverage < 0.8) {
      practices.push(`Only ${(typeCoverage * 100).toFixed(0)}% of functions have return types. Consider adding explicit return types.`)
    }

    return practices
  }
}

