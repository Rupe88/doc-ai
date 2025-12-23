import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

// Simple in-memory cache for analytics (in production, use Redis)
const analyticsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
import { createApiHandler, requireUser, getRouteParams } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'
import { z } from 'zod'

const analyticsParamsSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
})

/**
 * Get comprehensive analytics for a repository
 * Includes security, quality, API endpoints, and dependencies
 */
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId } = getRouteParams(context, analyticsParamsSchema)

    // Check cache first
    const cacheKey = `${user.id}:${repoId}`
    const cached = analyticsCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      logger.info('Analytics cache hit', { repoId, userId: user.id })
      return successResponse(cached.data)
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: {
        user: {
          select: {
            githubToken: true,
          },
        },
        docs: {
          select: {
            id: true,
            title: true,
            type: true,
            filePath: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
        analysisJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')

    // Get analytics from existing documentation and database
    const analytics = await generateAnalyticsFromDocs(repo)

    // Cache the result
    analyticsCache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now(),
    })

    // Clean up old cache entries (simple cleanup)
    if (analyticsCache.size > 100) {
      const cutoff = Date.now() - CACHE_DURATION
      for (const [key, value] of analyticsCache.entries()) {
        if (value.timestamp < cutoff) {
          analyticsCache.delete(key)
        }
      }
    }

    logger.info('Analytics generated and cached', { repoId, userId: user.id })
    return successResponse(analytics)
  },
  { requireAuth: true, methods: ['GET'] }
)


/**
 * Generate comprehensive analytics from existing docs and database
 */
