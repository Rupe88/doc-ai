// Note: RAGEngine and VectorStore removed - embeddings don't work in Next.js server environment
// Documentation is generated using direct LLM calls with function code as context
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'
import { getAIProvider } from './providers/factory'
import { CodeSummarizer } from '@/lib/nlp/code-summarization'
import { CodeToNaturalLanguage } from '@/lib/nlp/code-to-nl'
import { CodeSentimentAnalyzer } from '@/lib/nlp/sentiment-analysis'

export interface EnhancedDocOptions {
  includeExamples?: boolean
  includeCrossReferences?: boolean
  includeDeepExplanations?: boolean
  includeRelatedFunctions?: boolean
}

export class EnhancedDocGenerator {
  private llm: Awaited<ReturnType<typeof getAIProvider>>
  private summarizer: CodeSummarizer
  private codeToNL: CodeToNaturalLanguage
  private sentimentAnalyzer: CodeSentimentAnalyzer

  constructor() {
    this.llm = null as any
    this.summarizer = new CodeSummarizer()
    this.codeToNL = new CodeToNaturalLanguage()
    this.sentimentAnalyzer = new CodeSentimentAnalyzer()
  }

  private async getLLM() {
    if (!this.llm) {
      this.llm = await getAIProvider()
    }
    return this.llm
  }

