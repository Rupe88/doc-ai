import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/security/encryption'
import { GitHubService } from '@/lib/github/service'
import { RepoCloner } from '@/lib/github/repo-cloner'
import { ComprehensiveAnalyzer } from '@/lib/analyzer/comprehensive-analyzer'
import { getAIProviderWithFallback } from '@/lib/ai/providers/factory'
import { getRAGEngine } from '@/lib/ai/rag-engine'
import { createApiHandler, requireUser, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, NotFoundError, ValidationError, RateLimitError, checkResourceAccess } from '@/lib/utils/error-handler'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

const generateSchema = z.object({
  repoId: z.string().cuid('Invalid repository ID'),
  options: z.object({
    includeTests: z.boolean().optional(),
    includeExamples: z.boolean().optional(),
    depth: z.enum(['basic', 'standard', 'deep']).optional(),
  }).optional(),
})

export const POST = createApiHandler(
  async (context) => {
    const user = requireUser(context)
    const { repoId, options } = await getRequestBody(context, generateSchema)

    const rateLimitResult = await rateLimit(user.id, user.subscriptionTier as any, 'generate', 3600)

    if (!rateLimitResult.allowed) {
      const waitMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000)
      throw new RateLimitError(`Rate limit exceeded. Wait ${waitMinutes} minute(s).`)
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: { user: { select: { subscriptionTier: true, githubToken: true } } },
    })

    if (!repo) throw new NotFoundError('Repository')
    checkResourceAccess(user.id, repo.userId, 'Repository')
    if (!repo.user.githubToken) throw new ValidationError('GitHub not connected')

    const [owner, repoName] = repo.fullName.split('/')
    if (!owner || !repoName) throw new ValidationError('Invalid repository format')

    const analysisJob = await prisma.analysisJob.create({
      data: { repoId: repo.id, status: 'PENDING', progress: 0 },
    })

    await prisma.repo.update({ where: { id: repoId }, data: { status: 'ANALYZING' } })

    const accessToken = decrypt(repo.user.githubToken)

    // Process in background - ULTRA FAST mode
    processUltraFastGeneration({
      jobId: analysisJob.id,
      repoId: repo.id,
      userId: repo.userId,
      owner,
      repoName,
      branch: repo.defaultBranch,
      accessToken,
      options: options || { depth: 'standard' },
    }).catch(console.error)

    return successResponse({
      jobId: analysisJob.id,
      status: 'PENDING',
      message: 'Ultra-fast documentation generation started',
      rateLimit: { remaining: rateLimitResult.remaining, resetAt: rateLimitResult.resetAt },
    })
  },
  { requireAuth: true, methods: ['POST'] }
)

