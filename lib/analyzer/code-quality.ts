/**
 * Code Quality Metrics Analyzer
 * Calculates comprehensive code quality metrics
 */

export interface CodeQualityMetrics {
  overall: {
    score: number
    grade: string
    trend: 'improving' | 'stable' | 'declining'
  }
  maintainability: {
    score: number
    issues: string[]
  }
  complexity: {
    average: number
    highest: { name: string; value: number; file: string }[]
    distribution: { low: number; medium: number; high: number; veryHigh: number }
  }
  duplication: {
    percentage: number
    duplicatedBlocks: number
    duplicatedLines: number
  }
  documentation: {
    coverage: number
    undocumentedFunctions: string[]
    undocumentedClasses: string[]
  }
  testCoverage: {
    estimated: number
    hasTests: boolean
    testFiles: number
  }
  codeSmells: CodeSmell[]
  technicalDebt: {
    minutes: number
    rating: 'A' | 'B' | 'C' | 'D' | 'E'
  }
  lineMetrics: {
    total: number
    code: number
    comments: number
    blank: number
  }
}

export interface CodeSmell {
  type: string
  severity: 'minor' | 'major' | 'critical'
  file: string
  line: number
  message: string
  suggestion: string
}

export class CodeQualityAnalyzer {
  async analyze(files: Array<{ path: string; content: string }>): Promise<CodeQualityMetrics> {
    const sourceFiles = files.filter(f => this.isSourceFile(f.path))
    
    // Calculate all metrics
    const lineMetrics = this.calculateLineMetrics(sourceFiles)
    const complexity = this.calculateComplexity(sourceFiles)
    const documentation = this.calculateDocCoverage(sourceFiles)
    const duplication = this.detectDuplication(sourceFiles)
    const codeSmells = this.detectCodeSmells(sourceFiles)
    const testCoverage = this.estimateTestCoverage(files)
    const maintainability = this.calculateMaintainability(complexity, documentation, duplication, codeSmells)
    const technicalDebt = this.calculateTechnicalDebt(codeSmells, complexity, documentation)

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      maintainability.score,
      complexity.average,
      documentation.coverage,
      duplication.percentage,
      codeSmells.length
    )

