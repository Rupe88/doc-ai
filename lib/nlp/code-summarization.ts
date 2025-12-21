/**
 * Code Summarization using NLP
 * Generates concise summaries of code functions, classes, and files
 */

import { ChatOpenAI } from '@langchain/openai'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface CodeSummary {
  summary: string
  keyPoints: string[]
  complexity: 'low' | 'medium' | 'high'
  purpose: string
  inputs: string[]
  outputs: string[]
}

export class CodeSummarizer {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2,
    })
  }

  /**
   * Summarize a function
   */
  async summarizeFunction(functionInfo: FunctionInfo, code: string): Promise<CodeSummary> {
    const prompt = `Summarize this function:

Function: ${functionInfo.name}
Parameters: ${functionInfo.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}
Return Type: ${functionInfo.returnType || 'void'}
Complexity: ${functionInfo.complexity}
Code:
\`\`\`typescript
${code.slice(0, 1000)}
\`\`\`

Return JSON with:
- summary: 1-2 sentence summary
- keyPoints: array of 3-5 key points
- complexity: "low", "medium", or "high"
- purpose: what this function does
- inputs: array of input descriptions
- outputs: array of output descriptions`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeSummary
    } catch {
      return {
        summary: `Function ${functionInfo.name} with ${functionInfo.parameters.length} parameters`,
        keyPoints: [],
        complexity: functionInfo.complexity > 10 ? 'high' : functionInfo.complexity > 5 ? 'medium' : 'low',
        purpose: 'Processes input and returns output',
        inputs: functionInfo.parameters.map(p => p.name),
        outputs: functionInfo.returnType ? [functionInfo.returnType] : [],
      }
    }
  }

  /**
   * Summarize a class
   */
  async summarizeClass(classInfo: ClassInfo, code: string): Promise<CodeSummary> {
    const prompt = `Summarize this class:

Class: ${classInfo.name}
Methods: ${classInfo.methods.length}
Properties: ${classInfo.properties.length}
Extends: ${classInfo.extends || 'none'}
Implements: ${classInfo.implements?.join(', ') || 'none'}
Code:
\`\`\`typescript
${code.slice(0, 1500)}
\`\`\`

Return JSON with:
- summary: 1-2 sentence summary
- keyPoints: array of 3-5 key points
- complexity: "low", "medium", or "high"
- purpose: what this class does
- inputs: array of main inputs/properties
- outputs: array of main outputs/methods`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeSummary
    } catch {
      return {
        summary: `Class ${classInfo.name} with ${classInfo.methods.length} methods`,
        keyPoints: [],
        complexity: classInfo.methods.length > 10 ? 'high' : classInfo.methods.length > 5 ? 'medium' : 'low',
        purpose: 'Provides functionality for the application',
        inputs: classInfo.properties.map(p => p.name),
        outputs: classInfo.methods.map(m => m.name),
      }
    }
  }

  /**
   * Summarize a file
   */
  async summarizeFile(filePath: string, code: string, functions: FunctionInfo[], classes: ClassInfo[]): Promise<CodeSummary> {
    const prompt = `Summarize this file:

File: ${filePath}
Functions: ${functions.length}
Classes: ${classes.length}
Code Preview:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- summary: 1-2 sentence summary of the file's purpose
- keyPoints: array of 3-5 key points about what this file contains
- complexity: "low", "medium", or "high" based on code complexity
- purpose: what this file does
- inputs: array of main exports/functions
- outputs: array of main classes/types`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeSummary
    } catch {
      return {
        summary: `File ${filePath} with ${functions.length} functions and ${classes.length} classes`,
        keyPoints: [],
        complexity: (functions.length + classes.length) > 20 ? 'high' : (functions.length + classes.length) > 10 ? 'medium' : 'low',
        purpose: 'Contains code for the application',
        inputs: functions.slice(0, 5).map(f => f.name),
        outputs: classes.slice(0, 5).map(c => c.name),
      }
    }
  }

  /**
   * Generate abstract for codebase
   */
  async generateAbstract(
    functions: FunctionInfo[],
    classes: ClassInfo[],
    totalFiles: number
  ): Promise<string> {
    const prompt = `Generate a concise abstract for this codebase:

Total Files: ${totalFiles}
Functions: ${functions.length}
Classes: ${classes.length}
Top Functions: ${functions.slice(0, 10).map(f => f.name).join(', ')}
Top Classes: ${classes.slice(0, 10).map(c => c.name).join(', ')}

Generate a 2-3 sentence abstract describing what this codebase does.`

    try {
      const response = await this.llm.invoke(prompt)
      return response.content as string
    } catch {
      return `This codebase contains ${totalFiles} files with ${functions.length} functions and ${classes.length} classes.`
    }
  }

  /**
   * Generate one-line summary
   */
  async generateOneLineSummary(code: string, type: 'function' | 'class' | 'file'): Promise<string> {
    const prompt = `Generate a one-line summary for this ${type}:

\`\`\`typescript
${code.slice(0, 500)}
\`\`\`

Return only the summary, no additional text.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      return `A ${type} that processes data.`
    }
  }
}

