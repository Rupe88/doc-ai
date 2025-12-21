// Note: RAGEngine and VectorStore removed - embeddings don't work in Next.js server environment
// Documentation is generated using direct LLM calls with analysis context
import { EnhancedDocGenerator } from './enhanced-doc-generator'
import { getAIProvider } from './providers/factory'
import type { AnalysisResult, FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface DocGenerationOptions {
  includeSecurityAnalysis?: boolean
  includePerformanceAnalysis?: boolean
  includeArchitectureDiagrams?: boolean
}

export class DocGenerator {
  private enhancedGenerator: EnhancedDocGenerator
  private llm: Awaited<ReturnType<typeof getAIProvider>>

  constructor() {
    this.enhancedGenerator = new EnhancedDocGenerator()
    this.llm = null as any
  }

  private async getLLM() {
    if (!this.llm) {
      this.llm = await getAIProvider()
    }
    return this.llm
  }

  async generateOverviewDoc(
    repoId: string,
    repoName: string,
    analysisResult: AnalysisResult,
    options: DocGenerationOptions = {}
  ): Promise<string> {
    // Generate documentation using LLM with analysis context (no embeddings needed)
    const context = this.buildAnalysisContext(analysisResult)
    const content = await this.generateDocumentationWithLLM(repoName, context)

    let doc = `# ${repoName}\n\n`
    doc += content + '\n\n'

    // Always include architecture section if there are layers
    if (analysisResult.architecture.layers.length > 0) {
      doc += this.generateArchitectureSection(analysisResult.architecture)
    }

    // Always include security section if there are issues
    if (analysisResult.securityIssues.length > 0) {
      doc += this.generateSecuritySection(analysisResult.securityIssues)
    }

    // Always include performance section if there are issues
    if (analysisResult.performanceIssues.length > 0) {
      doc += this.generatePerformanceSection(analysisResult.performanceIssues)
    }

    return doc
  }

  private buildAnalysisContext(analysisResult: AnalysisResult): string {
    let context = '## Codebase Analysis\n\n'

    context += `### Structure\n`
    context += `- Functions: ${analysisResult.structure.functions.length}\n`
    context += `- Classes: ${analysisResult.structure.classes.length}\n`
    context += `- Interfaces: ${analysisResult.structure.interfaces.length}\n\n`

    // Add top functions
    if (analysisResult.structure.functions.length > 0) {
      context += `### Key Functions\n`
      analysisResult.structure.functions.slice(0, 10).forEach(f => {
        context += `- \`${f.name}\`: ${f.signature || 'No signature'}\n`
      })
      context += '\n'
    }

    // Add top classes
    if (analysisResult.structure.classes.length > 0) {
      context += `### Key Classes\n`
      analysisResult.structure.classes.slice(0, 10).forEach(c => {
        context += `- \`${c.name}\`: ${c.methods.length} methods, ${c.properties.length} properties\n`
      })
      context += '\n'
    }

    // Add patterns
    if (analysisResult.patterns.length > 0) {
      context += `### Design Patterns\n`
      context += analysisResult.patterns.map(p => `- ${p}`).join('\n') + '\n\n'
    }

    // Add architecture layers
    if (analysisResult.architecture.layers.length > 0) {
      context += `### Architecture Layers\n`
      analysisResult.architecture.layers.forEach(layer => {
        context += `- **${layer.name}** (${layer.type}): ${layer.files.length} files\n`
      })
      context += '\n'
    }

    return context
  }

  private async generateDocumentationWithLLM(repoName: string, context: string): Promise<string> {
    const prompt = `You are an expert technical writer. Generate comprehensive documentation for a codebase called "${repoName}".

${context}

Generate documentation that includes:
1. **Overview** - What this codebase does and its main purpose
2. **Getting Started** - How to set up and use this project
3. **Key Components** - Main modules and their responsibilities
4. **API Reference** - Brief overview of main functions and classes
5. **Best Practices** - Recommendations for working with this codebase

Format the output in clean Markdown. Be concise but thorough.`

    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch (error) {
      console.error('[DocGenerator] LLM call failed:', error)
      // Return a basic documentation structure
      return `## Overview\n\nThis is the documentation for ${repoName}.\n\n${context}`
    }
  }

  async generateFunctionDoc(
    repoId: string,
    functionInfo: FunctionInfo,
    filePath: string,
    allFunctions: FunctionInfo[] = []
  ): Promise<string> {
    // Use enhanced generator for in-depth documentation
    return await this.enhancedGenerator.generateEnhancedFunctionDoc(
      repoId,
      functionInfo,
      filePath,
      allFunctions,
      {
        includeExamples: true,
        includeCrossReferences: true,
        includeDeepExplanations: true,
        includeRelatedFunctions: true,
      }
    )
  }

  async generateClassDoc(
    repoId: string,
    classInfo: ClassInfo,
    filePath: string,
    allClasses: ClassInfo[] = []
  ): Promise<string> {
    // Use enhanced generator for in-depth documentation
    return await this.enhancedGenerator.generateEnhancedClassDoc(
      repoId,
      classInfo,
      filePath,
      allClasses,
      {
        includeExamples: true,
        includeCrossReferences: true,
        includeDeepExplanations: true,
        includeRelatedFunctions: true,
      }
    )
  }

  private generateArchitectureSection(architecture: any): string {
    let section = `## Architecture\n\n`

    architecture.layers.forEach((layer: any) => {
      section += `### ${layer.name} Layer\n\n`
      section += `Type: ${layer.type}\n\n`
      section += `Files:\n`
      layer.files.slice(0, 10).forEach((file: string) => {
        section += `- \`${file}\`\n`
      })
      section += '\n'
    })

    if (architecture.endpoints.length > 0) {
      section += `### API Endpoints\n\n`
      architecture.endpoints.forEach((endpoint: any) => {
        section += `- \`${endpoint.method} ${endpoint.path}\` - ${endpoint.handler}\n`
      })
      section += '\n'
    }

    return section
  }

  private generateSecuritySection(issues: any[]): string {
    let section = `## Security Analysis\n\n`

    const highIssues = issues.filter(i => i.severity === 'high')
    const mediumIssues = issues.filter(i => i.severity === 'medium')
    const lowIssues = issues.filter(i => i.severity === 'low')

    if (highIssues.length > 0) {
      section += `### High Priority Issues\n\n`
      highIssues.slice(0, 5).forEach(issue => {
        section += `- **${issue.type}** in \`${issue.filePath}:${issue.line}\`\n`
        section += `  ${issue.description}\n`
        section += `  Recommendation: ${issue.recommendation}\n\n`
      })
    }

    if (mediumIssues.length > 0) {
      section += `### Medium Priority Issues\n\n`
      mediumIssues.slice(0, 5).forEach(issue => {
        section += `- **${issue.type}** in \`${issue.filePath}:${issue.line}\`\n`
      })
      section += '\n'
    }

    return section
  }

  private generatePerformanceSection(issues: any[]): string {
    let section = `## Performance Analysis\n\n`

    issues.slice(0, 10).forEach(issue => {
      section += `- **${issue.type}** (${issue.severity}) in \`${issue.filePath}:${issue.line}\`\n`
      section += `  ${issue.description}\n`
      section += `  Recommendation: ${issue.recommendation}\n\n`
    })

    return section
  }
}

