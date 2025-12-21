import * as ts from 'typescript'
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
import { JSDocExtractor, type JSDocInfo } from './jsdoc-extractor'

export class TypeScriptAnalyzer {
  private sourceFile: ts.SourceFile

  constructor(sourceCode: string, fileName: string = 'file.ts') {
    this.sourceFile = ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    )
  }

  analyze(): CodeStructure {
    const functions: FunctionInfo[] = []
    const classes: ClassInfo[] = []
    const interfaces: InterfaceInfo[] = []
    const types: TypeInfo[] = []
    const exports: ExportInfo[] = []

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const func = this.extractFunction(node)
        if (func) functions.push(func)
      } else if (ts.isClassDeclaration(node)) {
        const cls = this.extractClass(node)
        if (cls) classes.push(cls)
      } else if (ts.isInterfaceDeclaration(node)) {
        const iface = this.extractInterface(node)
        if (iface) interfaces.push(iface)
      } else if (ts.isTypeAliasDeclaration(node)) {
        const type = this.extractType(node)
        if (type) types.push(type)
      } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        const exp = this.extractExport(node)
        if (exp) exports.push(exp)
      }

      ts.forEachChild(node, visit)
    }

    visit(this.sourceFile)

    return {
      functions,
      classes,
      interfaces,
      types,
      exports,
    }
  }

  private extractFunction(node: ts.FunctionDeclaration | ts.MethodDeclaration): FunctionInfo | null {
    if (!node.name) return null

    const name = node.name.getText(this.sourceFile)
    const parameters = this.extractParameters(node.parameters)
    const returnType = node.type ? node.type.getText(this.sourceFile) : null
    const lineStart = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
    const lineEnd = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
    const complexity = this.calculateComplexity(node)

    return {
      name,
      parameters,
      returnType,
      lineStart,
      lineEnd,
      complexity,
    }
  }

  private extractClass(node: ts.ClassDeclaration): ClassInfo | null {
    if (!node.name) return null

    const name = node.name.getText(this.sourceFile)
    const methods: FunctionInfo[] = []
    const properties: PropertyInfo[] = []
    
    let extendsClause: string | undefined
    const implementsClause: string[] = []

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClause = clause.types[0]?.getText(this.sourceFile)
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          implementsClause.push(...clause.types.map(t => t.getText(this.sourceFile)))
        }
      }
    }

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member)) {
        const method = this.extractFunction(member)
        if (method) methods.push(method)
      } else if (ts.isMethodSignature(member)) {
        // Handle method signatures separately if needed
      } else if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
        const prop = this.extractProperty(member)
        if (prop) properties.push(prop)
      }
    }

    const lineStart = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
    const lineEnd = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1

    return {
      name,
      methods,
      properties,
      lineStart,
      lineEnd,
      extends: extendsClause,
      implements: implementsClause.length > 0 ? implementsClause : undefined,
    }
  }

  private extractInterface(node: ts.InterfaceDeclaration): InterfaceInfo | null {
    const name = node.name.getText(this.sourceFile)
    const properties: PropertyInfo[] = []
    const methods: FunctionInfo[] = []

    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.extractProperty(member)
        if (prop) properties.push(prop)
      } else if (ts.isMethodSignature(member)) {
        // Method signatures don't have implementations, skip for now
      }
    }

    const lineStart = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
    const lineEnd = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1

    return {
      name,
      properties,
      methods,
      lineStart,
      lineEnd,
    }
  }

  private extractType(node: ts.TypeAliasDeclaration): TypeInfo | null {
    const name = node.name.getText(this.sourceFile)
    const definition = node.type.getText(this.sourceFile)
    const lineStart = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
    const lineEnd = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1

    return {
      name,
      definition,
      lineStart,
      lineEnd,
    }
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return parameters.map(param => {
      const name = param.name.getText(this.sourceFile)
      const type = param.type ? param.type.getText(this.sourceFile) : null
      const optional = !!param.questionToken
      const defaultValue = param.initializer ? param.initializer.getText(this.sourceFile) : undefined

      return {
        name,
        type,
        optional,
        defaultValue,
      }
    })
  }

  private extractProperty(node: ts.PropertyDeclaration | ts.PropertySignature): PropertyInfo | null {
    if (!ts.isIdentifier(node.name)) return null

    const name = node.name.getText(this.sourceFile)
    const type = node.type ? node.type.getText(this.sourceFile) : null
    const optional = !!node.questionToken
    const readonly = !!(node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword))

    return {
      name,
      type,
      optional,
      readonly,
    }
  }

  private extractExport(node: ts.ExportDeclaration | ts.ExportAssignment): ExportInfo | null {
    if (ts.isExportAssignment(node)) {
      return {
        name: 'default',
        type: 'default',
        line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      }
    }

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      const firstExport = node.exportClause.elements[0]
      if (firstExport) {
        return {
          name: firstExport.name.getText(this.sourceFile),
          type: 'const',
          line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        }
      }
    }

    return null
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1

    const visit = (n: ts.Node) => {
      if (
        ts.isIfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isCaseClause(n) ||
        ts.isCatchClause(n) ||
        ts.isConditionalExpression(n)
      ) {
        complexity++
      }
      ts.forEachChild(n, visit)
    }

    visit(node)
    return complexity
  }
}

