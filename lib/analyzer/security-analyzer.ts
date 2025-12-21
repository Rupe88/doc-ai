import type { SecurityIssue, PerformanceIssue } from '@/types/analyzer'

export class SecurityAnalyzer {
  analyzeCode(content: string, filePath: string): {
    securityIssues: SecurityIssue[]
    performanceIssues: PerformanceIssue[]
  } {
    const securityIssues: SecurityIssue[] = []
    const performanceIssues: PerformanceIssue[] = []

    const lines = content.split('\n')

    lines.forEach((line, index) => {
      const lineNumber = index + 1

      if (this.detectSQLInjection(line)) {
        securityIssues.push({
          type: 'sql_injection',
          severity: 'high',
          filePath,
          line: lineNumber,
          description: 'Potential SQL injection vulnerability detected',
          recommendation: 'Use parameterized queries or prepared statements',
        })
      }

      if (this.detectXSS(line)) {
        securityIssues.push({
          type: 'xss',
          severity: 'high',
          filePath,
          line: lineNumber,
          description: 'Potential XSS vulnerability detected',
          recommendation: 'Sanitize user input and use Content Security Policy',
        })
      }

      if (this.detectSensitiveData(line)) {
        securityIssues.push({
          type: 'sensitive_data',
          severity: 'medium',
          filePath,
          line: lineNumber,
          description: 'Potential sensitive data exposure',
          recommendation: 'Avoid logging or exposing sensitive information',
        })
      }

      if (this.detectNestedLoop(line, lines, index)) {
        performanceIssues.push({
          type: 'n_squared',
          severity: 'high',
          filePath,
          line: lineNumber,
          description: 'Nested loop detected - O(n²) complexity',
          recommendation: 'Consider optimizing with hash maps or other data structures',
        })
      }

      if (this.detectMemoryLeak(line)) {
        performanceIssues.push({
          type: 'memory_leak',
          severity: 'medium',
          filePath,
          line: lineNumber,
          description: 'Potential memory leak detected',
          recommendation: 'Ensure proper cleanup of event listeners and timers',
        })
      }
    })

    return { securityIssues, performanceIssues }
  }

  private detectSQLInjection(line: string): boolean {
    const sqlPatterns = [
      /\$\{.*\}.*SELECT/i,
      /\+.*SELECT/i,
      /`.*\$\{.*\}.*SELECT/i,
      /query\(.*\+.*\)/i,
      /execute\(.*\+.*\)/i,
    ]

    return sqlPatterns.some(pattern => pattern.test(line))
  }

  private detectXSS(line: string): boolean {
    const xssPatterns = [
      /innerHTML\s*=\s*[^'"]*\+/,
      /dangerouslySetInnerHTML/,
      /eval\(/,
      /document\.write\(/,
    ]

    return xssPatterns.some(pattern => pattern.test(line))
  }

  private detectSensitiveData(line: string): boolean {
    const sensitivePatterns = [
      /password.*=.*['"]/i,
      /api[_-]?key.*=.*['"]/i,
      /secret.*=.*['"]/i,
      /token.*=.*['"]/i,
      /console\.log.*password/i,
      /console\.log.*token/i,
    ]

    return sensitivePatterns.some(pattern => pattern.test(line))
  }

  private detectNestedLoop(line: string, lines: string[], index: number): boolean {
    const loopKeywords = ['for', 'while', 'forEach', 'map', 'filter']
    const hasLoop = loopKeywords.some(keyword => 
      new RegExp(`\\b${keyword}\\s*\\(`).test(line)
    )

    if (!hasLoop) return false

    for (let i = index + 1; i < Math.min(index + 20, lines.length); i++) {
      const nextLine = lines[i]
      if (loopKeywords.some(keyword => 
        new RegExp(`\\b${keyword}\\s*\\(`).test(nextLine)
      )) {
        return true
      }
    }

    return false
  }

  private detectMemoryLeak(line: string): boolean {
    const leakPatterns = [
      /setInterval\([^)]*\)(?!.*clearInterval)/,
      /setTimeout\([^)]*\)(?!.*clearTimeout)/,
      /addEventListener\([^)]*\)(?!.*removeEventListener)/,
    ]

    return leakPatterns.some(pattern => pattern.test(line))
  }
}

