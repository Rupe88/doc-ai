/**
 * Code-to-Natural-Language Conversion
 * Converts code to human-readable natural language explanations
 */

import { ChatOpenAI } from '@langchain/openai'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface CodeExplanation {
  summary: string
  stepByStep: string[]
  keyConcepts: string[]
  examples: string[]
  relatedPatterns: string[]
  complexity: string
}

export interface PlainEnglishExplanation {
  what: string
  why: string
  how: string
  when: string
  where: string
}

export class CodeToNaturalLanguage {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2,
    })
  }

  /**
   * Explain code in plain English
   */
  async explainCode(code: string, context?: string): Promise<PlainEnglishExplanation> {
    const prompt = `Explain this code in plain English:

Code:
\`\`\`typescript
${code.slice(0, 1500)}
\`\`\`

${context ? `Context: ${context}` : ''}

Return JSON with:
- what: What does this code do? (1-2 sentences)
- why: Why is this code needed? (1-2 sentences)
- how: How does it work? (2-3 sentences)
- when: When is this code executed? (1 sentence)
- where: Where is this code used? (1 sentence)

Example:
{
  "what": "This function validates user input by checking if it's not empty and matches the expected format",
  "why": "To prevent invalid data from entering the system and ensure data integrity",
  "how": "It first checks if the input exists, then uses a regex pattern to validate the format, and returns true if valid",
  "when": "This function is called whenever user input needs to be validated before processing",
  "where": "Used in API endpoints and form validation handlers"
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as PlainEnglishExplanation
    } catch {
      return {
        what: 'This code processes data',
        why: 'To perform necessary operations',
        how: 'It executes a series of steps',
        when: 'When called',
        where: 'In the application',
      }
    }
  }

  /**
   * Generate detailed code explanation
   */
  async generateDetailedExplanation(
    code: string,
    functionInfo?: FunctionInfo,
    context?: string
  ): Promise<CodeExplanation> {
    const prompt = `Generate a detailed explanation for this code:

${functionInfo ? `Function: ${functionInfo.name}` : ''}
${functionInfo ? `Parameters: ${functionInfo.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}` : ''}
${functionInfo ? `Return Type: ${functionInfo.returnType || 'void'}` : ''}
${functionInfo ? `Complexity: ${functionInfo.complexity}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

${context ? `Context: ${context}` : ''}

Return JSON with:
- summary: 2-3 sentence summary
- stepByStep: array of step-by-step explanations
- keyConcepts: array of key programming concepts used
- examples: array of example use cases
- relatedPatterns: array of related design patterns or algorithms
- complexity: explanation of time/space complexity

Example:
{
  "summary": "This function validates and processes user input by checking format and sanitizing data",
  "stepByStep": [
    "First, it checks if the input exists",
    "Then validates the format using regex",
    "Finally sanitizes the input and returns the result"
  ],
  "keyConcepts": ["input validation", "regex patterns", "data sanitization"],
  "examples": ["Validating email addresses", "Checking password strength"],
  "relatedPatterns": ["Validation pattern", "Sanitization pattern"],
  "complexity": "Time: O(n) where n is input length, Space: O(1)"
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeExplanation
    } catch {
      return {
        summary: 'This code performs operations on data',
        stepByStep: ['Step 1: Process input', 'Step 2: Transform data', 'Step 3: Return result'],
        keyConcepts: ['data processing'],
        examples: ['Processing user input'],
        relatedPatterns: [],
        complexity: 'O(n)',
      }
    }
  }

  /**
   * Explain function in simple terms
   */
  async explainFunction(functionInfo: FunctionInfo, code: string): Promise<string> {
    const prompt = `Explain this function in simple, non-technical terms:

Function Name: ${functionInfo.name}
Parameters: ${functionInfo.parameters.map(p => p.name).join(', ')}
Return Type: ${functionInfo.returnType || 'void'}

Code:
\`\`\`typescript
${code.slice(0, 1000)}
\`\`\`

Explain what this function does as if explaining to a non-programmer. Use simple language and analogies.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      return `Function ${functionInfo.name} processes the given inputs and returns a result.`
    }
  }

  /**
   * Explain class in simple terms
   */
  async explainClass(classInfo: ClassInfo, code: string): Promise<string> {
    const prompt = `Explain this class in simple, non-technical terms:

Class Name: ${classInfo.name}
Methods: ${classInfo.methods.map(m => m.name).join(', ')}
Properties: ${classInfo.properties.map(p => p.name).join(', ')}

Code Preview:
\`\`\`typescript
${code.slice(0, 1500)}
\`\`\`

Explain what this class does as if explaining to a non-programmer. Use simple language and analogies.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      return `Class ${classInfo.name} provides functionality for the application.`
    }
  }

  /**
   * Generate educational content about code
   */
  async generateEducationalContent(
    code: string,
    topic: string
  ): Promise<{
    introduction: string
    concepts: Array<{ concept: string; explanation: string }>
    examples: string[]
    exercises: string[]
    furtherReading: string[]
  }> {
    const prompt = `Generate educational content about this code:

Topic: ${topic}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- introduction: 2-3 sentence introduction to the topic
- concepts: array of {concept, explanation} pairs explaining key concepts
- examples: array of example use cases
- exercises: array of exercise ideas for learning
- furtherReading: array of topics for further study

Example:
{
  "introduction": "This code demonstrates how to validate user input in TypeScript",
  "concepts": [
    {"concept": "Input Validation", "explanation": "Checking if user input meets certain criteria"},
    {"concept": "Regex Patterns", "explanation": "Using regular expressions to match patterns"}
  ],
  "examples": ["Validating email addresses", "Checking password strength"],
  "exercises": ["Create a function to validate phone numbers", "Add validation for date formats"],
  "furtherReading": ["TypeScript type guards", "Form validation best practices"]
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        introduction: `This code demonstrates ${topic}`,
        concepts: [],
        examples: [],
        exercises: [],
        furtherReading: [],
      }
    }
  }

  /**
   * Generate code walkthrough
   */
  async generateWalkthrough(code: string, functionName?: string): Promise<{
    overview: string
    steps: Array<{ line: number; code: string; explanation: string }>
    summary: string
  }> {
    const lines = code.split('\n')
    const stepSize = Math.max(1, Math.floor(lines.length / 10))

    const prompt = `Generate a step-by-step walkthrough for this code:

${functionName ? `Function: ${functionName}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- overview: 1-2 sentence overview
- steps: array of {line, code, explanation} for key steps
- summary: final summary

Example:
{
  "overview": "This function validates user input step by step",
  "steps": [
    {"line": 1, "code": "if (!input)", "explanation": "First check if input exists"},
    {"line": 5, "code": "const pattern = /^[a-z]+$/", "explanation": "Define validation pattern"}
  ],
  "summary": "The function validates input and returns true if valid"
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        overview: 'This code performs operations step by step',
        steps: lines.slice(0, 5).map((line, i) => ({
          line: i + 1,
          code: line,
          explanation: `Line ${i + 1} executes`,
        })),
        summary: 'The code completes its operations',
      }
    }
  }

  /**
   * Convert algorithm to natural language
   */
  async explainAlgorithm(code: string, algorithmName?: string): Promise<{
    name: string
    description: string
    steps: string[]
    complexity: { time: string; space: string }
    useCases: string[]
  }> {
    const prompt = `Explain this algorithm:

${algorithmName ? `Algorithm: ${algorithmName}` : ''}

Code:
\`\`\`typescript
${code.slice(0, 2000)}
\`\`\`

Return JSON with:
- name: algorithm name
- description: what the algorithm does
- steps: array of step descriptions
- complexity: {time, space} complexity analysis
- useCases: array of when to use this algorithm

Example:
{
  "name": "Binary Search",
  "description": "Efficiently finds an element in a sorted array",
  "steps": [
    "Start with the middle element",
    "Compare with target",
    "Eliminate half of the array",
    "Repeat until found"
  ],
  "complexity": {"time": "O(log n)", "space": "O(1)"},
  "useCases": ["Searching in sorted arrays", "Finding boundaries"]
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        name: algorithmName || 'Algorithm',
        description: 'Processes data efficiently',
        steps: ['Step 1', 'Step 2', 'Step 3'],
        complexity: { time: 'O(n)', space: 'O(1)' },
        useCases: ['Data processing'],
      }
    }
  }

  /**
   * Generate learning path for codebase
   */
  async generateLearningPath(
    functions: FunctionInfo[],
    classes: ClassInfo[]
  ): Promise<{
    beginner: Array<{ name: string; reason: string }>
    intermediate: Array<{ name: string; reason: string }>
    advanced: Array<{ name: string; reason: string }>
  }> {
    const prompt = `Create a learning path for understanding this codebase:

Functions: ${functions.map(f => f.name).join(', ')}
Classes: ${classes.map(c => c.name).join(', ')}

Return JSON with:
- beginner: array of {name, reason} for beginner concepts
- intermediate: array of {name, reason} for intermediate concepts
- advanced: array of {name, reason} for advanced concepts

Example:
{
  "beginner": [
    {"name": "validateInput", "reason": "Simple validation logic, easy to understand"}
  ],
  "intermediate": [
    {"name": "processData", "reason": "Involves data transformation and error handling"}
  ],
  "advanced": [
    {"name": "optimizeQuery", "reason": "Complex algorithm with performance optimizations"}
  ]
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result
    } catch {
      return {
        beginner: functions.slice(0, 3).map(f => ({ name: f.name, reason: 'Simple function' })),
        intermediate: functions.slice(3, 6).map(f => ({ name: f.name, reason: 'Moderate complexity' })),
        advanced: functions.slice(6, 9).map(f => ({ name: f.name, reason: 'Complex function' })),
      }
    }
  }
}