// ULTRA FAST GENERATION - Target: Under 20 seconds
async function processUltraFastGeneration(jobData: {
  jobId: string
  repoId: string
  userId: string
  owner: string
  repoName: string
  branch: string
  accessToken: string
  options: any
}) {
  const { jobId, repoId, userId, owner, repoName, branch, accessToken } = jobData
  const startTime = Date.now()
  const log = (msg: string) => console.log(`[${jobId}] ${msg} (${Date.now() - startTime}ms)`)

  try {
    log(`ULTRA-FAST generation for ${owner}/${repoName}`)
    await updateProgress(jobId, 5, 'PROCESSING')

    // STEP 1: Clone repository
    log('Cloning...')
    const github = new GitHubService(accessToken)
    const cloner = new RepoCloner(github)
    const repoPath = await cloner.cloneRepository(owner, repoName, branch)
    
    await updateProgress(jobId, 15)

    // STEP 2: Analyze codebase (pure parsing, no LLM)
    log('Analyzing codebase...')
    const files = await cloner.getFiles(repoPath)
    log(`Found ${files.length} files`)

    const analyzer = new ComprehensiveAnalyzer(files, repoPath)
    const analysis = await analyzer.analyze()

    log(`Analysis complete: ${analysis.functions.length} funcs, ${analysis.classes.length} classes, ${analysis.apiRoutes.length} APIs`)
    await updateProgress(jobId, 30)

    // STEP 3: Clear old docs and RAG index
    await prisma.doc.deleteMany({ where: { repoId } })
    
    // Index code in RAG engine (async, don't wait)
    indexToRAG(repoId, repoName, analysis).catch(e => console.warn('[RAG] Indexing failed:', e.message))
    
    await updateProgress(jobId, 35)

    // STEP 4: Get AI provider with automatic fallback
    const ai = await getAIProviderWithFallback()
    log(`Using AI provider with fallback chain`)

    // STEP 5: Generate ALL docs in just 3 MEGA-BATCHES (super fast!)
    
    // MEGA-BATCH 1: Overview + Architecture (single comprehensive call)
    log('Generating comprehensive overview...')
    const megaPrompt1 = buildMegaPrompt(repoName, analysis)
    const megaDoc1 = await ai.chat(megaPrompt1)
    
    await saveDoc(repoId, userId, `${repoName} - Complete Documentation`, 'overview', megaDoc1, 'OVERVIEW', null, { analysis: summarizeAnalysis(analysis) })
    await updateProgress(jobId, 55)
    log('Overview complete')

    // MEGA-BATCH 2: API + Security + Quality (parallel)
    log('Generating API, Security, and Quality docs...')
    const [apiDoc, securityDoc, qualityDoc] = await Promise.all([
      analysis.apiRoutes.length > 0 
        ? ai.chat(buildApiPrompt(analysis.apiRoutes, analysis.middlewares))
        : Promise.resolve(null),
      analysis.securityIssues.length > 0 || analysis.vulnerabilities.length > 0
        ? ai.chat(buildSecurityPrompt(analysis))
        : Promise.resolve(null),
      ai.chat(buildQualityPrompt(analysis)),
    ])

    if (apiDoc) await saveDoc(repoId, userId, 'API Reference', 'api-reference', apiDoc, 'API', null, { routes: analysis.apiRoutes.length })
    if (securityDoc) await saveDoc(repoId, userId, 'Security Analysis', 'security', securityDoc, 'GUIDE', null, { issues: analysis.securityIssues.length })
    await saveDoc(repoId, userId, 'Code Quality Report', 'quality', qualityDoc, 'GUIDE', null, { score: analysis.qualityScore })
    
    await updateProgress(jobId, 80)
    log('API/Security/Quality complete')

    // MEGA-BATCH 3: Components + Services + Models (parallel)
    log('Generating Component, Service, and Model docs...')
    const [componentDoc, serviceDoc, modelDoc] = await Promise.all([
      (analysis.components.length > 0 || analysis.hooks.length > 0)
        ? ai.chat(buildComponentPrompt(analysis.components, analysis.hooks))
        : Promise.resolve(null),
      (analysis.services.length > 0 || analysis.controllers.length > 0)
        ? ai.chat(buildServicePrompt(analysis.services, analysis.controllers, analysis.utilities))
        : Promise.resolve(null),
      analysis.models.length > 0
        ? ai.chat(buildModelPrompt(analysis.models))
        : Promise.resolve(null),
    ])

    if (componentDoc) await saveDoc(repoId, userId, 'Frontend Components', 'components', componentDoc, 'FUNCTION', null, { count: analysis.components.length })
    if (serviceDoc) await saveDoc(repoId, userId, 'Backend Services', 'services', serviceDoc, 'CLASS', null, { count: analysis.services.length })
    if (modelDoc) await saveDoc(repoId, userId, 'Data Models', 'models', modelDoc, 'GUIDE', null, { count: analysis.models.length })

    await updateProgress(jobId, 95)
    log('Components/Services/Models complete')

    // Cleanup
    await cloner.cleanup()

    // Complete
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    })

    await prisma.repo.update({
      where: { id: repoId },
      data: { status: 'READY', lastSyncedAt: new Date() },
    })

    const totalTime = Date.now() - startTime
    log(`COMPLETED in ${Math.round(totalTime / 1000)}s`)

  } catch (error: any) {
    console.error(`[${jobId}] FAILED:`, error)
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: error.message || 'Unknown error' },
    })
    await prisma.repo.update({ where: { id: repoId }, data: { status: 'ERROR' } })
    throw error
  }
}

// Helpers
async function updateProgress(jobId: string, progress: number, status?: string) {
  await prisma.analysisJob.update({
    where: { id: jobId },
    data: { progress, ...(status && { status }), ...(status === 'PROCESSING' && { startedAt: new Date() }) },
  })
}

