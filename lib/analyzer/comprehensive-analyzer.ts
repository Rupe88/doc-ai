/**
 * Comprehensive Code Analyzer
 * Analyzes EVERYTHING in a codebase - not just functions and classes
 */

import * as path from 'path'
import type { RepoFile } from '@/lib/github/repo-cloner'

export interface ComprehensiveAnalysis {
  // Code Structure
  functions: FunctionInfo[]
  classes: ClassInfo[]
  interfaces: InterfaceInfo[]
  types: TypeInfo[]
  
  // Architecture
  apiRoutes: APIRouteInfo[]
  services: ServiceInfo[]
  controllers: ControllerInfo[]
  middlewares: MiddlewareInfo[]
  utilities: UtilityInfo[]
  models: ModelInfo[]
  hooks: HookInfo[]
  components: ComponentInfo[]
  
  // Configuration
  envVars: EnvVarInfo[]
  configFiles: ConfigFileInfo[]
  
  // Dependencies
  dependencies: DependencyInfo[]
  devDependencies: DependencyInfo[]
  
  // Statistics
  stats: CodeStats
  
  // Security & Quality
  securityIssues: SecurityIssue[]
  vulnerabilities: Vulnerability[]
  securityScore: number
  qualityScore: number
  patterns: string[]
}

export interface SecurityIssue {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  filePath: string
  line?: number
  recommendation?: string
}

export interface Vulnerability {
  name: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  file: string
  line?: number
  cwe?: string
}

export interface FunctionInfo {
  name: string
  filePath: string
  lineStart: number
  lineEnd: number
  code: string
  description?: string
  parameters: ParameterInfo[]
  returnType?: string
  isAsync: boolean
  isExported: boolean
  complexity: number
  callsTo: string[]
  calledBy: string[]
}

export interface ClassInfo {
  name: string
  filePath: string
  lineStart: number
  lineEnd: number
  code: string
  description?: string
  methods: FunctionInfo[]
  properties: PropertyInfo[]
  extends?: string
  implements?: string[]
  isExported: boolean
}

export interface InterfaceInfo {
  name: string
  filePath: string
  lineStart: number
  code: string
  properties: PropertyInfo[]
  extends?: string[]
}

export interface TypeInfo {
  name: string
  filePath: string
  lineStart: number
  code: string
  definition: string
}

export interface APIRouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL'
  path: string
  filePath: string
  lineStart: number
  code: string
  description?: string
  parameters: ParameterInfo[]
  requestBody?: string
  responseType?: string
  middleware?: string[]
  isProtected: boolean
}

export interface ServiceInfo {
  name: string
  filePath: string
  description?: string
  methods: FunctionInfo[]
  dependencies: string[]
}

export interface ControllerInfo {
  name: string
  filePath: string
  description?: string
  routes: APIRouteInfo[]
  methods: FunctionInfo[]
}

export interface MiddlewareInfo {
  name: string
  filePath: string
  lineStart: number
  code: string
  description?: string
  appliesTo?: string
}

export interface UtilityInfo {
  name: string
  filePath: string
  functions: FunctionInfo[]
  description?: string
}

export interface ModelInfo {
  name: string
  filePath: string
  fields: PropertyInfo[]
  relations?: string[]
  tableName?: string
}

export interface HookInfo {
  name: string
  filePath: string
  lineStart: number
  code: string
  description?: string
  dependencies: string[]
}

export interface ComponentInfo {
  name: string
  filePath: string
  lineStart: number
  code: string
  props: PropertyInfo[]
  hooks: string[]
  isClientComponent: boolean
}

export interface EnvVarInfo {
  name: string
  usedIn: string[]
  description?: string
  isRequired: boolean
}

export interface ConfigFileInfo {
  name: string
  filePath: string
  type: 'json' | 'yaml' | 'js' | 'ts'
  purpose: string
}

export interface DependencyInfo {
  name: string
  version: string
  purpose?: string
}

export interface ParameterInfo {
  name: string
  type?: string
  isOptional: boolean
  defaultValue?: string
}

export interface PropertyInfo {
  name: string
  type?: string
  isOptional: boolean
  isPrivate: boolean
}

export interface CodeStats {
  totalFiles: number
  totalLines: number
  codeLines: number
  commentLines: number
  blankLines: number
  totalFunctions: number
  totalClasses: number
  totalComponents: number
  totalRoutes: number
  languages: Record<string, number>
  largestFiles: { path: string; lines: number }[]
  mostComplexFunctions: { name: string; complexity: number; path: string }[]
}

export class ComprehensiveAnalyzer {
  private files: RepoFile[]
  private repoPath: string

  constructor(files: RepoFile[], repoPath: string) {
    this.files = files
    this.repoPath = repoPath
  }

  async analyze(): Promise<ComprehensiveAnalysis> {
    console.log(`[ComprehensiveAnalyzer] Analyzing ${this.files.length} files...`)

    const functions = this.extractFunctions()
    const classes = this.extractClasses()
    const interfaces = this.extractInterfaces()
    const types = this.extractTypes()
    const apiRoutes = this.extractAPIRoutes()
    const services = this.extractServices()
    const controllers = this.extractControllers()
    const middlewares = this.extractMiddlewares()
    const utilities = this.extractUtilities()
    const models = this.extractModels()
    const hooks = this.extractHooks()
    const components = this.extractComponents()
    const envVars = this.extractEnvVars()
    const configFiles = this.extractConfigFiles()
    const { dependencies, devDependencies } = this.extractDependencies()
    const stats = this.calculateStats(functions, classes, components, apiRoutes)
    
    // Security & Quality Analysis
    const { securityIssues, vulnerabilities, securityScore } = this.analyzeSecurityIssues()
    const dependencyVulnerabilities = this.analyzeDependencyVulnerabilities(dependencies, devDependencies)
    const allVulnerabilities = [...vulnerabilities, ...dependencyVulnerabilities]
    const { qualityScore, patterns } = this.analyzeCodeQuality(functions, classes)

    console.log(`[ComprehensiveAnalyzer] Found:
      - ${functions.length} functions
      - ${classes.length} classes
      - ${interfaces.length} interfaces
      - ${types.length} types
      - ${apiRoutes.length} API routes
      - ${services.length} services
      - ${controllers.length} controllers
      - ${middlewares.length} middlewares
      - ${utilities.length} utilities
      - ${models.length} models
      - ${hooks.length} hooks
      - ${components.length} components
      - ${securityIssues.length} security issues
      - ${allVulnerabilities.length} total vulnerabilities
      - Security Score: ${securityScore}/100
      - Quality Score: ${qualityScore}/100
    `)

    return {
      functions,
      classes,
      interfaces,
      types,
      apiRoutes,
      services,
      controllers,
      middlewares,
      utilities,
      models,
      hooks,
      components,
      envVars,
      configFiles,
      dependencies,
      devDependencies,
      stats,
      securityIssues,
      vulnerabilities: allVulnerabilities,
      securityScore,
      qualityScore,
      patterns,
    }
  }

  private analyzeDependencyVulnerabilities(dependencies: DependencyInfo[], devDependencies: DependencyInfo[]): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = []

