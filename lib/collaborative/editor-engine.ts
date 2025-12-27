/**
 * Real-time Collaborative Code Editor with Conflict Resolution
 *
 * Features:
 * - Operational Transformation for conflict resolution
 * - Real-time synchronization across users
 * - Code-aware merging and diffing
 * - Presence indicators and cursors
 * - Version history and rollback
 */

import { EventEmitter } from 'events'

export interface EditorOperation {
  id: string
  userId: string
  type: 'insert' | 'delete' | 'replace'
  position: number
  content?: string
  length?: number
  timestamp: number
  version: number
}

export interface EditorState {
  content: string
  version: number
  users: UserPresence[]
  operations: EditorOperation[]
}

export interface UserPresence {
  userId: string
  name: string
  avatar?: string
  cursor: {
    position: number
    selection?: { start: number; end: number }
  }
  color: string
  lastActive: number
}

export class OperationalTransform {
  /**
   * Transform operation A against operation B
   * Returns the transformed operation A'
   */
  static transform(operationA: EditorOperation, operationB: EditorOperation): EditorOperation {
    // If operations don't overlap, no transformation needed
    if (!this.operationsOverlap(operationA, operationB)) {
      return operationA
    }

    // Handle different operation combinations
    if (operationA.type === 'insert' && operationB.type === 'insert') {
      return this.transformInsertInsert(operationA, operationB)
    }

    if (operationA.type === 'insert' && operationB.type === 'delete') {
      return this.transformInsertDelete(operationA, operationB)
    }

    if (operationA.type === 'delete' && operationB.type === 'insert') {
      return this.transformDeleteInsert(operationA, operationB)
    }

    if (operationA.type === 'delete' && operationB.type === 'delete') {
      return this.transformDeleteDelete(operationA, operationB)
    }

    return operationA
  }

  private static operationsOverlap(opA: EditorOperation, opB: EditorOperation): boolean {
    const aStart = opA.position
    const aEnd = opA.position + (opA.type === 'delete' ? opA.length! : (opA.content?.length || 0))
    const bStart = opB.position
    const bEnd = opB.position + (opB.type === 'delete' ? opB.length! : (opB.content?.length || 0))

    return !(aEnd <= bStart || bEnd <= aStart)
  }

  private static transformInsertInsert(opA: EditorOperation, opB: EditorOperation): EditorOperation {
    if (opA.position < opB.position) {
      // A's insert comes first, no change needed
      return opA
    } else if (opA.position > opB.position) {
      // B's insert comes first, shift A's position
      return {
        ...opA,
        position: opA.position + (opB.content?.length || 0)
      }
    } else {
      // Same position - arbitrary ordering (user ID based)
      if (opA.userId < opB.userId) {
        return opA
      } else {
        return {
          ...opA,
          position: opA.position + (opB.content?.length || 0)
        }
      }
    }
  }

  private static transformInsertDelete(opA: EditorOperation, opB: EditorOperation): EditorOperation {
    if (opA.position <= opB.position) {
      // Insert before delete - no change
      return opA
    } else {
      // Insert after delete - adjust position
      return {
        ...opA,
        position: Math.max(0, opA.position - (opB.length || 0))
      }
    }
  }

  private static transformDeleteInsert(opA: EditorOperation, opB: EditorOperation): EditorOperation {
    if (opA.position < opB.position) {
      // Delete before insert - no change
      return opA
    } else {
      // Delete after insert - adjust position
      return {
        ...opA,
        position: opA.position + (opB.content?.length || 0)
      }
    }
  }

  private static transformDeleteDelete(opA: EditorOperation, opB: EditorOperation): EditorOperation {
    const aStart = opA.position
    const aEnd = opA.position + (opA.length || 0)
    const bStart = opB.position
    const bEnd = opB.position + (opB.length || 0)

    if (aEnd <= bStart) {
      // A completely before B - no change
      return opA
    } else if (aStart >= bEnd) {
      // A completely after B - shift position
      return {
        ...opA,
        position: Math.max(0, opA.position - (opB.length || 0))
      }
    } else {
      // Overlapping deletes - merge or split
      const overlapStart = Math.max(aStart, bStart)
      const overlapEnd = Math.min(aEnd, bEnd)

      if (overlapStart >= overlapEnd) {
        // No overlap after adjustment
        return {
          ...opA,
          position: Math.max(0, opA.position - (opB.length || 0))
        }
      }

      // Partial overlap - adjust length
      return {
        ...opA,
        position: Math.min(opA.position, opB.position),
        length: Math.abs((opA.length || 0) - (opB.length || 0))
      }
    }
  }
}

export class CollaborativeEditor extends EventEmitter {
  private state: EditorState
  private pendingOperations: EditorOperation[] = []
  private userSessions: Map<string, UserPresence> = new Map()