// Index code to RAG for semantic search & chat
async function indexToRAG(repoId: string, repoName: string, analysis: any) {
  try {
    const rag = getRAGEngine()
    
    if (!rag.isAvailable()) {
      console.log('[RAG] Vector store not configured - skipping indexing')
      return
    }

    console.log(`[RAG] Indexing ${repoName} to vector store...`)
    const { indexed, skipped } = await rag.indexRepository(repoId, repoName, analysis)
    console.log(`[RAG] Indexed ${indexed} code chunks (${skipped} skipped)`)
  } catch (error) {
    console.error('[RAG] Indexing error:', error)
  }
}

async function saveDoc(repoId: string, userId: string, title: string, slug: string, content: string, type: string, filePath: string | null, metadata: any) {
  // Ensure we have content
  if (!content || content.trim().length < 50) {
    console.warn(`[saveDoc] Empty or short content for ${title}`)
    content = `# ${title}\n\nDocumentation generation in progress or failed. Please try regenerating.\n\n## What This Document Covers\n\nThis document should contain comprehensive documentation about ${title.toLowerCase()}.`
  }
  
  await prisma.doc.create({
    data: { 
      repoId, 
      userId, 
      title, 
      slug: `${slug}-${Date.now()}`, 
      content, 
      type, 
      filePath, 
      metadata: metadata as any 
    },
  })
  
  console.log(`[saveDoc] Saved: ${title} (${content.length} chars)`)
}

function summarizeAnalysis(analysis: any) {
  return {
    files: analysis.stats?.totalFiles || 0,
    functions: analysis.functions.length,
    classes: analysis.classes.length,
    components: analysis.components.length,
    apis: analysis.apiRoutes.length,
    services: analysis.services.length,
    models: analysis.models.length,
  }
}

