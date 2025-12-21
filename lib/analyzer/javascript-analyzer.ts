import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import type {
  CodeStructure,
  FunctionInfo,
  ClassInfo,
  InterfaceInfo,
  TypeInfo,
  ExportInfo,
  ParameterInfo,
  PropertyInfo,
} from '@/types/analyzer'
import { JSDocExtractor } from './jsdoc-extractor'

export class JavaScriptAnalyzer {
  private ast: any
  private sourceCode: string

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode
    try {
      this.ast = parser.parse(sourceCode, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      })
    } catch (error) {
      this.ast = null
    }
  }

  analyze(): CodeStructure {
    if (!this.ast) {
      return {
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        exports: [],
      }
    }

    const functions: FunctionInfo[] = []
    const classes: ClassInfo[] = []
    const interfaces: InterfaceInfo[] = []
    const types: TypeInfo[] = []
    const exports: ExportInfo[] = []

    const lines = this.sourceCode.split('\n')

    traverse(this.ast, {
      FunctionDeclaration(path: any) {
        const func = extractFunction(path, lines)
        if (func) functions.push(func)
      },
      FunctionExpression(path: any) {
        if (path.parent.type === 'VariableDeclarator') {
          const func = extractFunction(path, lines)
          if (func) functions.push(func)
        }
      },
      ArrowFunctionExpression(path: any) {
        if (path.parent.type === 'VariableDeclarator') {
          const func = extractFunction(path, lines)
          if (func) functions.push(func)
        }
      },
      ClassDeclaration(path: any) {
        const cls = extractClass(path, lines)
        if (cls) classes.push(cls)
      },
      ExportNamedDeclaration(path: any) {
        const exp = extractExport(path, lines)
        if (exp) exports.push(exp)
      },
      ExportDefaultDeclaration(path: any) {
        exports.push({
          name: 'default',
          type: 'default',
          line: path.node.loc.start.line,
        })
      },
    })

    return {
      functions,
      classes,
      interfaces,
      types,
      exports,
    }
  }
}

function extractFunction(path: any, lines: string[]): FunctionInfo | null {
  const node = path.node
  if (!node) return null

  const name = node.id?.name || 'anonymous'
  const parameters = (node.params || []).map((param: any) => ({
    name: param.name || 'param',
    type: null,
    optional: param.optional || false,
    defaultValue: param.default ? path.getSource().slice(param.default.start, param.default.end) : undefined,
  }))

  const lineStart = node.loc?.start.line || 1
  const lineEnd = node.loc?.end.line || lineStart
  const complexity = calculateComplexity(node)

  return {
    name,
    parameters,
    returnType: null,
    lineStart,
    lineEnd,
    complexity,
  }
}

function extractClass(path: any, lines: string[]): ClassInfo | null {
  const node = path.node
  if (!node || !node.id) return null

  const name = node.id.name
  const methods: FunctionInfo[] = []
  const properties: PropertyInfo[] = []

  for (const member of node.body.body) {
    if (member.type === 'MethodDefinition') {
      const method = extractFunction({ node: member.value }, lines)
      if (method) {
        method.name = member.key.name || method.name
        methods.push(method)
      }
    } else if (member.type === 'ClassProperty' || member.type === 'PropertyDefinition') {
      properties.push({
        name: member.key.name || 'property',
        type: null,
        optional: false,
        readonly: member.readonly || false,
      })
    }
  }

  const lineStart = node.loc?.start.line || 1
  const lineEnd = node.loc?.end.line || lineStart

  return {
    name,
    methods,
    properties,
    lineStart,
    lineEnd,
  }
}

function extractExport(path: any, lines: string[]): ExportInfo | null {
  const node = path.node
  if (!node) return null

  if (node.declaration) {
    const decl = node.declaration
    if (decl.id) {
      return {
        name: decl.id.name,
        type: decl.type === 'FunctionDeclaration' ? 'function' : 'const',
        line: node.loc?.start.line || 1,
      }
    }
  }

  return null
}

function calculateComplexity(node: any): number {
  let complexity = 1

  function visit(n: any) {
    if (
      n.type === 'IfStatement' ||
      n.type === 'WhileStatement' ||
      n.type === 'ForStatement' ||
      n.type === 'ForInStatement' ||
      n.type === 'ForOfStatement' ||
      n.type === 'SwitchCase' ||
      n.type === 'CatchClause' ||
      n.type === 'ConditionalExpression'
    ) {
      complexity++
    }

    for (const key in n) {
      if (key !== 'parent' && key !== 'leadingComments' && key !== 'trailingComments') {
        const child = n[key]
        if (Array.isArray(child)) {
          child.forEach(visit)
        } else if (child && typeof child === 'object' && child.type) {
          visit(child)
        }
      }
    }
  }

  visit(node)
  return complexity
}

