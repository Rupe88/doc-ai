/**
 * Named Entity Recognition (NER) for Code
 * Identifies and extracts entities (functions, classes, variables) from code
 */

import { ChatOpenAI } from '@langchain/openai'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface CodeEntity {
  name: string
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'constant' | 'enum'
  filePath: string
  lineStart: number
  lineEnd: number
  description: string
  relationships: EntityRelationship[]
  importance: 'high' | 'medium' | 'low'
  category: string
}

export interface EntityRelationship {
  target: string
  type: 'calls' | 'extends' | 'implements' | 'uses' | 'imports' | 'references'
  strength: number
}

export interface EntityClassification {
  entity: CodeEntity
  category: string
  subcategory?: string
  purpose: string
  domain: string[]
}

export class CodeEntityRecognizer {
  private llm: ChatOpenAI

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1,
    })
  }

  /**
   * Extract entities from code structure
   */
  async extractEntities(
    functions: FunctionInfo[],
    classes: ClassInfo[],
    filePath: string
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = []

    // Extract function entities
    for (const func of functions) {
      const entity = await this.extractFunctionEntity(func, filePath)
      entities.push(entity)
    }

    // Extract class entities
    for (const cls of classes) {
      const entity = await this.extractClassEntity(cls, filePath)
      entities.push(entity)
    }

    // Extract relationships
    const entitiesWithRelationships = await this.extractRelationships(entities)

    return entitiesWithRelationships
  }

  /**
   * Extract function entity with NLP analysis
   */
  private async extractFunctionEntity(func: FunctionInfo, filePath: string): Promise<CodeEntity> {
    const relationships: EntityRelationship[] = []

    // Analyze function calls and dependencies
    if (func.code) {
      const calls = await this.extractFunctionCalls(func.code)
      relationships.push(...calls)
    }

    // Classify function importance
    const importance = this.calculateImportance(func)

    // Categorize function
    const category = await this.categorizeEntity(func.name, func.code || '', 'function')

    // Generate description using NLP
    const description = await this.generateEntityDescription(func, 'function')

    return {
      name: func.name,
      type: 'function',
      filePath,
      lineStart: func.lineStart,
      lineEnd: func.lineEnd,
      description,
      relationships,
      importance,
      category,
    }
  }

  /**
   * Extract class entity with NLP analysis
   */
  private async extractClassEntity(cls: ClassInfo, filePath: string): Promise<CodeEntity> {
    const relationships: EntityRelationship[] = []

    // Extract inheritance relationships
    if (cls.extends) {
      relationships.push({
        target: cls.extends,
        type: 'extends',
        strength: 1.0,
      })
    }

    // Extract implementation relationships
    if (cls.implements) {
      for (const iface of cls.implements) {
        relationships.push({
          target: iface,
          type: 'implements',
          strength: 0.9,
        })
      }
    }

    // Extract method calls
    for (const method of cls.methods) {
      if (method.code) {
        const calls = await this.extractFunctionCalls(method.code)
        relationships.push(...calls)
      }
    }

    // Classify class importance
    const importance = this.calculateClassImportance(cls)

    // Categorize class
    const category = await this.categorizeEntity(cls.name, '', 'class')

    // Generate description using NLP
    const description = await this.generateEntityDescription(cls, 'class')

    return {
      name: cls.name,
      type: 'class',
      filePath,
      lineStart: cls.lineStart,
      lineEnd: cls.lineEnd,
      description,
      relationships,
      importance,
      category,
    }
  }

  /**
   * Extract function calls from code using NLP
   */
  private async extractFunctionCalls(code: string): Promise<EntityRelationship[]> {
    const prompt = `Extract all function calls from this code:

\`\`\`typescript
${code.slice(0, 1000)}
\`\`\`

Return JSON array with:
- target: function name being called
- type: "calls"
- strength: 0-1 based on how directly it's called

Example:
[
  {"target": "validateInput", "type": "calls", "strength": 1.0},
  {"target": "processData", "type": "calls", "strength": 0.8}
]`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return result as EntityRelationship[]
    } catch {
      // Fallback: simple regex extraction
      const functionCallRegex = /(\w+)\s*\(/g
      const calls: EntityRelationship[] = []
      let match
      while ((match = functionCallRegex.exec(code)) !== null) {
        calls.push({
          target: match[1],
          type: 'calls',
          strength: 0.7,
        })
      }
      return calls
    }
  }

  /**
   * Extract relationships between entities
   */
  private async extractRelationships(entities: CodeEntity[]): Promise<CodeEntity[]> {
    // Build entity map for quick lookup
    const entityMap = new Map<string, CodeEntity>()
    entities.forEach(e => entityMap.set(e.name, e))

    // Resolve relationships
    for (const entity of entities) {
      const resolvedRelationships: EntityRelationship[] = []

      for (const rel of entity.relationships) {
        // Check if target entity exists
        if (entityMap.has(rel.target)) {
          resolvedRelationships.push(rel)
        } else {
          // Check for partial matches
          const partialMatch = Array.from(entityMap.keys()).find(name =>
            name.toLowerCase().includes(rel.target.toLowerCase()) ||
            rel.target.toLowerCase().includes(name.toLowerCase())
          )
          if (partialMatch) {
            resolvedRelationships.push({
              ...rel,
              target: partialMatch,
            })
          }
        }
      }

      entity.relationships = resolvedRelationships
    }

    return entities
  }

  /**
   * Calculate entity importance using NLP
   */
  private calculateImportance(func: FunctionInfo): 'high' | 'medium' | 'low' {
    // High importance indicators
    if (func.complexity > 10) return 'high'
    if (func.parameters.length > 5) return 'high'
    if (func.jsdoc?.description) return 'high'
    if (func.name.toLowerCase().includes('main') || func.name.toLowerCase().includes('init')) return 'high'

    // Medium importance
    if (func.complexity > 5) return 'medium'
    if (func.parameters.length > 2) return 'medium'

    // Low importance
    return 'low'
  }

  /**
   * Calculate class importance
   */
  private calculateClassImportance(cls: ClassInfo): 'high' | 'medium' | 'low' {
    if (cls.methods.length > 15) return 'high'
    if (cls.extends || cls.implements) return 'high'
    if (cls.methods.length > 5) return 'medium'
    return 'low'
  }

  /**
   * Categorize entity using NLP
   */
  private async categorizeEntity(name: string, code: string, type: string): Promise<string> {
    const prompt = `Categorize this ${type}:

Name: ${name}
Code Preview: ${code.slice(0, 500)}

Return a single category name (e.g., "authentication", "validation", "data_processing", "api_handler", "utility", "business_logic", "infrastructure").

Return only the category name, no additional text.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      // Fallback categorization
      const nameLower = name.toLowerCase()
      if (nameLower.includes('auth') || nameLower.includes('login')) return 'authentication'
      if (nameLower.includes('valid') || nameLower.includes('check')) return 'validation'
      if (nameLower.includes('api') || nameLower.includes('route')) return 'api_handler'
      if (nameLower.includes('util') || nameLower.includes('helper')) return 'utility'
      return 'business_logic'
    }
  }

  /**
   * Generate entity description using NLP
   */
  private async generateEntityDescription(
    entity: FunctionInfo | ClassInfo,
    type: 'function' | 'class'
  ): Promise<string> {
    const prompt = `Generate a concise description for this ${type}:

Name: ${entity.name}
${type === 'function' ? `Parameters: ${(entity as FunctionInfo).parameters.map(p => p.name).join(', ')}` : ''}
${type === 'class' ? `Methods: ${(entity as ClassInfo).methods.map(m => m.name).join(', ')}` : ''}
${type === 'function' ? `Code: ${(entity as FunctionInfo).code?.slice(0, 500) || ''}` : ''}

Generate a 1-2 sentence description explaining what this ${type} does.`

    try {
      const response = await this.llm.invoke(prompt)
      return (response.content as string).trim()
    } catch {
      return `${type === 'function' ? 'Function' : 'Class'} ${entity.name}`
    }
  }

  /**
   * Classify entities into domains and purposes
   */
  async classifyEntities(entities: CodeEntity[]): Promise<EntityClassification[]> {
    const classifications: EntityClassification[] = []

    for (const entity of entities) {
      const classification = await this.classifyEntity(entity)
      classifications.push(classification)
    }

    return classifications
  }

  /**
   * Classify a single entity
   */
  private async classifyEntity(entity: CodeEntity): Promise<EntityClassification> {
    const prompt = `Classify this code entity:

Name: ${entity.name}
Type: ${entity.type}
Category: ${entity.category}
Description: ${entity.description}

Return JSON with:
- category: main category
- subcategory: optional subcategory
- purpose: what this entity is used for
- domain: array of domain keywords (e.g., ["web", "api", "authentication"])

Example:
{
  "category": "authentication",
  "subcategory": "jwt_token",
  "purpose": "Handles JWT token generation and validation",
  "domain": ["web", "security", "authentication"]
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      return {
        entity,
        ...result,
      }
    } catch {
      return {
        entity,
        category: entity.category,
        purpose: entity.description,
        domain: [entity.category],
      }
    }
  }

  /**
   * Build entity knowledge graph
   */
  buildKnowledgeGraph(entities: CodeEntity[]): {
    nodes: Array<{ id: string; label: string; type: string; category: string }>
    edges: Array<{ source: string; target: string; type: string; strength: number }>
  } {
    const nodes = entities.map(e => ({
      id: e.name,
      label: e.name,
      type: e.type,
      category: e.category,
    }))

    const edges: Array<{ source: string; target: string; type: string; strength: number }> = []
    for (const entity of entities) {
      for (const rel of entity.relationships) {
        edges.push({
          source: entity.name,
          target: rel.target,
          type: rel.type,
          strength: rel.strength,
        })
      }
    }

    return { nodes, edges }
  }
}