// MEGA PROMPT 1: Complete Overview - ULTRA COMPREHENSIVE
function buildMegaPrompt(repoName: string, analysis: any): string {
  const topFunctions = analysis.functions.slice(0, 20).map((f: any) => 
    `- \`${f.name}(${f.parameters?.map((p: any) => `${p.name}: ${p.type || 'any'}`).join(', ') || ''})\` -> \`${f.returnType || 'void'}\`
  - File: \`${f.filePath}\`
  - Complexity: ${f.complexity || 'N/A'}
  - ${f.isAsync ? 'Async' : 'Sync'}, ${f.isExported ? 'Exported' : 'Internal'}`
  ).join('\n\n')

  const topClasses = analysis.classes.slice(0, 15).map((c: any) => {
    const methods = c.methods?.slice(0, 5).map((m: any) => m.name).join(', ') || 'none'
    return `- **${c.name}**${c.extends ? ` extends \`${c.extends}\`` : ''}
  - File: \`${c.filePath}\`
  - Methods: ${methods}
  - ${c.implements?.length > 0 ? `Implements: ${c.implements.join(', ')}` : ''}`
  }).join('\n\n')

  const apis = analysis.apiRoutes.slice(0, 25).map((r: any) => {
    const params = r.parameters?.map((p: any) => p.name).join(', ') || ''
    return `| \`${r.method}\` | \`${r.path}\` | ${r.isProtected ? 'Yes' : 'No'} | ${params || '-'} |`
  }).join('\n')

  const components = analysis.components.slice(0, 15).map((c: any) => {
    const props = c.props?.map((p: any) => p.name).join(', ') || 'none'
    return `- **${c.name}** - Props: ${props} - ${c.isClientComponent ? 'Client' : 'Server'}`
  }).join('\n')

  const services = analysis.services.slice(0, 10).map((s: any) => {
    const methods = s.methods?.map((m: any) => m.name).join(', ') || 'none'
    return `- **${s.name}** - Methods: ${methods}`
  }).join('\n')

  const models = analysis.models.slice(0, 10).map((m: any) => {
    const fields = m.fields?.slice(0, 5).map((f: any) => `${f.name}: ${f.type}`).join(', ') || 'none'
    return `- **${m.name}** - Fields: ${fields}`
  }).join('\n')

  const dependencies = analysis.dependencies.slice(0, 20).map((d: any) => `\`${d.name}\` (${d.version})`).join(', ')

  const securitySummary = analysis.securityScore >= 80 ? 'Excellent' : 
                          analysis.securityScore >= 60 ? 'Good' : 
                          analysis.securityScore >= 40 ? 'Needs Attention' : 'Critical Issues'

  const qualitySummary = analysis.qualityScore >= 80 ? 'Excellent' :
                         analysis.qualityScore >= 60 ? 'Good' :
                         analysis.qualityScore >= 40 ? 'Needs Improvement' : 'Poor'

  return `You are an expert technical writer. Generate COMPREHENSIVE, PROFESSIONAL documentation for the "${repoName}" codebase. This documentation should be clear enough for new developers to understand and contribute to the project.

# CODEBASE ANALYSIS SUMMARY

## Statistics
| Metric | Count |
|--------|-------|
| Total Files | ${analysis.stats?.totalFiles || 'N/A'} |
| Lines of Code | ${analysis.stats?.codeLines || 'N/A'} |
| Functions | ${analysis.functions.length} |
| Classes | ${analysis.classes.length} |
| React Components | ${analysis.components.length} |
| API Endpoints | ${analysis.apiRoutes.length} |
| Services | ${analysis.services.length} |
| Database Models | ${analysis.models.length} |
| Custom Hooks | ${analysis.hooks.length} |
| Middlewares | ${analysis.middlewares.length} |
| Security Score | ${analysis.securityScore}/100 (${securitySummary}) |
| Quality Score | ${analysis.qualityScore}/100 (${qualitySummary}) |

## Detected Technologies & Patterns
${analysis.patterns?.join(', ') || 'Standard JavaScript/TypeScript patterns'}

## Key Functions
${topFunctions || 'No functions detected'}

## Key Classes
${topClasses || 'No classes detected'}

## API Endpoints
| Method | Endpoint | Auth Required | Parameters |
|--------|----------|---------------|------------|
${apis || '| - | No endpoints detected | - | - |'}

## React Components
${components || 'No React components detected'}

## Services & Business Logic
${services || 'No services detected'}

## Database Models
${models || 'No models detected'}

## Dependencies
${dependencies || 'No dependencies'}

---

# GENERATE THE FOLLOWING DOCUMENTATION

Write detailed markdown documentation with these sections. Be specific, use code examples, and make it actionable for developers.

## 1. Project Overview
- What is this project? What problem does it solve?
- Who is the target user/audience?
- What are the main features?

## 2. Architecture Overview
- High-level system design
- How components interact
- Design patterns used (MVC, Repository, etc.)
- Data flow through the application

## 3. Tech Stack
For each technology, explain WHY it's used:
- Frontend framework and libraries
- Backend framework
- Database and ORM
- Authentication method
- Styling approach
- Testing frameworks
- DevOps tools

## 4. Getting Started
Step-by-step instructions:
\`\`\`bash
# Clone and install
git clone <repo>
cd ${repoName}
npm install

# Environment setup
cp .env.example .env.local
# Add required keys...

# Run development server
npm run dev
\`\`\`

## 5. Project Structure
Explain each important directory:
\`\`\`
${repoName}/
├── app/           # Next.js app router pages
├── components/    # React components
├── lib/           # Utility functions and services
├── prisma/        # Database schema
└── ...
\`\`\`

## 6. Core Concepts
Explain the key abstractions developers need to understand:
- How authentication works
- How data flows through the app
- Key design decisions and why

## 7. API Reference Summary
Brief overview of all available API endpoints with their purpose

## 8. Database Schema
Overview of the data model and relationships

## 9. Configuration
List all environment variables and their purposes

## 10. Development Workflow
- How to add new features
- Coding standards
- Testing requirements
- PR process

IMPORTANT: Write comprehensive, detailed documentation. Use proper markdown formatting with headers, code blocks, tables, and bullet points. Make it professional and useful.`
}

