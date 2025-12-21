export type DocType = 'FUNCTION' | 'CLASS' | 'API' | 'ARCHITECTURE' | 'OVERVIEW'

export interface CodeStructure {
  functions: FunctionInfo[]
  classes: ClassInfo[]
  interfaces: InterfaceInfo[]
  types: TypeInfo[]
  exports: ExportInfo[]
}

export interface FunctionInfo {
  name: string
  parameters: ParameterInfo[]
  returnType: string | null
  lineStart: number
  lineEnd: number
  complexity: number
  description?: string
  jsdoc?: {
    description?: string
    params?: Array<{ name: string; description: string; type?: string }>
    returns?: { description: string; type?: string }
    examples?: string[]
    deprecated?: string
    see?: string[]
    throws?: Array<{ type: string; description: string }>
  }
  signature?: string
  code?: string
}

export interface ClassInfo {
  name: string
  methods: FunctionInfo[]
  properties: PropertyInfo[]
  lineStart: number
  lineEnd: number
  extends?: string
  implements?: string[]
  description?: string
  jsdoc?: {
    description?: string
    examples?: string[]
    deprecated?: string
  }
}

export interface InterfaceInfo {
  name: string
  properties: PropertyInfo[]
  methods: FunctionInfo[]
  lineStart: number
  lineEnd: number
}

export interface TypeInfo {
  name: string
  definition: string
  lineStart: number
  lineEnd: number
}

export interface ParameterInfo {
  name: string
  type: string | null
  optional: boolean
  defaultValue?: string
}

export interface PropertyInfo {
  name: string
  type: string | null
  optional: boolean
  readonly: boolean
}

export interface ExportInfo {
  name: string
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'default'
  line: number
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  circularDependencies: string[][]
}

export interface DependencyNode {
  id: string
  filePath: string
  type: 'file' | 'module'
}

export interface DependencyEdge {
  from: string
  to: string
  type: 'import' | 'export' | 'require'
}

export interface SecurityIssue {
  type: 'sql_injection' | 'xss' | 'csrf' | 'auth_bypass' | 'sensitive_data' | 'other'
  severity: 'high' | 'medium' | 'low'
  filePath: string
  line: number
  description: string
  recommendation: string
}

export interface PerformanceIssue {
  type: 'n_squared' | 'memory_leak' | 'inefficient_algorithm' | 'large_bundle' | 'other'
  severity: 'high' | 'medium' | 'low'
  filePath: string
  line: number
  description: string
  recommendation: string
}

export interface AnalysisResult {
  structure: CodeStructure
  dependencies: DependencyGraph
  securityIssues: SecurityIssue[]
  performanceIssues: PerformanceIssue[]
  patterns: string[]
  architecture: ArchitectureInfo
}

export interface ArchitectureInfo {
  layers: LayerInfo[]
  endpoints: EndpointInfo[]
  dataFlow: DataFlowInfo[]
}

export interface LayerInfo {
  name: string
  files: string[]
  type: 'presentation' | 'business' | 'data' | 'shared'
}

export interface EndpointInfo {
  method: string
  path: string
  handler: string
  filePath: string
  line: number
}

export interface DataFlowInfo {
  from: string
  to: string
  type: 'api_call' | 'database' | 'event' | 'function_call'
}

