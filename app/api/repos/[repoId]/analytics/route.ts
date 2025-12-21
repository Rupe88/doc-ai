import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

import { prisma } from '@/lib/db/prisma'
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, checkResourceAccess } from '@/lib/utils/error-handler'

/**
 * Get comprehensive analytics for a repository
 * Includes security, quality, API endpoints, and dependencies
 */
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const repoId = context.params?.repoId as string
    
    if (!repoId) {
      throw new NotFoundError('Repository ID required')
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: {
        docs: {
          select: {
            id: true,
            title: true,
            type: true,
            filePath: true,
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

    // Extract analytics from metadata
    const overviewDoc = repo.docs.find(d => d.type === 'OVERVIEW')
    const metadata = (overviewDoc?.metadata as any) || {}

    // Build comprehensive analytics
    const analytics = {
      repository: {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        status: repo.status,
        lastSyncedAt: repo.lastSyncedAt,
      },

      // Code Statistics
      stats: {
        totalFiles: metadata.files || metadata.stats?.totalFiles || 0,
        totalLines: metadata.stats?.totalLines || 0,
        codeLines: metadata.stats?.codeLines || 0,
        functions: metadata.functions || metadata.stats?.totalFunctions || 0,
        classes: metadata.classes || metadata.stats?.totalClasses || 0,
        components: metadata.components || metadata.stats?.totalComponents || 0,
        apiEndpoints: metadata.apis || 0,
        services: metadata.services || 0,
        models: metadata.models || 0,
      },

      // Security Analysis
      security: {
        score: metadata.securityScore ?? 85,
        issues: extractSecurityIssues(metadata),
        vulnerabilities: extractVulnerabilities(metadata),
        recommendations: generateSecurityRecommendations(metadata),
      },

      // Code Quality
      quality: {
        score: metadata.qualityScore ?? 80,
        patterns: metadata.patterns || [],
        complexity: {
          average: calculateAverageComplexity(metadata),
          hotspots: metadata.stats?.mostComplexFunctions?.slice(0, 5) || [],
        },
        issues: extractQualityIssues(metadata),
        recommendations: generateQualityRecommendations(metadata),
      },

      // API Endpoints
      endpoints: extractEndpoints(repo.docs, metadata),

      // Dependencies
      dependencies: {
        production: metadata.dependencies || [],
        development: metadata.devDependencies || [],
        outdated: [], // Would need npm audit integration
        vulnerable: [], // Would need security DB integration
      },

      // Documentation Coverage
      documentation: {
        totalDocs: repo.docs.length,
        byType: countDocsByType(repo.docs),
        lastGenerated: overviewDoc?.createdAt,
        coverage: calculateDocCoverage(metadata, repo.docs.length),
      },

      // Trends (placeholder for historical data)
      trends: {
        securityScoreHistory: [{ date: new Date().toISOString(), score: metadata.securityScore ?? 85 }],
        qualityScoreHistory: [{ date: new Date().toISOString(), score: metadata.qualityScore ?? 80 }],
      },
    }

    return successResponse(analytics)
  },
  { requireAuth: true, methods: ['GET'] }
)

function extractSecurityIssues(metadata: any): any[] {
  const issues = metadata.securityIssues || []
  return issues.map((issue: any) => ({
    id: `sec-${Math.random().toString(36).slice(2)}`,
    type: issue.type || 'UNKNOWN',
    severity: issue.severity || 'MEDIUM',
    message: issue.message || 'Security issue detected',
    filePath: issue.filePath || '',
    line: issue.line,
    recommendation: issue.recommendation || 'Review and fix this issue',
  }))
}

function extractVulnerabilities(metadata: any): any[] {
  const vulns = metadata.vulnerabilities || []
  return vulns.map((vuln: any) => ({
    id: `vuln-${Math.random().toString(36).slice(2)}`,
    name: vuln.name || 'Vulnerability',
    severity: vuln.severity || 'MEDIUM',
    description: vuln.description || '',
    file: vuln.file || '',
    line: vuln.line,
    cwe: vuln.cwe,
    fix: vuln.fix || 'Review and patch this vulnerability',
  }))
}

function generateSecurityRecommendations(metadata: any): string[] {
  const recommendations: string[] = []
  const score = metadata.securityScore ?? 85

  if (score < 50) {
    recommendations.push('CRITICAL: Multiple security issues detected. Immediate review required.')
  }
  if (score < 70) {
    recommendations.push('Review and remove any hardcoded secrets or API keys')
    recommendations.push('Implement input validation on all user inputs')
  }
  if (score < 90) {
    recommendations.push('Consider adding Content Security Policy headers')
    recommendations.push('Enable HTTPS and secure cookie flags')
  }

  recommendations.push('Regularly update dependencies to patch known vulnerabilities')
  recommendations.push('Implement rate limiting on public APIs')

  return recommendations.slice(0, 5)
}

function calculateAverageComplexity(metadata: any): number {
  const functions = metadata.stats?.mostComplexFunctions || []
  if (functions.length === 0) return 5

  const total = functions.reduce((sum: number, f: any) => sum + (f.complexity || 0), 0)
  return Math.round(total / functions.length)
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

function extractEndpoints(docs: any[], metadata: any): any[] {
  const apiDocs = docs.filter(d => d.type === 'API')
  const endpoints: any[] = []

  // From docs
  for (const doc of apiDocs) {
    const meta = doc.metadata as any
    if (meta?.routes) {
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
  if (metadata.apiRoutes) {
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

function countDocsByType(docs: any[]): Record<string, number> {
  return docs.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function calculateDocCoverage(metadata: any, docCount: number): number {
  const totalItems = (metadata.functions || 0) + (metadata.classes || 0) + (metadata.apis || 0)
  if (totalItems === 0) return 100

  // Rough estimate: each doc covers ~5 items on average
  const coverage = Math.min(100, Math.round((docCount * 5 / totalItems) * 100))
  return coverage
}
