import type { RepoFile } from '@/lib/github/repo-cloner'
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import type { EndpointInfo } from '@/types/analyzer'

export interface APIDocumentation {
  endpoints: EndpointInfo[]
  openAPISpec: string
  swaggerSpec: string
}

export class APIAnalyzer {
  private files: RepoFile[]

  constructor(files: RepoFile[]) {
    this.files = files
  }

  /**
   * Analyze codebase for API endpoints
   */
  analyze(): APIDocumentation {
    const endpoints: EndpointInfo[] = []

    for (const file of this.files) {
      if (file.language === 'ts' || file.language === 'tsx' || file.language === 'js' || file.language === 'jsx') {
        const fileEndpoints = this.analyzeFile(file)
        endpoints.push(...fileEndpoints)
      }
    }

    const openAPISpec = this.generateOpenAPI(endpoints)
    const swaggerSpec = this.generateSwagger(endpoints)

    return {
      endpoints,
      openAPISpec,
      swaggerSpec,
    }
  }

  private analyzeFile(file: RepoFile): EndpointInfo[] {
    const endpoints: EndpointInfo[] = []

    try {
      const ast = parser.parse(file.content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
      })

      const self = this
      traverse(ast, {
        // Express.js routes
        CallExpression(path: any) {
          const { node } = path

          // app.get, app.post, router.get, etc.
          if (
            node.callee.type === 'MemberExpression' &&
            ['get', 'post', 'put', 'delete', 'patch'].includes(node.callee.property?.name)
          ) {
            const method = node.callee.property.name.toUpperCase()
            const pathPattern = self.extractPath(node.arguments[0])
            const handler = node.arguments[1]

            if (pathPattern && handler) {
              endpoints.push({
                method,
                path: pathPattern,
                filePath: file.path,
                line: node.loc?.start.line || 0,
                handler: self.extractHandlerInfo(handler),
              })
            }
          }

          // Fastify routes
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property?.name === 'route'
          ) {
            const routeConfig = node.arguments[0]
            if (routeConfig && routeConfig.type === 'ObjectExpression') {
              const method = self.extractRouteMethod(routeConfig)
              const path = self.extractRoutePath(routeConfig)

              if (method && path) {
                endpoints.push({
                  method,
                  path,
                  filePath: file.path,
                  line: node.loc?.start.line || 0,
                  handler: self.extractRouteHandler(routeConfig),
                })
              }
            }
          }
        },
      })
    } catch (error) {
      console.error(`Error analyzing ${file.path}:`, error)
    }

    return endpoints
  }

  private extractPath(arg: any): string | null {
    if (!arg) return null

    if (arg.type === 'StringLiteral') {
      return arg.value
    }

    if (arg.type === 'TemplateLiteral') {
      // Convert template literal to OpenAPI path pattern
      return arg.quasis.map((q: any) => q.value.cooked).join('{param}')
    }

    return null
  }

  private extractHandlerInfo(handler: any): string {
    if (handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') {
      return 'inline'
    }

    if (handler.type === 'Identifier') {
      return handler.name
    }

    return 'unknown'
  }

  private extractParameters(handler: any): Array<{ name: string; type: string; required: boolean }> {
    const parameters: Array<{ name: string; type: string; required: boolean }> = []

    if (handler.params && Array.isArray(handler.params)) {
      for (const param of handler.params) {
        if (param.type === 'Identifier') {
          parameters.push({
            name: param.name,
            type: 'any',
            required: true,
          })
        }
      }
    }

    return parameters
  }

  private extractResponses(handler: any): Array<{ status: number; description: string }> {
    // Try to infer responses from handler body
    return [
      { status: 200, description: 'Success' },
      { status: 400, description: 'Bad Request' },
      { status: 500, description: 'Internal Server Error' },
    ]
  }

  private extractRouteMethod(config: any): string | null {
    if (config.properties) {
      const methodProp = config.properties.find((p: any) => p.key?.name === 'method')
      if (methodProp && methodProp.value.type === 'StringLiteral') {
        return methodProp.value.value.toUpperCase()
      }
    }
    return null
  }

  private extractRoutePath(config: any): string | null {
    if (config.properties) {
      const urlProp = config.properties.find((p: any) => p.key?.name === 'url' || p.key?.name === 'path')
      if (urlProp && urlProp.value.type === 'StringLiteral') {
        return urlProp.value.value
      }
    }
    return null
  }

  private extractRouteHandler(config: any): string {
    if (config.properties) {
      const handlerProp = config.properties.find((p: any) => p.key?.name === 'handler')
      if (handlerProp) {
        return this.extractHandlerInfo(handlerProp.value)
      }
    }
    return 'unknown'
  }

  private extractRouteParameters(config: any): Array<{ name: string; type: string; required: boolean }> {
    // Similar to extractParameters but for Fastify route config
    return []
  }

  private extractRouteResponses(config: any): Array<{ status: number; description: string }> {
    // Similar to extractResponses but for Fastify route config
    return [
      { status: 200, description: 'Success' },
    ]
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  private generateOpenAPI(endpoints: EndpointInfo[]): string {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation',
      },
      paths: {} as Record<string, any>,
    }

    for (const endpoint of endpoints) {
      const path = endpoint.path || '/'
      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }

      spec.paths[path][endpoint.method.toLowerCase()] = {
        summary: `${endpoint.method} ${path}`,
        description: `Endpoint in ${endpoint.filePath}:${endpoint.line}`,
        parameters: [],
        responses: {
          200: { description: 'Success' },
          400: { description: 'Bad Request' },
          500: { description: 'Internal Server Error' },
        },
      }
    }

    return JSON.stringify(spec, null, 2)
  }

  /**
   * Generate Swagger 2.0 specification
   */
  private generateSwagger(endpoints: EndpointInfo[]): string {
    const spec = {
      swagger: '2.0',
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation',
      },
      paths: {} as Record<string, any>,
    }

    for (const endpoint of endpoints) {
      const path = endpoint.path || '/'
      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }

      spec.paths[path][endpoint.method.toLowerCase()] = {
        summary: `${endpoint.method} ${path}`,
        description: `Endpoint in ${endpoint.filePath}:${endpoint.line}`,
        parameters: [],
        responses: {
          200: { description: 'Success' },
          400: { description: 'Bad Request' },
          500: { description: 'Internal Server Error' },
        },
      }
    }

    return JSON.stringify(spec, null, 2)
  }
}

