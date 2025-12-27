import { getAIProviderWithFallback } from './providers/factory'
import { logger } from '../utils/logger'

export interface CodeReviewIssue {
  type: 'bug' | 'security' | 'performance' | 'maintainability' | 'style'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  file: string
  line?: number
  code?: string
  suggestion: string
  confidence: number
}

export interface CodeReviewSummary {
  score: number
  grade: string
  totalIssues: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  topIssues: CodeReviewIssue[]
  recommendations: string[]
}

export interface CodeIssue {
  id: string
  type: 'security' | 'quality' | 'performance' | 'maintainability' | 'best_practice'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  filePath: string
  lineStart?: number
  lineEnd?: number
  codeSnippet?: string
  suggestion?: string
  aiSuggestion?: string
  category: string
  confidence: number
  tags: string[]
}

export interface CodeReviewResult {
  summary: {
    totalIssues: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    infoCount: number
    securityScore: number
    qualityScore: number
    performanceScore: number
    maintainabilityScore: number
    overallScore: number
  }
  issues: CodeIssue[]
  recommendations: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  analysis: {
    filesAnalyzed: number
    totalLines: number
    analysisTime: number
    aiSuggestionsCount: number
  }
  metadata: {
    repositoryId: string
    repositoryName: string
    analyzedAt: Date
    version: string
  }
}

export class AICodeReviewer {
  private ai = getAIProviderWithFallback()

  async reviewCodebase(
    repoId: string,
    repoName: string,
    analysis: any,
    options: {
      includeAISuggestions?: boolean
      severityThreshold?: 'critical' | 'high' | 'medium' | 'low' | 'info'
      categories?: string[]
      maxIssues?: number
      includeTrends?: boolean
    } = {}
  ): Promise<CodeReviewResult> {
    const startTime = Date.now()

    logger.info('🚀 Starting AI code review', { repoId, repoName })

    const issues: CodeIssue[] = []

    // Security analysis
    const securityIssues = await this.analyzeSecurity(analysis)
    issues.push(...securityIssues)

    // Quality analysis
    const qualityIssues = await this.analyzeCodeQuality(analysis)
    issues.push(...qualityIssues)

    // Performance analysis
    const performanceIssues = await this.analyzePerformance(analysis)
    issues.push(...performanceIssues)

    // Maintainability analysis
    const maintainabilityIssues = await this.analyzeMaintainability(analysis)
    issues.push(...maintainabilityIssues)

    // Best practices
    const bestPracticeIssues = await this.analyzeBestPractices(analysis)
    issues.push(...bestPracticeIssues)

    // Filter issues
    let filteredIssues = this.filterIssues(issues, options)

    // AI suggestions
    if (options.includeAISuggestions) {
      filteredIssues = await this.generateAISuggestions(filteredIssues, analysis)
    }

    // Add metadata
    filteredIssues = filteredIssues.map((issue, index) => ({
      ...issue,
      id: issue.id || `issue-${Date.now()}-${index}`,
    }))

    const summary = this.calculateSummary(filteredIssues)
    const recommendations = this.generateRecommendations(filteredIssues)

    const result: CodeReviewResult = {
      summary,
      issues: filteredIssues,
      recommendations,
      analysis: {
        filesAnalyzed: analysis?.files?.length || 0,
        totalLines: analysis?.stats?.totalLines || 0,
        analysisTime: Date.now() - startTime,
        aiSuggestionsCount: filteredIssues.filter(i => i.aiSuggestion).length,
      },
      metadata: {
        repositoryId: repoId,
        repositoryName: repoName,
        analyzedAt: new Date(),
        version: '2.0.0',
      },
    }

    logger.info('✅ Code review completed', {
      repoId,
      issues: result.summary.totalIssues
    })

    return result
  }