  /**
   * Generate enhanced function documentation with detailed descriptions, examples, and cross-references
   */
  async generateEnhancedFunctionDoc(
    repoId: string,
    functionInfo: FunctionInfo,
    filePath: string,
    allFunctions: FunctionInfo[],
    options: EnhancedDocOptions = {}
  ): Promise<string> {
    // Use function code directly as context (no embeddings needed)
    const codeContext = this.getCodeContext(functionInfo)
    
    // Build comprehensive documentation
    let doc = `# ${functionInfo.name}\n\n`
    
    // Add signature
    if (functionInfo.signature) {
      doc += `\`\`\`typescript\n${functionInfo.signature}\n\`\`\`\n\n`
    }
    
    // File and location
    doc += `**File:** \`${filePath}\`  \n`
    doc += `**Lines:** ${functionInfo.lineStart}-${functionInfo.lineEnd}  \n`
    doc += `**Complexity:** ${this.getComplexityLabel(functionInfo.complexity)}\n\n`
    
    // Description (from JSDoc or AI-generated)
    const description = await this.generateDescription(functionInfo, codeContext)
    if (description) {
      doc += `## Description\n\n${description}\n\n`
    }

    // Add NLP-powered summary
    if (functionInfo.code) {
      try {
        const summary = await this.summarizer.summarizeFunction(functionInfo, functionInfo.code)
        if (summary.summary) {
          doc += `## Summary\n\n${summary.summary}\n\n`
          if (summary.keyPoints && summary.keyPoints.length > 0) {
            doc += `### Key Points\n\n`
            summary.keyPoints.forEach(point => {
              doc += `- ${point}\n`
            })
            doc += '\n'
          }
        }
      } catch (error) {
        // Continue if summarization fails
        console.error('Summarization failed:', error)
      }
    }

    // Add plain English explanation
    if (functionInfo.code) {
      try {
        const plainEnglish = await this.codeToNL.explainFunction(functionInfo, functionInfo.code)
        doc += `## Plain English Explanation\n\n${plainEnglish}\n\n`
      } catch (error) {
        // Continue if explanation fails
        console.error('Code explanation failed:', error)
      }
    }
    
    // Parameters section with detailed descriptions
    if (functionInfo.parameters.length > 0) {
      doc += `## Parameters\n\n`
      for (const param of functionInfo.parameters) {
        doc += `### \`${param.name}\`${param.optional ? ' (optional)' : ''}\n\n`
        
        // Type
        if (param.type) {
          doc += `- **Type:** \`${param.type}\`\n`
        }
        
        // Description from JSDoc or AI
        const paramDescription = await this.getParameterDescription(
          functionInfo,
          param.name,
          codeContext
        )
        if (paramDescription) {
          doc += `- **Description:** ${paramDescription}\n`
        }
        
        // Default value
        if (param.defaultValue) {
          doc += `- **Default:** \`${param.defaultValue}\`\n`
        }
        
        doc += '\n'
      }
    }
    
    // Returns section
    if (functionInfo.returnType) {
      doc += `## Returns\n\n`
      doc += `- **Type:** \`${functionInfo.returnType}\`\n`
      
      const returnDescription = await this.getReturnDescription(functionInfo, codeContext)
      if (returnDescription) {
        doc += `- **Description:** ${returnDescription}\n`
      }
      doc += '\n'
    }
    
    // Examples section
    if (options.includeExamples !== false) {
      const examples = await this.generateExamples(functionInfo, codeContext)
      if (examples.length > 0) {
        doc += `## Examples\n\n`
        examples.forEach((example, index) => {
          doc += `### Example ${index + 1}\n\n`
          doc += `\`\`\`typescript\n${example}\n\`\`\`\n\n`
        })
      }
    }
    
    // Edge cases and error handling
    const edgeCases = await this.generateEdgeCases(functionInfo, codeContext)
    if (edgeCases.length > 0) {
      doc += `## Edge Cases & Error Handling\n\n`
      edgeCases.forEach(edgeCase => {
        doc += `- ${edgeCase}\n`
      })
      doc += '\n'
    }
    
    // Performance considerations
    const performanceNotes = await this.generatePerformanceNotes(functionInfo, codeContext)
    if (performanceNotes) {
      doc += `## Performance\n\n${performanceNotes}\n\n`
    }

    // Add NLP-powered complexity and quality analysis
    if (functionInfo.code) {
      try {
        const complexity = await this.sentimentAnalyzer.analyzeComplexity(functionInfo.code, functionInfo)
        const quality = await this.sentimentAnalyzer.assessQuality(functionInfo.code, functionInfo)
        
        doc += `## Code Quality Analysis\n\n`
        doc += `- **Complexity**: ${complexity.label} (${(complexity.overall * 100).toFixed(0)}%)\n`
        doc += `- **Maintainability**: ${(complexity.maintainability * 100).toFixed(0)}%\n`
        doc += `- **Readability**: ${(complexity.readability * 100).toFixed(0)}%\n`
        doc += `- **Overall Quality**: ${quality.label} (${(quality.overall * 100).toFixed(0)}%)\n\n`

        // Add detected issues
        const issues = await this.sentimentAnalyzer.detectIssues(functionInfo.code, functionInfo)
        if (issues.length > 0) {
          doc += `## Code Issues\n\n`
          issues.forEach(issue => {
            doc += `### ${issue.type} (${issue.severity})\n\n`
            doc += `${issue.description}\n\n`
            doc += `**Suggestion**: ${issue.suggestion}\n\n`
            doc += `**Impact**: ${issue.impact}\n\n`
          })
        }
      } catch (error) {
        // Continue if analysis fails
        console.error('Quality analysis failed:', error)
      }
    }
    
    // Related functions
    if (options.includeRelatedFunctions !== false) {
      const related = this.findRelatedFunctions(functionInfo, allFunctions)
      if (related.length > 0) {
        doc += `## Related Functions\n\n`
        related.forEach(rel => {
          doc += `- [\`${rel.name}\`](#${rel.name.toLowerCase()}) - ${rel.description || 'Related function'}\n`
        })
        doc += '\n'
      }
    }
    
    // Cross-references
    if (options.includeCrossReferences !== false) {
      const crossRefs = await this.findCrossReferences(functionInfo, allFunctions)
      if (crossRefs.length > 0) {
        doc += `## See Also\n\n`
        crossRefs.forEach(ref => {
          doc += `- [\`${ref.name}\`](./${ref.filePath}#${ref.name.toLowerCase()}) - ${ref.reason}\n`
        })
        doc += '\n'
      }
    }
    
    // Implementation details (if needed)
    if (functionInfo.code && functionInfo.complexity > 5) {
      doc += `## Implementation Details\n\n`
      doc += `\`\`\`typescript\n${this.trimCode(functionInfo.code, 50)}\n\`\`\`\n\n`
    }
    
    return doc
  }

