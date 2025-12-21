import madge from 'madge'
import type { DependencyGraph, DependencyNode, DependencyEdge } from '@/types/analyzer'
import * as path from 'path'

export class DependencyAnalyzer {
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
  }

  async analyze(): Promise<DependencyGraph> {
    try {
      const res = await madge(this.repoPath, {
        fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
        excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./],
      })

      const tree = res.obj()
      const nodes: DependencyNode[] = []
      const edges: DependencyEdge[] = []
      const nodeMap = new Map<string, DependencyNode>()

      for (const [filePath, dependencies] of Object.entries(tree)) {
        const normalizedPath = path.relative(this.repoPath, filePath)
        
        if (!nodeMap.has(normalizedPath)) {
          const node: DependencyNode = {
            id: normalizedPath,
            filePath: normalizedPath,
            type: 'file',
          }
          nodes.push(node)
          nodeMap.set(normalizedPath, node)
        }

        if (Array.isArray(dependencies)) {
          for (const dep of dependencies) {
            const depPath = path.relative(this.repoPath, dep)
            
            if (!nodeMap.has(depPath)) {
              const depNode: DependencyNode = {
                id: depPath,
                filePath: depPath,
                type: 'file',
              }
              nodes.push(depNode)
              nodeMap.set(depPath, depNode)
            }

            edges.push({
              from: normalizedPath,
              to: depPath,
              type: 'import',
            })
          }
        }
      }

      const circularDependencies = this.detectCircularDependencies(nodes, edges)

      return {
        nodes,
        edges,
        circularDependencies,
      }
    } catch (error) {
      console.error('Dependency analysis error:', error)
      return {
        nodes: [],
        edges: [],
        circularDependencies: [],
      }
    }
  }

  private detectCircularDependencies(
    nodes: DependencyNode[],
    edges: DependencyEdge[]
  ): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()

    const nodeMap = new Map<string, DependencyNode>()
    nodes.forEach(node => nodeMap.set(node.id, node))

    const adjacencyList = new Map<string, string[]>()
    nodes.forEach(node => adjacencyList.set(node.id, []))
    edges.forEach(edge => {
      const list = adjacencyList.get(edge.from) || []
      list.push(edge.to)
      adjacencyList.set(edge.from, list)
    })

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId)
      recStack.add(nodeId)
      path.push(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path])
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor)
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor])
          }
        }
      }

      recStack.delete(nodeId)
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, [])
      }
    }

    return cycles
  }
}