// MEGA PROMPT 2: API Reference - DETAILED
function buildApiPrompt(routes: any[], middlewares: any[]): string {
  const routesByPath: Record<string, any[]> = {}
  
  routes.forEach((r: any) => {
    const basePath = r.path.split('/').slice(0, 3).join('/')
    if (!routesByPath[basePath]) routesByPath[basePath] = []
    routesByPath[basePath].push(r)
  })

  const routeDetails = routes.slice(0, 50).map((r: any) => {
    const params = r.parameters?.map((p: any) => `\`${p.name}\`: ${p.type || 'string'}`).join(', ') || 'None'
    return `
### ${r.method} \`${r.path}\`

**Authentication:** ${r.isProtected ? 'Required (Bearer token)' : 'Not required (public)'}

**File:** \`${r.filePath}\`

**URL Parameters:** ${params}

**Code Preview:**
\`\`\`typescript
// ${r.filePath}
${r.code?.substring(0, 500) || '// Handler code'}
\`\`\`
`
  }).join('\n---\n')

  const middlewareList = middlewares.slice(0, 15).map((m: any) =>
    `| \`${m.name}\` | \`${m.filePath}\` | ${m.description || 'Middleware function'} |`
  ).join('\n')

  return `You are an API documentation expert. Generate COMPREHENSIVE API documentation for this backend.

# API ENDPOINTS FOUND

${routeDetails}

# MIDDLEWARES

| Name | File | Purpose |
|------|------|---------|
${middlewareList || '| None | - | - |'}

---

# GENERATE PROFESSIONAL API DOCUMENTATION

Write detailed API documentation in markdown format:

## 1. API Overview
- Base URL structure
- API versioning (if any)
- Content types (JSON, etc.)
- General response format

## 2. Authentication
- How to obtain tokens
- How to include tokens in requests
- Token expiration and refresh
- Example authenticated request

## 3. Endpoints Reference

For EACH endpoint, provide:

### [METHOD] /path
**Description:** What this endpoint does

**Authentication:** Required / Not Required

**Request:**
\`\`\`http
[METHOD] /api/path
Content-Type: application/json
Authorization: Bearer <token>

{
  "field": "value"
}
\`\`\`

**Response (Success 200):**
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

**Response (Error 4xx/5xx):**
\`\`\`json
{
  "success": false,
  "error": { "message": "..." }
}
\`\`\`

**Example (curl):**
\`\`\`bash
curl -X [METHOD] http://localhost:3000/api/path \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token" \\
  -d '{"field": "value"}'
\`\`\`

**Example (JavaScript):**
\`\`\`javascript
const response = await fetch('/api/path', {
  method: '[METHOD]',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ field: 'value' })
});
\`\`\`

## 4. Error Codes
| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Include valid token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Contact support |

## 5. Rate Limiting
- Limits per endpoint
- How to check remaining quota
- What to do when rate limited

## 6. Webhooks (if applicable)
- Available webhook events
- Payload format
- Signature verification

Write professional, actionable documentation that developers can use immediately.`
}

// MEGA PROMPT 3: Security Analysis
function buildSecurityPrompt(analysis: any): string {
  const issues = [...(analysis.securityIssues || []), ...(analysis.vulnerabilities || [])]
  const issueList = issues.slice(0, 30).map((i: any) =>
    `- [${i.severity || 'MEDIUM'}] ${i.type || i.name}: ${i.message || i.description} (${i.filePath || i.file}:${i.line || 'N/A'})`
  ).join('\n')

  return `Generate a security analysis report for this codebase:

## DETECTED ISSUES (${issues.length} total)
${issueList || 'No critical issues detected'}

## SECURITY SCORE: ${analysis.securityScore || 'N/A'}/100

Generate comprehensive security report with:
1. ## Executive Summary - Overall security posture
2. ## Critical Issues - Issues that need immediate attention
3. ## Vulnerabilities by Category
   - Authentication/Authorization issues
   - Injection vulnerabilities (SQL, XSS, etc.)
   - Sensitive data exposure
   - Security misconfigurations
   - Dependency vulnerabilities
4. ## Recommendations - How to fix each issue
5. ## Best Practices - Security improvements to implement
6. ## Compliance - OWASP Top 10 coverage

Be specific about file locations and provide fix examples.`
}