  /**
   * Generate enhanced class documentation
   */
  async generateEnhancedClassDoc(
    repoId: string,
    classInfo: ClassInfo,
    filePath: string,
    allClasses: ClassInfo[],
    options: EnhancedDocOptions = {}
  ): Promise<string> {
    let doc = `# ${classInfo.name}\n\n`
    
    // File and location
    doc += `**File:** \`${filePath}\`  \n`
    doc += `**Lines:** ${classInfo.lineStart}-${classInfo.lineEnd}\n\n`
    
    // Description
    if (classInfo.description) {
      doc += `## Description\n\n${classInfo.description}\n\n`
    }
    
    // Extends/Implements
    if (classInfo.extends) {
      doc += `**Extends:** \`${classInfo.extends}\`\n\n`
    }
    
    if (classInfo.implements && classInfo.implements.length > 0) {
      doc += `**Implements:** ${classInfo.implements.map(i => `\`${i}\``).join(', ')}\n\n`
    }
    
    // Properties
    if (classInfo.properties.length > 0) {
      doc += `## Properties\n\n`
      for (const prop of classInfo.properties) {
        doc += `### \`${prop.name}\`${prop.readonly ? ' (readonly)' : ''}\n\n`
        if (prop.type) {
          doc += `- **Type:** \`${prop.type}\`\n`
        }
        if (prop.optional) {
          doc += `- **Optional:** Yes\n`
        }
        doc += '\n'
      }
    }
    
    // Methods
    if (classInfo.methods.length > 0) {
      doc += `## Methods\n\n`
      for (const method of classInfo.methods) {
        doc += `### \`${method.name}\`\n\n`
        if (method.signature) {
          doc += `\`\`\`typescript\n${method.signature}\n\`\`\`\n\n`
        }
        if (method.description) {
          doc += `${method.description}\n\n`
        }
        if (method.parameters.length > 0) {
          doc += `**Parameters:** ${method.parameters.map(p => `\`${p.name}: ${p.type || 'any'}\``).join(', ')}\n\n`
        }
        if (method.returnType) {
          doc += `**Returns:** \`${method.returnType}\`\n\n`
        }
      }
    }
    
    // Usage example
    if (options.includeExamples !== false) {
      const example = await this.generateClassExample(classInfo)
      if (example) {
        doc += `## Usage Example\n\n`
        doc += `\`\`\`typescript\n${example}\n\`\`\`\n\n`
      }
    }
    
    return doc
  }

  // Helper methods

  /**
   * Get code context from function info directly (no embeddings needed)
   */
  private getCodeContext(functionInfo: FunctionInfo): string {
    // Build context from function info - no vector store needed
    let context = ''
    
    if (functionInfo.code) {
      context = functionInfo.code
    } else {
      // Fallback: construct from signature and parameters
      const params = functionInfo.parameters
        .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type || 'any'}`)
        .join(', ')
      context = `function ${functionInfo.name}(${params})${functionInfo.returnType ? `: ${functionInfo.returnType}` : ''}`
    }
    
    return context
  }

  private async generateDescription(
    functionInfo: FunctionInfo,
    codeContext: string
  ): Promise<string> {
    // Use JSDoc description if available
    if (functionInfo.jsdoc?.description) {
      return functionInfo.jsdoc.description
    }
    
    // Generate with AI
    const prompt = `Generate a clear, concise description for this function based on its code:

Function: ${functionInfo.name}
Signature: ${functionInfo.signature || 'N/A'}
Code Context:
${codeContext.slice(0, 1000)}

Provide a 1-2 sentence description explaining what this function does.`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch {
      return `Function ${functionInfo.name}`
    }
  }

  private async getParameterDescription(
    functionInfo: FunctionInfo,
    paramName: string,
    codeContext: string
  ): Promise<string | null> {
    // Check JSDoc first
    const jsdocParam = functionInfo.jsdoc?.params?.find(p => p.name === paramName)
    if (jsdocParam?.description) {
      return jsdocParam.description
    }
    
    // Generate with AI
    const prompt = `Describe what the parameter "${paramName}" does in this function:

Function: ${functionInfo.name}
Code Context:
${codeContext.slice(0, 800)}

Provide a brief 1-sentence description.`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch {
      return null
    }
  }

  private async getReturnDescription(
    functionInfo: FunctionInfo,
    codeContext: string
  ): Promise<string | null> {
    // Check JSDoc first
    if (functionInfo.jsdoc?.returns?.description) {
      return functionInfo.jsdoc.returns.description
    }
    
    // Generate with AI
    const prompt = `Describe what this function returns:

Function: ${functionInfo.name}
Return Type: ${functionInfo.returnType || 'void'}
Code Context:
${codeContext.slice(0, 800)}

Provide a brief 1-sentence description.`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch {
      return null
    }
  }

  private async generateExamples(
    functionInfo: FunctionInfo,
    codeContext: string
  ): Promise<string[]> {
    const examples: string[] = []
    
    // Use JSDoc examples if available
    if (functionInfo.jsdoc?.examples) {
      examples.push(...functionInfo.jsdoc.examples)
    }
    
    // Generate additional examples with AI
    const prompt = `Generate 2-3 practical code examples showing how to use this function:

Function: ${functionInfo.name}
Signature: ${functionInfo.signature || 'N/A'}
Parameters: ${functionInfo.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}
Return Type: ${functionInfo.returnType || 'void'}
Code Context:
${codeContext.slice(0, 1000)}

Generate realistic TypeScript examples. Return only the code examples, one per line, separated by "---".`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      const aiExamples = response.split('---').map((e: string) => e.trim()).filter(Boolean)
      examples.push(...aiExamples.slice(0, 2))
    } catch {
      // Fallback to basic example
      if (examples.length === 0) {
        const paramList = functionInfo.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')
        examples.push(`const result = ${functionInfo.name}(${paramList})`)
      }
    }
    
    return examples.slice(0, 3)
  }

  private async generateEdgeCases(
    functionInfo: FunctionInfo,
    codeContext: string
  ): Promise<string[]> {
    const prompt = `List edge cases and error scenarios for this function:

Function: ${functionInfo.name}
Parameters: ${functionInfo.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}
Code Context:
${codeContext.slice(0, 1000)}

List 3-5 edge cases or error scenarios. Return as a bulleted list.`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response.split('\n').filter((line: string) => line.trim().startsWith('-')).slice(0, 5)
    } catch {
      return []
    }
  }

  private async generatePerformanceNotes(
    functionInfo: FunctionInfo,
    codeContext: string
  ): Promise<string | null> {
    if (functionInfo.complexity <= 3) {
      return null // Simple functions don't need performance notes
    }
    
    const prompt = `Analyze performance characteristics of this function:

Function: ${functionInfo.name}
Complexity: ${functionInfo.complexity}
Code Context:
${codeContext.slice(0, 1000)}

Provide brief performance notes (time/space complexity, optimization tips).`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch {
      return null
    }
  }

  private findRelatedFunctions(
    functionInfo: FunctionInfo,
    allFunctions: FunctionInfo[]
  ): Array<{ name: string; description?: string }> {
    // Find functions with similar names or parameters
    const related: Array<{ name: string; description?: string }> = []
    
    const nameWords = functionInfo.name.toLowerCase().split(/(?=[A-Z])|_/).filter(Boolean)
    
    for (const func of allFunctions) {
      if (func.name === functionInfo.name) continue
      
      const funcWords = func.name.toLowerCase().split(/(?=[A-Z])|_/).filter(Boolean)
      const commonWords = nameWords.filter(w => funcWords.includes(w))
      
      if (commonWords.length > 0) {
        related.push({
          name: func.name,
          description: func.jsdoc?.description,
        })
      }
    }
    
    return related.slice(0, 5)
  }

  private async findCrossReferences(
    functionInfo: FunctionInfo,
    allFunctions: FunctionInfo[]
  ): Promise<Array<{ name: string; filePath: string; reason: string }>> {
    const refs: Array<{ name: string; filePath: string; reason: string }> = []
    
    // Find functions that might call this one or be called by this one
    // This is simplified - in production, you'd analyze actual call graphs
    
    return refs
  }

  private async generateClassExample(classInfo: ClassInfo): Promise<string | null> {
    const prompt = `Generate a practical usage example for this class:

Class: ${classInfo.name}
Properties: ${classInfo.properties.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}
Methods: ${classInfo.methods.map(m => m.name).join(', ')}

Generate a realistic TypeScript example showing how to instantiate and use this class.`
    
    try {
      const llm = await this.getLLM()
      const response = await llm.chat(prompt)
      return response
    } catch {
      return null
    }
  }

  private getComplexityLabel(complexity: number): string {
    if (complexity <= 3) return 'Low'
    if (complexity <= 7) return 'Medium'
    if (complexity <= 15) return 'High'
    return 'Very High'
  }

  private trimCode(code: string, maxLines: number): string {
    const lines = code.split('\n')
    if (lines.length <= maxLines) return code
    return lines.slice(0, maxLines).join('\n') + '\n// ... (truncated)'
  }
}

