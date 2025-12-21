/**
 * Sentiment Analysis for Code
 * Analyzes code quality, complexity, and potential issues
 */

import { ChatOpenAI } from '@langchain/openai'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface ComplexityScore {
  overall: number // 0-1
  cognitive: number // 0-1
  cyclomatic: number // 0-1
  maintainability: number // 0-1
  readability: number // 0-1
  label: 'low' | 'medium' | 'high' | 'very_high'
}

export interface QualityScore {
  overall: number // 0-1
  codeQuality: number // 0-1
  documentation: number // 0-1
  testability: number // 0-1
  performance: number // 0-1
  security: number // 0-1
  label: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface CodeIssue {
  type: 'complexity' | 'maintainability' | 'performance' | 'security' | 'readability' | 'documentation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: { file: string; line: number }
  suggestion: string
  impact: string
}

export class CodeSentimentAnalyzer {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1,
    })
  }

  /**
   * Analyze code complexity
   */
  async analyzeComplexity(
    code: string,
    functionInfo?: FunctionInfo
  ): Promise<ComplexityScore> {
    const prompt = `Analyze the complexity of this code:

${functionInfo ? `Function: ${functionInfo.name}` : ''}
${functionInfo ? `Cyclomatic Complexity: ${functionInfo.complexity}` : ''}
${functionInfo ? `Parameters: ${functionInfo.parameters.length}` : ''}
${functionInfo ? `Lines: ${functionInfo.lineEnd - functionInfo.lineStart}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- overall: overall complexity score (0-1, where 1 is most complex)
- cognitive: cognitive complexity (0-1)
- cyclomatic: cyclomatic complexity normalized (0-1)
- maintainability: maintainability score (0-1, where 1 is most maintainable)
- readability: readability score (0-1, where 1 is most readable)
- label: "low", "medium", "high", or "very_high"

Example:
{
  "overall": 0.7,
  "cognitive": 0.8,
  "cyclomatic": 0.6,
  "maintainability": 0.4,
  "readability": 0.5,
  "label": "high"
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as ComplexityScore
    } catch {
      // Fallback calculation
      const cyclomatic = functionInfo ? Math.min(functionInfo.complexity / 20, 1) : 0.5
      const overall = cyclomatic
      return {
        overall,
        cognitive: overall,
        cyclomatic,
        maintainability: 1 - overall,
        readability: 1 - overall,
        label: overall < 0.3 ? 'low' : overall < 0.6 ? 'medium' : overall < 0.8 ? 'high' : 'very_high',
      }
    }
  }

  /**
   * Assess code quality
   */
  async assessQuality(
    code: string,
    functionInfo?: FunctionInfo,
    classInfo?: ClassInfo
  ): Promise<QualityScore> {
    const prompt = `Assess the quality of this code:

${functionInfo ? `Function: ${functionInfo.name}` : ''}
${classInfo ? `Class: ${classInfo.name}` : ''}
${functionInfo ? `Has JSDoc: ${!!functionInfo.jsdoc}` : ''}
${functionInfo ? `Complexity: ${functionInfo.complexity}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- overall: overall quality score (0-1, where 1 is best)
- codeQuality: code structure and style (0-1)
- documentation: documentation quality (0-1)
- testability: how easy it is to test (0-1)
- performance: performance considerations (0-1)
- security: security considerations (0-1)
- label: "excellent", "good", "fair", or "poor"

Example:
{
  "overall": 0.75,
  "codeQuality": 0.8,
  "documentation": 0.7,
  "testability": 0.8,
  "performance": 0.7,
  "security": 0.8,
  "label": "good"
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as QualityScore
    } catch {
      // Fallback calculation
      const hasDocs = functionInfo?.jsdoc ? 0.8 : 0.3
      const complexity = functionInfo ? Math.max(0, 1 - functionInfo.complexity / 20) : 0.7
      const overall = (hasDocs + complexity) / 2

      return {
        overall,
        codeQuality: complexity,
        documentation: hasDocs,
        testability: complexity,
        performance: 0.7,
        security: 0.7,
        label: overall > 0.8 ? 'excellent' : overall > 0.6 ? 'good' : overall > 0.4 ? 'fair' : 'poor',
      }
    }
  }

  /**
   * Detect code issues
   */
  async detectIssues(
    code: string,
    functionInfo?: FunctionInfo,
    classInfo?: ClassInfo
  ): Promise<CodeIssue[]> {
    const prompt = `Detect issues in this code:

${functionInfo ? `Function: ${functionInfo.name}` : ''}
${classInfo ? `Class: ${classInfo.name}` : ''}
${functionInfo ? `Complexity: ${functionInfo.complexity}` : ''}
${functionInfo ? `Parameters: ${functionInfo.parameters.length}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON array of issues with:
- type: "complexity", "maintainability", "performance", "security", "readability", or "documentation"
- severity: "low", "medium", "high", or "critical"
- description: what the issue is
- location: {file: string, line: number}
- suggestion: how to fix it
- impact: what impact this issue has

Example:
[
  {
    "type": "complexity",
    "severity": "high",
    "description": "Function has high cyclomatic complexity (15)",
    "location": {"file": "utils.ts", "line": 42},
    "suggestion": "Consider breaking this function into smaller functions",
    "impact": "Hard to test and maintain"
  }
]`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeIssue[]
    } catch {
      // Fallback: basic issue detection
      return this.detectIssuesFallback(code, functionInfo)
    }
  }

  /**
   * Fallback issue detection
   */
  private detectIssuesFallback(code: string, functionInfo?: FunctionInfo): CodeIssue[] {
    const issues: CodeIssue[] = []

    if (functionInfo) {
      // High complexity
      if (functionInfo.complexity > 15) {
        issues.push({
          type: 'complexity',
          severity: 'high',
          description: `Function has high cyclomatic complexity (${functionInfo.complexity})`,
          location: { file: '', line: functionInfo.lineStart },
          suggestion: 'Consider breaking this function into smaller functions',
          impact: 'Hard to test and maintain',
        })
      }

      // Long parameter list
      if (functionInfo.parameters.length > 5) {
        issues.push({
          type: 'maintainability',
          severity: 'medium',
          description: `Function has ${functionInfo.parameters.length} parameters`,
          location: { file: '', line: functionInfo.lineStart },
          suggestion: 'Consider using an options object',
          impact: 'Hard to call and maintain',
        })
      }

      // Missing documentation
      if (!functionInfo.jsdoc) {
        issues.push({
          type: 'documentation',
          severity: 'low',
          description: 'Function lacks JSDoc documentation',
          location: { file: '', line: functionInfo.lineStart },
          suggestion: 'Add JSDoc comments explaining the function',
          impact: 'Harder for other developers to understand',
        })
      }
    }

    return issues
  }

  /**
   * Analyze code sentiment (positive/negative indicators)
   */
  async analyzeSentiment(code: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative'
    indicators: Array<{ type: string; description: string; impact: 'positive' | 'negative' }>
    score: number // -1 to 1
  }> {
    const prompt = `Analyze the sentiment/quality indicators of this code:

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- sentiment: "positive", "neutral", or "negative" based on code quality indicators
- indicators: array of {type, description, impact} for quality indicators
- score: -1 to 1 score (1 is best quality)

Example:
{
  "sentiment": "positive",
  "indicators": [
    {"type": "good_practice", "description": "Uses TypeScript types", "impact": "positive"},
    {"type": "issue", "description": "Missing error handling", "impact": "negative"}
  ],
  "score": 0.7
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        sentiment: 'neutral',
        indicators: [],
        score: 0,
      }
    }
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(
    functions: FunctionInfo[],
    classes: ClassInfo[]
  ): Promise<{
    summary: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    overallScore: number
  }> {
    const prompt = `Generate a comprehensive quality report for this codebase:

Functions: ${functions.length}
Classes: ${classes.length}
Average Complexity: ${functions.reduce((sum, f) => sum + f.complexity, 0) / (functions.length || 1)}
Functions with Docs: ${functions.filter(f => f.jsdoc).length}
Classes with Docs: ${classes.filter(c => c.description).length}

Return JSON with:
- summary: 2-3 sentence summary
- strengths: array of codebase strengths
- weaknesses: array of codebase weaknesses
- recommendations: array of improvement recommendations
- overallScore: 0-1 overall quality score

Example:
{
  "summary": "The codebase shows good structure but lacks comprehensive documentation",
  "strengths": ["Well-organized functions", "Good type usage"],
  "weaknesses": ["Missing documentation", "High complexity in some functions"],
  "recommendations": ["Add JSDoc comments", "Refactor complex functions"],
  "overallScore": 0.65
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        summary: 'Codebase analysis completed',
        strengths: [],
        weaknesses: [],
        recommendations: [],
        overallScore: 0.5,
      }
    }
  }
}