    // Known vulnerable packages (simplified database)
    const vulnerabilityDB: Record<string, { severity: string; description: string; cwe: string }[]> = {
      'lodash': [
        { severity: 'MEDIUM', description: 'Prototype pollution vulnerability in older versions', cwe: 'CWE-1321' }
      ],
      'axios': [
        { severity: 'HIGH', description: 'Potential SSRF in redirect handling', cwe: 'CWE-918' }
      ],
      'minimatch': [
        { severity: 'HIGH', description: 'Regular expression denial of service', cwe: 'CWE-400' }
      ],
      'node-forge': [
        { severity: 'CRITICAL', description: 'RSA signature forgery vulnerability', cwe: 'CWE-347' }
      ],
      'ua-parser-js': [
        { severity: 'HIGH', description: 'Regular expression denial of service', cwe: 'CWE-400' }
      ],
      'jsonwebtoken': [
        { severity: 'HIGH', description: 'JWT algorithm confusion', cwe: 'CWE-347' }
      ],
      'express-fileupload': [
        { severity: 'HIGH', description: 'Directory traversal vulnerability', cwe: 'CWE-22' }
      ],
    }

    const allDeps = [...dependencies, ...devDependencies]

    for (const dep of allDeps) {
      const vulnList = vulnerabilityDB[dep.name]
      if (vulnList) {
        for (const vuln of vulnList) {
          // Basic version checking (simplified - in real implementation would use proper semver)
          if (this.isVersionVulnerable(dep.version, vuln)) {
            vulnerabilities.push({
              name: `${dep.name} Security Vulnerability`,
              severity: vuln.severity as Vulnerability['severity'],
              description: `${dep.name}@${dep.version}: ${vuln.description}`,
              file: 'package.json',
              cwe: vuln.cwe,
            })
          }
        }
      }
    }