// MEGA PROMPT 4: Code Quality
function buildQualityPrompt(analysis: any): string {
  const complexFuncs = analysis.stats?.mostComplexFunctions?.slice(0, 10).map((f: any) =>
    `- ${f.name}: complexity ${f.complexity} (${f.filePath})`
  ).join('\n') || 'None detected'

  return `Generate a code quality report for this codebase:

## STATISTICS
- Total Files: ${analysis.stats?.totalFiles || 'N/A'}
- Code Lines: ${analysis.stats?.codeLines || 'N/A'}
- Functions: ${analysis.functions.length}
- Classes: ${analysis.classes.length}

## MOST COMPLEX FUNCTIONS
${complexFuncs}

## QUALITY SCORE: ${analysis.qualityScore || 'N/A'}/100

## DETECTED PATTERNS
${analysis.patterns?.join(', ') || 'Standard patterns'}

Generate comprehensive quality report with:
1. ## Summary - Overall code health
2. ## Complexity Analysis - Functions that need refactoring
3. ## Code Smells - Potential issues (long functions, deep nesting, etc.)
4. ## Technical Debt - Areas that need attention
5. ## Performance Concerns - Potential bottlenecks
6. ## Maintainability Score - How easy to maintain
7. ## Recommendations - Specific improvements with examples
8. ## Best Practices - Coding standards to adopt

Be actionable and specific.`
}

// MEGA PROMPT 5: Components & Hooks
function buildComponentPrompt(components: any[], hooks: any[]): string {
  const compList = components.slice(0, 25).map((c: any) =>
    `- ${c.name} (${c.filePath}) - Props: ${c.props?.map((p: any) => p.name).join(', ') || 'none'}`
  ).join('\n')

  const hookList = hooks.slice(0, 15).map((h: any) =>
    `- ${h.name} (${h.filePath})`
  ).join('\n')

  return `Generate frontend component documentation:

## REACT COMPONENTS (${components.length})
${compList || 'None detected'}

## CUSTOM HOOKS (${hooks.length})
${hookList || 'None detected'}

Generate comprehensive component documentation with:
1. ## Component Library Overview
2. ## Components - For each component:
   - Purpose and usage
   - Props table (name, type, required, description)
   - Example usage
   - Related components
3. ## Custom Hooks - For each hook:
   - Purpose
   - Parameters
   - Return value
   - Example usage
4. ## Patterns - Common patterns used
5. ## Styling - How styles are managed

Use code examples and prop tables.`
}

// MEGA PROMPT 6: Services & Controllers
function buildServicePrompt(services: any[], controllers: any[], utilities: any[]): string {
  const serviceList = services.slice(0, 15).map((s: any) =>
    `- ${s.name} [${s.methods?.map((m: any) => m.name).join(', ') || 'N/A'}] (${s.filePath})`
  ).join('\n')

  const controllerList = controllers.slice(0, 10).map((c: any) =>
    `- ${c.name} [${c.methods?.map((m: any) => m.name).join(', ') || 'N/A'}] (${c.filePath})`
  ).join('\n')

  const utilList = utilities.slice(0, 15).map((u: any) =>
    `- ${u.name} (${u.filePath})`
  ).join('\n')

  return `Generate backend architecture documentation:

## SERVICES (${services.length})
${serviceList || 'None detected'}

## CONTROLLERS (${controllers.length})
${controllerList || 'None detected'}

## UTILITIES (${utilities.length})
${utilList || 'None detected'}

Generate comprehensive backend documentation with:
1. ## Architecture Overview - How backend is structured
2. ## Services - For each service:
   - Purpose
   - Key methods with signatures
   - Dependencies
   - Usage examples
3. ## Controllers - Request handling logic
4. ## Utilities - Helper functions available
5. ## Design Patterns - Patterns used (Repository, Factory, etc.)
6. ## Error Handling - How errors are managed

Be detailed with method signatures and examples.`
}

// MEGA PROMPT 7: Data Models
function buildModelPrompt(models: any[]): string {
  const modelList = models.slice(0, 20).map((m: any) => {
    const fields = m.fields?.slice(0, 10).map((f: any) =>
      `  - ${f.name}: ${f.type}${f.isRequired ? ' (required)' : ''}${f.isUnique ? ' (unique)' : ''}`
    ).join('\n') || '  - No fields detected'
    return `### ${m.name}\n${fields}`
  }).join('\n\n')

  return `Generate database model documentation:

## DATA MODELS (${models.length})
${modelList || 'None detected'}

Generate comprehensive model documentation with:
1. ## Schema Overview - Database structure
2. ## Entity Relationship Diagram - Describe relationships
3. ## Models - For each model:
   - Purpose
   - Fields table (name, type, constraints, description)
   - Relationships (has many, belongs to)
   - Indexes
   - Example queries
4. ## Migrations - How to manage schema changes
5. ## Best Practices - Data modeling guidelines

Use tables for field definitions.`
}