    return {
      overall: {
        score: overallScore,
        grade: this.getGrade(overallScore),
        trend: 'stable',
      },
      maintainability,
      complexity,
      duplication,
      documentation,
      testCoverage,
      codeSmells,
      technicalDebt,
      lineMetrics,
    }
  }

  private isSourceFile(path: string): boolean {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx']
    return sourceExtensions.some(ext => path.endsWith(ext)) && 
           !path.includes('node_modules') &&
           !path.includes('.test.') &&
           !path.includes('.spec.')
  }

  private calculateLineMetrics(files: Array<{ path: string; content: string }>): CodeQualityMetrics['lineMetrics'] {
    let total = 0
    let code = 0
    let comments = 0
    let blank = 0

    for (const file of files) {
      const lines = file.content.split('\n')
      for (const line of lines) {
        total++
        const trimmed = line.trim()
        if (trimmed === '') {
          blank++
        } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          comments++
        } else {
          code++
        }
      }
    }

    return { total, code, comments, blank }
  }

  private calculateComplexity(files: Array<{ path: string; content: string }>): CodeQualityMetrics['complexity'] {
    const functionComplexities: { name: string; value: number; file: string }[] = []
    const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 }

    for (const file of files) {
      // Find functions and calculate complexity
      const functionPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*\{)/g
      let match

      while ((match = functionPattern.exec(file.content)) !== null) {
        const name = match[1] || match[2] || match[3] || 'anonymous'
        const startIndex = match.index
        
        // Get function body (simplified)
        const bodyStart = file.content.indexOf('{', startIndex)
        if (bodyStart === -1) continue
        
        let depth = 1
        let bodyEnd = bodyStart + 1
        while (depth > 0 && bodyEnd < file.content.length) {
          if (file.content[bodyEnd] === '{') depth++
          if (file.content[bodyEnd] === '}') depth--
          bodyEnd++
        }
        
        const body = file.content.substring(bodyStart, bodyEnd)
        const complexity = this.calculateCyclomaticComplexity(body)
        
        functionComplexities.push({ name, value: complexity, file: file.path })
        
        if (complexity <= 5) distribution.low++
        else if (complexity <= 10) distribution.medium++
        else if (complexity <= 20) distribution.high++
        else distribution.veryHigh++
      }
    }

    const average = functionComplexities.length > 0
      ? functionComplexities.reduce((sum, f) => sum + f.value, 0) / functionComplexities.length
      : 0

    const highest = [...functionComplexities]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return { average: Math.round(average * 10) / 10, highest, distribution }
  }

  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\?/g,
      /&&/g,
      /\|\|/g,
      /\?[^:]*:/g,
    ]

    for (const pattern of patterns) {
      const matches = code.match(pattern)
      if (matches) complexity += matches.length
    }

    return complexity
  }

  private calculateDocCoverage(files: Array<{ path: string; content: string }>): CodeQualityMetrics['documentation'] {
    let documentedFunctions = 0
    let totalFunctions = 0
    let documentedClasses = 0
    let totalClasses = 0
    const undocumentedFunctions: string[] = []
    const undocumentedClasses: string[] = []

    for (const file of files) {
      // Check for JSDoc before functions
      const functionPattern = /(?:\/\*\*[\s\S]*?\*\/\s*)?((?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g
      let match

      while ((match = functionPattern.exec(file.content)) !== null) {
        const name = match[2] || match[3] || 'anonymous'
        totalFunctions++
        
        if (match[0].startsWith('/**')) {
          documentedFunctions++
        } else {
          undocumentedFunctions.push(`${name} (${file.path})`)
        }
      }

      // Check for JSDoc before classes
      const classPattern = /(?:\/\*\*[\s\S]*?\*\/\s*)?((?:export\s+)?class\s+(\w+))/g
      while ((match = classPattern.exec(file.content)) !== null) {
        const name = match[2]
        totalClasses++
        
        if (match[0].startsWith('/**')) {
          documentedClasses++
        } else {
          undocumentedClasses.push(`${name} (${file.path})`)
        }
      }
    }

    const total = totalFunctions + totalClasses
    const documented = documentedFunctions + documentedClasses
    const coverage = total > 0 ? Math.round((documented / total) * 100) : 100

    return {
      coverage,
      undocumentedFunctions: undocumentedFunctions.slice(0, 20),
      undocumentedClasses: undocumentedClasses.slice(0, 20),
    }
  }

  private detectDuplication(files: Array<{ path: string; content: string }>): CodeQualityMetrics['duplication'] {
    // Simple duplication detection using line-based comparison
    const lineHashes = new Map<string, number>()
    let totalLines = 0
    let duplicatedLines = 0
    let duplicatedBlocks = 0

    for (const file of files) {
      const lines = file.content.split('\n')
      
      for (let i = 0; i < lines.length - 3; i++) {
        const block = lines.slice(i, i + 4).join('\n').trim()
        if (block.length < 50) continue // Skip short blocks
        
        const hash = this.simpleHash(block)
        const count = lineHashes.get(hash) || 0
        lineHashes.set(hash, count + 1)
        
        if (count > 0) {
          duplicatedLines += 4
          if (count === 1) duplicatedBlocks++
        }
        totalLines += 4
      }
    }

    const percentage = totalLines > 0 ? Math.round((duplicatedLines / totalLines) * 100) : 0

    return { percentage, duplicatedBlocks, duplicatedLines }
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(16)
  }

  private detectCodeSmells(files: Array<{ path: string; content: string }>): CodeSmell[] {
    const smells: CodeSmell[] = []

    const rules = [
      {
        pattern: /function\s*\([^)]{100,}\)/g,
        type: 'Too Many Parameters',
        severity: 'major' as const,
        suggestion: 'Consider using an options object instead of many parameters',
      },
      {
        pattern: /\.then\([^)]+\)\.then\([^)]+\)\.then\([^)]+\)/g,
        type: 'Callback Hell',
        severity: 'major' as const,
        suggestion: 'Use async/await for better readability',
      },
      {
        pattern: /console\.(log|warn|error|info)/g,
        type: 'Console Statement',
        severity: 'minor' as const,
        suggestion: 'Remove console statements before production',
      },
      {
        pattern: /TODO|FIXME|HACK|XXX/g,
        type: 'TODO Comment',
        severity: 'minor' as const,
        suggestion: 'Address TODO comments and track in issue tracker',
      },
      {
        pattern: /any(?:\s*[,\]\);>])/g,
        type: 'TypeScript Any',
        severity: 'minor' as const,
        suggestion: 'Replace any with proper type annotations',
      },
      {
        pattern: /^\s{60,}/gm,
        type: 'Deep Nesting',
        severity: 'major' as const,
        suggestion: 'Reduce nesting by extracting functions or using early returns',
      },
      {
        pattern: /class\s+\w+\s*\{[^}]{5000,}\}/gs,
        type: 'Large Class',
        severity: 'major' as const,
        suggestion: 'Consider breaking down into smaller, focused classes',
      },
      {
        pattern: /function\s+\w+\s*\([^)]*\)\s*\{[^}]{1000,}\}/gs,
        type: 'Long Function',
        severity: 'major' as const,
        suggestion: 'Break down into smaller functions with single responsibility',
      },
    ]

    for (const file of files) {
      for (const rule of rules) {
        let match
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
        
        while ((match = pattern.exec(file.content)) !== null) {
          const beforeMatch = file.content.substring(0, match.index)
          const line = beforeMatch.split('\n').length

          smells.push({
            type: rule.type,
            severity: rule.severity,
            file: file.path,
            line,
            message: `${rule.type} detected`,
            suggestion: rule.suggestion,
          })
        }
      }
    }

    return smells.slice(0, 100) // Limit to 100 smells
  }

  private estimateTestCoverage(files: Array<{ path: string; content: string }>): CodeQualityMetrics['testCoverage'] {
    const testFiles = files.filter(f => 
      f.path.includes('.test.') || 
      f.path.includes('.spec.') || 
      f.path.includes('__tests__')
    )

    const sourceFiles = files.filter(f => this.isSourceFile(f.path))
    
    // Estimate coverage based on test file ratio
    const hasTests = testFiles.length > 0
    const estimated = hasTests 
      ? Math.min(100, Math.round((testFiles.length / sourceFiles.length) * 100))
      : 0

    return { estimated, hasTests, testFiles: testFiles.length }
  }

  private calculateMaintainability(
    complexity: CodeQualityMetrics['complexity'],
    documentation: CodeQualityMetrics['documentation'],
    duplication: CodeQualityMetrics['duplication'],
    codeSmells: CodeSmell[]
  ): CodeQualityMetrics['maintainability'] {
    const issues: string[] = []
    let score = 100

    // Penalize high complexity
    if (complexity.average > 15) {
      score -= 20
      issues.push('High average cyclomatic complexity')
    } else if (complexity.average > 10) {
      score -= 10
      issues.push('Moderate cyclomatic complexity')
    }

    // Penalize low documentation
    if (documentation.coverage < 30) {
      score -= 20
      issues.push('Low documentation coverage')
    } else if (documentation.coverage < 60) {
      score -= 10
      issues.push('Moderate documentation coverage')
    }

    // Penalize duplication
    if (duplication.percentage > 20) {
      score -= 20
      issues.push('High code duplication')
    } else if (duplication.percentage > 10) {
      score -= 10
      issues.push('Moderate code duplication')
    }

    // Penalize code smells
    const criticalSmells = codeSmells.filter(s => s.severity === 'critical').length
    const majorSmells = codeSmells.filter(s => s.severity === 'major').length

    if (criticalSmells > 0) {
      score -= criticalSmells * 5
      issues.push(`${criticalSmells} critical code smells`)
    }
    if (majorSmells > 5) {
      score -= 10
      issues.push(`${majorSmells} major code smells`)
    }

    return { score: Math.max(0, score), issues }
  }

  private calculateTechnicalDebt(
    codeSmells: CodeSmell[],
    complexity: CodeQualityMetrics['complexity'],
    documentation: CodeQualityMetrics['documentation']
  ): CodeQualityMetrics['technicalDebt'] {
    // Estimate technical debt in minutes
    let minutes = 0

    // Code smells
    minutes += codeSmells.filter(s => s.severity === 'critical').length * 60
    minutes += codeSmells.filter(s => s.severity === 'major').length * 30
    minutes += codeSmells.filter(s => s.severity === 'minor').length * 10

    // High complexity functions
    minutes += complexity.highest.filter(f => f.value > 20).length * 45
    minutes += complexity.highest.filter(f => f.value > 10 && f.value <= 20).length * 20

    // Missing documentation
    minutes += documentation.undocumentedFunctions.length * 10
    minutes += documentation.undocumentedClasses.length * 20

    // Calculate rating (A-E)
    let rating: 'A' | 'B' | 'C' | 'D' | 'E'
    if (minutes <= 60) rating = 'A'
    else if (minutes <= 240) rating = 'B'
    else if (minutes <= 480) rating = 'C'
    else if (minutes <= 960) rating = 'D'
    else rating = 'E'

    return { minutes, rating }
  }

  private calculateOverallScore(
    maintainabilityScore: number,
    avgComplexity: number,
    docCoverage: number,
    duplicationPercentage: number,
    codeSmellCount: number
  ): number {
    // Weighted average
    const complexityScore = Math.max(0, 100 - avgComplexity * 5)
    const smellScore = Math.max(0, 100 - codeSmellCount * 2)
    const dupScore = Math.max(0, 100 - duplicationPercentage * 2)

    return Math.round(
      (maintainabilityScore * 0.3 +
      complexityScore * 0.2 +
      docCoverage * 0.2 +
      dupScore * 0.15 +
      smellScore * 0.15)
    )
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  generateMarkdownReport(metrics: CodeQualityMetrics): string {
    let md = '# Code Quality Report\n\n'

    // Overall Score
    md += '## Overall Score\n\n'
    md += `**Score**: ${metrics.overall.score}/100 (Grade: ${metrics.overall.grade})\n\n`

    // Metrics Summary
    md += '## Metrics Summary\n\n'
    md += `| Metric | Value |\n`
    md += `|--------|-------|\n`
    md += `| Maintainability | ${metrics.maintainability.score}/100 |\n`
    md += `| Avg Complexity | ${metrics.complexity.average} |\n`
    md += `| Documentation | ${metrics.documentation.coverage}% |\n`
    md += `| Duplication | ${metrics.duplication.percentage}% |\n`
    md += `| Tech Debt | ${metrics.technicalDebt.minutes} min (${metrics.technicalDebt.rating}) |\n\n`

    // Line Metrics
    md += '## Line Metrics\n\n'
    md += `- Total Lines: ${metrics.lineMetrics.total}\n`
    md += `- Code Lines: ${metrics.lineMetrics.code}\n`
    md += `- Comments: ${metrics.lineMetrics.comments}\n`
    md += `- Blank: ${metrics.lineMetrics.blank}\n\n`

    // High Complexity Functions
    if (metrics.complexity.highest.length > 0) {
      md += '## High Complexity Functions\n\n'
      md += `| Function | Complexity | File |\n`
      md += `|----------|------------|------|\n`
      for (const func of metrics.complexity.highest.slice(0, 10)) {
        md += `| ${func.name} | ${func.value} | ${func.file} |\n`
      }
      md += '\n'
    }

    // Code Smells
    if (metrics.codeSmells.length > 0) {
      md += '## Code Smells\n\n'
      const critical = metrics.codeSmells.filter(s => s.severity === 'critical')
      const major = metrics.codeSmells.filter(s => s.severity === 'major')
      
      if (critical.length > 0) {
        md += '### Critical\n\n'
        for (const smell of critical.slice(0, 5)) {
          md += `- **${smell.type}** in \`${smell.file}:${smell.line}\`\n`
          md += `  - ${smell.suggestion}\n`
        }
        md += '\n'
      }
      
      if (major.length > 0) {
        md += '### Major\n\n'
        for (const smell of major.slice(0, 10)) {
          md += `- **${smell.type}** in \`${smell.file}:${smell.line}\`\n`
        }
        md += '\n'
      }
    }

    return md
  }
}

