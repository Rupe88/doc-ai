/**
 * Static Code Analyzer - NO AI NEEDED!
 * Instant analysis for vulnerabilities, errors, and code quality
 */

export interface Issue {
  type: 'error' | 'warning' | 'vulnerability' | 'performance'
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  file: string
  line: number
  code: string
  fix?: string
}

export interface StaticAnalysisResult {
  issues: Issue[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
  securityScore: number
  qualityScore: number
}

// Security patterns to detect
const SECURITY_PATTERNS = [
  {
    pattern: /eval\s*\(/g,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'eval() is dangerous - allows code injection',
    fix: 'Use JSON.parse() or Function constructor with sanitized input',
  },
  {
    pattern: /innerHTML\s*=/g,
    type: 'vulnerability' as const,
    severity: 'high' as const,
    message: 'innerHTML can lead to XSS attacks',
    fix: 'Use textContent or sanitize HTML with DOMPurify',
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    type: 'vulnerability' as const,
    severity: 'high' as const,
    message: 'dangerouslySetInnerHTML can lead to XSS',
    fix: 'Sanitize HTML content before rendering',
  },
  {
    pattern: /document\.write\s*\(/g,
    type: 'vulnerability' as const,
    severity: 'high' as const,
    message: 'document.write() can be exploited for XSS',
    fix: 'Use DOM manipulation methods instead',
  },
  {
    pattern: /new\s+Function\s*\(/g,
    type: 'vulnerability' as const,
    severity: 'high' as const,
    message: 'Function constructor is similar to eval()',
    fix: 'Avoid dynamic code generation',
  },
  {
    pattern: /exec\s*\(/g,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'Command injection risk with exec()',
    fix: 'Use execFile() or spawn() with array args',
  },
  {
    pattern: /child_process.*exec/g,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'Shell command injection possible',
    fix: 'Use execFile() with arguments array',
  },
  {
    pattern: /password\s*[:=]\s*["'`][^"'`]+["'`]/gi,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'Hardcoded password detected',
    fix: 'Use environment variables for secrets',
  },
  {
    pattern: /api[_-]?key\s*[:=]\s*["'`][^"'`]+["'`]/gi,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'Hardcoded API key detected',
    fix: 'Use environment variables for API keys',
  },
  {
    pattern: /secret\s*[:=]\s*["'`][^"'`]+["'`]/gi,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'Hardcoded secret detected',
    fix: 'Use environment variables for secrets',
  },
  {
    pattern: /SELECT\s+.*\s+FROM.*\+/gi,
    type: 'vulnerability' as const,
    severity: 'critical' as const,
    message: 'SQL injection risk - string concatenation in query',
    fix: 'Use parameterized queries or ORM',
  },
  {
    pattern: /\$\{.*\}.*SELECT|SELECT.*\$\{/gi,
    type: 'vulnerability' as const,
    severity: 'high' as const,
    message: 'SQL injection risk - template literal in query',
    fix: 'Use parameterized queries',
  },
  {
    pattern: /cors\s*\(\s*\{?\s*origin\s*:\s*['"]\*['"]/gi,
    type: 'vulnerability' as const,
    severity: 'medium' as const,
    message: 'CORS allows all origins',
    fix: 'Specify allowed origins explicitly',
  },
  {
    pattern: /https?:\/\/localhost/g,
    type: 'warning' as const,
    severity: 'low' as const,
    message: 'Hardcoded localhost URL',
    fix: 'Use environment variable for base URL',
  },
  {
    pattern: /console\.(log|debug|info)\s*\(/g,
    type: 'warning' as const,
    severity: 'low' as const,
    message: 'Console log in production code',
    fix: 'Remove or use proper logging library',
  },
  {
    pattern: /TODO|FIXME|HACK|XXX/g,
    type: 'warning' as const,
    severity: 'low' as const,
    message: 'Unresolved TODO/FIXME comment',
    fix: 'Address or remove the comment',
  },
  {
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    type: 'error' as const,
    severity: 'medium' as const,
    message: 'Empty catch block - errors are silently ignored',
    fix: 'Handle or log the error properly',
  },
  {
    pattern: /\/\/\s*@ts-ignore/g,
    type: 'warning' as const,
    severity: 'medium' as const,
    message: 'TypeScript error suppressed',
    fix: 'Fix the type error instead of ignoring',
  },
  {
    pattern: /\/\/\s*eslint-disable/g,
    type: 'warning' as const,
    severity: 'low' as const,
    message: 'ESLint rule disabled',
    fix: 'Fix the linting issue instead of disabling',
  },
  {
    pattern: /any\s*[;,\)>]/g,
    type: 'warning' as const,
    severity: 'low' as const,
    message: 'Use of "any" type reduces type safety',
    fix: 'Use a more specific type',
  },
]

// Performance patterns
const PERFORMANCE_PATTERNS = [
  {
    pattern: /\.forEach\s*\([^)]*await/g,
    type: 'performance' as const,
    severity: 'high' as const,
    message: 'await inside forEach - runs sequentially',
    fix: 'Use Promise.all with map for parallel execution',
  },
  {
    pattern: /new\s+Array\s*\(\s*\d{6,}\s*\)/g,
    type: 'performance' as const,
    severity: 'medium' as const,
    message: 'Very large array allocation',
    fix: 'Consider streaming or pagination',
  },
  {
    pattern: /JSON\.parse.*JSON\.stringify/g,
    type: 'performance' as const,
    severity: 'low' as const,
    message: 'Deep clone via JSON - slow for large objects',
    fix: 'Use structuredClone() or lodash.cloneDeep()',
  },
  {
    pattern: /document\.querySelector.*loop|for.*document\.querySelector/gi,
    type: 'performance' as const,
    severity: 'medium' as const,
    message: 'DOM query inside loop',
    fix: 'Cache the DOM reference outside the loop',
  },
  {
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*fetch/g,
    type: 'performance' as const,
    severity: 'low' as const,
    message: 'Fetch in useEffect without cleanup',
    fix: 'Add AbortController for cleanup',
  },
]

export function analyzeFile(content: string, filePath: string): Issue[] {
  const issues: Issue[] = []
  const lines = content.split('\n')

  // Skip node_modules, .min files, etc
  if (filePath.includes('node_modules') || filePath.includes('.min.') || filePath.includes('dist/')) {
    return []
  }

  // Check security patterns
  for (const rule of [...SECURITY_PATTERNS, ...PERFORMANCE_PATTERNS]) {
    let match
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index)
      const lineNumber = beforeMatch.split('\n').length
      const lineContent = lines[lineNumber - 1] || ''

      issues.push({
        type: rule.type,
        severity: rule.severity,
        message: rule.message,
        file: filePath,
        line: lineNumber,
        code: lineContent.trim().substring(0, 100),
        fix: rule.fix,
      })
    }
  }

  return issues
}

export function analyzeFiles(files: { path: string; content: string }[]): StaticAnalysisResult {
  const allIssues: Issue[] = []

  for (const file of files) {
    // Only analyze JS/TS files
    if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file.path)) {
      const issues = analyzeFile(file.content, file.path)
      allIssues.push(...issues)
    }
  }

  // Deduplicate similar issues
  const uniqueIssues = allIssues.filter((issue, index) => {
    return allIssues.findIndex(i => 
      i.file === issue.file && 
      i.line === issue.line && 
      i.message === issue.message
    ) === index
  })

  const summary = {
    critical: uniqueIssues.filter(i => i.severity === 'critical').length,
    high: uniqueIssues.filter(i => i.severity === 'high').length,
    medium: uniqueIssues.filter(i => i.severity === 'medium').length,
    low: uniqueIssues.filter(i => i.severity === 'low').length,
    total: uniqueIssues.length,
  }

  // Calculate security score (0-100)
  const securityPenalty = summary.critical * 20 + summary.high * 10 + summary.medium * 5 + summary.low * 1
  const securityScore = Math.max(0, 100 - securityPenalty)

  // Calculate quality score based on code patterns
  const qualityPenalty = uniqueIssues.filter(i => i.type === 'error' || i.type === 'warning').length * 2
  const qualityScore = Math.max(0, 100 - qualityPenalty)

  return {
    issues: uniqueIssues.slice(0, 100), // Limit to top 100 issues
    summary,
    securityScore,
    qualityScore,
  }
}

// Format issues as markdown
export function formatIssuesAsMarkdown(result: StaticAnalysisResult): string {
  const { issues, summary, securityScore, qualityScore } = result

  let md = `## Code Analysis Report

### Scores
- **Security Score**: ${securityScore}/100 ${securityScore >= 80 ? '(Good)' : securityScore >= 50 ? '(Needs Improvement)' : '(Critical!)'}
- **Quality Score**: ${qualityScore}/100

### Issue Summary
| Severity | Count |
|----------|-------|
| Critical | ${summary.critical} |
| High | ${summary.high} |
| Medium | ${summary.medium} |
| Low | ${summary.low} |
| **Total** | **${summary.total}** |

`

  if (summary.critical > 0) {
    md += `### Critical Issues (Fix Immediately!)\n\n`
    issues.filter(i => i.severity === 'critical').forEach(issue => {
      md += `- **${issue.message}**\n`
      md += `  - File: \`${issue.file}:${issue.line}\`\n`
      md += `  - Code: \`${issue.code}\`\n`
      md += `  - Fix: ${issue.fix}\n\n`
    })
  }

  if (summary.high > 0) {
    md += `### High Priority Issues\n\n`
    issues.filter(i => i.severity === 'high').slice(0, 10).forEach(issue => {
      md += `- **${issue.message}** in \`${issue.file}:${issue.line}\`\n`
      md += `  - Fix: ${issue.fix}\n`
    })
    md += '\n'
  }

  if (summary.medium > 0) {
    md += `### Medium Priority Issues\n\n`
    issues.filter(i => i.severity === 'medium').slice(0, 10).forEach(issue => {
      md += `- ${issue.message} in \`${issue.file}:${issue.line}\`\n`
    })
    md += '\n'
  }

  return md
}