  private async analyzeSecurity(analysis: any): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    if (analysis.functions) {
      for (const func of analysis.functions) {
        const code = func.code || ''
        const codeLower = code.toLowerCase()

        // SQL Injection
        if (codeLower.includes('sql(') || (codeLower.includes('select') && codeLower.includes('+'))) {
          issues.push({
            id: `security-${func.filePath}-${func.lineStart}`,
            type: 'security',
            severity: 'critical',
            title: 'SQL Injection Vulnerability',
            description: 'Direct string concatenation in database queries',
            filePath: func.filePath,
            lineStart: func.lineStart,
            codeSnippet: code.substring(0, 200),
            suggestion: 'Use parameterized queries',
            category: 'Injection',
            confidence: 0.85,
            tags: ['security', 'sql-injection'],
          })
        }

        // XSS
        if ((codeLower.includes('innerhtml') || codeLower.includes('outerhtml')) && !codeLower.includes('sanitize')) {
          issues.push({
            id: `security-${func.filePath}-${func.lineStart}-xss`,
            type: 'security',
            severity: 'high',
            title: 'XSS Vulnerability',
            description: 'Unescaped user input in HTML',
            filePath: func.filePath,
            lineStart: func.lineStart,
            codeSnippet: code.substring(0, 200),
            suggestion: 'Escape user input',
            category: 'XSS',
            confidence: 0.80,
            tags: ['security', 'xss'],
          })
        }
      }
    }

    return issues
  }

  private async analyzeCodeQuality(analysis: any): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    if (analysis.functions) {
      for (const func of analysis.functions) {
        const code = func.code || ''
        const lines = code.split('\n').length
        const complexity = this.calculateComplexity(func)

        if (complexity > 15) {
          issues.push({
            id: `quality-${func.filePath}-${func.lineStart}`,
            type: 'quality',
            severity: complexity > 25 ? 'high' : 'medium',
            title: 'High Function Complexity',
            description: `Function complexity: ${complexity}`,
            filePath: func.filePath,
            lineStart: func.lineStart,
            codeSnippet: code.substring(0, 200),
            suggestion: 'Break into smaller functions',
            category: 'Complexity',
            confidence: 0.90,
            tags: ['quality', 'complexity'],
          })
        }

        if (lines > 50) {
          issues.push({
            id: `quality-${func.filePath}-${func.lineStart}-length`,
            type: 'quality',
            severity: 'low',
            title: 'Long Function',
            description: `Function has ${lines} lines`,
            filePath: func.filePath,
            lineStart: func.lineStart,
            suggestion: 'Split into smaller functions',
            category: 'Length',
            confidence: 0.85,
            tags: ['quality', 'readability'],
          })
        }
      }
    }

    return issues
  }

  private async analyzePerformance(analysis: any): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    if (analysis.functions) {
      for (const func of analysis.functions) {
        const code = func.code || ''
        const codeLower = code.toLowerCase()

        if (codeLower.includes('for') && codeLower.includes('query') && codeLower.includes('await')) {
          issues.push({
            id: `performance-${func.filePath}-${func.lineStart}`,
            type: 'performance',
            severity: 'high',
            title: 'N+1 Query Issue',
            description: 'Potential N+1 database queries',
            filePath: func.filePath,
            lineStart: func.lineStart,
            codeSnippet: code.substring(0, 200),
            suggestion: 'Use eager loading or batch queries',
            category: 'Database',
            confidence: 0.75,
            tags: ['performance', 'database'],
          })
        }
      }
    }

    return issues
  }

  private async analyzeMaintainability(analysis: any): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    if (analysis.functions && analysis.functions.length > 1) {
      const seen = new Set()
      for (const func of analysis.functions) {
        const hash = this.simpleHash(func.code?.substring(0, 100) || '')
        if (seen.has(hash) && func.code?.length > 50) {
          issues.push({
            id: `maintainability-${func.filePath}-${func.lineStart}`,
            type: 'maintainability',
            severity: 'medium',
            title: 'Code Duplication',
            description: 'Duplicate code detected',
            filePath: func.filePath,
            lineStart: func.lineStart,
            suggestion: 'Extract to shared function',
            category: 'Duplication',
            confidence: 0.80,
            tags: ['maintainability', 'duplication'],
          })
        }
        seen.add(hash)
      }
    }

    return issues
  }

  private async analyzeBestPractices(analysis: any): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    if (analysis.functions) {
      for (const func of analysis.functions) {
        const code = func.code || ''
        const codeLower = code.toLowerCase()

        if (!codeLower.includes('try') || !codeLower.includes('catch')) {
          issues.push({
            id: `practice-${func.filePath}-${func.lineStart}`,
            type: 'best_practice',
            severity: 'medium',
            title: 'Missing Error Handling',
            description: 'No try-catch blocks found',
            filePath: func.filePath,
            lineStart: func.lineStart,
            codeSnippet: code.substring(0, 200),
            suggestion: 'Add error handling',
            category: 'Error Handling',
            confidence: 0.75,
            tags: ['best-practice', 'error-handling'],
          })
        }
      }
    }

    return issues
  }

  private async generateAISuggestions(issues: CodeIssue[], analysis: any): Promise<CodeIssue[]> {
    const aiProvider = await this.ai

    for (const issue of issues.slice(0, 3)) {
      try {
        const prompt = `Improve this code issue: ${issue.title} - ${issue.description}`
        const suggestion = await aiProvider.chat(prompt)
        issue.aiSuggestion = suggestion
      } catch (error) {
        logger.warn('AI suggestion failed', { error })
      }
    }
    return issues
  }

  private calculateSummary(issues: CodeIssue[]) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const highCount = issues.filter(i => i.severity === 'high').length
    const mediumCount = issues.filter(i => i.severity === 'medium').length
    const lowCount = issues.filter(i => i.severity === 'low').length
    const infoCount = issues.filter(i => i.severity === 'info').length

    return {
      totalIssues: issues.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      securityScore: Math.max(0, 100 - (criticalCount * 20 + highCount * 10)),
      qualityScore: Math.max(0, 100 - (highCount * 8 + mediumCount * 4)),
      performanceScore: Math.max(0, 100 - (criticalCount * 15 + highCount * 8)),
      maintainabilityScore: Math.max(0, 100 - (mediumCount * 6 + lowCount * 3)),
      overallScore: Math.round((100 - issues.length * 2 + lowCount * 1) / 1),
    }
  }

  private generateRecommendations(issues: CodeIssue[]) {
    return {
      immediate: [
        issues.filter(i => i.severity === 'critical').length > 0 ?
          'Fix critical security issues immediately' : 'Code looks good for critical issues'
      ],
      shortTerm: ['Add comprehensive testing', 'Implement error handling'],
      longTerm: ['Set up automated code reviews', 'Establish coding standards'],
    }
  }

  private filterIssues(issues: CodeIssue[], options: any): CodeIssue[] {
    let filtered = issues

    if (options.severityThreshold) {
      const levels: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
      const minLevel = levels[options.severityThreshold as string] || 0
      filtered = filtered.filter(issue => levels[issue.severity] <= minLevel)
    }

    if (options.maxIssues) {
      filtered = filtered.slice(0, options.maxIssues)
    }

    return filtered
  }

  private calculateComplexity(func: any): number {
    const code = func.code || ''
    let complexity = 1
    const patterns = ['if', 'else', 'for', 'while', 'switch', 'catch', '&&', '||']
    for (const pattern of patterns) {
      complexity += (code.split(pattern).length - 1)
    }
    return complexity
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }
}

