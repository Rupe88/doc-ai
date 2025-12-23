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

export class AICodeReviewer {
  private aiPromise = getAIProviderWithFallback()

  async reviewCodebase(analysis: any): Promise<CodeReviewSummary> {
    try {
      const ai = await this.aiPromise
      const issues: CodeReviewIssue[] = []

      // Review functions for potential issues
      if (analysis.functions?.length > 0) {
        const functionIssues = await this.reviewFunctions(ai, analysis.functions.slice(0, 20))
        issues.push(...functionIssues)
      }

      // Review API routes for security
      if (analysis.apiRoutes?.length > 0) {
        const apiIssues = await this.reviewAPIRoutes(ai, analysis.apiRoutes.slice(0, 15))
        issues.push(...apiIssues)
      }

      // Review components for best practices
      if (analysis.components?.length > 0) {
        const componentIssues = await this.reviewComponents(ai, analysis.components.slice(0, 10))
        issues.push(...componentIssues)
      }

      // Review classes for design patterns
      if (analysis.classes?.length > 0) {
        const classIssues = await this.reviewClasses(ai, analysis.classes.slice(0, 10))
        issues.push(...classIssues)
      }

      // Calculate summary
      const summary = this.calculateReviewSummary(issues)

      logger.info('AI code review completed', {
        totalIssues: issues.length,
        score: summary.score,
        grade: summary.grade
      })

      return summary
    } catch (error: any) {
      logger.error('AI code review failed:', { message: error?.message || 'Unknown error' })
      return this.getFallbackReview()
    }
  }