  constructor(initialContent: string = '') {
    super()
    this.state = {
      content: initialContent,
      version: 0,
      users: [],
      operations: []
    }
  }

  /**
   * Apply a user operation with conflict resolution
   */
  applyOperation(operation: EditorOperation): EditorOperation[] {
    // Transform against pending operations
    let transformedOp = operation
    for (const pendingOp of this.pendingOperations) {
      transformedOp = OperationalTransform.transform(transformedOp, pendingOp)
    }

    // Apply the transformed operation
    this.applyOperationToContent(transformedOp)

    // Add to history
    this.state.operations.push(transformedOp)
    this.state.version++

    // Emit event for real-time sync
    this.emit('operation', transformedOp)

    // Add to pending operations for future transformations
    this.pendingOperations.push(transformedOp)

    // Clean up old operations (keep last 100)
    if (this.pendingOperations.length > 100) {
      this.pendingOperations = this.pendingOperations.slice(-50)
    }

    return [transformedOp]
  }

  /**
   * Apply multiple operations in batch
   */
  applyOperations(operations: EditorOperation[]): EditorOperation[] {
    const appliedOps: EditorOperation[] = []

    for (const op of operations) {
      const transformed = this.applyOperation(op)
      appliedOps.push(...transformed)
    }

    return appliedOps
  }

  /**
   * Add user presence
   */
  addUserPresence(user: UserPresence): void {
    this.userSessions.set(user.userId, user)
    this.notifyPresenceUpdate()
  }

  /**
   * Update user presence
   */
  updateUserPresence(userId: string, updates: Partial<UserPresence>): void {
    const existing = this.userSessions.get(userId)
    if (existing) {
      this.userSessions.set(userId, { ...existing, ...updates, lastActive: Date.now() })
      this.notifyPresenceUpdate()
    }
  }

  /**
   * Remove user presence
   */
  removeUserPresence(userId: string): void {
    this.userSessions.delete(userId)
    this.notifyPresenceUpdate()
  }

  /**
   * Get current editor state
   */
  getState(): EditorState {
    return {
      ...this.state,
      users: Array.from(this.userSessions.values())
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(limit: number = 50): EditorOperation[] {
    return this.state.operations.slice(-limit)
  }

  /**
   * Rollback to specific version
   */
  rollbackToVersion(targetVersion: number): EditorState {
    if (targetVersion >= this.state.version || targetVersion < 0) {
      return this.getState()
    }

    // Recreate content from operations up to target version
    let content = ''
    const operations = this.state.operations.filter(op => op.version <= targetVersion)

    for (const op of operations) {
      content = this.applyOperationToContentString(content, op)
    }

    return {
      content,
      version: targetVersion,
      users: Array.from(this.userSessions.values()),
      operations
    }
  }

  private applyOperationToContent(operation: EditorOperation): void {
    this.state.content = this.applyOperationToContentString(this.state.content, operation)
  }

  private applyOperationToContentString(content: string, operation: EditorOperation): string {
    switch (operation.type) {
      case 'insert':
        if (operation.content) {
          return content.slice(0, operation.position) +
                 operation.content +
                 content.slice(operation.position)
        }
        return content

      case 'delete':
        if (operation.length) {
          return content.slice(0, operation.position) +
                 content.slice(operation.position + operation.length)
        }
        return content

      case 'replace':
        if (operation.content && operation.length) {
          return content.slice(0, operation.position) +
                 operation.content +
                 content.slice(operation.position + operation.length)
        }
        return content

      default:
        return content
    }
  }

  private notifyPresenceUpdate(): void {
    this.state.users = Array.from(this.userSessions.values())

    // Clean up inactive users (5 minutes)
    const now = Date.now()
    for (const [userId, user] of this.userSessions.entries()) {
      if (now - user.lastActive > 5 * 60 * 1000) {
        this.userSessions.delete(userId)
      }
    }

    this.emit('presence', this.state.users)
  }

  /**
   * Create operation from user action
   */
  static createOperation(
    userId: string,
    type: EditorOperation['type'],
    position: number,
    content?: string,
    length?: number
  ): EditorOperation {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      position,
      content,
      length,
      timestamp: Date.now(),
      version: 0
    }
  }
}

// Singleton editor manager
const editors = new Map<string, CollaborativeEditor>()

export function getCollaborativeEditor(documentId: string, initialContent?: string): CollaborativeEditor {
  if (!editors.has(documentId)) {
    editors.set(documentId, new CollaborativeEditor(initialContent))
  }
  return editors.get(documentId)!
}

export function removeCollaborativeEditor(documentId: string): void {
  editors.delete(documentId)
}
