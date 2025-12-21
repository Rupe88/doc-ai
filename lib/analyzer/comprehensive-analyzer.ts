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
      vulnerabilities,
      securityScore,
      qualityScore,
      patterns,
    }
  }

  private analyzeSecurityIssues(): { securityIssues: SecurityIssue[]; vulnerabilities: Vulnerability[]; securityScore: number } {
    const securityIssues: SecurityIssue[] = []
    const vulnerabilities: Vulnerability[] = []

    for (const file of this.files) {
      if (!this.isSourceFile(file)) continue
      const lines = file.content.split('\n')

      lines.forEach((line, index) => {
        const lineNum = index + 1

        // Check for hardcoded secrets
        if (/(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]+['"]/i.test(line)) {
          securityIssues.push({
            type: 'HARDCODED_SECRET',
            severity: 'CRITICAL',
            message: 'Potential hardcoded secret detected',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Use environment variables instead',
          })
        }

        // Check for SQL injection
        if (/\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i.test(line) ||
            /['"].*\+.*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(line)) {
          vulnerabilities.push({
            name: 'SQL Injection',
            severity: 'HIGH',
            description: 'Potential SQL injection vulnerability',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-89',
          })
        }

        // Check for XSS
        if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(line)) {
          vulnerabilities.push({
            name: 'XSS',
            severity: 'MEDIUM',
            description: 'Potential XSS vulnerability via dangerouslySetInnerHTML or innerHTML',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-79',
          })
        }

        // Check for eval usage
        if (/\beval\s*\(/.test(line)) {
          securityIssues.push({
            type: 'EVAL_USAGE',
            severity: 'HIGH',
            message: 'Use of eval() detected - security risk',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Avoid eval() - use safer alternatives',
          })
        }

        // Check for console.log in production code
        if (/console\.(log|debug|info)\s*\(/.test(line) && !file.path.includes('test')) {
          securityIssues.push({
            type: 'DEBUG_CODE',
            severity: 'LOW',
            message: 'Console logging in production code',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Remove console logs or use a proper logging library',
          })
        }

        // Check for unvalidated redirects
        if (/window\.location\s*=|res\.redirect\s*\(.*req\./i.test(line)) {
          vulnerabilities.push({
            name: 'Open Redirect',
            severity: 'MEDIUM',
            description: 'Potential unvalidated redirect',
            file: file.path,
            line: lineNum,
            cwe: 'CWE-601',
          })
        }

        // Check for missing authentication
        if (/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|DELETE|PATCH)/i.test(line) &&
            !file.content.includes('requireAuth') && !file.content.includes('getSession')) {
          securityIssues.push({
            type: 'MISSING_AUTH',
            severity: 'MEDIUM',
            message: 'API route may be missing authentication',
            filePath: file.path,
            line: lineNum,
            recommendation: 'Add authentication middleware',
          })
        }
      })
    }

    // Calculate security score
    const criticalCount = securityIssues.filter(i => i.severity === 'CRITICAL').length + 
                          vulnerabilities.filter(v => v.severity === 'CRITICAL').length
    const highCount = securityIssues.filter(i => i.severity === 'HIGH').length + 
                      vulnerabilities.filter(v => v.severity === 'HIGH').length
    const mediumCount = securityIssues.filter(i => i.severity === 'MEDIUM').length + 
                        vulnerabilities.filter(v => v.severity === 'MEDIUM').length
    const lowCount = securityIssues.filter(i => i.severity === 'LOW').length + 
                     vulnerabilities.filter(v => v.severity === 'LOW').length

    const securityScore = Math.max(0, 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 1))

    return { securityIssues, vulnerabilities, securityScore }
  }

  private analyzeCodeQuality(functions: FunctionInfo[], classes: ClassInfo[]): { qualityScore: number; patterns: string[] } {
    const patterns: string[] = []
    let qualityScore = 100

    // Detect patterns
    const hasReact = this.files.some(f => f.content.includes('import React') || f.content.includes("from 'react'"))
    const hasNextJS = this.files.some(f => f.content.includes("from 'next'") || f.path.includes('app/'))
    const hasPrisma = this.files.some(f => f.content.includes('@prisma/client'))
    const hasExpress = this.files.some(f => f.content.includes("from 'express'"))
    const hasTypescript = this.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
    const hasTailwind = this.files.some(f => f.content.includes('tailwind') || f.path.includes('tailwind'))
    const hasZod = this.files.some(f => f.content.includes("from 'zod'"))
    const hasRedux = this.files.some(f => f.content.includes('@reduxjs/toolkit') || f.content.includes('createSlice'))
    const hasGraphQL = this.files.some(f => f.content.includes('graphql') || f.content.includes('gql`'))

    if (hasReact) patterns.push('React')
    if (hasNextJS) patterns.push('Next.js')
    if (hasPrisma) patterns.push('Prisma ORM')
    if (hasExpress) patterns.push('Express.js')
    if (hasTypescript) patterns.push('TypeScript')
    if (hasTailwind) patterns.push('Tailwind CSS')
    if (hasZod) patterns.push('Zod Validation')
    if (hasRedux) patterns.push('Redux')
    if (hasGraphQL) patterns.push('GraphQL')

    // Architecture patterns
    const hasServices = this.files.some(f => f.path.includes('/services/') || f.path.includes('/service.'))
    const hasControllers = this.files.some(f => f.path.includes('/controllers/'))
    const hasMiddleware = this.files.some(f => f.path.includes('/middleware/'))
    const hasUtils = this.files.some(f => f.path.includes('/utils/') || f.path.includes('/lib/'))
    const hasTests = this.files.some(f => f.path.includes('.test.') || f.path.includes('.spec.'))

    if (hasServices) patterns.push('Service Layer')
    if (hasControllers) patterns.push('MVC Pattern')
    if (hasMiddleware) patterns.push('Middleware Pattern')
    if (hasUtils) patterns.push('Utility Modules')
    if (hasTests) patterns.push('Test Coverage')

    // Quality penalties
    const avgComplexity = functions.length > 0 
      ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length 
      : 0
    
    if (avgComplexity > 20) qualityScore -= 20
    else if (avgComplexity > 10) qualityScore -= 10
    else if (avgComplexity > 5) qualityScore -= 5

    // Check for long functions (>100 lines)
    const longFunctions = functions.filter(f => (f.lineEnd - f.lineStart) > 100).length
    qualityScore -= longFunctions * 3

    // Check for deeply nested code
    const deeplyNested = this.files.filter(f => {
      const maxIndent = f.content.split('\n').reduce((max, line) => {
        const indent = line.search(/\S/)
        return indent > max ? indent : max
      }, 0)
      return maxIndent > 24 // 6 levels of nesting
    }).length
    qualityScore -= deeplyNested * 2

    // Bonus for good practices
    if (hasTypescript) qualityScore += 5
    if (hasTests) qualityScore += 10
    if (hasZod) qualityScore += 5
    if (hasMiddleware) qualityScore += 3

    qualityScore = Math.max(0, Math.min(100, qualityScore))

    return { qualityScore, patterns }
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
            
            routes.push({
              method,
              path: apiPath,
              filePath: file.path,
              lineStart,
              code: code.substring(0, 2000),
              isProtected: file.content.includes('requireAuth') || file.content.includes('getSession'),
              parameters: this.extractRouteParams(apiPath),
            })
          }
        }
      }
      
      // Express style routes
      const expressPattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
      let match
      
      while ((match = expressPattern.exec(file.content)) !== null) {
        const beforeMatch = file.content.substring(0, match.index)
        const lineStart = beforeMatch.split('\n').length
        
        routes.push({
          method: match[1].toUpperCase() as APIRouteInfo['method'],
          path: match[2],
          filePath: file.path,
          lineStart,
          code: match[0],
          isProtected: false,
          parameters: this.extractRouteParams(match[2]),
        })
      }
    }
    
    return routes
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
          deps.push({ name, version: version as string })
        }
        
        for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
          devDeps.push({ name, version: version as string })
        }
      } catch (e) {
        console.error('Failed to parse package.json:', e)
      }
    }
    
    return { dependencies: deps, devDependencies: devDeps }
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
        isOptional: false,
      })
    }
    
    return params
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

