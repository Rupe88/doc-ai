/**
 * Dependency Graph Analyzer
 * Generates visual dependency graphs for codebases
 */

import * as path from 'path'

export interface DependencyNode {
  id: string
  name: string
  path: string
  type: 'file' | 'module' | 'package'
  size?: number
  complexity?: number
}

export interface DependencyEdge {
  source: string
  target: string
  type: 'import' | 'export' | 'require' | 'dynamic'
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  stats: {
    totalFiles: number
    totalDependencies: number
    circularDependencies: string[][]
    orphanFiles: string[]
    mostDependent: { file: string; count: number }[]
    mostImported: { file: string; count: number }[]
  }
}

export class DependencyGraphAnalyzer {
  private importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
  private requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  private dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  async analyze(files: Array<{ path: string; content: string }>): Promise<DependencyGraph> {
    const nodes: Map<string, DependencyNode> = new Map()
    const edges: DependencyEdge[] = []
    const importCounts: Map<string, number> = new Map()
    const dependencyCounts: Map<string, number> = new Map()

    // Create nodes for all files
    for (const file of files) {
      const id = this.normalizePathToId(file.path)
      nodes.set(id, {
        id,
        name: path.basename(file.path),
        path: file.path,
        type: 'file',
        size: file.content.length,
        complexity: this.calculateComplexity(file.content),
      })
    }

    // Analyze dependencies
    for (const file of files) {
      const sourceId = this.normalizePathToId(file.path)
      const imports = this.extractImports(file.content)
      
      dependencyCounts.set(sourceId, imports.length)

      for (const imp of imports) {
        const targetPath = this.resolveImportPath(file.path, imp.path)
        const targetId = this.normalizePathToId(targetPath)

        // Track import counts
        importCounts.set(targetId, (importCounts.get(targetId) || 0) + 1)

        // Add edge
        edges.push({
          source: sourceId,
          target: targetId,
          type: imp.type,
        })

        // Add external module nodes if not already present
        if (!nodes.has(targetId) && !imp.path.startsWith('.')) {
          nodes.set(targetId, {
            id: targetId,
            name: imp.path.split('/')[0],
            path: imp.path,
            type: 'package',
          })
        }
      }
    }

    // Calculate stats
    const circularDependencies = this.findCircularDependencies(edges)
    const orphanFiles = this.findOrphanFiles(nodes, edges)
    
    const mostDependent = Array.from(dependencyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }))

    const mostImported = Array.from(importCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }))

    return {
      nodes: Array.from(nodes.values()),
      edges,
      stats: {
        totalFiles: files.length,
        totalDependencies: edges.length,
        circularDependencies,
        orphanFiles,
        mostDependent,
        mostImported,
      },
    }
  }

  private extractImports(content: string): Array<{ path: string; type: DependencyEdge['type'] }> {
    const imports: Array<{ path: string; type: DependencyEdge['type'] }> = []

    // ES6 imports
    let match
    const importRegex = new RegExp(this.importRegex.source, 'g')
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'import' })
    }

    // CommonJS require
    const requireRegex = new RegExp(this.requireRegex.source, 'g')
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'require' })
    }

    // Dynamic imports
    const dynamicRegex = new RegExp(this.dynamicImportRegex.source, 'g')
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'dynamic' })
    }

    return imports
  }

  private resolveImportPath(sourcePath: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      const sourceDir = path.dirname(sourcePath)
      return path.join(sourceDir, importPath)
    }
    return importPath
  }

  private normalizePathToId(filePath: string): string {
    return filePath
      .replace(/\\/g, '/')
      .replace(/\.(ts|tsx|js|jsx)$/, '')
      .replace(/\/index$/, '')
  }

  private calculateComplexity(content: string): number {
    let complexity = 1
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\?/g,
      /\?\./g,
      /&&/g,
      /\|\|/g,
    ]

    for (const pattern of patterns) {
      const matches = content.match(pattern)
      if (matches) complexity += matches.length
    }

    return complexity
  }

  private findCircularDependencies(edges: DependencyEdge[]): string[][] {
    const graph = new Map<string, Set<string>>()
    
    for (const edge of edges) {
      if (!graph.has(edge.source)) {
        graph.set(edge.source, new Set())
      }
      graph.get(edge.source)!.add(edge.target)
    }

    const cycles: string[][] = []
    const visited = new Set<string>()
    const stack = new Set<string>()

    const dfs = (node: string, path: string[]): void => {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node)
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart))
        }
        return
      }

      if (visited.has(node)) return

      visited.add(node)
      stack.add(node)
      path.push(node)

      const neighbors = graph.get(node) || new Set()
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path])
      }

      stack.delete(node)
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles.slice(0, 10) // Limit to first 10 cycles
  }

  private findOrphanFiles(nodes: Map<string, DependencyNode>, edges: DependencyEdge[]): string[] {
    const imported = new Set(edges.map(e => e.target))
    const importing = new Set(edges.map(e => e.source))

    return Array.from(nodes.values())
      .filter(node => 
        node.type === 'file' && 
        !imported.has(node.id) && 
        !importing.has(node.id)
      )
      .map(node => node.path)
      .slice(0, 20)
  }

  // Generate Mermaid diagram for visualization
  generateMermaidDiagram(graph: DependencyGraph, maxNodes: number = 30): string {
    let diagram = 'graph TD\n'

    // Limit nodes for readability
    const topNodes = graph.nodes
      .filter(n => n.type === 'file')
      .slice(0, maxNodes)
    const nodeIds = new Set(topNodes.map(n => n.id))

    // Add nodes with styling
    for (const node of topNodes) {
      const label = node.name.replace(/[^a-zA-Z0-9]/g, '_')
      const style = node.complexity && node.complexity > 20 
        ? ':::highComplexity' 
        : node.complexity && node.complexity > 10 
          ? ':::mediumComplexity' 
          : ''
      diagram += `  ${this.sanitizeId(node.id)}["${label}"]${style}\n`
    }

    // Add edges
    const relevantEdges = graph.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .slice(0, 100)

    for (const edge of relevantEdges) {
      const arrow = edge.type === 'dynamic' ? '-..->' : '-->'
      diagram += `  ${this.sanitizeId(edge.source)} ${arrow} ${this.sanitizeId(edge.target)}\n`
    }

    // Add styles
    diagram += '\n  classDef highComplexity fill:#ff6b6b,stroke:#c92a2a\n'
    diagram += '  classDef mediumComplexity fill:#ffd43b,stroke:#fab005\n'

    return diagram
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
  }
}

