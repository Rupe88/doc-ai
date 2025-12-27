/**
 * Enhanced Security Scanner - Advanced SQL/NoSQL Injection Detection
 *
 * Features:
 * - Precise line-by-line analysis
 * - Context-aware vulnerability detection
 * - SQL and NoSQL injection patterns
 * - False positive reduction
 * - CWE and OWASP mapping
 */

import { SecurityIssue, SecurityScanner } from '../analyzer/security-scanner'

export interface InjectionPattern {
  name: string
  type: 'sql' | 'nosql'
  pattern: RegExp
  context: string[]
  severity: 'critical' | 'high' | 'medium'
  cwe: string
  description: string
  frameworks?: string[] // Specific frameworks this applies to
  falsePositiveCheck?: (code: string, line: string) => boolean
}

export interface FrameworkSecurityRules {
  framework: string
  patterns: InjectionPattern[]
  fileExtensions: string[]
  contextKeywords: string[]
}

export class EnhancedSecurityScanner {
  private baseScanner = new SecurityScanner()

  private frameworkRules: FrameworkSecurityRules[] = [
    // React/Next.js Security Rules
    {
      framework: 'react',
      fileExtensions: ['.jsx', '.tsx', '.js', '.ts'],
      contextKeywords: ['react', 'jsx', 'component', 'useState', 'useEffect'],
      patterns: [
        {
          name: 'React dangerouslySetInnerHTML XSS',
          type: 'sql', // reusing type for XSS
          pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*[^}]*\$\{/gi,
          context: ['react', 'jsx', 'component'],
          severity: 'critical',
          cwe: 'CWE-79',
          description: 'dangerouslySetInnerHTML with interpolated content can lead to XSS attacks',
          frameworks: ['react', 'nextjs'],
          falsePositiveCheck: (code, line) => {
            // Check if content is properly sanitized
            const nearbyCode = this.getNearbyCode(code, line, 10)
            return nearbyCode.includes('DOMPurify') || nearbyCode.includes('sanitize') ||
                   nearbyCode.includes('escapeHtml')
          }
        },
        {
          name: 'React useEffect Missing Dependencies',
          type: 'sql', // reusing type
          pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\$\{[^}]*\}[^}]*\}\s*,\s*\[\s*\]\s*\)/gi,
          context: ['react', 'hook'],
          severity: 'medium',
          cwe: 'CWE-664',
          description: 'useEffect with interpolated values but empty dependency array can cause stale closures',
          frameworks: ['react', 'nextjs']
        },
        {
          name: 'Next.js Server-Side Data Fetching',
          type: 'sql',
          pattern: /getServerSideProps\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*fetch\s*\([^)]*\$\{[^}]*\}[^)]*\)/gi,
          context: ['nextjs', 'ssr'],
          severity: 'high',
          cwe: 'CWE-918',
          description: 'Server-side fetch with interpolated URLs can lead to SSRF attacks',
          frameworks: ['nextjs'],
          falsePositiveCheck: (code, line) => {
            // Check if URL is validated
            const nearbyCode = this.getNearbyCode(code, line, 5)
            return nearbyCode.includes('validateUrl') || nearbyCode.includes('allowedHosts')
          }
        },
        {
          name: 'React State XSS via setState',
          type: 'sql',
          pattern: /setState\s*\(\s*\{[^}]*:\s*[^}]*\$\{[^}]*\}[^}]*\}\s*\)/gi,
          context: ['react', 'state'],
          severity: 'high',
          cwe: 'CWE-79',
          description: 'Setting state with interpolated values can lead to XSS if rendered',
          frameworks: ['react', 'nextjs']
        }
      ]
    },

    // Vue.js Security Rules
    {
      framework: 'vue',
      fileExtensions: ['.vue', '.js', '.ts'],
      contextKeywords: ['vue', 'component', 'template', 'script'],
      patterns: [
        {
          name: 'Vue v-html XSS',
          type: 'sql',
          pattern: /v-html\s*=\s*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]/gi,
          context: ['vue', 'template'],
          severity: 'critical',
          cwe: 'CWE-79',
          description: 'v-html with interpolated content can lead to XSS attacks',
          frameworks: ['vue'],
          falsePositiveCheck: (code, line) => {
            const nearbyCode = this.getNearbyCode(line, line, 5)
            return nearbyCode.includes('sanitize') || nearbyCode.includes('DOMPurify')
          }
        },
        {
          name: 'Vue Computed Property Injection',
          type: 'sql',
          pattern: /computed\s*:\s*\{[^}]*:\s*function\s*\([^)]*\)\s*\{[^}]*\$\{[^}]*\}[^}]*\}/gi,
          context: ['vue', 'computed'],
          severity: 'medium',
          cwe: 'CWE-95',
          description: 'Computed properties with interpolation may be vulnerable to injection',
          frameworks: ['vue']
        },
        {
          name: 'Vue Watch Deep Injection',
          type: 'sql',
          pattern: /watch\s*:\s*\{[^}]*deep\s*:\s*true[^}]*handler\s*:\s*function\s*\([^)]*\)\s*\{[^}]*\$\{[^}]*\}/gi,
          context: ['vue', 'watch'],
          severity: 'medium',
          cwe: 'CWE-95',
          description: 'Deep watchers with interpolated code can be exploited',
          frameworks: ['vue']
        }
      ]
    },

    // Express.js Security Rules
    {
      framework: 'express',
      fileExtensions: ['.js', '.ts'],
      contextKeywords: ['express', 'app', 'router', 'middleware'],
      patterns: [
        {
          name: 'Express Path Traversal',
          type: 'sql',
          pattern: /(?:sendFile|__dirname|__filename|path\.join|path\.resolve)\s*\([^)]*\$\{[^}]*\}[^)]*\)/gi,
          context: ['express', 'static', 'file'],
          severity: 'critical',
          cwe: 'CWE-22',
          description: 'File operations with interpolated paths can lead to path traversal attacks',
          frameworks: ['express', 'nodejs'],
          falsePositiveCheck: (code, line) => {
            const nearbyCode = this.getNearbyCode(code, line, 5)
            return nearbyCode.includes('path.normalize') || nearbyCode.includes('validatePath')
          }
        },
        {
          name: 'Express CORS Wildcard',
          type: 'sql',
          pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*['"`]\*['"`][^}]*\}\s*\)/gi,
          context: ['express', 'cors'],
          severity: 'high',
          cwe: 'CWE-942',
          description: 'CORS with wildcard origin allows all domains to make requests',
          frameworks: ['express']
        },
        {
          name: 'Express Missing Helmet',
          type: 'sql',
          pattern: /app\.listen\s*\(/gi,
          context: ['express', 'server'],
          severity: 'medium',
          cwe: 'CWE-693',
          description: 'Express server running without security headers (helmet middleware)',
          frameworks: ['express'],
          falsePositiveCheck: (code, line) => {
            const fullCode = code
            return fullCode.includes('helmet') || fullCode.includes('app.use.*helmet')
          }
        },
        {
          name: 'Express Rate Limiting Missing',
          type: 'sql',
          pattern: /app\.post\s*\(\s*['"`][/][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/gi,
          context: ['express', 'route'],
          severity: 'medium',
          cwe: 'CWE-770',
          description: 'API endpoints without rate limiting can be abused',
          frameworks: ['express'],
          falsePositiveCheck: (code, line) => {
            const fullCode = code
            return fullCode.includes('express-rate-limit') || fullCode.includes('rateLimit')
          }
        }
      ]
    },

    // Next.js Specific Rules
    {
      framework: 'nextjs',
      fileExtensions: ['.tsx', '.ts', '.js'],
      contextKeywords: ['next', 'api', 'pages', 'app'],
      patterns: [
        {
          name: 'Next.js API Route Injection',
          type: 'sql',
          pattern: /export\s+(?:default|async function)\s+(?:GET|POST|PUT|DELETE)\s*\([^)]*\)\s*\{[^}]*\$\{[^}]*\}[^}]*query\[|body\./gi,
          context: ['nextjs', 'api'],
          severity: 'high',
          cwe: 'CWE-94',
          description: 'API routes using interpolated values from request can lead to injection',
          frameworks: ['nextjs'],
          falsePositiveCheck: (code, line) => {
            const nearbyCode = this.getNearbyCode(code, line, 10)
            return nearbyCode.includes('zod') || nearbyCode.includes('joi') ||
                   nearbyCode.includes('yup') || nearbyCode.includes('validate')
          }
        },
        {
          name: 'Next.js Image Domain Bypass',
          type: 'sql',
          pattern: /images\s*:\s*\{[^}]*domains\s*:\s*\[[^]]*\*\s*\]/gi,
          context: ['nextjs', 'config'],
          severity: 'high',
          cwe: 'CWE-918',
          description: 'Next.js images config with wildcard domains allows external image loading',
          frameworks: ['nextjs']
        },
        {
          name: 'Next.js Middleware Injection',
          type: 'sql',
          pattern: /middleware\.ts[^}]*request\.nextUrl\.searchParams\.get\s*\([^)]*\$\{[^}]*\}/gi,
          context: ['nextjs', 'middleware'],
          severity: 'medium',
          cwe: 'CWE-94',
          description: 'Middleware using interpolated values in URL parameters',
          frameworks: ['nextjs']
        }
      ]
    },

    // Authentication & Authorization
    {
      framework: 'auth',
      fileExtensions: ['.js', '.ts', '.tsx', '.vue'],
      contextKeywords: ['auth', 'login', 'jwt', 'session', 'token'],
      patterns: [
        {
          name: 'JWT Secret Hardcoded',
          type: 'sql',
          pattern: /(?:JWT_SECRET|jwt.*secret|token.*secret)\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi,
          context: ['auth', 'jwt'],
          severity: 'critical',
          cwe: 'CWE-798',
          description: 'JWT secrets should never be hardcoded in source code',
          frameworks: ['all']
        },
        {
          name: 'Weak Password Requirements',
          type: 'sql',
          pattern: /(?:password|pwd)\.length\s*[<>]=?\s*[0-5]/gi,
          context: ['auth', 'validation'],
          severity: 'high',
          cwe: 'CWE-521',
          description: 'Password requirements are too weak (less than 6 characters)',
          frameworks: ['all']
        },
        {
          name: 'Missing Password Hashing',
          type: 'sql',
          pattern: /(?:password|pwd)\s*=\s*[^;]*;\s*(?!.*(?:bcrypt|argon|scrypt|pbkdf2))/gi,
          context: ['auth', 'register'],
          severity: 'critical',
          cwe: 'CWE-257',
          description: 'Passwords stored without proper hashing',
          frameworks: ['all'],
          falsePositiveCheck: (code, line) => {
            const nearbyCode = this.getNearbyCode(code, line, 5)
            return nearbyCode.includes('bcrypt') || nearbyCode.includes('hash') ||
                   nearbyCode.includes('argon2') || nearbyCode.includes('scrypt')
          }
        }
      ]
    }
  ]

  private injectionPatterns: InjectionPattern[] = [
    // SQL Injection Patterns
    {
      name: 'SQL String Interpolation',
      type: 'sql',
      pattern: /\$\{[^}]*\}.*\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i,
      context: ['query', 'execute', 'sql'],
      severity: 'critical',
      cwe: 'CWE-89',
      description: 'SQL query with string interpolation can lead to injection attacks',
      falsePositiveCheck: (code, line) => {
        // Check if it's properly sanitized or parameterized
        const beforeLine = code.substring(0, code.indexOf(line))
        return beforeLine.includes('prepare') || beforeLine.includes('bind') || beforeLine.includes('escape')
      }
    },
    {
      name: 'SQL Concatenation',
      type: 'sql',
      pattern: /(?:query|execute|sql).*\+.*(?:SELECT|INSERT|UPDATE|DELETE)/i,
      context: ['database', 'db', 'sql'],
      severity: 'critical',
      cwe: 'CWE-89',
      description: 'SQL query built with string concatenation is vulnerable to injection',
      falsePositiveCheck: (code, line) => {
        // Check for parameterized queries
        return line.includes('?') || line.includes('$1') || line.includes(':param')
      }
    },
    {
      name: 'Raw SQL Query',
      type: 'sql',
      pattern: /(?:\$queryRaw|queryRaw|rawQuery|executeRaw)\s*\(/i,
      context: ['prisma', 'database'],
      severity: 'high',
      cwe: 'CWE-89',
      description: 'Raw SQL queries bypass ORM protections and are injection-prone',
      falsePositiveCheck: (code, line) => {
        // Allow if it's a prepared statement or safe query
        return line.includes('PREPARE') || line.includes('EXECUTE')
      }
    },

    // NoSQL Injection Patterns
    {
      name: 'MongoDB Operator Injection',
      type: 'nosql',
      pattern: /(?:find|findOne|update|updateOne|delete|deleteOne|aggregate)\s*\(\s*\{[^}]*\$[^}]*\$\{[^}]*\}/i,
      context: ['mongo', 'mongoose', 'collection'],
      severity: 'critical',
      cwe: 'CWE-943',
      description: 'MongoDB query with interpolated operators can lead to injection',
      falsePositiveCheck: (code, line) => {
        // Check if operators are properly validated
        return line.includes('ObjectId(') || line.includes('sanitize') || line.includes('validate')
      }
    },
    {
      name: 'Mongoose Query Injection',
      type: 'nosql',
      pattern: /(?:find|findOne|update|updateOne|delete|deleteOne)\(\s*\{[^}]*\$\{[^}]*\}/i,
      context: ['mongoose', 'model', 'schema'],
      severity: 'critical',
      cwe: 'CWE-943',
      description: 'Mongoose query with user input can lead to NoSQL injection',
      falsePositiveCheck: (code, line) => {
        // Check for proper validation or sanitization
        const nearbyCode = this.getNearbyCode(code, line, 5)
        return nearbyCode.includes('joi') || nearbyCode.includes('yup') || nearbyCode.includes('zod') ||
               nearbyCode.includes('sanitize') || nearbyCode.includes('escape')
      }
    },
    {
      name: 'JavaScript Object Injection',
      type: 'nosql',
      pattern: /JSON\.parse\s*\([^)]*\$\{[^}]*\}/i,
      context: ['json', 'parse', 'object'],
      severity: 'high',
      cwe: 'CWE-502',
      description: 'Parsing user input as JSON can lead to object injection',
      falsePositiveCheck: (code, line) => {
        // Check if input is validated
        return line.includes('validate') || line.includes('sanitize')
      }
    },

    // Advanced SQL Patterns
    {
      name: 'SQL Template Literal',
      type: 'sql',
      pattern: /`\s*SELECT.*\$\{[^}]*\}.*`/i,
      context: ['sql', 'query', 'template'],
      severity: 'critical',
      cwe: 'CWE-89',
      description: 'SQL in template literals with interpolation is dangerous',
      falsePositiveCheck: (code, line) => {
        // Check for proper escaping or parameterization
        return line.includes('sql.escape') || line.includes('mysql.escape') || line.includes('pg.escape')
      }
    },
    {
      name: 'Dynamic Table Name',
      type: 'sql',
      pattern: /(?:FROM|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\$\{[^}]*\}/i,
      context: ['sql', 'table', 'database'],
      severity: 'critical',
      cwe: 'CWE-89',
      description: 'Dynamic table names from user input can lead to injection',
      falsePositiveCheck: (code, line) => {
        // Check if table names are whitelisted
        return line.includes('whitelist') || line.includes('allowedTables')
      }
    },

    // Advanced NoSQL Patterns
    {
      name: 'Expression Injection',
      type: 'nosql',
      pattern: /(?:\$where|\$expr|\$function)\s*:\s*\$\{[^}]*\}/i,
      context: ['mongo', 'where', 'expr'],
      severity: 'critical',
      cwe: 'CWE-943',
      description: 'MongoDB $where/$expr with user input allows code injection',
      falsePositiveCheck: (code, line) => {
        // These operators should never have user input
        return false
      }
    },
    {
      name: 'Regex Injection',
      type: 'nosql',
      pattern: /new\s+RegExp\s*\(\s*\$\{[^}]*\}/i,
      context: ['regex', 'pattern', 'search'],
      severity: 'high',
      cwe: 'CWE-400',
      description: 'User input in RegExp constructor can cause ReDoS or injection',
      falsePositiveCheck: (code, line) => {
        // Check for regex escaping
        return line.includes('escapeRegExp') || line.includes('escape-regex')
      }
    }
  ]

  async scanWithEnhancedInjectionDetection(
    files: Array<{ path: string; content: string }>
  ): Promise<{
    issues: SecurityIssue[]
    summary: any
    injectionDetails: {
      sqlInjectionCount: number
      nosqlInjectionCount: number
      falsePositivesAvoided: number
      frameworkVulnerabilities: Record<string, number>
    }
  }> {
    const baseResult = await this.baseScanner.scan(files)
    const enhancedIssues: SecurityIssue[] = [...baseResult.issues]

    let sqlInjectionCount = 0
    let nosqlInjectionCount = 0
    let falsePositivesAvoided = 0
    const frameworkVulnerabilities: Record<string, number> = {}

    for (const file of files) {
      if (!this.isSourceFile(file.path)) continue

      // Detect framework for this file
      const detectedFrameworks = this.detectFrameworks(file)

      // Scan for injection vulnerabilities
      const fileInjectionIssues = this.scanForInjectionVulnerabilities(file)
      enhancedIssues.push(...fileInjectionIssues.issues)

      // Scan for framework-specific vulnerabilities
      for (const framework of detectedFrameworks) {
        const frameworkIssues = this.scanForFrameworkVulnerabilities(file, framework)
        enhancedIssues.push(...frameworkIssues)

        frameworkVulnerabilities[framework] = (frameworkVulnerabilities[framework] || 0) + frameworkIssues.length
      }

      sqlInjectionCount += fileInjectionIssues.sqlCount
      nosqlInjectionCount += fileInjectionIssues.nosqlCount
      falsePositivesAvoided += fileInjectionIssues.falsePositivesAvoided
    }

    // Remove duplicates and update summary
    const uniqueIssues = this.deduplicateIssues(enhancedIssues)
    const updatedSummary = this.generateEnhancedSummary(uniqueIssues, sqlInjectionCount, nosqlInjectionCount, frameworkVulnerabilities)

    return {
      issues: uniqueIssues,
      summary: updatedSummary,
      injectionDetails: {
        sqlInjectionCount,
        nosqlInjectionCount,
        falsePositivesAvoided,
        frameworkVulnerabilities
      }
    }
  }

  private scanForInjectionVulnerabilities(file: { path: string; content: string }): {
    issues: SecurityIssue[]
    sqlCount: number
    nosqlCount: number
    falsePositivesAvoided: number
  } {
    const issues: SecurityIssue[] = []
    let sqlCount = 0
    let nosqlCount = 0
    let falsePositivesAvoided = 0

    const lines = file.content.split('\n')

    lines.forEach((line, index) => {
      const lineNumber = index + 1

      for (const pattern of this.injectionPatterns) {
        if (pattern.pattern.test(line)) {
          // Check context relevance
          if (!this.isContextRelevant(file.content, line, pattern.context)) {
            falsePositivesAvoided++
            continue
          }

          // Check for false positives
          if (pattern.falsePositiveCheck && pattern.falsePositiveCheck(file.content, line)) {
            falsePositivesAvoided++
            continue
          }

          // Count by type
          if (pattern.type === 'sql') sqlCount++
          if (pattern.type === 'nosql') nosqlCount++

          issues.push({
            id: `${pattern.name.replace(/\s+/g, '_')}-${file.path}-${lineNumber}`,
            type: pattern.type === 'sql' ? 'sql_injection' : 'command_injection',
            severity: pattern.severity,
            title: pattern.name,
            description: pattern.description,
            filePath: file.path,
            line: lineNumber,
            code: line.trim(),
            recommendation: this.generateRecommendation(pattern, file.content, line),
            cweId: pattern.cwe,
            owaspCategory: 'A03:2021 Injection'
          })
        }
      }
    })

    return { issues, sqlCount, nosqlCount, falsePositivesAvoided }
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
    return sourceExtensions.some(ext => filePath.endsWith(ext))
  }

  private isContextRelevant(code: string, line: string, contexts: string[]): boolean {
    // Check if any context keywords appear in the surrounding code
    const nearbyCode = this.getNearbyCode(code, line, 10)

    return contexts.some(context =>
      nearbyCode.toLowerCase().includes(context.toLowerCase())
    )
  }

  private getNearbyCode(fullCode: string, targetLine: string, linesBeforeAfter: number): string {
    const lines = fullCode.split('\n')
    const targetIndex = lines.findIndex(line => line.includes(targetLine))
    if (targetIndex === -1) return targetLine

    const start = Math.max(0, targetIndex - linesBeforeAfter)
    const end = Math.min(lines.length - 1, targetIndex + linesBeforeAfter)

    return lines.slice(start, end + 1).join('\n')
  }

  private detectFrameworks(file: { path: string; content: string }): string[] {
    const detectedFrameworks: string[] = []
    const content = file.content.toLowerCase()
    const filename = file.path.toLowerCase()

    // React detection
    if (content.includes('import react') || content.includes('from "react"') ||
        content.includes('usestate') || content.includes('useeffect') ||
        filename.includes('.jsx') || filename.includes('.tsx')) {
      detectedFrameworks.push('react')
      if (content.includes('next') || content.includes('getserversideprops') ||
          content.includes('getstaticprops') || filename.includes('pages/') ||
          filename.includes('app/')) {
        detectedFrameworks.push('nextjs')
      }
    }

    // Vue detection
    if (content.includes('import vue') || content.includes('from "vue"') ||
        content.includes('<template>') || content.includes('v-') ||
        filename.includes('.vue')) {
      detectedFrameworks.push('vue')
    }

    // Express detection
    if (content.includes('express') || content.includes('app.listen') ||
        content.includes('app.get') || content.includes('app.post') ||
        content.includes('router.') || content.includes('middleware')) {
      detectedFrameworks.push('express')
    }

    // General Node.js detection
    if (content.includes('require(') || content.includes('import ') ||
        content.includes('module.exports') || filename.includes('.js')) {
      detectedFrameworks.push('nodejs')
    }

    return detectedFrameworks.length > 0 ? detectedFrameworks : ['generic']
  }

  private scanForFrameworkVulnerabilities(
    file: { path: string; content: string },
    framework: string
  ): SecurityIssue[] {
    const issues: SecurityIssue[] = []
    const lines = file.content.split('\n')

    const frameworkRule = this.frameworkRules.find(r => r.framework === framework)
    if (!frameworkRule) return issues

    lines.forEach((line, index) => {
      const lineNumber = index + 1

      for (const pattern of frameworkRule.patterns) {
        if (pattern.pattern.test(line)) {
          // Check if the pattern is applicable to this file
          if (pattern.frameworks && !pattern.frameworks.includes('all') &&
              !pattern.frameworks.includes(framework)) {
            continue
          }

          // Check context relevance
          if (!this.isContextRelevant(file.content, line, pattern.context)) {
            continue
          }

          // Check for false positives
          if (pattern.falsePositiveCheck && pattern.falsePositiveCheck(file.content, line)) {
            continue
          }

          issues.push({
            id: `${pattern.name.replace(/\s+/g, '_')}-${file.path}-${lineNumber}`,
            type: pattern.type === 'sql' ? 'sql_injection' : 'command_injection',
            severity: pattern.severity,
            title: pattern.name,
            description: pattern.description,
            filePath: file.path,
            line: lineNumber,
            code: line.trim(),
            recommendation: this.generateFrameworkRecommendation(pattern, framework),
            cweId: pattern.cwe,
            owaspCategory: 'A03:2021 Injection'
          })
        }
      }
    })

    return issues
  }

  private generateFrameworkRecommendation(pattern: InjectionPattern, framework: string): string {
    switch (framework) {
      case 'react':
      case 'nextjs':
        if (pattern.name.includes('dangerouslySetInnerHTML')) {
          return 'Use DOMPurify.sanitize() or avoid dangerouslySetInnerHTML entirely. Consider using React components for dynamic content.'
        }
        if (pattern.name.includes('useEffect')) {
          return 'Add proper dependencies to useEffect or use useCallback/useMemo to stabilize references.'
        }
        if (pattern.name.includes('setState')) {
          return 'Validate and sanitize user input before setting component state.'
        }
        break

      case 'vue':
        if (pattern.name.includes('v-html')) {
          return 'Use v-text or computed properties instead of v-html, or sanitize content with DOMPurify.'
        }
        if (pattern.name.includes('computed')) {
          return 'Avoid complex logic in computed properties. Move to methods or use watchers instead.'
        }
        break

      case 'express':
        if (pattern.name.includes('path')) {
          return 'Use path.normalize() and validate paths against an allowlist of permitted directories.'
        }
        if (pattern.name.includes('CORS')) {
          return 'Specify allowed origins explicitly: cors({ origin: ["https://trusteddomain.com"] })'
        }
        if (pattern.name.includes('helmet')) {
          return 'Install and use helmet middleware: npm install helmet && app.use(helmet())'
        }
        if (pattern.name.includes('rate')) {
          return 'Install express-rate-limit: npm install express-rate-limit && app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))'
        }
        break

      case 'nextjs':
        if (pattern.name.includes('API')) {
          return 'Use Zod, Joi, or Yup for input validation. Never trust user input directly.'
        }
        if (pattern.name.includes('Image')) {
          return 'Specify allowed domains explicitly: images: { domains: ["trustedcdn.com"] }'
        }
        if (pattern.name.includes('middleware')) {
          return 'Validate and sanitize URL parameters in middleware before using them.'
        }
        break
    }

    // Fallback recommendations
    switch (pattern.name) {
      case 'JWT Secret Hardcoded':
        return 'Move secrets to environment variables: process.env.JWT_SECRET'

      case 'Weak Password Requirements':
        return 'Enforce strong passwords: minimum 8 characters, uppercase, lowercase, numbers, symbols'

      case 'Missing Password Hashing':
        return 'Use bcrypt: const hash = await bcrypt.hash(password, 12)'

      default:
        return 'Implement proper input validation, sanitization, and use parameterized queries'
    }
  }

  private generateSummary(issues: SecurityIssue[]): any {
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length,
    }

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
      score,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
    }
  }

  private generateRecommendation(pattern: InjectionPattern, code: string, line: string): string {
    switch (pattern.name) {
      case 'SQL String Interpolation':
        return 'Use parameterized queries: sql.query("SELECT * FROM users WHERE id = ?", [userId])'

      case 'SQL Concatenation':
        return 'Use prepared statements: connection.prepare("SELECT * FROM users WHERE id = ?").execute([userId])'

      case 'Raw SQL Query':
        return 'Use ORM methods instead of raw SQL, or ensure proper parameterization with placeholders'

      case 'MongoDB Operator Injection':
        return 'Validate and sanitize MongoDB operators. Use $in, $eq, etc. with whitelisted values only'

      case 'Mongoose Query Injection':
        return 'Use mongoose built-in validation, sanitize inputs, and avoid direct object construction from user data'

      case 'JavaScript Object Injection':
        return 'Use a schema validator (Joi, Yup, Zod) and avoid JSON.parse on untrusted input'

      case 'SQL Template Literal':
        return 'Use sql-template-strings or similar libraries for safe SQL templating'

      case 'Dynamic Table Name':
        return 'Whitelist allowed table names and validate against the whitelist'

      case 'Expression Injection':
        return 'Never use $where, $expr, or $function with user input. Use aggregation pipeline instead'

      case 'Regex Injection':
        return 'Escape user input with RegExp.escape() or use safe regex libraries'

      default:
        return 'Use parameterized queries, input validation, and proper sanitization'
    }
  }

  private deduplicateIssues(issues: SecurityIssue[]): SecurityIssue[] {
    const seen = new Set<string>()

    return issues.filter(issue => {
      const key = `${issue.type}-${issue.filePath}-${issue.line}-${issue.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private generateEnhancedSummary(
    issues: SecurityIssue[],
    sqlCount: number,
    nosqlCount: number,
    frameworkVulns?: Record<string, number>
  ): any {
    const baseSummary = this.generateSummary(issues)

    return {
      ...baseSummary,
      injectionAnalysis: {
        sqlInjections: sqlCount,
        nosqlInjections: nosqlCount,
        totalInjections: sqlCount + nosqlCount,
        injectionPercentage: issues.length > 0 ? ((sqlCount + nosqlCount) / issues.length * 100).toFixed(1) : '0'
      },
      frameworkAnalysis: frameworkVulns || {},
      riskAssessment: this.assessInjectionRisk(sqlCount, nosqlCount),
      recommendations: this.generateSecurityRecommendations(issues, frameworkVulns || {})
    }
  }

  private generateSecurityRecommendations(
    issues: SecurityIssue[],
    frameworkVulns: Record<string, number>
  ): string[] {
    const recommendations: string[] = []

    if (issues.some(i => i.type === 'sql_injection')) {
      recommendations.push('🔴 CRITICAL: SQL injection vulnerabilities detected - use parameterized queries immediately')
    }

    if (issues.some(i => i.title.includes('dangerouslySetInnerHTML'))) {
      recommendations.push('🟠 HIGH: React XSS vulnerabilities found - replace dangerouslySetInnerHTML with safe alternatives')
    }

    if (frameworkVulns.react && frameworkVulns.react > 0) {
      recommendations.push(`⚠️ MEDIUM: ${frameworkVulns.react} React-specific security issues - review component security`)
    }

    if (frameworkVulns.express && frameworkVulns.express > 0) {
      recommendations.push(`⚠️ MEDIUM: ${frameworkVulns.express} Express.js security issues - add helmet, rate limiting, and CORS policies`)
    }

    if (frameworkVulns.nextjs && frameworkVulns.nextjs > 0) {
      recommendations.push(`⚠️ MEDIUM: ${frameworkVulns.nextjs} Next.js security issues - validate API inputs and configure image domains`)
    }

    if (issues.some(i => i.title.includes('JWT') || i.title.includes('password'))) {
      recommendations.push('🔴 CRITICAL: Authentication vulnerabilities detected - implement proper password hashing and secure JWT handling')
    }

    recommendations.push('✅ INFO: Consider implementing automated security testing in CI/CD pipeline')
    recommendations.push('✅ INFO: Set up security headers and enable CSP (Content Security Policy)')

    return recommendations.slice(0, 8) // Limit to top 8 recommendations
  }

  private assessInjectionRisk(sqlCount: number, nosqlCount: number): string {
    const total = sqlCount + nosqlCount

    if (total === 0) return 'LOW - No injection vulnerabilities detected'
    if (total <= 2) return 'MEDIUM - Few injection risks, monitor closely'
    if (total <= 5) return 'HIGH - Multiple injection vulnerabilities require immediate attention'
    return 'CRITICAL - Severe injection vulnerabilities detected, immediate remediation required'
  }
}

// Enhanced validation functions for line accuracy
export function validateInjectionFinding(
  code: string,
  line: string,
  lineNumber: number,
  pattern: InjectionPattern
): boolean {
  // Get context around the line
  const lines = code.split('\n')
  const startLine = Math.max(0, lineNumber - 5)
  const endLine = Math.min(lines.length - 1, lineNumber + 5)
  const context = lines.slice(startLine, endLine + 1).join('\n')

  // Check if the pattern is actually vulnerable
  if (pattern.falsePositiveCheck) {
    return !pattern.falsePositiveCheck(context, line)
  }

  // Additional validation logic
  return true
}

// Export enhanced scanner
export async function performEnhancedSecurityScan(
  files: Array<{ path: string; content: string }>
) {
  const scanner = new EnhancedSecurityScanner()
  return scanner.scanWithEnhancedInjectionDetection(files)
}
