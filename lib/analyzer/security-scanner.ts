/**
 * Advanced Security Vulnerability Scanner
 * Detects security issues in code
 */

export interface SecurityIssue {
  id: string
  type: SecurityIssueType
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  filePath: string
  line: number
  code: string
  recommendation: string
  cweId?: string
  owaspCategory?: string
}

export type SecurityIssueType =
  | 'sql_injection'
  | 'xss'
  | 'command_injection'
  | 'path_traversal'
  | 'insecure_random'
  | 'hardcoded_secret'
  | 'insecure_crypto'
  | 'sensitive_data_exposure'
  | 'insecure_deserialization'
  | 'missing_auth'
  | 'cors_misconfiguration'
  | 'insecure_cookie'
  | 'prototype_pollution'
  | 'regex_dos'
  | 'open_redirect'

interface SecurityRule {
  id: string
  type: SecurityIssueType
  severity: SecurityIssue['severity']
  title: string
  pattern: RegExp
  description: string
  recommendation: string
  cweId?: string
  owaspCategory?: string
}

export class SecurityScanner {
  private rules: SecurityRule[] = [
    // SQL Injection
    {
      id: 'SEC001',
      type: 'sql_injection',
      severity: 'critical',
      title: 'Potential SQL Injection',
      pattern: /(?:query|execute|exec)\s*\(\s*[`'"].*\$\{/gi,
      description: 'String interpolation in SQL query can lead to SQL injection attacks',
      recommendation: 'Use parameterized queries or prepared statements instead of string interpolation',
      cweId: 'CWE-89',
      owaspCategory: 'A03:2021 Injection',
    },
    {
      id: 'SEC002',
      type: 'sql_injection',
      severity: 'critical',
      title: 'Raw SQL Query',
      pattern: /\$queryRaw|\.raw\s*\(/gi,
      description: 'Raw SQL queries can be vulnerable to injection attacks',
      recommendation: 'Prefer ORM methods or use parameterized queries with proper escaping',
      cweId: 'CWE-89',
      owaspCategory: 'A03:2021 Injection',
    },
    // XSS
    {
      id: 'SEC003',
      type: 'xss',
      severity: 'high',
      title: 'Potential XSS via dangerouslySetInnerHTML',
      pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:/gi,
      description: 'Using dangerouslySetInnerHTML can expose the application to XSS attacks',
      recommendation: 'Sanitize HTML content using DOMPurify or similar library before rendering',
      cweId: 'CWE-79',
      owaspCategory: 'A03:2021 Injection',
    },
    {
      id: 'SEC004',
      type: 'xss',
      severity: 'medium',
      title: 'Unescaped User Input in Template',
      pattern: /innerHTML\s*=|outerHTML\s*=/gi,
      description: 'Direct HTML assignment can lead to XSS vulnerabilities',
      recommendation: 'Use textContent instead of innerHTML, or sanitize the content',
      cweId: 'CWE-79',
      owaspCategory: 'A03:2021 Injection',
    },
    // Command Injection
    {
      id: 'SEC005',
      type: 'command_injection',
      severity: 'critical',
      title: 'Potential Command Injection',
      pattern: /(?:exec|spawn|execSync|spawnSync)\s*\(\s*[`'"].*\$\{/gi,
      description: 'User input in command execution can lead to command injection',
      recommendation: 'Avoid using shell commands with user input. If necessary, use allowlists and escape input',
      cweId: 'CWE-78',
      owaspCategory: 'A03:2021 Injection',
    },
    {
      id: 'SEC006',
      type: 'command_injection',
      severity: 'high',
      title: 'Shell Command Execution',
      pattern: /child_process\.exec\s*\(/gi,
      description: 'exec() is vulnerable to command injection. Use execFile() instead',
      recommendation: 'Replace exec() with execFile() and pass arguments as an array',
      cweId: 'CWE-78',
      owaspCategory: 'A03:2021 Injection',
    },
    // Path Traversal
    {
      id: 'SEC007',
      type: 'path_traversal',
      severity: 'high',
      title: 'Potential Path Traversal',
      pattern: /(?:readFile|writeFile|createReadStream|createWriteStream)\s*\([^)]*\+/gi,
      description: 'Concatenating user input to file paths can lead to path traversal attacks',
      recommendation: 'Use path.resolve() and validate the resolved path is within expected directory',
      cweId: 'CWE-22',
      owaspCategory: 'A01:2021 Broken Access Control',
    },
    // Hardcoded Secrets
    {
      id: 'SEC008',
      type: 'hardcoded_secret',
      severity: 'critical',
      title: 'Hardcoded API Key or Secret',
      pattern: /(?:api[_-]?key|secret|password|token|auth)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
      description: 'Hardcoded secrets in source code can be exposed in version control',
      recommendation: 'Use environment variables for secrets. Never commit credentials to source control',
      cweId: 'CWE-798',
      owaspCategory: 'A07:2021 Identification and Authentication Failures',
    },
    {
      id: 'SEC009',
      type: 'hardcoded_secret',
      severity: 'critical',
      title: 'Hardcoded Private Key',
      pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/gi,
      description: 'Private keys should never be hardcoded in source code',
      recommendation: 'Store private keys in secure key management systems or environment variables',
      cweId: 'CWE-321',
      owaspCategory: 'A02:2021 Cryptographic Failures',
    },
    // Insecure Crypto
    {
      id: 'SEC010',
      type: 'insecure_crypto',
      severity: 'high',
      title: 'Weak Cryptographic Algorithm (MD5)',
      pattern: /createHash\s*\(\s*['"]md5['"]\)/gi,
      description: 'MD5 is cryptographically broken and should not be used for security',
      recommendation: 'Use SHA-256 or stronger for hashing. Use bcrypt/argon2 for passwords',
      cweId: 'CWE-328',
      owaspCategory: 'A02:2021 Cryptographic Failures',
    },
    {
      id: 'SEC011',
      type: 'insecure_crypto',
      severity: 'high',
      title: 'Weak Cryptographic Algorithm (SHA1)',
      pattern: /createHash\s*\(\s*['"]sha1['"]\)/gi,
      description: 'SHA1 is deprecated for security purposes',
      recommendation: 'Use SHA-256 or SHA-3 for cryptographic hashing',
      cweId: 'CWE-328',
      owaspCategory: 'A02:2021 Cryptographic Failures',
    },
    // Insecure Random
    {
      id: 'SEC012',
      type: 'insecure_random',
      severity: 'medium',
      title: 'Insecure Random Number Generator',
      pattern: /Math\.random\s*\(\)/gi,
      description: 'Math.random() is not cryptographically secure',
      recommendation: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive operations',
      cweId: 'CWE-330',
      owaspCategory: 'A02:2021 Cryptographic Failures',
    },
    // CORS Misconfiguration
    {
      id: 'SEC013',
      type: 'cors_misconfiguration',
      severity: 'medium',
      title: 'Wildcard CORS Origin',
      pattern: /(?:Access-Control-Allow-Origin|origin)\s*[:=]\s*['"]\*['"]/gi,
      description: 'Allowing all origins can expose the API to cross-site attacks',
      recommendation: 'Specify allowed origins explicitly instead of using wildcard',
      cweId: 'CWE-942',
      owaspCategory: 'A05:2021 Security Misconfiguration',
    },
    // Insecure Cookie
    {
      id: 'SEC014',
      type: 'insecure_cookie',
      severity: 'medium',
      title: 'Cookie Without Secure Flag',
      pattern: /setCookie|set-cookie[^}]*(?!secure)/gi,
      description: 'Cookies without Secure flag can be transmitted over unencrypted connections',
      recommendation: 'Set Secure, HttpOnly, and SameSite flags on sensitive cookies',
      cweId: 'CWE-614',
      owaspCategory: 'A05:2021 Security Misconfiguration',
    },
    // Prototype Pollution
    {
      id: 'SEC015',
      type: 'prototype_pollution',
      severity: 'high',
      title: 'Potential Prototype Pollution',
      pattern: /Object\.assign\s*\([^,]+,\s*(?:req\.body|req\.query|params)/gi,
      description: 'Merging user input directly into objects can lead to prototype pollution',
      recommendation: 'Validate and sanitize user input before merging. Use Object.create(null) for safe objects',
      cweId: 'CWE-1321',
      owaspCategory: 'A03:2021 Injection',
    },
    // Open Redirect
    {
      id: 'SEC016',
      type: 'open_redirect',
      severity: 'medium',
      title: 'Potential Open Redirect',
      pattern: /(?:redirect|location\.href|window\.location)\s*=\s*(?:req\.query|req\.params|params)/gi,
      description: 'Using user-controlled URLs in redirects can lead to phishing attacks',
      recommendation: 'Validate redirect URLs against an allowlist of trusted destinations',
      cweId: 'CWE-601',
      owaspCategory: 'A01:2021 Broken Access Control',
    },
    // Eval
    {
      id: 'SEC017',
      type: 'command_injection',
      severity: 'critical',
      title: 'Use of eval()',
      pattern: /\beval\s*\(/gi,
      description: 'eval() can execute arbitrary code and is a major security risk',
      recommendation: 'Avoid eval(). Use JSON.parse() for JSON data or safer alternatives',
      cweId: 'CWE-95',
      owaspCategory: 'A03:2021 Injection',
    },
    // Regex DoS
    {
      id: 'SEC018',
      type: 'regex_dos',
      severity: 'medium',
      title: 'Potentially Vulnerable Regular Expression',
      pattern: /new RegExp\s*\([^)]*\+/gi,
      description: 'Dynamic regex with user input can cause ReDoS attacks',
      recommendation: 'Avoid creating regex from user input. If necessary, use safe-regex library',
      cweId: 'CWE-1333',
      owaspCategory: 'A06:2021 Vulnerable Components',
    },
  ]

  async scan(files: Array<{ path: string; content: string }>): Promise<{
    issues: SecurityIssue[]
    summary: SecuritySummary
  }> {
    const issues: SecurityIssue[] = []

    for (const file of files) {
      // Skip non-source files
      if (!this.isSourceFile(file.path)) continue

      const fileIssues = this.scanFile(file)
      issues.push(...fileIssues)
    }

    const summary = this.generateSummary(issues)
    return { issues, summary }
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
    return sourceExtensions.some(ext => filePath.endsWith(ext))
  }

  private scanFile(file: { path: string; content: string }): SecurityIssue[] {
    const issues: SecurityIssue[] = []
    const lines = file.content.split('\n')

    for (const rule of this.rules) {
      let match
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)

      while ((match = pattern.exec(file.content)) !== null) {
        // Find line number
        const beforeMatch = file.content.substring(0, match.index)
        const lineNumber = beforeMatch.split('\n').length

        // Get the line content
        const lineContent = lines[lineNumber - 1] || ''

        issues.push({
          id: `${rule.id}-${file.path}-${lineNumber}`,
          type: rule.type,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          filePath: file.path,
          line: lineNumber,
          code: lineContent.trim(),
          recommendation: rule.recommendation,
          cweId: rule.cweId,
          owaspCategory: rule.owaspCategory,
        })
      }
    }

    return issues
  }

  private generateSummary(issues: SecurityIssue[]): SecuritySummary {
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length,
    }

    const byType: Record<string, number> = {}
    for (const issue of issues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1
    }

    const affectedFiles = new Set(issues.map(i => i.filePath)).size

    // Calculate security score (0-100)
    const score = Math.max(0, 100 - (
      bySeverity.critical * 20 +
      bySeverity.high * 10 +
      bySeverity.medium * 5 +
      bySeverity.low * 2 +
      bySeverity.info * 1
    ))

    return {
      totalIssues: issues.length,
      bySeverity,
      byType,
      affectedFiles,
      score,
      grade: this.getGrade(score),
    }
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  generateMarkdownReport(issues: SecurityIssue[], summary: SecuritySummary): string {
    let md = '# Security Scan Report\n\n'
    
    md += '## Summary\n\n'
    md += `- **Security Score**: ${summary.score}/100 (Grade: ${summary.grade})\n`
    md += `- **Total Issues**: ${summary.totalIssues}\n`
    md += `- **Affected Files**: ${summary.affectedFiles}\n\n`

    md += '### Issues by Severity\n\n'
    md += `| Severity | Count |\n`
    md += `|----------|-------|\n`
    md += `| Critical | ${summary.bySeverity.critical} |\n`
    md += `| High | ${summary.bySeverity.high} |\n`
    md += `| Medium | ${summary.bySeverity.medium} |\n`
    md += `| Low | ${summary.bySeverity.low} |\n`
    md += `| Info | ${summary.bySeverity.info} |\n\n`

    if (issues.length > 0) {
      md += '## Detailed Findings\n\n'

      // Group by severity
      const critical = issues.filter(i => i.severity === 'critical')
      const high = issues.filter(i => i.severity === 'high')
      const medium = issues.filter(i => i.severity === 'medium')
      const low = issues.filter(i => i.severity === 'low')

      const renderIssues = (sectionIssues: SecurityIssue[], title: string) => {
        if (sectionIssues.length === 0) return ''
        let section = `### ${title}\n\n`
        for (const issue of sectionIssues) {
          section += `#### ${issue.title}\n\n`
          section += `- **File**: \`${issue.filePath}:${issue.line}\`\n`
          section += `- **Severity**: ${issue.severity.toUpperCase()}\n`
          if (issue.cweId) section += `- **CWE**: ${issue.cweId}\n`
          if (issue.owaspCategory) section += `- **OWASP**: ${issue.owaspCategory}\n`
          section += `\n**Description**: ${issue.description}\n\n`
          section += `**Code**:\n\`\`\`\n${issue.code}\n\`\`\`\n\n`
          section += `**Recommendation**: ${issue.recommendation}\n\n`
          section += '---\n\n'
        }
        return section
      }

      md += renderIssues(critical, 'Critical Issues')
      md += renderIssues(high, 'High Priority Issues')
      md += renderIssues(medium, 'Medium Priority Issues')
      md += renderIssues(low, 'Low Priority Issues')
    } else {
      md += '## No Issues Found\n\nGreat job! No security issues were detected in the scanned codebase.\n'
    }

    return md
  }
}

export interface SecuritySummary {
  totalIssues: number
  bySeverity: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  byType: Record<string, number>
  affectedFiles: number
  score: number
  grade: string
}