// Singleton instance
let aiCodeReviewerInstance: AICodeReviewer | null = null

export function getAICodeReviewer(): AICodeReviewer {
  if (!aiCodeReviewerInstance) {
    aiCodeReviewerInstance = new AICodeReviewer()
  }
  return aiCodeReviewerInstance
}

// Legacy compatibility
export async function performAICodeReview(analysis: any): Promise<CodeReviewSummary> {
  const reviewer = new AICodeReviewer()
  const result = await reviewer.reviewCodebase('legacy', 'legacy', analysis)

  return {
    score: result.summary.overallScore,
    grade: result.summary.overallScore >= 80 ? 'A' : result.summary.overallScore >= 60 ? 'B' : 'C',
    totalIssues: result.summary.totalIssues,
    issuesByType: result.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    issuesBySeverity: {
      low: result.summary.lowCount,
      medium: result.summary.mediumCount,
      high: result.summary.highCount,
      critical: result.summary.criticalCount,
    },
    topIssues: result.issues.slice(0, 5).map(issue => ({
      type: issue.type as any,
      severity: issue.severity as any,
      title: issue.title,
      description: issue.description,
      file: issue.filePath,
      line: issue.lineStart,
      code: issue.codeSnippet,
      suggestion: issue.suggestion || '',
      confidence: issue.confidence,
    })),
    recommendations: [...result.recommendations.immediate, ...result.recommendations.shortTerm],
  }
}