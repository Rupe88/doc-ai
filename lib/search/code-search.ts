import { prisma } from '@/lib/db/prisma'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'
import { SemanticCodeSearch } from '@/lib/nlp/semantic-search'

export interface SearchResult {
  type: 'function' | 'class' | 'file' | 'symbol'
  name: string
  filePath: string
  line: number
  content: string
  score: number
}

export interface SymbolLocation {
  filePath: string
  line: number
  column?: number
}

export class CodeSearch {
  private semanticSearch: SemanticCodeSearch

  constructor() {
    this.semanticSearch = new SemanticCodeSearch()
  }

  /**
   * Full-text search across codebase (with NLP semantic search)
   */
  async search(
    repoId: string,
    query: string,
    options?: {
      type?: 'function' | 'class' | 'file' | 'all'
      limit?: number
      useSemantic?: boolean
    }
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 20
    const type = options?.type || 'all'
    const useSemantic = options?.useSemantic !== false // Default to true

    // Use semantic search if enabled
    if (useSemantic) {
      try {
        const semanticResults = await this.semanticSearch.searchByIntent(query, repoId, limit)
        return semanticResults.map(result => ({
          type: 'function' as const,
          name: result.code.split('\n')[0] || '',
          filePath: result.filePath,
          line: result.lineStart,
          content: result.code,
          score: result.relevanceScore,
        }))
      } catch (error) {
        // Fallback to regular search if semantic search fails
        console.error('Semantic search failed, falling back to regular search:', error)
      }
    }

    // Get code index
    const codeIndex = await prisma.codeIndex.findUnique({
      where: { repoId },
    })

    if (!codeIndex) {
      return []
    }

    const symbols = codeIndex.symbols as any
    const results: SearchResult[] = []

    // Search in symbols
    if (type === 'all' || type === 'function' || type === 'class') {
      const symbolList = Array.isArray(symbols) ? symbols : Object.values(symbols)
      
      for (const symbol of symbolList) {
        const score = this.calculateScore(symbol, query)
        if (score > 0) {
          results.push({
            type: symbol.type === 'function' ? 'function' : 'class',
            name: symbol.name || '',
            filePath: symbol.filePath || '',
            line: symbol.line || 0,
            content: symbol.content || '',
            score,
          })
        }
      }
    }

    // Search in file tree
    if (type === 'all' || type === 'file') {
      const fileTree = codeIndex.fileTree as any
      const files = Array.isArray(fileTree) ? fileTree : Object.values(fileTree)
      
      for (const file of files) {
        if (file.path && file.path.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            type: 'file',
            name: file.name || file.path,
            filePath: file.path || '',
            line: 0,
            content: '',
            score: 0.5,
          })
        }
      }
    }

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Find definition of a symbol
   */
  async findDefinition(
    repoId: string,
    symbolName: string
  ): Promise<SymbolLocation | null> {
    const codeIndex = await prisma.codeIndex.findUnique({
      where: { repoId },
    })

    if (!codeIndex) {
      return null
    }

    const symbols = codeIndex.symbols as any
    const symbolList = Array.isArray(symbols) ? symbols : Object.values(symbols)

    for (const symbol of symbolList) {
      if (symbol.name === symbolName) {
        return {
          filePath: symbol.filePath || '',
          line: symbol.line || 0,
          column: symbol.column || 0,
        }
      }
    }

    return null
  }

  /**
   * Find all references to a symbol
   */
  async findReferences(
    repoId: string,
    symbolName: string
  ): Promise<SymbolLocation[]> {
    const codeIndex = await prisma.codeIndex.findUnique({
      where: { repoId },
    })

    if (!codeIndex) {
      return []
    }

    const searchIndex = codeIndex.searchIndex as any
    const references: SymbolLocation[] = []

    // Search for references in search index
    if (searchIndex && typeof searchIndex === 'object') {
      for (const [filePath, fileData] of Object.entries(searchIndex)) {
        const data = fileData as any
        if (data.references && Array.isArray(data.references)) {
          for (const ref of data.references) {
            if (ref.name === symbolName) {
              references.push({
                filePath,
                line: ref.line || 0,
                column: ref.column || 0,
              })
            }
          }
        }
      }
    }

    return references
  }

  /**
   * Get file tree structure
   */
  async getFileTree(repoId: string): Promise<any> {
    const codeIndex = await prisma.codeIndex.findUnique({
      where: { repoId },
    })

    if (!codeIndex) {
      return null
    }

    return codeIndex.fileTree
  }

  /**
   * Index codebase for search
   */
  async indexCodebase(
    repoId: string,
    files: Array<{
      path: string
      content: string
      functions?: FunctionInfo[]
      classes?: ClassInfo[]
    }>
  ): Promise<void> {
    const symbols: any[] = []
    const fileTree: any[] = []
    const searchIndex: Record<string, any> = {}

    for (const file of files) {
      // Add to file tree
      fileTree.push({
        path: file.path,
        name: file.path.split('/').pop() || file.path,
        type: this.getFileType(file.path),
      })

      // Index functions
      if (file.functions) {
        for (const func of file.functions) {
          symbols.push({
            type: 'function',
            name: func.name,
            filePath: file.path,
            line: func.lineStart || 0,
            column: 0,
            content: func.name || '',
            parameters: func.parameters || [],
            returnType: func.returnType || '',
          })
        }
      }

      // Index classes
      if (file.classes) {
        for (const cls of file.classes) {
          symbols.push({
            type: 'class',
            name: cls.name,
            filePath: file.path,
            line: cls.lineStart || 0,
            column: 0,
            content: cls.name,
            methods: cls.methods || [],
            properties: cls.properties || [],
          })
        }
      }

      // Build search index
      searchIndex[file.path] = {
        content: file.content,
        functions: file.functions?.map(f => ({
          name: f.name,
          line: f.lineStart,
        })) || [],
        classes: file.classes?.map(c => ({
          name: c.name,
          line: c.lineStart,
        })) || [],
      }
    }

    // Upsert code index
    await prisma.codeIndex.upsert({
      where: { repoId },
      create: {
        repoId,
        symbols,
        fileTree,
        searchIndex,
      },
      update: {
        symbols,
        fileTree,
        searchIndex,
        lastIndexedAt: new Date(),
      },
    })
  }

  private calculateScore(symbol: any, query: string): number {
    const queryLower = query.toLowerCase()
    const nameLower = (symbol.name || '').toLowerCase()
    const contentLower = (symbol.content || '').toLowerCase()

    let score = 0

    // Exact match
    if (nameLower === queryLower) {
      score += 100
    } else if (nameLower.startsWith(queryLower)) {
      score += 50
    } else if (nameLower.includes(queryLower)) {
      score += 25
    }

    // Content match
    if (contentLower.includes(queryLower)) {
      score += 10
    }

    return score
  }

  private getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      php: 'php',
      rb: 'ruby',
    }
    return typeMap[ext] || 'other'
  }
}

