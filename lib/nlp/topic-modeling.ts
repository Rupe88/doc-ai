/**
 * Topic Modeling for Code
 * Identifies topics, themes, and patterns in codebase
 */

import { ChatOpenAI } from '@langchain/openai'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface CodeTopic {
  name: string
  description: string
  files: string[]
  functions: string[]
  classes: string[]
  keywords: string[]
  importance: number
  category: string
}

export interface Theme {
  name: string
  description: string
  topics: string[]
  files: string[]
  patterns: string[]
}

export interface TopicGroup {
  topic: string
  files: Array<{ path: string; relevance: number }>
  functions: Array<{ name: string; relevance: number }>
  classes: Array<{ name: string; relevance: number }>
}

export class CodeTopicModeler {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2,
    })
  }

  /**
   * Extract topics from codebase
   */
  async extractTopics(
    files: Array<{ path: string; functions: FunctionInfo[]; classes: ClassInfo[] }>
  ): Promise<CodeTopic[]> {
    const prompt = `Analyze this codebase and identify main topics/themes:

Files: ${files.map(f => f.path).join(', ')}
Total Functions: ${files.reduce((sum, f) => sum + f.functions.length, 0)}
Total Classes: ${files.reduce((sum, f) => sum + f.classes.length, 0)}

Return JSON array of topics with:
- name: topic name
- description: what this topic covers
- files: array of relevant file paths
- functions: array of relevant function names
- classes: array of relevant class names
- keywords: array of keywords for this topic
- importance: 0-1 score
- category: category (e.g., "authentication", "data_processing", "api")

Example:
[
  {
    "name": "User Authentication",
    "description": "Handles user login, registration, and session management",
    "files": ["auth.ts", "user.ts"],
    "functions": ["login", "register", "validateToken"],
    "classes": ["AuthService", "User"],
    "keywords": ["auth", "login", "password", "token", "session"],
    "importance": 0.9,
    "category": "authentication"
  }
]`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as CodeTopic[]
    } catch {
      // Fallback: simple topic extraction
      return this.extractTopicsFallback(files)
    }
  }

  /**
   * Fallback topic extraction
   */
  private extractTopicsFallback(
    files: Array<{ path: string; functions: FunctionInfo[]; classes: ClassInfo[] }>
  ): CodeTopic[] {
    const topics: CodeTopic[] = []
    const topicMap = new Map<string, CodeTopic>()

    for (const file of files) {
      const fileName = file.path.split('/').pop() || ''
      const category = this.inferCategory(fileName, file.functions, file.classes)

      if (!topicMap.has(category)) {
        topicMap.set(category, {
          name: category,
          description: `Code related to ${category}`,
          files: [],
          functions: [],
          classes: [],
          keywords: [category],
          importance: 0.5,
          category,
        })
      }

      const topic = topicMap.get(category)!
      topic.files.push(file.path)
      topic.functions.push(...file.functions.map(f => f.name))
      topic.classes.push(...file.classes.map(c => c.name))
    }

    return Array.from(topicMap.values())
  }

  /**
   * Infer category from file/function/class names
   */
  private inferCategory(
    fileName: string,
    functions: FunctionInfo[],
    classes: ClassInfo[]
  ): string {
    const nameLower = fileName.toLowerCase()
    const allNames = [
      fileName,
      ...functions.map(f => f.name),
      ...classes.map(c => c.name),
    ].join(' ').toLowerCase()

    if (allNames.includes('auth') || allNames.includes('login')) return 'authentication'
    if (allNames.includes('api') || allNames.includes('route')) return 'api'
    if (allNames.includes('valid') || allNames.includes('check')) return 'validation'
    if (allNames.includes('util') || allNames.includes('helper')) return 'utility'
    if (allNames.includes('db') || allNames.includes('database')) return 'database'
    if (allNames.includes('test')) return 'testing'
    if (allNames.includes('config')) return 'configuration'

    return 'general'
  }

  /**
   * Group files by topic
   */
  async groupByTopic(
    files: Array<{ path: string; functions: FunctionInfo[]; classes: ClassInfo[] }>
  ): Promise<TopicGroup[]> {
    const topics = await this.extractTopics(files)
    const groups: TopicGroup[] = []

    for (const topic of topics) {
      const group: TopicGroup = {
        topic: topic.name,
        files: topic.files.map(path => ({
          path,
          relevance: topic.importance,
        })),
        functions: topic.functions.map(name => ({
          name,
          relevance: topic.importance,
        })),
        classes: topic.classes.map(name => ({
          name,
          relevance: topic.importance,
        })),
      }
      groups.push(group)
    }

    return groups
  }

  /**
   * Identify themes in codebase
   */
  async identifyThemes(topics: CodeTopic[]): Promise<Theme[]> {
    const prompt = `Identify high-level themes from these topics:

Topics:
${topics.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Return JSON array of themes with:
- name: theme name
- description: theme description
- topics: array of related topic names
- files: array of relevant files
- patterns: array of design patterns used

Example:
[
  {
    "name": "Security & Authentication",
    "description": "All security-related functionality",
    "topics": ["authentication", "authorization", "encryption"],
    "files": ["auth.ts", "security.ts"],
    "patterns": ["JWT", "OAuth", "RBAC"]
  }
]`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as Theme[]
    } catch {
      // Fallback: group related topics
      return this.groupRelatedTopics(topics)
    }
  }

  /**
   * Group related topics into themes
   */
  private groupRelatedTopics(topics: CodeTopic[]): Theme[] {
    const themes: Theme[] = []
    const themeMap = new Map<string, Theme>()

    for (const topic of topics) {
      const themeName = this.getThemeName(topic.category)

      if (!themeMap.has(themeName)) {
        themeMap.set(themeName, {
          name: themeName,
          description: `Theme covering ${themeName.toLowerCase()}`,
          topics: [],
          files: [],
          patterns: [],
        })
      }

      const theme = themeMap.get(themeName)!
      theme.topics.push(topic.name)
      theme.files.push(...topic.files)
    }

    return Array.from(themeMap.values())
  }

  /**
   * Get theme name from category
   */
  private getThemeName(category: string): string {
    const categoryMap: Record<string, string> = {
      authentication: 'Security & Authentication',
      validation: 'Data Validation',
      'data_processing': 'Data Processing',
      api: 'API & Endpoints',
      utility: 'Utilities & Helpers',
      database: 'Database & Storage',
      testing: 'Testing & Quality',
      configuration: 'Configuration & Setup',
    }

    return categoryMap[category] || 'General'
  }

  /**
   * Find related topics
   */
  async findRelatedTopics(topic: CodeTopic, allTopics: CodeTopic[]): Promise<CodeTopic[]> {
    const related: CodeTopic[] = []

    for (const otherTopic of allTopics) {
      if (otherTopic.name === topic.name) continue

      // Check keyword overlap
      const commonKeywords = topic.keywords.filter(k => otherTopic.keywords.includes(k))
      if (commonKeywords.length > 0) {
        related.push(otherTopic)
      }

      // Check file overlap
      const commonFiles = topic.files.filter(f => otherTopic.files.includes(f))
      if (commonFiles.length > 0 && !related.includes(otherTopic)) {
        related.push(otherTopic)
      }
    }

    return related.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Generate topic summary
   */
  async generateTopicSummary(topic: CodeTopic): Promise<string> {
    const prompt = `Generate a comprehensive summary for this codebase topic:

Topic: ${topic.name}
Description: ${topic.description}
Files: ${topic.files.join(', ')}
Functions: ${topic.functions.join(', ')}
Classes: ${topic.classes.join(', ')}
Keywords: ${topic.keywords.join(', ')}

Generate a 2-3 paragraph summary explaining what this topic covers, its importance, and how it fits into the codebase.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      return `${topic.name} covers ${topic.description}. It includes ${topic.files.length} files, ${topic.functions.length} functions, and ${topic.classes.length} classes.`
    }
  }
}