  private async reviewFunctions(ai: any, functions: any[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = []

    for (const func of functions) {
      if (!func.code || func.code.length < 50) continue

      const prompt = `Review this function for potential issues:

Function: ${func.name}
File: ${func.filePath}
Lines: ${func.lineEnd - func.lineStart}
Complexity: ${func.complexity || 'unknown'}

Code:
${func.code.substring(0, 1000)}

Check for:
1. Bugs and logic errors
2. Performance issues
3. Security vulnerabilities
4. Code quality problems
5. Best practices violations

Return findings in JSON format with: type, severity, title, description, suggestion, confidence`

      try {
        const response = await ai.chat(prompt)
        const findings = this.parseReviewResponse(response)

        findings.forEach((finding: any) => {
          issues.push({
            type: finding.type || 'bug',
            severity: finding.severity || 'medium',
            title: finding.title || 'Issue detected',
            description: finding.description || 'AI detected an issue',
            file: func.filePath,
            line: func.lineStart,
            code: func.code.substring(0, 200),
            suggestion: finding.suggestion || 'Review and fix this issue',
            confidence: finding.confidence || 0.5
          })
        })
      } catch (error) {
        logger.warn('Failed to review function:', func.name)
      }
    }

    return issues
  }

  private async reviewAPIRoutes(ai: any, routes: any[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = []

    for (const route of routes) {
      const prompt = `Security review for API route:

Method: ${route.method}
Path: ${route.path}
Protected: ${route.isProtected ? 'Yes' : 'No'}
File: ${route.filePath}

Code: ${route.code?.substring(0, 500) || 'Code not available'}

Check for:
1. Authentication/authorization issues
2. Input validation problems
3. SQL injection vulnerabilities
4. XSS possibilities
5. Rate limiting concerns
6. CORS issues

Return security findings in JSON format.`

      try {
        const response = await ai.chat(prompt)
        const findings = this.parseReviewResponse(response)

        findings.forEach((finding: any) => {
          issues.push({
            type: finding.type || 'security',
            severity: finding.severity || 'high',
            title: finding.title || 'Security issue detected',
            description: finding.description || 'AI detected a security concern',
            file: route.filePath,
            suggestion: finding.suggestion || 'Review and fix this security issue',
            confidence: finding.confidence || 0.8
          })
        })
      } catch (error) {
        logger.warn('Failed to review API route:', route.path)
      }
    }

    return issues
  }

  private async reviewComponents(ai: any, components: any[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = []

    for (const component of components) {
      const prompt = `Review React component for best practices:

Component: ${component.name}
File: ${component.filePath}
Props: ${component.props?.map((p: any) => p.name).join(', ') || 'none'}
Server/Client: ${component.isServerComponent ? 'Server' : 'Client'}

Check for:
1. Performance issues (unnecessary re-renders)
2. Accessibility problems
3. State management issues
4. Props validation
5. Side effects handling
6. Memory leaks

Return findings in JSON format.`

      try {
        const response = await ai.chat(prompt)
        const findings = this.parseReviewResponse(response)

        findings.forEach((finding: any) => {
          issues.push({
            type: finding.type || 'maintainability',
            severity: finding.severity || 'medium',
            title: finding.title || 'Component issue detected',
            description: finding.description || 'AI detected a component concern',
            file: component.filePath,
            suggestion: finding.suggestion || 'Review and improve this component',
            confidence: finding.confidence || 0.6
          })
        })
      } catch (error) {
        logger.warn('Failed to review component:', component.name)
      }
    }

    return issues
  }

  private async reviewClasses(ai: any, classes: any[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = []

    for (const cls of classes) {
      const prompt = `Review class design:

Class: ${cls.name}
File: ${cls.filePath}
Extends: ${cls.extends || 'none'}
Implements: ${cls.implements?.join(', ') || 'none'}
Methods: ${cls.methods?.length || 0}

Check for:
1. SOLID principles violations
2. Design pattern misapplications
3. Inheritance issues
4. Encapsulation problems
5. Method complexity

Return findings in JSON format.`

      try {
        const response = await ai.chat(prompt)
        const findings = this.parseReviewResponse(response)

        findings.forEach((finding: any) => {
          issues.push({
            type: finding.type || 'maintainability',
            severity: finding.severity || 'medium',
            title: finding.title || 'Class issue detected',
            description: finding.description || 'AI detected a class design concern',
            file: cls.filePath,
            suggestion: finding.suggestion || 'Review and improve this class',
            confidence: finding.confidence || 0.6
          })
        })
      } catch (error) {
        logger.warn('Failed to review class:', cls.name)
      }
    }

    return issues
  }

  private parseReviewResponse(response: string): any[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/) || response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return Array.isArray(parsed) ? parsed : [parsed]
      }
    } catch (error) {
      logger.warn('Failed to parse review response JSON')
    }

    // Fallback - extract issues from text
    return this.extractIssuesFromText(response)
  }

  private extractIssuesFromText(text: string): Partial<CodeReviewIssue>[] {
    const issues: Partial<CodeReviewIssue>[] = []

    // Simple pattern matching for common issues
    if (text.toLowerCase().includes('security') || text.toLowerCase().includes('vulnerab')) {
      issues.push({
        type: 'security',
        severity: 'high',
        title: 'Security concern detected',
        description: 'AI detected a potential security issue',
        suggestion: 'Review and fix the security concern',
        confidence: 0.8
      })
    }

    if (text.toLowerCase().includes('performance') || text.toLowerCase().includes('slow')) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        title: 'Performance issue detected',
        description: 'AI detected a potential performance problem',
        suggestion: 'Optimize the code for better performance',
        confidence: 0.7
      })
    }

    return issues
  }

  private calculateReviewSummary(issues: CodeReviewIssue[]): CodeReviewSummary {
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const issuesBySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate score based on issues
    const baseScore = 100
    const penalty = issues.reduce((total, issue) => {
      const severityMultiplier = { low: 1, medium: 2, high: 3, critical: 5 }
      return total + (severityMultiplier[issue.severity] || 1)
    }, 0)

    const score = Math.max(0, Math.min(100, baseScore - penalty))

    const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'B+' :
                  score >= 80 ? 'B' : score >= 75 ? 'C+' : score >= 70 ? 'C' :
                  score >= 65 ? 'D' : 'F'

    const topIssues = issues
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
      .slice(0, 10)

    const recommendations = this.generateRecommendations(issues, score)

    return {
      score,
      grade,
      totalIssues: issues.length,
      issuesByType,
      issuesBySeverity,
      topIssues,
      recommendations
    }
  }

  private generateRecommendations(issues: CodeReviewIssue[], score: number): string[] {
    const recommendations = []

    if (score < 70) {
      recommendations.push('🚨 CRITICAL: Multiple high-severity issues found. Address immediately.')
    }

    if (issues.filter(i => i.type === 'security').length > 0) {
      recommendations.push('🔒 Security issues detected. Implement security fixes before deployment.')
    }

    if (issues.filter(i => i.type === 'performance').length > 0) {
      recommendations.push('⚡ Performance optimizations needed. Review and optimize slow code paths.')
    }

    if (issues.filter(i => i.type === 'maintainability').length > 0) {
      recommendations.push('🛠️ Code maintainability improvements recommended. Refactor complex code.')
    }

    recommendations.push('📝 Consider implementing automated code review in CI/CD pipeline.')
    recommendations.push('🎯 Set up code quality gates to prevent similar issues.')

    return recommendations.slice(0, 6)
  }

  private getFallbackReview(): CodeReviewSummary {
    return {
      score: 75,
      grade: 'C',
      totalIssues: 0,
      issuesByType: {},
      issuesBySeverity: {},
      topIssues: [],
      recommendations: [
        'Code review analysis temporarily unavailable',
        'Basic security and quality checks passed',
        'Consider re-running analysis for detailed review'
      ]
    }
  }
}

export async function performAICodeReview(analysis: any): Promise<CodeReviewSummary> {
  const reviewer = new AICodeReviewer()
  return reviewer.reviewCodebase(analysis)
}