async function generateAnalyticsFromDocs(repo: any) {
  const overviewDoc = repo.docs.find((d: any) => d.type === 'OVERVIEW')
  const apiDocs = repo.docs.filter((d: any) => d.type === 'API')
  const functionDocs = repo.docs.filter((d: any) => d.type === 'FUNCTION')
  const classDocs = repo.docs.filter((d: any) => d.type === 'CLASS')

  const metadata = (overviewDoc?.metadata as any) || {}

  // Extract statistics from docs
  const stats = extractStatsFromDocs(repo.docs, metadata)

  // Generate security analysis
  const securityAnalysis = await generateSecurityAnalysis(repo, apiDocs, metadata)

  // Generate quality analysis
  const qualityAnalysis = generateQualityAnalysis(functionDocs, classDocs, metadata)

  // Extract dependencies
  const dependencies = extractDependencies(metadata)

  // Generate endpoints
  const endpoints = extractEndpointsFromDocs(repo.docs, metadata)

  return {
    repository: {
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      status: repo.status,
      lastSyncedAt: repo.lastSyncedAt,
    },
    overview: {
      totalFiles: stats.totalFiles,
      totalLines: stats.totalLines,
      codeLines: stats.codeLines,
      functions: stats.functions,
      classes: stats.classes,
      components: stats.components,
      apiRoutes: stats.apiRoutes,
    },
    stats,
    security: securityAnalysis,
    quality: qualityAnalysis,
    dependencies,
    endpoints,
    patterns: metadata.patterns || extractPatternsFromDocs(repo.docs),
    documentation: {
      totalDocs: repo.docs.length,
      byType: countDocsByType(repo.docs),
      lastGenerated: overviewDoc?.createdAt,
      coverage: calculateDocCoverage(stats, repo.docs.length),
    },
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Extract comprehensive statistics from documentation
 */
function extractStatsFromDocs(docs: any[], metadata: any) {
  const apiDocs = docs.filter(d => d.type === 'API')
  const functionDocs = docs.filter(d => d.type === 'FUNCTION')
  const classDocs = docs.filter(d => d.type === 'CLASS')
  const componentDocs = docs.filter(d => d.type === 'COMPONENT')

  // Count API routes from docs
  let apiRoutes = 0
  for (const doc of apiDocs) {
    const meta = doc.metadata as any
    if (meta?.routes && Array.isArray(meta.routes)) {
      apiRoutes += meta.routes.length
    }
  }

  return {
    totalFiles: metadata.files || metadata.stats?.totalFiles || docs.length,
    totalLines: metadata.stats?.totalLines || 0,
    codeLines: metadata.stats?.codeLines || 0,
    functions: functionDocs.length || metadata.stats?.totalFunctions || 0,
    classes: classDocs.length || metadata.stats?.totalClasses || 0,
    components: componentDocs.length || metadata.stats?.totalComponents || 0,
    apiEndpoints: apiDocs.length,
    services: metadata.services || 0,
    models: metadata.models || 0,
    apiRoutes,
  }
}

/**
 * Generate security analysis from docs and metadata
 */
async function generateSecurityAnalysis(repo: any, apiDocs: any[], metadata: any) {
  const issues: any[] = []
  const vulnerabilities: any[] = []

  // Check for authentication issues
  for (const doc of apiDocs) {
    const meta = doc.metadata as any
    if (meta?.routes) {
      for (const route of meta.routes) {
        if (!route.isProtected && (route.method === 'POST' || route.method === 'PUT' || route.method === 'DELETE')) {
          issues.push({
            type: 'UNPROTECTED_ENDPOINT',
            severity: 'HIGH',
            message: `Unprotected ${route.method} endpoint: ${route.path}`,
            filePath: doc.filePath,
            recommendation: 'Add authentication middleware to protect this endpoint',
          })
        }
      }
    }
  }

  // Check for common security issues in docs
  const allDocs = repo.docs || []
  for (const doc of allDocs) {
    const content = (doc.content || '').toLowerCase()

    // Check for hardcoded secrets
    if (content.includes('password') || content.includes('secret') || content.includes('key') || content.includes('token')) {
      if (content.includes('=') && (content.includes('"') || content.includes("'"))) {
        issues.push({
          type: 'POTENTIAL_HARDCODED_SECRET',
          severity: 'HIGH',
          message: `Potential hardcoded secret detected in ${doc.title}`,
          filePath: doc.filePath,
          recommendation: 'Move secrets to environment variables or secure key management',
        })
      }
    }

    // Check for insecure practices
    if (content.includes('eval(') || content.includes('function(') && content.includes('string')) {
      issues.push({
        type: 'DANGEROUS_FUNCTION_USAGE',
        severity: 'HIGH',
        message: `Dangerous function usage detected in ${doc.title}`,
        filePath: doc.filePath,
        recommendation: 'Avoid using eval() or Function constructor with user input',
      })
    }

    // Check for SQL injection patterns
    if (content.includes('sql') || content.includes('query')) {
      if (content.includes('select') && content.includes('+') && (content.includes('req.') || content.includes('request.'))) {
        vulnerabilities.push({
          name: 'SQL Injection',
          severity: 'CRITICAL',
          description: 'Potential SQL injection vulnerability detected',
          file: doc.filePath,
          cwe: 'CWE-89',
          fix: 'Use parameterized queries or prepared statements',
        })
      }
    }

    // Check for XSS patterns
    if (content.includes('innerhtml') || content.includes('outerhtml') || content.includes('dangerouslysetinnerhtml')) {
      issues.push({
        type: 'XSS_VULNERABILITY',
        severity: 'HIGH',
        message: `Potential XSS vulnerability in ${doc.title}`,
        filePath: doc.filePath,
        recommendation: 'Use safe HTML rendering methods and sanitize user input',
      })
    }
  }

  // Check for potential security issues in metadata
  if (metadata.securityIssues) {
    issues.push(...metadata.securityIssues.map((issue: any) => ({
      type: issue.type || 'SECURITY_ISSUE',
      severity: issue.severity || 'MEDIUM',
      message: issue.message || 'Security issue detected',
      filePath: issue.filePath || '',
      line: issue.line,
      recommendation: issue.recommendation || 'Review and fix this security issue',
    })))
  }

  if (metadata.vulnerabilities) {
    vulnerabilities.push(...metadata.vulnerabilities.map((vuln: any) => ({
      name: vuln.name || 'Vulnerability',
      severity: vuln.severity || 'MEDIUM',
      description: vuln.description || '',
      file: vuln.file || '',
      line: vuln.line,
      cwe: vuln.cwe,
      fix: vuln.fix || `Review and fix ${vuln.name}`,
    })))
  }

  // Check for missing security headers
  const hasSecurityHeaders = allDocs.some((doc: any) =>
    doc.content && (
      doc.content.includes('helmet') ||
      doc.content.includes('security') ||
      doc.content.includes('csp') ||
      doc.content.includes('content-security-policy')
    )
  )

  if (!hasSecurityHeaders) {
    issues.push({
      type: 'MISSING_SECURITY_HEADERS',
      severity: 'MEDIUM',
      message: 'No security headers detected in the codebase',
      filePath: '',
      recommendation: 'Implement security headers like CSP, HSTS, X-Frame-Options',
    })
  }

  // Calculate security score based on issues
  const baseScore = 100
  const issuePenalty = issues.length * 3
  const vulnPenalty = vulnerabilities.length * 8
  const unprotectedCount = issues.filter((i: any) => i.type === 'UNPROTECTED_ENDPOINT').length
  const authPenalty = apiDocs.length > 0 ? unprotectedCount * 5 : 0
  const securityScore = Math.max(0, Math.min(100, baseScore - issuePenalty - vulnPenalty - authPenalty))

  const grade = securityScore >= 95 ? 'A' :
                securityScore >= 85 ? 'B' :
                securityScore >= 75 ? 'C' :
                securityScore >= 65 ? 'D' : 'F'

  return {
    score: securityScore,
    grade,
    issues: issues.slice(0, 20), // Limit to prevent overwhelming UI
    vulnerabilities: vulnerabilities.slice(0, 10),
    recommendations: generateEnhancedSecurityRecommendations(issues, vulnerabilities, metadata),
  }
}

/**
 * Generate quality analysis from docs
 */
function generateQualityAnalysis(functionDocs: any[], classDocs: any[], metadata: any) {
  const functions = functionDocs.length
  const classes = classDocs.length

  // Calculate complexity metrics
  const avgComplexity = metadata.stats?.mostComplexFunctions?.length > 0
    ? metadata.stats.mostComplexFunctions.reduce((sum: number, f: any) => sum + (f.complexity || 0), 0) / metadata.stats.mostComplexFunctions.length
    : 5

  const highestComplexities = metadata.stats?.mostComplexFunctions?.slice(0, 5) || []

  // Calculate quality score
  let qualityScore = 80 // Base score
  if (functions === 0) qualityScore -= 20 // No functions documented
  if (classes === 0) qualityScore -= 10 // No classes documented
  if (avgComplexity > 15) qualityScore -= 15 // High complexity
  if (metadata.patterns?.includes('Test Coverage')) qualityScore += 10

  qualityScore = Math.max(0, Math.min(100, qualityScore))

  const grade = qualityScore >= 95 ? 'A' :
                qualityScore >= 85 ? 'B' :
                qualityScore >= 75 ? 'C' :
                qualityScore >= 65 ? 'D' : 'F'

  return {
    score: qualityScore,
    grade,
    patterns: metadata.patterns || [],
    complexity: {
      average: avgComplexity,
      hotspots: highestComplexities.map((f: any) => ({
        name: f.name || f.functionName || 'Unknown',
        value: f.complexity || 0,
        file: f.path || f.filePath || '',
      })),
      distribution: calculateComplexityDistribution(metadata.stats?.mostComplexFunctions || []),
    },
    issues: extractQualityIssues(metadata),
    recommendations: generateQualityRecommendations(metadata),
    maintainability: Math.max(0, Math.min(100, qualityScore + 10)),
    testability: metadata.patterns?.includes('Test Coverage') ? 85 : 65,
    techDebt: {
      hours: Math.round((100 - qualityScore) * 0.8),
      category: qualityScore > 85 ? 'Low' : qualityScore > 70 ? 'Medium' : 'High',
      breakdown: generateTechDebtBreakdownFromMetadata(metadata, qualityScore),
    },
  }
}

/**
 * Extract dependencies from metadata and analyze them
 */
function extractDependencies(metadata: any) {
  const production = metadata.dependencies || []
  const development = metadata.devDependencies || []

  // Analyze dependencies for potential issues
  const analyzedDeps = analyzeDependencies(production, development)

  return {
    total: production.length + development.length,
    outdated: analyzedDeps.outdated,
    vulnerable: analyzedDeps.vulnerable,
    list: analyzedDeps.list,
    production,
    development,
    summary: analyzedDeps.summary,
  }
}

/**
 * Analyze dependencies for vulnerabilities and issues
 */
function analyzeDependencies(production: any[], development: any[]) {
  const allDeps = [
    ...production.map((dep: any) => ({ ...dep, type: 'production' })),
    ...development.map((dep: any) => ({ ...dep, type: 'development' })),
  ]

  let outdated = 0
  let vulnerable = 0
  const issues: any[] = []

  // Known vulnerable packages (simplified - in production, use a proper vulnerability database)
  const knownVulnerabilities: Record<string, any> = {
    'lodash': { severity: 'MEDIUM', description: 'Prototype pollution vulnerability in older versions' },
    'express': { severity: 'HIGH', description: 'Security vulnerabilities in versions < 4.17.0' },
    'mongoose': { severity: 'MEDIUM', description: 'Potential injection vulnerabilities' },
    'axios': { severity: 'LOW', description: 'Minor security issues in older versions' },
    'jsonwebtoken': { severity: 'CRITICAL', description: 'RSA/ECDSA algorithm confusion vulnerability' },
    'minimatch': { severity: 'HIGH', description: 'Regular expression denial of service' },
    'moment': { severity: 'HIGH', description: 'Deprecated - use date-fns or dayjs' },
    'request': { severity: 'CRITICAL', description: 'Deprecated - multiple security issues' },
  }

  for (const dep of allDeps) {
    const name = typeof dep === 'string' ? dep : dep.name || ''
    const version = typeof dep === 'string' ? 'unknown' : dep.version || ''

    // Check for known vulnerabilities
    if (knownVulnerabilities[name]) {
      const vuln = knownVulnerabilities[name]
      vulnerable++
      issues.push({
        name,
        version,
        type: 'VULNERABILITY',
        severity: vuln.severity,
        description: vuln.description,
        recommendation: `Update ${name} to latest secure version`,
      })
    }

    // Check for outdated versions (simplified check)
    if (version && version.includes('^') && parseInt(version.replace('^', '').split('.')[0]) < 1) {
      outdated++
    }
  }

  // Check for dependency conflicts
  const depNames = allDeps.map(dep => typeof dep === 'string' ? dep : dep.name).filter(Boolean)
  const duplicates = depNames.filter((name, index) => depNames.indexOf(name) !== index)

  if (duplicates.length > 0) {
    issues.push({
      name: 'Dependency Conflicts',
      type: 'CONFLICT',
      severity: 'MEDIUM',
      description: `Duplicate dependencies detected: ${duplicates.join(', ')}`,
      recommendation: 'Resolve dependency conflicts and remove duplicates',
    })
  }

  return {
    list: allDeps.map(dep => ({
      name: typeof dep === 'string' ? dep : dep.name || '',
      version: typeof dep === 'string' ? 'latest' : dep.version || 'unknown',
      type: typeof dep === 'string' ? 'production' : dep.type || 'production',
    })),
    outdated,
    vulnerable,
    issues,
    summary: {
      total: allDeps.length,
      production: production.length,
      development: development.length,
      issues: issues.length,
      recommendations: [
        'Regularly update dependencies to latest secure versions',
        'Use npm audit or yarn audit to check for vulnerabilities',
        'Consider using tools like Dependabot for automated updates',
        'Remove unused dependencies to reduce attack surface',
      ].slice(0, 4),
    },
  }
}

/**
 * Extract endpoints from docs
 */
function extractEndpointsFromDocs(docs: any[], metadata: any): any[] {
  const apiDocs = docs.filter(d => d.type === 'API')
  const endpoints: any[] = []

  // From docs
  for (const doc of apiDocs) {
    const meta = doc.metadata as any
    if (meta?.routes && Array.isArray(meta.routes)) {
      endpoints.push(...meta.routes.map((r: any) => ({
        method: r.method || 'GET',
        path: r.path || doc.title,
        description: r.description || '',
        isProtected: r.isProtected ?? false,
        filePath: r.filePath || doc.filePath,
      })))
    }
  }

  // From metadata
  if (metadata.apiRoutes && Array.isArray(metadata.apiRoutes)) {
    for (const route of metadata.apiRoutes) {
      if (!endpoints.some(e => e.path === route.path && e.method === route.method)) {
        endpoints.push({
          method: route.method || 'GET',
          path: route.path,
          description: route.description || '',
          isProtected: route.isProtected ?? false,
          filePath: route.filePath,
        })
      }
    }
  }

  return endpoints.slice(0, 50)
}

/**
 * Extract patterns from docs
 */
function extractPatternsFromDocs(docs: any[]): string[] {
  const patterns = new Set<string>()

  for (const doc of docs) {
    const meta = doc.metadata as any
    if (meta?.patterns && Array.isArray(meta.patterns)) {
      meta.patterns.forEach((p: string) => patterns.add(p))
    }
  }

  // Common patterns to detect
  const languages = docs.map(d => d.filePath?.split('.').pop()).filter(Boolean)
  if (languages.includes('ts')) patterns.add('TypeScript')
  if (languages.includes('js')) patterns.add('JavaScript')
  if (languages.includes('tsx') || languages.includes('jsx')) patterns.add('React')

  if (docs.some(d => d.type === 'API')) patterns.add('REST API')
  if (docs.some(d => d.type === 'COMPONENT')) patterns.add('Component Library')

  return Array.from(patterns)
}

/**
 * Calculate complexity distribution
 */
function calculateComplexityDistribution(functions: any[]) {
  const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 }

  for (const func of functions) {
    const complexity = func.complexity || 0
    if (complexity <= 5) distribution.low++
    else if (complexity <= 10) distribution.medium++
    else if (complexity <= 20) distribution.high++
    else distribution.veryHigh++
  }

  return distribution
}

function countDocsByType(docs: any[]): Record<string, number> {
  return docs.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function calculateDocCoverage(stats: any, docCount: number): number {
  const totalItems = (stats.functions || 0) + (stats.classes || 0) + (stats.apiEndpoints || 0)
  if (totalItems === 0) return 100

  // Rough estimate: each doc covers ~5 items on average
  const coverage = Math.min(100, Math.round((docCount * 5 / totalItems) * 100))
  return coverage
}

function generateEnhancedSecurityRecommendations(issues: any[], vulnerabilities: any[], metadata: any): string[] {
  const recommendations: string[] = []

  const criticalVulns = vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length
  const highVulns = vulnerabilities.filter((v: any) => v.severity === 'HIGH').length
  const unprotectedEndpoints = issues.filter((i: any) => i.type === 'UNPROTECTED_ENDPOINT').length
  const hardcodedSecrets = issues.filter((i: any) => i.type === 'POTENTIAL_HARDCODED_SECRET').length
  const sqlInjection = vulnerabilities.some((v: any) => v.name === 'SQL Injection')
  const xssVulns = issues.some((i: any) => i.type === 'XSS_VULNERABILITY')

  if (criticalVulns > 0) {
    recommendations.push('🚨 CRITICAL: Address critical security vulnerabilities immediately')
  }

  if (highVulns > 0) {
    recommendations.push('⚠️ HIGH PRIORITY: Fix high-severity security issues')
  }

  if (unprotectedEndpoints > 0) {
    recommendations.push(`🔒 ${unprotectedEndpoints} unprotected API endpoints detected - add authentication`)
  }

  if (hardcodedSecrets > 0) {
    recommendations.push('🔑 Move hardcoded secrets to environment variables')
  }

  if (sqlInjection) {
    recommendations.push('🛡️ Implement parameterized queries to prevent SQL injection')
  }

  if (xssVulns) {
    recommendations.push('🔒 Sanitize user inputs and implement Content Security Policy')
  }

  if (issues.some((i: any) => i.type === 'MISSING_SECURITY_HEADERS')) {
    recommendations.push('📊 Add security headers (CSP, HSTS, X-Frame-Options)')
  }

  if (issues.some((i: any) => i.type === 'DANGEROUS_FUNCTION_USAGE')) {
    recommendations.push('🚫 Replace eval() and Function constructor with safer alternatives')
  }

  recommendations.push('🔄 Regularly update dependencies to patch known vulnerabilities')
  recommendations.push('🛡️ Implement rate limiting on public APIs')
  recommendations.push('📝 Conduct regular security audits and penetration testing')

  return recommendations.slice(0, 8)
}

function extractQualityIssues(metadata: any): any[] {
  const issues: any[] = []

  // Check for complex functions
  const complexFunctions = metadata.stats?.mostComplexFunctions?.filter((f: any) => f.complexity > 15) || []
  for (const func of complexFunctions.slice(0, 5)) {
    issues.push({
      type: 'HIGH_COMPLEXITY',
      severity: func.complexity > 25 ? 'HIGH' : 'MEDIUM',
      message: `Function "${func.name}" has high complexity (${func.complexity})`,
      filePath: func.path || func.filePath,
      recommendation: 'Consider breaking this function into smaller, focused functions',
    })
  }

  return issues
}

function generateQualityRecommendations(metadata: any): string[] {
  const recommendations: string[] = []
  const score = metadata.qualityScore ?? 80
  const patterns = metadata.patterns || []

  if (score < 60) {
    recommendations.push('Refactor complex functions to improve maintainability')
  }
  if (!patterns.includes('Test Coverage')) {
    recommendations.push('Add unit tests to improve code reliability')
  }
  if (!patterns.includes('TypeScript')) {
    recommendations.push('Consider using TypeScript for better type safety')
  }

  recommendations.push('Follow consistent naming conventions')
  recommendations.push('Add JSDoc comments to public APIs')

  return recommendations.slice(0, 5)
}

/**
 * Generate tech debt breakdown from metadata
 */
function generateTechDebtBreakdownFromMetadata(metadata: any, qualityScore: number): any[] {
  const breakdown = []

  // Complexity debt
  const highComplexity = metadata.stats?.mostComplexFunctions?.filter((f: any) => f.complexity > 15).length || 0
  if (highComplexity > 0) {
    breakdown.push({
      type: 'High Complexity Functions',
      hours: Math.round(highComplexity * 2),
      priority: 'High',
    })
  }

  // Missing tests
  if (!metadata.patterns?.includes('Test Coverage')) {
    breakdown.push({
      type: 'Missing Test Coverage',
      hours: Math.round((metadata.stats?.totalFunctions || 0) * 0.5),
      priority: 'Medium',
    })
  }

  // Long functions
  const longFunctions = metadata.stats?.mostComplexFunctions?.filter((f: any) => (f.lineEnd - f.lineStart) > 50).length || 0
  if (longFunctions > 0) {
    breakdown.push({
      type: 'Long Functions',
      hours: Math.round(longFunctions * 1.5),
      priority: 'Medium',
    })
  }

  // Missing documentation
  const totalFunctions = metadata.stats?.totalFunctions || 0
  const documentedFunctions = metadata.stats?.totalFunctions || 0 // Assuming documented = total for now
  const undocumented = Math.max(0, totalFunctions - documentedFunctions)
  if (undocumented > 0) {
    breakdown.push({
      type: 'Undocumented Code',
      hours: Math.round(undocumented * 0.5),
      priority: 'Low',
    })
  }

  return breakdown.slice(0, 5)
}
