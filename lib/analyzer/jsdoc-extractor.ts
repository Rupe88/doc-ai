import * as ts from 'typescript'
import type { FunctionInfo, ClassInfo } from '@/types/analyzer'

export interface JSDocInfo {
  description?: string
  params?: Array<{ name: string; description: string; type?: string }>
  returns?: { description: string; type?: string }
  examples?: string[]
  since?: string
  deprecated?: string
  see?: string[]
  throws?: Array<{ type: string; description: string }>
  tags?: Record<string, string>
}

export class JSDocExtractor {
  /**
   * Extract JSDoc/TSDoc comments from a function node
   */
  extractFunctionJSDoc(node: ts.FunctionDeclaration | ts.MethodDeclaration, sourceFile: ts.SourceFile): JSDocInfo | null {
    const jsdocTags = ts.getJSDocTags(node)
    const jsdocComments = ts.getJSDocCommentsAndTags(node)
    
    if (jsdocTags.length === 0 && jsdocComments.length === 0) {
      return null
    }

    // Extract comment text from JSDoc comments
    let commentText = ''
    for (const comment of jsdocComments) {
      if (ts.isJSDoc(comment)) {
        commentText += comment.comment || ''
      }
    }
    
    const description = this.extractDescription(commentText)

    const jsdoc: JSDocInfo = {
      description,
      params: [],
      returns: undefined,
      examples: [],
      tags: {},
    }

    // Extract @param tags
    for (const tag of jsdocTags) {
      if (ts.isJSDocParameterTag(tag)) {
        const paramName = tag.name?.getText(sourceFile) || ''
        const paramComment = tag.comment || ''
        const paramType = tag.typeExpression?.type?.getText(sourceFile)
        
        jsdoc.params?.push({
          name: paramName,
          description: this.cleanComment(paramComment),
          type: paramType,
        })
      } else if (ts.isJSDocReturnTag(tag)) {
        const returnComment = tag.comment
        let returnType: string | undefined
        if (tag.typeExpression && 'type' in tag.typeExpression) {
          const typeExpr = tag.typeExpression as any
          returnType = typeExpr.type?.getText(sourceFile)
        }
        
        jsdoc.returns = {
          description: this.cleanComment(returnComment),
          type: returnType,
        }
      } else if (tag.tagName?.getText(sourceFile) === 'example') {
        const example = tag.comment
        if (example) {
          jsdoc.examples?.push(this.cleanComment(example))
        }
      } else if (tag.tagName?.getText(sourceFile) === 'deprecated') {
        jsdoc.deprecated = this.cleanComment(tag.comment) || 'Deprecated'
      } else if (tag.tagName?.getText(sourceFile) === 'see') {
        if (!jsdoc.see) jsdoc.see = []
        jsdoc.see.push(this.cleanComment(tag.comment) || '')
      } else if (tag.tagName?.getText(sourceFile) === 'throws' || tag.tagName?.getText(sourceFile) === 'exception') {
        if (!jsdoc.throws) jsdoc.throws = []
        let throwType = 'Error'
        if ('typeExpression' in tag && tag.typeExpression) {
          const typeExpr = tag.typeExpression as any
          throwType = typeExpr.type?.getText(sourceFile) || 'Error'
        }
        jsdoc.throws.push({
          type: throwType,
          description: this.cleanComment(tag.comment) || '',
        })
      } else {
        // Generic tag
        const tagName = tag.tagName?.getText(sourceFile) || ''
        const tagComment = tag.comment || ''
        if (tagName && tagComment) {
          jsdoc.tags![tagName] = this.cleanComment(tagComment)
        }
      }
    }

    // Extract @example blocks from comment text
    const exampleMatches = commentText.match(/@example\s+([\s\S]*?)(?=@|\*\/|$)/g)
    if (exampleMatches) {
      for (const match of exampleMatches) {
        const example = match.replace(/@example\s+/, '').trim()
        jsdoc.examples?.push(example)
      }
    }

    return jsdoc.params?.length === 0 && !jsdoc.description && !jsdoc.returns ? null : jsdoc
  }

  /**
   * Extract JSDoc from a class node
   */
  extractClassJSDoc(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): JSDocInfo | null {
    const jsdocComments = ts.getJSDocCommentsAndTags(node)
    if (jsdocComments.length === 0) return null
    
    let commentText = ''
    for (const comment of jsdocComments) {
      if (ts.isJSDoc(comment)) {
        commentText += comment.comment || ''
      }
    }
    
    if (!commentText) return null

    const description = this.extractDescription(commentText)
    if (!description) return null

    return {
      description,
      tags: {},
    }
  }

  /**
   * Extract description from comment text
   */
  private extractDescription(commentText: string): string {
    // Remove JSDoc tags and extract main description
    const lines = commentText.split('\n')
    const descriptionLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      // Stop at first @tag
      if (trimmed.startsWith('@')) break
      // Skip comment markers
      const cleaned = trimmed.replace(/^\*\s*/, '').replace(/^\/\*\*?\s*/, '').replace(/\s*\*\/$/, '')
      if (cleaned && !cleaned.startsWith('@')) {
        descriptionLines.push(cleaned)
      }
    }

    return descriptionLines.join(' ').trim()
  }

  /**
   * Clean comment text
   */
  private cleanComment(comment: string | ts.NodeArray<ts.JSDocComment> | ts.JSDocText | undefined): string {
    if (!comment) return ''
    
    if (typeof comment === 'string') {
      return comment.trim()
    }
    
    if (Array.isArray(comment)) {
      return comment.map(c => {
        if (typeof c === 'string') return c
        if ('text' in c) return c.text
        return String(c)
      }).join(' ').trim()
    }
    
    if ('text' in comment) {
      return comment.text.trim()
    }

    return String(comment).trim()
  }
}