    return vulnerabilities
  }

  private isVersionVulnerable(version: string, vuln: any): boolean {
    // Simplified version checking - in production, use proper semver comparison
    // For now, assume any version could be vulnerable
    return true
  }

  private analyzeSecurityIssues(): { securityIssues: SecurityIssue[]; vulnerabilities: Vulnerability[]; securityScore: number } {
    const securityIssues: SecurityIssue[] = []
    const vulnerabilities: Vulnerability[] = []

    for (const file of this.files) {
      if (!this.isSourceFile(file)) continue
      const lines = file.content.split('\n')

      lines.forEach((line, index) => {
        const lineNum = index + 1

        // Check for hardcoded secrets - Enhanced patterns
        if (/(?:password|secret|api[_-]?key|token|auth[_-]?key|access[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(line) ||
            /(?:JWT_SECRET|DATABASE_URL|AWS_ACCESS_KEY|STRIPE_SECRET)\s*[:=]/i.test(line)) {
          securityIssues.push({
            type: 'HARDCODED_SECRET',
            severity: 'CRITICAL',
            message: 'Hardcoded sensitive credential detected',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Move to environment variables or secure vault',
          })
        }

        // Check for SQL injection - More comprehensive
        if (/\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|CREATE|ALTER)/i.test(line) ||
            /['"].*\+.*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(line) ||
            /(?:query|execute)\s*\(\s*`.*\$\{.*\}.*`/i.test(line)) {
          vulnerabilities.push({
            name: 'SQL Injection',
            severity: 'HIGH',
            description: 'Potential SQL injection vulnerability through string concatenation or template literals',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-89',
          })
        }

        // Check for XSS - Enhanced patterns
        if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(line) ||
            /document\.write\s*\(/i.test(line) ||
            /window\.location\.href\s*\+/i.test(line)) {
          vulnerabilities.push({
            name: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            description: 'Potential XSS vulnerability via DOM manipulation',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-79',
          })
        }

        // Check for eval usage and other code injection
        if (/\beval\s*\(/.test(line) ||
            /\bFunction\s*\(\s*['"`]/.test(line) ||
            /new\s+Function\s*\(/.test(line)) {
          securityIssues.push({
            type: 'CODE_INJECTION',
            severity: 'HIGH',
            message: 'Dynamic code execution detected - high security risk',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Avoid eval(), Function constructor - use safer alternatives',
          })
        }

        // Check for insecure random generation
        if (/Math\.random\(\)/i.test(line) && /token|secret|key/i.test(line)) {
          securityIssues.push({
            type: 'WEAK_CRYPTO',
            severity: 'MEDIUM',
            message: 'Using Math.random() for cryptographic purposes',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Use crypto.randomBytes() or secure random generators',
          })
        }

        // Check for path traversal
        if (/(?:\.\.[\/\\]|\/.*\.\.[\/\\])/i.test(line) &&
            /(?:path|file|read|require)/i.test(line)) {
          vulnerabilities.push({
            name: 'Path Traversal',
            severity: 'HIGH',
            description: 'Potential directory traversal vulnerability',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-22',
          })
        }

        // Check for command injection
        if (/(?:exec|spawn|execSync|execFile)\s*\(\s*.*\+/i.test(line) ||
            /child_process/i.test(line) && /\$\{.*\}/i.test(line)) {
          vulnerabilities.push({
            name: 'Command Injection',
            severity: 'CRITICAL',
            description: 'Potential command injection vulnerability',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-78',
          })
        }

        // Check for unvalidated redirects - Enhanced
        if (/window\.location\s*=|res\.redirect\s*\(.*req\.|res\.sendRedirect/i.test(line)) {
          vulnerabilities.push({
            name: 'Open Redirect',
            severity: 'MEDIUM',
            description: 'Potential unvalidated redirect vulnerability',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-601',
          })
        }

        // Check for missing input validation
        if (/req\.(?:body|query|params)\./i.test(line) &&
            !line.includes('validate') && !line.includes('sanitize') &&
            !file.content.includes('zod') && !file.content.includes('joi') &&
            !file.content.includes('yup')) {
          securityIssues.push({
            type: 'MISSING_VALIDATION',
            severity: 'MEDIUM',
            message: 'User input used without validation',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Add input validation and sanitization',
          })
        }

        // Check for insecure cookie settings
        if (/setCookie|cookie\s*=/i.test(line) && !/secure|httpOnly|sameSite/i.test(line)) {
          securityIssues.push({
            type: 'INSECURE_COOKIE',
            severity: 'MEDIUM',
            message: 'Cookie set without security flags',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Set secure, httpOnly, and sameSite flags',
          })
        }

        // Check for missing HTTPS enforcement
        if (/app\.listen|createServer/i.test(line) && !file.content.includes('https') &&
            !file.content.includes('force-ssl') && !file.content.includes('trust proxy')) {
          securityIssues.push({
            type: 'NO_HTTPS',
            severity: 'HIGH',
            message: 'Server may not be enforcing HTTPS',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Enforce HTTPS and use secure headers',
          })
        }

        // Check for console.log in production code - More specific
        if (/console\.(log|debug|info|warn|error)\s*\(/.test(line) &&
            !file.path.includes('test') && !file.path.includes('spec') &&
            !file.path.includes('.config.')) {
          securityIssues.push({
            type: 'DEBUG_CODE',
            severity: 'LOW',
            message: 'Console logging in production code',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Remove console logs or use structured logging',
          })
        }

        // Check for missing authentication on sensitive routes
        if (/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|DELETE|PATCH)/i.test(line) &&
            /(?:admin|user|account|settings|delete)/i.test(line) &&
            !file.content.includes('requireAuth') && !file.content.includes('getSession') &&
            !file.content.includes('authenticate') && !file.content.includes('verifyToken')) {
          securityIssues.push({
            type: 'MISSING_AUTH',
            severity: 'HIGH',
            message: 'Sensitive API route may be missing authentication',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Add authentication middleware to protect sensitive endpoints',
          })
        }
      })
    }

    // Remove duplicate issues
    const uniqueIssues = securityIssues.filter((issue, index, self) =>
      index === self.findIndex(i => i.type === issue.type && i.filePath === issue.filePath)
    )

    const uniqueVulnerabilities = vulnerabilities.filter((vuln, index, self) =>
      index === self.findIndex(v => v.name === vuln.name && v.file === vuln.file && v.line === vuln.line)
    )

    // Calculate security score with improved weighting
    const criticalCount = uniqueIssues.filter(i => i.severity === 'CRITICAL').length +
                          uniqueVulnerabilities.filter(v => v.severity === 'CRITICAL').length
    const highCount = uniqueIssues.filter(i => i.severity === 'HIGH').length +
                      uniqueVulnerabilities.filter(v => v.severity === 'HIGH').length
    const mediumCount = uniqueIssues.filter(i => i.severity === 'MEDIUM').length +
                        uniqueVulnerabilities.filter(v => v.severity === 'MEDIUM').length
    const lowCount = uniqueIssues.filter(i => i.severity === 'LOW').length +
                     uniqueVulnerabilities.filter(v => v.severity === 'LOW').length

    const securityScore = Math.max(0, 100 -
      (criticalCount * 25) -
      (highCount * 15) -
      (mediumCount * 8) -
      (lowCount * 2)
    )

    return { securityIssues: uniqueIssues, vulnerabilities: uniqueVulnerabilities, securityScore }
  }

  private analyzeCodeQuality(functions: FunctionInfo[], classes: ClassInfo[]): { qualityScore: number; patterns: string[] } {
    const patterns: string[] = []

    // Detect technology patterns
    const techPatterns = this.detectTechnologyPatterns()
    patterns.push(...techPatterns)

    // Detect architecture patterns
    const archPatterns = this.detectArchitecturePatterns()
    patterns.push(...archPatterns)

    // Calculate comprehensive quality metrics
    const complexityMetrics = this.calculateComplexityMetrics(functions)
    const maintainabilityMetrics = this.calculateMaintainabilityMetrics(functions, classes)
    const testabilityMetrics = this.calculateTestabilityMetrics(functions)
    const technicalDebtMetrics = this.calculateTechnicalDebtMetrics(functions, classes)

    // Calculate overall quality score
    const qualityScore = this.calculateOverallQualityScore(
      complexityMetrics,
      maintainabilityMetrics,
      testabilityMetrics,
      technicalDebtMetrics,
      techPatterns
    )

    return { qualityScore, patterns }
  }

  private detectTechnologyPatterns(): string[] {
    const patterns: string[] = []

    const techChecks = [
      { name: 'React', check: () => this.files.some(f => f.content.includes('import React') || f.content.includes("from 'react'")) },
      { name: 'Next.js', check: () => this.files.some(f => f.content.includes("from 'next'") || f.path.includes('app/') || f.path.includes('pages/')) },
      { name: 'Prisma ORM', check: () => this.files.some(f => f.content.includes('@prisma/client') || f.content.includes('prisma/schema.prisma')) },
      { name: 'Express.js', check: () => this.files.some(f => f.content.includes("from 'express'") || f.content.includes("require('express')")) },
      { name: 'TypeScript', check: () => this.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')) },
      { name: 'Tailwind CSS', check: () => this.files.some(f => f.content.includes('tailwind') || f.path.includes('tailwind.config')) },
      { name: 'Zod Validation', check: () => this.files.some(f => f.content.includes("from 'zod'")) },
      { name: 'Redux', check: () => this.files.some(f => f.content.includes('@reduxjs/toolkit') || f.content.includes('createSlice')) },
      { name: 'GraphQL', check: () => this.files.some(f => f.content.includes('graphql') || f.content.includes('gql`')) },
      { name: 'Jest', check: () => this.files.some(f => f.content.includes("from 'jest'") || f.path.includes('jest.config')) },
      { name: 'ESLint', check: () => this.files.some(f => f.path.includes('eslint') || f.path.includes('.eslintrc')) },
      { name: 'Prettier', check: () => this.files.some(f => f.path.includes('prettier') || f.path.includes('.prettierrc')) },
      { name: 'Docker', check: () => this.files.some(f => f.path.includes('Dockerfile') || f.path.includes('docker-compose')) },
    ]

    for (const tech of techChecks) {
      if (tech.check()) {
        patterns.push(tech.name)
      }
    }

    return patterns
  }

  private detectArchitecturePatterns(): string[] {
    const patterns: string[] = []

    const archChecks = [
      { name: 'Service Layer', check: () => this.files.some(f => f.path.toLowerCase().includes('/services/') || f.path.toLowerCase().includes('/service.')) },
      { name: 'MVC Pattern', check: () => this.files.some(f => f.path.toLowerCase().includes('/controllers/') || f.path.toLowerCase().includes('/models/')) },
      { name: 'Middleware Pattern', check: () => this.files.some(f => f.path.toLowerCase().includes('/middleware/')) },
      { name: 'Utility Modules', check: () => this.files.some(f => f.path.toLowerCase().includes('/utils/') || f.path.toLowerCase().includes('/lib/') || f.path.toLowerCase().includes('/helpers/')) },
      { name: 'Test Coverage', check: () => this.files.some(f => f.path.toLowerCase().includes('.test.') || f.path.toLowerCase().includes('.spec.') || f.path.toLowerCase().includes('/__tests__/')) },
      { name: 'Component Architecture', check: () => this.files.some(f => f.path.toLowerCase().includes('/components/')) },
      { name: 'Custom Hooks', check: () => this.files.some(f => f.content.includes('use') && f.path.toLowerCase().includes('/hooks/')) },
      { name: 'API Routes', check: () => this.files.some(f => f.path.includes('/api/') || f.path.includes('/routes/')) },
    ]

    for (const arch of archChecks) {
      if (arch.check()) {
        patterns.push(arch.name)
      }
    }

    return patterns
  }

  private calculateComplexityMetrics(functions: FunctionInfo[]) {
    const complexities = functions.map(f => f.complexity)
    const avgComplexity = complexities.length > 0 ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 0

    const distribution = {
      low: complexities.filter(c => c <= 5).length,
      medium: complexities.filter(c => c > 5 && c <= 10).length,
      high: complexities.filter(c => c > 10 && c <= 20).length,
      veryHigh: complexities.filter(c => c > 20).length,
    }

    const hotspots = functions
      .filter(f => f.complexity > 15)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)
      .map(f => ({ name: f.name, value: f.complexity, file: f.filePath }))

    return { average: avgComplexity, distribution, hotspots }
  }

  private calculateMaintainabilityMetrics(functions: FunctionInfo[], classes: ClassInfo[]) {
    let score = 100

    // Factor 1: Function length (lines of code)
    const avgFunctionLength = functions.length > 0
      ? functions.reduce((sum, f) => sum + (f.lineEnd - f.lineStart), 0) / functions.length
      : 0

    if (avgFunctionLength > 50) score -= 15
    else if (avgFunctionLength > 30) score -= 8
    else if (avgFunctionLength > 20) score -= 4

    // Factor 2: Cyclomatic complexity
    const highComplexity = functions.filter(f => f.complexity > 10).length
    score -= (highComplexity / functions.length) * 20

    // Factor 3: Class size
    const avgClassSize = classes.length > 0
      ? classes.reduce((sum, c) => sum + (c.lineEnd - c.lineStart), 0) / classes.length
      : 0

    if (avgClassSize > 300) score -= 10
    else if (avgClassSize > 200) score -= 5

    // Factor 4: Parameter count
    const avgParams = functions.length > 0
      ? functions.reduce((sum, f) => sum + f.parameters.length, 0) / functions.length
      : 0

    if (avgParams > 5) score -= 8
    else if (avgParams > 3) score -= 4

    return Math.max(0, Math.min(100, score))
  }

  private calculateTestabilityMetrics(functions: FunctionInfo[]) {
    let score = 50 // Base score

    // Check for test files
    const testFiles = this.files.filter(f =>
      f.path.includes('.test.') ||
      f.path.includes('.spec.') ||
      f.path.includes('/__tests__/')
    ).length

    if (testFiles > 0) score += 20

    // Check for testable patterns
    const hasDependencyInjection = this.files.some(f => f.content.includes('inject') || f.content.includes('DI'))
    const hasInterfaceSegregation = this.files.some(f => f.content.includes('interface'))
    const hasMocking = this.files.some(f => f.content.includes('jest.mock') || f.content.includes('vi.mock'))

    if (hasDependencyInjection) score += 10
    if (hasInterfaceSegregation) score += 10
    if (hasMocking) score += 10

    // Check for pure functions (simple heuristic)
    const pureFunctions = functions.filter(f =>
      !f.code.includes('this.') &&
      !f.code.includes('window.') &&
      !f.code.includes('document.') &&
      !f.code.includes('console.')
    ).length

    score += (pureFunctions / functions.length) * 20

    return Math.max(0, Math.min(100, score))
  }

  private calculateTechnicalDebtMetrics(functions: FunctionInfo[], classes: ClassInfo[]) {
    const debtItems = []

    // High complexity functions
    const highComplexity = functions.filter(f => f.complexity > 15)
    if (highComplexity.length > 0) {
      debtItems.push({
        type: 'High Complexity Functions',
        hours: Math.round(highComplexity.length * 2),
        priority: 'High',
      })
    }

    // Long functions
    const longFunctions = functions.filter(f => (f.lineEnd - f.lineStart) > 50)
    if (longFunctions.length > 0) {
      debtItems.push({
        type: 'Long Functions',
        hours: Math.round(longFunctions.length * 1.5),
        priority: 'Medium',
      })
    }

    // Large classes
    const largeClasses = classes.filter(c => (c.lineEnd - c.lineStart) > 200)
    if (largeClasses.length > 0) {
      debtItems.push({
        type: 'Large Classes',
        hours: Math.round(largeClasses.length * 3),
        priority: 'High',
      })
    }

    // Missing documentation
    const undocumented = functions.filter(f => !f.description).length
    if (undocumented > 0) {
      debtItems.push({
        type: 'Undocumented Code',
        hours: Math.round(undocumented * 0.5),
        priority: 'Low',
      })
    }

    // Deep nesting
    const deeplyNestedFiles = this.files.filter(f => {
      const maxIndent = f.content.split('\n').reduce((max, line) => {
        const indent = line.search(/\S/)
        return indent > max ? indent : max
      }, 0)
      return maxIndent > 24
    }).length

    if (deeplyNestedFiles > 0) {
      debtItems.push({
        type: 'Deeply Nested Code',
        hours: Math.round(deeplyNestedFiles * 1),
        priority: 'Medium',
      })
    }

    const totalHours = debtItems.reduce((sum, item) => sum + item.hours, 0)
    const category = totalHours > 80 ? 'High' : totalHours > 40 ? 'Medium' : 'Low'

    return { hours: totalHours, category, breakdown: debtItems }
  }

  private calculateOverallQualityScore(
    complexity: any,
    maintainability: number,
    testability: number,
    technicalDebt: any,
    patterns: string[]
  ): number {
    let score = 100

    // Complexity penalties
    if (complexity.average > 20) score -= 20
    else if (complexity.average > 10) score -= 10
    else if (complexity.average > 5) score -= 5

    // Maintainability factor
    score = (score * maintainability) / 100

    // Testability factor
    score = (score * (50 + testability / 2)) / 100

    // Technical debt penalty
    const debtPenalty = technicalDebt.hours / 10
    score -= Math.min(30, debtPenalty)

    // Pattern bonuses
    const bonusPatterns = ['TypeScript', 'Test Coverage', 'ESLint', 'Prettier', 'Zod Validation']
    const bonusCount = patterns.filter(p => bonusPatterns.includes(p)).length
    score += bonusCount * 3

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  private extractFunctions(): FunctionInfo[] {
    const functions: FunctionInfo[] = []
    
    for (const file of this.files) {
      if (!this.isSourceFile(file)) continue
      
      const lines = file.content.split('\n')
      
      // Match function declarations
      const patterns = [
        // Named function
        /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/gm,
        // Arrow function
        /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/gm,
        // Method (will be handled in classes)
      ]
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(file.content)) !== null) {
          const name = match[1]
          const beforeMatch = file.content.substring(0, match.index)
          const lineStart = beforeMatch.split('\n').length
          
          // Get function body
          const code = this.extractBlock(file.content, match.index)
          const lineEnd = lineStart + code.split('\n').length - 1
          
          // Check if exported
          const isExported = match[0].includes('export')
          const isAsync = match[0].includes('async')
          
          // Extract parameters
          const paramsString = match[3] || match[2] || ''
          const parameters = this.parseParameters(paramsString)
          
          // Calculate complexity
          const complexity = this.calculateComplexity(code)
          
          functions.push({
            name,
            filePath: file.path,
            lineStart,
            lineEnd,
            code: code.substring(0, 2000), // Limit code size
            parameters,
            returnType: match[4]?.trim(),
            isAsync,
            isExported,
            complexity,
            callsTo: this.findFunctionCalls(code),
            calledBy: [], // Will be filled later
          })
        }
      }
    }
    
    return functions
  }

  private extractClasses(): ClassInfo[] {
    const classes: ClassInfo[] = []
    
    for (const file of this.files) {
      if (!this.isSourceFile(file)) continue
      
      const pattern = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/gm
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1]
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        
        const code = this.extractBlock(file.content, match.index)
        const lineEnd = lineStart + code.split('\n').length - 1
        
        // Extract methods
        const methods = this.extractMethodsFromClass(code, file.path, lineStart)
        
        // Extract properties
        const properties = this.extractPropertiesFromClass(code)
        
        classes.push({
          name,
          filePath: file.path,
          lineStart,
          lineEnd,
          code: code.substring(0, 3000),
          methods,
          properties,
          extends: match[2],
          implements: match[3]?.split(',').map(s => s.trim()),
          isExported: match[0].includes('export'),
        })
      }
    }
    
    return classes
  }

  private extractInterfaces(): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = []
    
    for (const file of this.files) {
      if (file.language !== 'ts' && file.language !== 'tsx') continue
      
      const pattern = /^(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*\{/gm
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1]
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        
        const code = this.extractBlock(file.content, match.index)
        const properties = this.extractPropertiesFromInterface(code)
        
        interfaces.push({
          name,
          filePath: file.path,
          lineStart,
          code: code.substring(0, 1000),
          properties,
          extends: match[2]?.split(',').map(s => s.trim()),
        })
      }
    }
    
    return interfaces
  }

  private extractTypes(): TypeInfo[] {
    const types: TypeInfo[] = []
    
    for (const file of this.files) {
      if (file.language !== 'ts' && file.language !== 'tsx') continue
      
      const pattern = /^(?:export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=\s*([^;]+);?/gm
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1]
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        
        types.push({
          name,
          filePath: file.path,
          lineStart,
          code: match[0],
          definition: match[2].trim(),
        })
      }
    }
    
    return types
  }

  private extractAPIRoutes(): APIRouteInfo[] {
    const routes: APIRouteInfo[] = []

    for (const file of this.files) {
      // Next.js App Router
      if (file.path.includes('/api/') && file.path.includes('route.')) {
        const apiPath = this.extractNextAPIPath(file.path)

        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
          const pattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g')
          const match = pattern.exec(file.content)

          if (match) {
            const beforeMatch = file.content.substring(0, match.index)
            const lineStart = beforeMatch.split('\n').length
            const code = this.extractBlock(file.content, match.index)

            // Extract more detailed information
            const description = this.extractJSDocComment(file.content, match.index)
            const parameters = this.extractRouteParams(apiPath)
            const middleware = this.extractMiddlewareFromRoute(code)

            routes.push({
              method,
              path: apiPath,
              filePath: file.path,
              lineStart,
              code: code.substring(0, 2000),
              description,
              isProtected: this.isRouteProtected(file.content, code),
              parameters,
              middleware,
              requestBody: this.extractRequestBody(code),
              responseType: this.extractResponseType(code),
            })
          }
        }
      }

      // Express style routes - Enhanced
      const expressPatterns = [
        /(?:app|router|express)\.(get|post|put|patch|delete|use|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /(?:router|app)\.(route\(['"`][^'"`]*['"`]\)\.)?(get|post|put|patch|delete|use|all)\s*\(/gi,
      ]

      for (const expressPattern of expressPatterns) {
        let match
        while ((match = expressPattern.exec(file.content)) !== null) {
          const method = match[1] || match[2] || match[3]
          const path = match[2] || this.extractExpressPath(file.content, match.index)

          if (method && path) {
            const beforeMatch = file.content.substring(0, match.index)
            const lineStart = beforeMatch.split('\n').length
            const code = this.extractBlock(file.content, match.index)

            routes.push({
              method: method.toUpperCase() as APIRouteInfo['method'],
              path,
              filePath: file.path,
              lineStart,
              code: code.substring(0, 2000),
              description: this.extractJSDocComment(file.content, match.index),
              isProtected: this.isRouteProtected(file.content, code),
              parameters: this.extractRouteParams(path),
              middleware: this.extractMiddlewareFromRoute(code),
              requestBody: this.extractRequestBody(code),
              responseType: this.extractResponseType(code),
            })
          }
        }
      }

      // Fastify routes
      const fastifyPattern = /fastify\.(get|post|put|patch|delete|route)\s*\(\s*['"`]([^'"`]+)['"`]/gi
      let fastifyMatch
      while ((fastifyMatch = fastifyPattern.exec(file.content)) !== null) {
        const beforeMatch = file.content.substring(0, fastifyMatch.index)
        const lineStart = beforeMatch.split('\n').length
        const code = this.extractBlock(file.content, fastifyMatch.index)

        routes.push({
          method: fastifyMatch[1].toUpperCase() as APIRouteInfo['method'],
          path: fastifyMatch[2],
          filePath: file.path,
          lineStart,
          code: code.substring(0, 2000),
          description: this.extractJSDocComment(file.content, fastifyMatch.index),
          isProtected: this.isRouteProtected(file.content, code),
          parameters: this.extractRouteParams(fastifyMatch[2]),
          middleware: this.extractMiddlewareFromRoute(code),
        })
      }

      // Hapi.js routes
      const hapiPattern = /server\.route\s*\(\s*\{[\s\S]*?method:\s*['"`]([^'"`]+)['"`][\s\S]*?path:\s*['"`]([^'"`]+)['"`]/gi
      let hapiMatch
      while ((hapiMatch = hapiPattern.exec(file.content)) !== null) {
        const beforeMatch = file.content.substring(0, hapiMatch.index)
        const lineStart = beforeMatch.split('\n').length

        routes.push({
          method: hapiMatch[1].toUpperCase() as APIRouteInfo['method'],
          path: hapiMatch[2],
          filePath: file.path,
          lineStart,
          code: hapiMatch[0].substring(0, 2000),
          isProtected: this.isRouteProtected(file.content, hapiMatch[0]),
          parameters: this.extractRouteParams(hapiMatch[2]),
        })
      }

      // GraphQL resolvers
      if (file.content.includes('graphql') || file.content.includes('apollo')) {
        const resolverPattern = /(?:Query|Mutation):\s*\{[\s\S]*?(\w+):\s*(?:async\s+)?\([^)]*\)\s*=>/gi
        let resolverMatch
        while ((resolverMatch = resolverPattern.exec(file.content)) !== null) {
          const beforeMatch = file.content.substring(0, resolverMatch.index)
          const lineStart = beforeMatch.split('\n').length

          routes.push({
            method: 'ALL',
            path: `/graphql/${resolverMatch[1]}`,
            filePath: file.path,
            lineStart,
            code: resolverMatch[0].substring(0, 2000),
            description: `GraphQL ${resolverMatch[1]} resolver`,
            isProtected: false,
            parameters: [],
          })
        }
      }
    }

    // Remove duplicates
    const uniqueRoutes = routes.filter((route, index, self) =>
      index === self.findIndex(r => r.method === route.method && r.path === route.path && r.filePath === route.filePath)
    )

    return uniqueRoutes
  }

  private extractServices(): ServiceInfo[] {
    const services: ServiceInfo[] = []
    
    for (const file of this.files) {
      if (!file.path.toLowerCase().includes('service')) continue
      if (!this.isSourceFile(file)) continue
      
      const className = this.extractClassName(file.content)
      const methods = this.extractFunctionsFromFile(file)
      
      services.push({
        name: className || path.basename(file.path, path.extname(file.path)),
        filePath: file.path,
        methods,
        dependencies: this.extractImports(file.content),
      })
    }
    
    return services
  }

  private extractControllers(): ControllerInfo[] {
    const controllers: ControllerInfo[] = []
    
    for (const file of this.files) {
      if (!file.path.toLowerCase().includes('controller')) continue
      if (!this.isSourceFile(file)) continue
      
      const className = this.extractClassName(file.content)
      const methods = this.extractFunctionsFromFile(file)
      const routes = this.extractAPIRoutes().filter(r => r.filePath === file.path)
      
      controllers.push({
        name: className || path.basename(file.path, path.extname(file.path)),
        filePath: file.path,
        methods,
        routes,
      })
    }
    
    return controllers
  }

  private extractMiddlewares(): MiddlewareInfo[] {
    const middlewares: MiddlewareInfo[] = []
    
    for (const file of this.files) {
      if (!file.path.toLowerCase().includes('middleware')) continue
      if (!this.isSourceFile(file)) continue
      
      const lines = file.content.split('\n')
      
      // Look for middleware patterns
      const patterns = [
        /export\s+(?:async\s+)?function\s+(\w+)/g,
        /export\s+const\s+(\w+)\s*=/g,
      ]
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(file.content)) !== null) {
          const name = match[1]
          const beforeMatch = file.content.substring(0, match.index)
          const lineStart = beforeMatch.split('\n').length
          const code = this.extractBlock(file.content, match.index)
          
          middlewares.push({
            name,
            filePath: file.path,
            lineStart,
            code: code.substring(0, 1000),
          })
        }
      }
    }
    
    return middlewares
  }

  private extractUtilities(): UtilityInfo[] {
    const utilities: UtilityInfo[] = []
    
    for (const file of this.files) {
      const isUtil = file.path.toLowerCase().includes('util') ||
                    file.path.toLowerCase().includes('helper') ||
                    file.path.toLowerCase().includes('lib/')
      
      if (!isUtil || !this.isSourceFile(file)) continue
      
      const functions = this.extractFunctionsFromFile(file)
      
      if (functions.length > 0) {
        utilities.push({
          name: path.basename(file.path, path.extname(file.path)),
          filePath: file.path,
          functions,
        })
      }
    }
    
    return utilities
  }

  private extractModels(): ModelInfo[] {
    const models: ModelInfo[] = []
    
    for (const file of this.files) {
      // Prisma schema
      if (file.path.includes('prisma/schema.prisma')) {
        const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g
        let match
        
        while ((match = modelPattern.exec(file.content)) !== null) {
          const name = match[1]
          const body = match[2]
          const fields = this.extractPrismaFields(body)
          
          models.push({
            name,
            filePath: file.path,
            fields,
            tableName: name.toLowerCase(),
          })
        }
      }
      
      // TypeORM/Sequelize entities
      if (file.path.toLowerCase().includes('model') || file.path.toLowerCase().includes('entity')) {
        const className = this.extractClassName(file.content)
        if (className) {
          models.push({
            name: className,
            filePath: file.path,
            fields: [],
          })
        }
      }
    }
    
    return models
  }

  private extractHooks(): HookInfo[] {
    const hooks: HookInfo[] = []
    
    for (const file of this.files) {
      if (!this.isSourceFile(file)) continue
      
      // React hooks (use*)
      const pattern = /export\s+(?:const|function)\s+(use\w+)\s*(?:=|<|\()/g
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1]
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        const code = this.extractBlock(file.content, match.index)
        
        hooks.push({
          name,
          filePath: file.path,
          lineStart,
          code: code.substring(0, 1500),
          dependencies: this.extractHookDependencies(code),
        })
      }
    }
    
    return hooks
  }

  private extractComponents(): ComponentInfo[] {
    const components: ComponentInfo[] = []
    
    for (const file of this.files) {
      if (file.language !== 'tsx' && file.language !== 'jsx') continue
      
      // Check if it's a component file
      const isClientComponent = file.content.includes("'use client'") || file.content.includes('"use client"')
      
      // Function components
      const pattern = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1]
        if (!name[0].match(/[A-Z]/)) continue // Components start with uppercase
        
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        const code = this.extractBlock(file.content, match.index)
        
        components.push({
          name,
          filePath: file.path,
          lineStart,
          code: code.substring(0, 2000),
          props: this.extractProps(match[2]),
          hooks: this.findHookUsage(code),
          isClientComponent,
        })
      }
    }
    
    return components
  }

  private extractEnvVars(): EnvVarInfo[] {
    const envVars = new Map<string, { usedIn: Set<string> }>()
    
    for (const file of this.files) {
      const pattern = /process\.env\.(\w+)|env\(["'](\w+)["']\)/g
      let match
      
      while ((match = pattern.exec(file.content)) !== null) {
        const name = match[1] || match[2]
        if (!envVars.has(name)) {
          envVars.set(name, { usedIn: new Set() })
        }
        envVars.get(name)!.usedIn.add(file.path)
      }
    }
    
    return Array.from(envVars.entries()).map(([name, info]) => ({
      name,
      usedIn: Array.from(info.usedIn),
      isRequired: true,
    }))
  }

  private extractConfigFiles(): ConfigFileInfo[] {
    const configs: ConfigFileInfo[] = []
    const configPatterns = [
      'package.json', 'tsconfig.json', 'next.config', 'tailwind.config',
      'postcss.config', 'eslint', 'prettier', '.env', 'docker', 'Dockerfile',
    ]
    
    for (const file of this.files) {
      for (const pattern of configPatterns) {
        if (file.path.toLowerCase().includes(pattern.toLowerCase())) {
          configs.push({
            name: path.basename(file.path),
            filePath: file.path,
            type: file.path.endsWith('.json') ? 'json' : 
                  file.path.endsWith('.yaml') || file.path.endsWith('.yml') ? 'yaml' :
                  file.path.endsWith('.js') ? 'js' : 'ts',
            purpose: this.getConfigPurpose(pattern),
          })
          break
        }
      }
    }
    
    return configs
  }

  private extractDependencies(): { dependencies: DependencyInfo[]; devDependencies: DependencyInfo[] } {
    const deps: DependencyInfo[] = []
    const devDeps: DependencyInfo[] = []

    const pkgFile = this.files.find(f => f.path.endsWith('package.json'))
    if (pkgFile) {
      try {
        const pkg = JSON.parse(pkgFile.content)

        for (const [name, version] of Object.entries(pkg.dependencies || {})) {
          const purpose = this.inferDependencyPurpose(name, version as string, false)
          deps.push({
            name,
            version: version as string,
            purpose
          })
        }

        for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
          const purpose = this.inferDependencyPurpose(name, version as string, true)
          devDeps.push({
            name,
            version: version as string,
            purpose
          })
        }
      } catch (e) {
        console.error('Failed to parse package.json:', e)
      }
    }

    return { dependencies: deps, devDependencies: devDeps }
  }

  private inferDependencyPurpose(name: string, version: string, isDev: boolean): string {
    const purposeMap: Record<string, string> = {
      // React ecosystem
      'react': 'Frontend framework',
      'react-dom': 'React DOM renderer',
      'next': 'Full-stack React framework',
      '@next/font': 'Font optimization',

      // UI libraries
      'tailwindcss': 'CSS framework',
      '@tailwindcss/typography': 'Typography plugin',
      'framer-motion': 'Animation library',
      'lucide-react': 'Icon library',
      '@radix-ui': 'UI component primitives',

      // State management
      'zustand': 'State management',
      'redux': 'State management',
      '@reduxjs/toolkit': 'Redux toolkit',

      // API & Networking
      'axios': 'HTTP client',
      'swr': 'Data fetching',
      'react-query': 'Data fetching',
      '@tanstack/react-query': 'Data fetching',

      // Database
      'prisma': 'ORM',
      '@prisma/client': 'Prisma client',
      'mongoose': 'MongoDB ODM',
      'mysql2': 'MySQL driver',
      'pg': 'PostgreSQL driver',

      // Authentication
      'next-auth': 'Authentication',
      '@auth/prisma-adapter': 'Auth adapter',
      'bcryptjs': 'Password hashing',
      'jsonwebtoken': 'JWT handling',

      // Validation
      'zod': 'Schema validation',
      'joi': 'Schema validation',
      'yup': 'Schema validation',

      // Development tools
      'typescript': 'TypeScript',
      '@types/node': 'Node.js types',
      '@types/react': 'React types',
      'eslint': 'Linting',
      '@typescript-eslint': 'TypeScript ESLint',
      'prettier': 'Code formatting',
      'husky': 'Git hooks',
      'lint-staged': 'Lint staging',

      // Testing
      'jest': 'Testing framework',
      '@testing-library/react': 'React testing',
      '@testing-library/jest-dom': 'Jest DOM testing',
      'cypress': 'E2E testing',

      // Build tools
      'webpack': 'Bundler',
      'vite': 'Build tool',
      'rollup': 'Module bundler',
      'babel': 'JavaScript transpiler',

      // Utilities
      'lodash': 'Utility library',
      'date-fns': 'Date utilities',
      'clsx': 'Class name utility',
      'uuid': 'UUID generation',
    }

    return purposeMap[name] || (isDev ? 'Development tool' : 'Runtime dependency')
  }

  private calculateStats(
    functions: FunctionInfo[],
    classes: ClassInfo[],
    components: ComponentInfo[],
    routes: APIRouteInfo[]
  ): CodeStats {
    let totalLines = 0
    let codeLines = 0
    let commentLines = 0
    let blankLines = 0
    const languages: Record<string, number> = {}
    const fileSizes: { path: string; lines: number }[] = []
    
    for (const file of this.files) {
      const lines = file.content.split('\n')
      totalLines += lines.length
      fileSizes.push({ path: file.path, lines: lines.length })
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === '') blankLines++
        else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) commentLines++
        else codeLines++
      }
      
      const lang = file.language || 'unknown'
      languages[lang] = (languages[lang] || 0) + 1
    }
    
    const sortedComplexity = functions
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)
      .map(f => ({ name: f.name, complexity: f.complexity, path: f.filePath }))
    
    return {
      totalFiles: this.files.length,
      totalLines,
      codeLines,
      commentLines,
      blankLines,
      totalFunctions: functions.length,
      totalClasses: classes.length,
      totalComponents: components.length,
      totalRoutes: routes.length,
      languages,
      largestFiles: fileSizes.sort((a, b) => b.lines - a.lines).slice(0, 10),
      mostComplexFunctions: sortedComplexity,
    }
  }

  // Helper methods
  private isSourceFile(file: RepoFile): boolean {
    return ['ts', 'tsx', 'js', 'jsx'].includes(file.language || '')
  }

  private extractBlock(content: string, startIndex: number): string {
    const openBrace = content.indexOf('{', startIndex)
    if (openBrace === -1) return content.substring(startIndex, startIndex + 200)
    
    let depth = 1
    let i = openBrace + 1
    
    while (depth > 0 && i < content.length) {
      if (content[i] === '{') depth++
      if (content[i] === '}') depth--
      i++
    }
    
    return content.substring(startIndex, i)
  }

  private extractClassName(content: string): string | null {
    const match = content.match(/class\s+(\w+)/)
    return match ? match[1] : null
  }

  private extractNextAPIPath(filePath: string): string {
    const match = filePath.match(/app(.+?)route\.(ts|js)/)
    if (!match) return filePath
    
    return match[1]
      .replace(/\[([^\]]+)\]/g, ':$1')
      .replace(/\/+$/, '')
  }

  private extractRouteParams(path: string): ParameterInfo[] {
    const params: ParameterInfo[] = []
    const pattern = /[:\[]([^\]/\]]+)/g
    let match

    while ((match = pattern.exec(path)) !== null) {
      params.push({
        name: match[1],
        type: 'string',
        isOptional: path.includes('?'),
      })
    }

    return params
  }

  private extractJSDocComment(content: string, functionIndex: number): string | undefined {
    // Look for JSDoc comment above the function
    const beforeFunction = content.substring(0, functionIndex)
    const lines = beforeFunction.split('\n')
    const jsdocLines: string[] = []

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (line.startsWith('/**')) {
        jsdocLines.unshift(line)
        continue
      }
      if (line.startsWith('*/')) {
        jsdocLines.unshift(line)
        break
      }
      if (line.startsWith('*')) {
        jsdocLines.unshift(line)
      }
      if (!line.startsWith('*') && !line.startsWith('/**') && jsdocLines.length > 0) {
        break
      }
    }

    if (jsdocLines.length > 0) {
      // Extract description from JSDoc
      const jsdoc = jsdocLines.join('\n')
      const descriptionMatch = jsdoc.match(/\/\*\*\s*\n\s*\*\s*([^*\n]+)/)
      return descriptionMatch ? descriptionMatch[1].trim() : undefined
    }

    return undefined
  }

  private isRouteProtected(fileContent: string, routeCode: string): boolean {
    return fileContent.includes('requireAuth') ||
           fileContent.includes('getSession') ||
           fileContent.includes('authenticate') ||
           fileContent.includes('verifyToken') ||
           fileContent.includes('auth') ||
           routeCode.includes('auth') ||
           routeCode.includes('session')
  }

  private extractMiddlewareFromRoute(code: string): string[] {
    const middleware: string[] = []
    const patterns = [
      /middleware:\s*\[([^\]]+)\]/g,
      /use\s*\(\s*(\w+)\s*\)/g,
      /(\w+)Middleware/g,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(code)) !== null) {
        const middlewareName = match[1] || match[0].replace(/middleware|use|\(|\)/g, '').trim()
        if (middlewareName && !middleware.includes(middlewareName)) {
          middleware.push(middlewareName)
        }
      }
    }

    return middleware
  }

  private extractRequestBody(code: string): string | undefined {
    // Look for request body type hints
    const patterns = [
      /req\.body\.(\w+)/g,
      /body:\s*(\w+)/g,
      /RequestBody|Input/i,
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(code)
      if (match) {
        return match[1] || 'JSON'
      }
    }

    return undefined
  }

  private extractResponseType(code: string): string | undefined {
    // Look for response type hints
    const patterns = [
      /res\.json\s*\(/g,
      /res\.send\s*\(/g,
      /return\s+\{/g,
      /Response|Output/i,
    ]

    for (const pattern of patterns) {
      if (pattern.test(code)) {
        if (pattern.source.includes('json')) return 'JSON'
        if (pattern.source.includes('send')) return 'Text'
        if (pattern.source.includes('return')) return 'Object'
        return 'Unknown'
      }
    }

    return undefined
  }

  private extractExpressPath(content: string, matchIndex: number): string {
    // Extract path from Express route definition
    const routeBlock = this.extractBlock(content, matchIndex)
    const pathMatch = routeBlock.match(/['"`]([^'"`]+)['"`]/)
    return pathMatch ? pathMatch[1] : '/'
  }

  private parseParameters(paramsString: string): ParameterInfo[] {
    if (!paramsString.trim()) return []
    
    return paramsString.split(',').map(param => {
      const parts = param.trim().split(':')
      const name = parts[0].replace(/[?=].*/, '').trim()
      const type = parts[1]?.trim()
      
      return {
        name,
        type,
        isOptional: param.includes('?') || param.includes('='),
        defaultValue: param.includes('=') ? param.split('=')[1]?.trim() : undefined,
      }
    })
  }

  private calculateComplexity(code: string): number {
    let complexity = 1
    const patterns = [/\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g, /\bcatch\b/g, /&&/g, /\|\|/g, /\?/g]
    
    for (const pattern of patterns) {
      const matches = code.match(pattern)
      if (matches) complexity += matches.length
    }
    
    return complexity
  }

  private findFunctionCalls(code: string): string[] {
    const calls: string[] = []
    const pattern = /(\w+)\s*\(/g
    let match
    
    while ((match = pattern.exec(code)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'function', 'catch'].includes(match[1])) {
        calls.push(match[1])
      }
    }
    
    return [...new Set(calls)]
  }

  private extractImports(content: string): string[] {
    const imports: string[] = []
    const pattern = /import\s+(?:[\w{},\s*]+)\s+from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1])
    }
    
    return imports
  }

  private extractMethodsFromClass(classCode: string, filePath: string, classLineStart: number): FunctionInfo[] {
    const methods: FunctionInfo[] = []
    const pattern = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g
    let match
    
    while ((match = pattern.exec(classCode)) !== null) {
      if (match[1] === 'constructor') continue
      
      const beforeMatch = classCode.substring(0, match.index)
      const lineOffset = beforeMatch.split('\n').length - 1
      
      methods.push({
        name: match[1],
        filePath,
        lineStart: classLineStart + lineOffset,
        lineEnd: classLineStart + lineOffset + 10,
        code: match[0],
        parameters: this.parseParameters(match[2]),
        returnType: match[3]?.trim(),
        isAsync: match[0].includes('async'),
        isExported: false,
        complexity: 1,
        callsTo: [],
        calledBy: [],
      })
    }
    
    return methods
  }

  private extractPropertiesFromClass(classCode: string): PropertyInfo[] {
    const properties: PropertyInfo[] = []
    const pattern = /(?:public\s+|private\s+|protected\s+)?(?:readonly\s+)?(\w+)(?:\?)?(?:\s*:\s*([^;=]+))?(?:\s*=)?/g
    let match
    
    while ((match = pattern.exec(classCode)) !== null) {
      if (['constructor', 'function', 'if', 'for', 'while', 'return'].includes(match[1])) continue
      
      properties.push({
        name: match[1],
        type: match[2]?.trim(),
        isOptional: classCode.includes(`${match[1]}?`),
        isPrivate: match[0].includes('private'),
      })
    }
    
    return properties.slice(0, 20)
  }

  private extractPropertiesFromInterface(code: string): PropertyInfo[] {
    const properties: PropertyInfo[] = []
    const pattern = /(\w+)(\?)?:\s*([^;,\n]+)/g
    let match
    
    while ((match = pattern.exec(code)) !== null) {
      properties.push({
        name: match[1],
        type: match[3].trim(),
        isOptional: !!match[2],
        isPrivate: false,
      })
    }
    
    return properties
  }

  private extractPrismaFields(body: string): PropertyInfo[] {
    const fields: PropertyInfo[] = []
    const lines = body.split('\n')
    
    for (const line of lines) {
      const match = line.trim().match(/^(\w+)\s+(\w+)(\?)?/)
      if (match && !line.includes('@@')) {
        fields.push({
          name: match[1],
          type: match[2],
          isOptional: !!match[3],
          isPrivate: false,
        })
      }
    }
    
    return fields
  }

  private extractHookDependencies(code: string): string[] {
    const deps: string[] = []
    const pattern = /use(State|Effect|Memo|Callback|Ref|Context)/g
    let match
    
    while ((match = pattern.exec(code)) !== null) {
      deps.push(`use${match[1]}`)
    }
    
    return [...new Set(deps)]
  }

  private extractProps(propsString: string): PropertyInfo[] {
    const props: PropertyInfo[] = []
    const match = propsString.match(/\{\s*([^}]+)\s*\}/)
    
    if (match) {
      const propNames = match[1].split(',').map(p => p.trim().split(':')[0].replace('?', ''))
      for (const name of propNames) {
        if (name) {
          props.push({ name, isOptional: propsString.includes(`${name}?`), isPrivate: false })
        }
      }
    }
    
    return props
  }

  private findHookUsage(code: string): string[] {
    const hooks: string[] = []
    const pattern = /\b(use\w+)\s*\(/g
    let match
    
    while ((match = pattern.exec(code)) !== null) {
      hooks.push(match[1])
    }
    
    return [...new Set(hooks)]
  }

  private extractFunctionsFromFile(file: RepoFile): FunctionInfo[] {
    const functions: FunctionInfo[] = []
    const pattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g
    let match
    
    while ((match = pattern.exec(file.content)) !== null) {
      const name = match[1] || match[2]
      const beforeMatch = file.content.substring(0, match.index)
      const lineStart = beforeMatch.split('\n').length
      
      functions.push({
        name,
        filePath: file.path,
        lineStart,
        lineEnd: lineStart + 10,
        code: '',
        parameters: [],
        isAsync: match[0].includes('async'),
        isExported: match[0].includes('export'),
        complexity: 1,
        callsTo: [],
        calledBy: [],
      })
    }
    
    return functions
  }

  private getConfigPurpose(pattern: string): string {
    const purposes: Record<string, string> = {
      'package.json': 'Package dependencies and scripts',
      'tsconfig': 'TypeScript configuration',
      'next.config': 'Next.js configuration',
      'tailwind.config': 'Tailwind CSS styling',
      'postcss': 'PostCSS processing',
      'eslint': 'Code linting rules',
      'prettier': 'Code formatting',
      '.env': 'Environment variables',
      'docker': 'Container configuration',
    }
    return purposes[pattern] || 'Configuration'
  }
}

