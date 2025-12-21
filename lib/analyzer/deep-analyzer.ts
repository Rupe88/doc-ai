import { TypeScriptAnalyzer } from './typescript-analyzer'
import { JavaScriptAnalyzer } from './javascript-analyzer'
import { DependencyAnalyzer } from './dependency-analyzer'
import { SecurityAnalyzer } from './security-analyzer'
import type {
  AnalysisResult,
  CodeStructure,
  ArchitectureInfo,
  LayerInfo,
  EndpointInfo,
} from '@/types/analyzer'
import type { RepoFile } from '@/lib/github/repo-cloner'
import * as path from 'path'

export class DeepAnalyzer {
  private files: RepoFile[]
  private repoPath: string

  constructor(files: RepoFile[], repoPath: string) {
    this.files = files
    this.repoPath = repoPath
  }

  async analyze(): Promise<AnalysisResult> {
    const structure = this.analyzeStructure()
    const dependencies = await this.analyzeDependencies()
    const securityAndPerformance = this.analyzeSecurityAndPerformance()
    const patterns = this.detectPatterns()
    const architecture = this.analyzeArchitecture()

    return {
      structure,
      dependencies,
      securityIssues: securityAndPerformance.securityIssues,
      performanceIssues: securityAndPerformance.performanceIssues,
      patterns,
      architecture,
    }
  }

  private analyzeStructure(): CodeStructure {
    const allFunctions: any[] = []
    const allClasses: any[] = []
    const allInterfaces: any[] = []
    const allTypes: any[] = []
    const allExports: any[] = []

    for (const file of this.files) {
      try {
        if (file.language === 'ts' || file.language === 'tsx') {
          const analyzer = new TypeScriptAnalyzer(file.content, file.path)
          const result = analyzer.analyze()
          allFunctions.push(...result.functions)
          allClasses.push(...result.classes)
          allInterfaces.push(...result.interfaces)
          allTypes.push(...result.types)
          allExports.push(...result.exports)
        } else if (file.language === 'js' || file.language === 'jsx') {
          const analyzer = new JavaScriptAnalyzer(file.content)
          const result = analyzer.analyze()
          allFunctions.push(...result.functions)
          allClasses.push(...result.classes)
          allExports.push(...result.exports)
        }
      } catch (error) {
        console.error(`Error analyzing ${file.path}:`, error)
      }
    }

    return {
      functions: allFunctions,
      classes: allClasses,
      interfaces: allInterfaces,
      types: allTypes,
      exports: allExports,
    }
  }

  private async analyzeDependencies() {
    try {
      const analyzer = new DependencyAnalyzer(this.repoPath)
      return await analyzer.analyze()
    } catch (error) {
      console.error('Dependency analysis error:', error)
      return {
        nodes: [],
        edges: [],
        circularDependencies: [],
      }
    }
  }

  private analyzeSecurityAndPerformance() {
    const securityAnalyzer = new SecurityAnalyzer()
    const securityIssues: any[] = []
    const performanceIssues: any[] = []

    for (const file of this.files) {
      const result = securityAnalyzer.analyzeCode(file.content, file.path)
      securityIssues.push(...result.securityIssues)
      performanceIssues.push(...result.performanceIssues)
    }

    return { securityIssues, performanceIssues }
  }

  private detectPatterns(): string[] {
    const patterns: string[] = []

    const hasRepositoryPattern = this.files.some(file =>
      /class.*Repository|interface.*Repository/i.test(file.content)
    )
    if (hasRepositoryPattern) patterns.push('Repository')

    const hasSingletonPattern = this.files.some(file =>
      /getInstance|private.*constructor/i.test(file.content)
    )
    if (hasSingletonPattern) patterns.push('Singleton')

    const hasFactoryPattern = this.files.some(file =>
      /create.*Factory|Factory.*create/i.test(file.content)
    )
    if (hasFactoryPattern) patterns.push('Factory')

    const hasObserverPattern = this.files.some(file =>
      /subscribe|notify|Observer/i.test(file.content)
    )
    if (hasObserverPattern) patterns.push('Observer')

    return patterns
  }

  private analyzeArchitecture(): ArchitectureInfo {
    const layers = this.identifyLayers()
    const endpoints = this.identifyEndpoints()
    const dataFlow = this.identifyDataFlow()

    return {
      layers,
      endpoints,
      dataFlow,
    }
  }

  private identifyLayers(): LayerInfo[] {
    const layers: LayerInfo[] = []
    const presentationFiles: string[] = []
    const businessFiles: string[] = []
    const dataFiles: string[] = []
    const sharedFiles: string[] = []

    for (const file of this.files) {
      const filePath = file.path.toLowerCase()
      
      if (filePath.includes('component') || filePath.includes('page') || filePath.includes('view')) {
        presentationFiles.push(file.path)
      } else if (filePath.includes('service') || filePath.includes('controller') || filePath.includes('handler')) {
        businessFiles.push(file.path)
      } else if (filePath.includes('model') || filePath.includes('schema') || filePath.includes('db')) {
        dataFiles.push(file.path)
      } else if (filePath.includes('util') || filePath.includes('helper') || filePath.includes('type')) {
        sharedFiles.push(file.path)
      }
    }

    if (presentationFiles.length > 0) {
      layers.push({
        name: 'Presentation',
        files: presentationFiles,
        type: 'presentation',
      })
    }

    if (businessFiles.length > 0) {
      layers.push({
        name: 'Business',
        files: businessFiles,
        type: 'business',
      })
    }

    if (dataFiles.length > 0) {
      layers.push({
        name: 'Data',
        files: dataFiles,
        type: 'data',
      })
    }

    if (sharedFiles.length > 0) {
      layers.push({
        name: 'Shared',
        files: sharedFiles,
        type: 'shared',
      })
    }

    return layers
  }

  private identifyEndpoints(): EndpointInfo[] {
    const endpoints: EndpointInfo[] = []

    for (const file of this.files) {
      const lines = file.content.split('\n')
      
      lines.forEach((line, index) => {
        const routeMatch = line.match(/(get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]/i)
        if (routeMatch) {
          endpoints.push({
            method: routeMatch[1].toUpperCase(),
            path: routeMatch[2],
            handler: file.path,
            filePath: file.path,
            line: index + 1,
          })
        }

        const expressMatch = line.match(/\.(get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]/i)
        if (expressMatch) {
          endpoints.push({
            method: expressMatch[1].toUpperCase(),
            path: expressMatch[2],
            handler: file.path,
            filePath: file.path,
            line: index + 1,
          })
        }
      })
    }

    return endpoints
  }

  private identifyDataFlow(): any[] {
    const dataFlow: any[] = []

    for (const file of this.files) {
      const lines = file.content.split('\n')
      
      lines.forEach((line, index) => {
        if (/fetch\(|axios\.|\.get\(|\.post\(/.test(line)) {
          const urlMatch = line.match(/['"`](https?:\/\/[^'"`]+)['"`]/)
          if (urlMatch) {
            dataFlow.push({
              from: file.path,
              to: urlMatch[1],
              type: 'api_call',
            })
          }
        }

        if (/\.query\(|\.execute\(|prisma\./.test(line)) {
          dataFlow.push({
            from: file.path,
            to: 'database',
            type: 'database',
          })
        }
      })
    }

    return dataFlow
  }
}

