/**
 * API Documentation Auto-Generator
 * Detects API endpoints and generates OpenAPI/Swagger documentation
 */

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  handler: string
  filePath: string
  description?: string
  parameters: APIParameter[]
  requestBody?: APIRequestBody
  responses: APIResponse[]
  tags: string[]
}

export interface APIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  type: string
  required: boolean
  description?: string
}

export interface APIRequestBody {
  contentType: string
  schema: any
  required: boolean
}

export interface APIResponse {
  status: number
  description: string
  schema?: any
}

export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  servers: Array<{ url: string; description: string }>
  paths: Record<string, any>
  components: {
    schemas: Record<string, any>
    securitySchemes?: Record<string, any>
  }
  tags: Array<{ name: string; description: string }>
}

export class APIDocsGenerator {
  // Next.js App Router patterns
  private nextAppRouterPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g
  // Express patterns
  private expressPattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi
  // Zod schema pattern
  private zodSchemaPattern = /z\.object\(\{([^}]+)\}\)/g

  async generateFromFiles(
    files: Array<{ path: string; content: string }>,
    projectName: string = 'API Documentation'
  ): Promise<{ endpoints: APIEndpoint[]; openapi: OpenAPISpec }> {
    const endpoints: APIEndpoint[] = []

    for (const file of files) {
      // Detect Next.js App Router API routes
      if (file.path.includes('/api/') && file.path.includes('route.')) {
        const nextEndpoints = this.extractNextAppRouterEndpoints(file)
        endpoints.push(...nextEndpoints)
      }

      // Detect Express routes
      const expressEndpoints = this.extractExpressEndpoints(file)
      endpoints.push(...expressEndpoints)
    }

    // Generate OpenAPI spec
    const openapi = this.generateOpenAPISpec(endpoints, projectName)

    return { endpoints, openapi }
  }

  private extractNextAppRouterEndpoints(file: { path: string; content: string }): APIEndpoint[] {
    const endpoints: APIEndpoint[] = []
    const apiPath = this.extractAPIPathFromFilePath(file.path)

    // Find HTTP method handlers
    const methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    
    for (const method of methods) {
      const pattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`, 'g')
      if (pattern.test(file.content)) {
        // Extract Zod schema if present
        const zodSchema = this.extractZodSchema(file.content)
        const description = this.extractJSDocDescription(file.content, method)
        
        endpoints.push({
          method,
          path: apiPath,
          handler: method,
          filePath: file.path,
          description,
          parameters: this.extractRouteParams(apiPath),
          requestBody: method !== 'GET' ? {
            contentType: 'application/json',
            schema: zodSchema || { type: 'object' },
            required: true,
          } : undefined,
          responses: this.generateDefaultResponses(method),
          tags: this.extractTags(apiPath),
        })
      }
    }

    return endpoints
  }

  private extractExpressEndpoints(file: { path: string; content: string }): APIEndpoint[] {
    const endpoints: APIEndpoint[] = []
    const pattern = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi
    let match

    while ((match = pattern.exec(file.content)) !== null) {
      const method = match[1].toUpperCase() as APIEndpoint['method']
      const path = match[2]

      endpoints.push({
        method,
        path,
        handler: `${method} ${path}`,
        filePath: file.path,
        parameters: this.extractRouteParams(path),
        responses: this.generateDefaultResponses(method),
        tags: this.extractTags(path),
      })
    }

    return endpoints
  }

  private extractAPIPathFromFilePath(filePath: string): string {
    // Convert Next.js file path to API path
    // e.g., app/api/users/[id]/route.ts -> /api/users/{id}
    const match = filePath.match(/app(.+?)route\.(ts|js)/)
    if (!match) return filePath

    return match[1]
      .replace(/\[([^\]]+)\]/g, '{$1}') // Convert [id] to {id}
      .replace(/\/+$/, '') // Remove trailing slash
  }

  private extractRouteParams(path: string): APIParameter[] {
    const params: APIParameter[] = []
    const paramPattern = /\{([^}]+)\}/g
    let match

    while ((match = paramPattern.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        type: 'string',
        required: true,
        description: `The ${match[1]} parameter`,
      })
    }

    return params
  }

  private extractZodSchema(content: string): any | null {
    // Look for Zod schema definitions
    const schemaMatch = content.match(/const\s+\w+Schema\s*=\s*z\.object\(\{([^}]+)\}\)/)
    if (!schemaMatch) return null

    // Parse the schema (simplified)
    const fields: Record<string, any> = {}
    const fieldPattern = /(\w+):\s*z\.(\w+)/g
    let match

    while ((match = fieldPattern.exec(schemaMatch[1])) !== null) {
      const [, name, type] = match
      fields[name] = {
        type: this.zodTypeToOpenAPI(type),
      }
    }

    return {
      type: 'object',
      properties: fields,
    }
  }

  private zodTypeToOpenAPI(zodType: string): string {
    const mapping: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'string',
      array: 'array',
      object: 'object',
      enum: 'string',
    }
    return mapping[zodType.toLowerCase()] || 'string'
  }

  private extractJSDocDescription(content: string, method: string): string | undefined {
    // Look for JSDoc comment before the method
    const pattern = new RegExp(`\\/\\*\\*([^*]*(?:\\*[^/][^*]*)*)\\*\\/\\s*export\\s+(?:async\\s+)?function\\s+${method}`, 's')
    const match = content.match(pattern)
    if (!match) return undefined

    // Extract description from JSDoc
    const descMatch = match[1].match(/@description\s+(.+?)(?=@|$)/s)
    return descMatch ? descMatch[1].trim() : undefined
  }

  private extractTags(path: string): string[] {
    // Extract tags from path segments
    const segments = path.split('/').filter(Boolean)
    if (segments.length >= 2) {
      return [segments[1]] // e.g., /api/users -> 'users'
    }
    return ['default']
  }

  private generateDefaultResponses(method: string): APIResponse[] {
    const responses: APIResponse[] = [
      { status: 200, description: 'Successful response' },
    ]

    if (method === 'POST') {
      responses[0].status = 201
      responses[0].description = 'Resource created successfully'
    }

    responses.push(
      { status: 400, description: 'Bad request' },
      { status: 401, description: 'Unauthorized' },
      { status: 404, description: 'Not found' },
      { status: 500, description: 'Internal server error' }
    )

    return responses
  }

  generateOpenAPISpec(endpoints: APIEndpoint[], title: string): OpenAPISpec {
    const paths: Record<string, any> = {}
    const tags = new Set<string>()

    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {}
      }

      endpoint.tags.forEach(tag => tags.add(tag))

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        tags: endpoint.tags,
        summary: endpoint.description || `${endpoint.method} ${endpoint.path}`,
        operationId: `${endpoint.method.toLowerCase()}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        parameters: endpoint.parameters.map(p => ({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: { type: p.type },
          description: p.description,
        })),
        requestBody: endpoint.requestBody ? {
          required: endpoint.requestBody.required,
          content: {
            [endpoint.requestBody.contentType]: {
              schema: endpoint.requestBody.schema,
            },
          },
        } : undefined,
        responses: Object.fromEntries(
          endpoint.responses.map(r => [
            r.status.toString(),
            { description: r.description, content: r.schema ? { 'application/json': { schema: r.schema } } : undefined },
          ])
        ),
      }
    }

    return {
      openapi: '3.0.3',
      info: {
        title,
        version: '1.0.0',
        description: 'Auto-generated API documentation',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development server' },
      ],
      paths,
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: Array.from(tags).map(name => ({ name, description: `${name} endpoints` })),
    }
  }

  generateMarkdownDocs(endpoints: APIEndpoint[]): string {
    let md = '# API Documentation\n\n'
    md += '## Endpoints\n\n'

    // Group by tags
    const byTag = new Map<string, APIEndpoint[]>()
    for (const endpoint of endpoints) {
      const tag = endpoint.tags[0] || 'default'
      if (!byTag.has(tag)) byTag.set(tag, [])
      byTag.get(tag)!.push(endpoint)
    }

    for (const [tag, tagEndpoints] of byTag) {
      md += `### ${tag.charAt(0).toUpperCase() + tag.slice(1)}\n\n`

      for (const endpoint of tagEndpoints) {
        md += `#### \`${endpoint.method}\` ${endpoint.path}\n\n`
        if (endpoint.description) {
          md += `${endpoint.description}\n\n`
        }

        if (endpoint.parameters.length > 0) {
          md += '**Parameters:**\n\n'
          md += '| Name | Location | Type | Required | Description |\n'
          md += '|------|----------|------|----------|-------------|\n'
          for (const param of endpoint.parameters) {
            md += `| ${param.name} | ${param.in} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |\n`
          }
          md += '\n'
        }

        if (endpoint.requestBody) {
          md += '**Request Body:**\n\n'
          md += '```json\n'
          md += JSON.stringify(endpoint.requestBody.schema, null, 2)
          md += '\n```\n\n'
        }

        md += '**Responses:**\n\n'
        for (const response of endpoint.responses) {
          md += `- \`${response.status}\`: ${response.description}\n`
        }
        md += '\n---\n\n'
      }
    }

    return md
  }
}

