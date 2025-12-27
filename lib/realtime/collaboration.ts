/**
 * Real-time Collaboration Engine
 * Enables multiple users to edit documents simultaneously
 */

import { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { prisma } from '../db/prisma'
import { getAIProviderWithFallback } from '../ai/providers/factory'

export interface CollaborationSession {
  id: string
  docId: string
  participants: CollaborationParticipant[]
  content: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CollaborationParticipant {
  userId: string
  userName: string
  avatar?: string
  cursor?: CursorPosition
  selection?: SelectionRange
  color: string
}

export interface CursorPosition {
  line: number
  column: number
}

export interface SelectionRange {
  start: CursorPosition
  end: CursorPosition
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'selection' | 'ai-suggest'
  userId: string
  sessionId: string
  data: any
  timestamp: Date
}

export class CollaborationEngine {
  private sessions = new Map<string, CollaborationSession>()
  private connections = new Map<string, WebSocket>()
  private aiSuggestionTimeouts = new Map<string, NodeJS.Timeout>()

  /**
   * Create or join a collaboration session
   */
  async joinSession(docId: string, userId: string): Promise<CollaborationSession> {
    let session = this.sessions.get(docId)

    if (!session) {
      // Create new session
      const doc = await prisma.doc.findUnique({
        where: { id: docId },
        select: { id: true, content: true, version: true },
      })

      if (!doc) {
        throw new Error('Document not found')
      }

      session = {
        id: `session-${docId}`,
        docId,
        participants: [],
        content: doc.content || '',
        version: doc.version || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.sessions.set(docId, session)
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Add participant
    const participant: CollaborationParticipant = {
      userId: user.id,
      userName: user.name || 'Anonymous',
      avatar: user.image || undefined,
      color: this.generateUserColor(user.id),
    }

    // Remove existing participant if already in session
    session.participants = session.participants.filter(p => p.userId !== userId)
    session.participants.push(participant)

    return session
  }

  /**
   * Handle WebSocket connection
   */
  async handleConnection(ws: WebSocket, request: IncomingMessage, userId: string) {
    const url = new URL(request.url || '', 'http://localhost')
    const sessionId = url.searchParams.get('sessionId')
    const docId = url.searchParams.get('docId')

    if (!sessionId || !docId) {
      ws.close(4001, 'Missing sessionId or docId')
      return
    }

    try {
      const session = await this.joinSession(docId, userId)
      const connectionId = `${userId}-${sessionId}`

      this.connections.set(connectionId, ws)

      // Send initial session data
      ws.send(JSON.stringify({
        type: 'session-joined',
        session,
        userId,
      }))

      // Broadcast user joined
      this.broadcastToSession(session.id, {
        type: 'user-joined',
        userId,
        participant: session.participants.find(p => p.userId === userId),
      }, userId)

      // Handle incoming messages
      ws.on('message', async (data: Buffer) => {
        try {
          const event: CollaborationEvent = JSON.parse(data.toString())

          switch (event.type) {
            case 'edit':
              await this.handleEdit(session, event)
              break
            case 'cursor':
              await this.handleCursor(session, event)
              break
            case 'selection':
              await this.handleSelection(session, event)
              break
            case 'ai-suggest':
              await this.handleAISuggestion(session, event)
              break
          }
        } catch (error) {
          console.error('Error handling collaboration event:', error)
        }
      })

      // Handle disconnection
      ws.on('close', () => {
        this.connections.delete(connectionId)
        this.handleDisconnect(session.id, userId)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.connections.delete(connectionId)
        this.handleDisconnect(session.id, userId)
      })

    } catch (error) {
      console.error('Error joining collaboration session:', error)
      ws.close(4002, 'Failed to join session')
    }
  }

  /**
   * Handle document edits
   */
  private async handleEdit(session: CollaborationSession, event: CollaborationEvent) {
    const { changes, version } = event.data

    // Apply operational transformation (simplified)
    // In a real implementation, you'd use a proper OT library
    session.content = this.applyChanges(session.content, changes)
    session.version = version + 1
    session.updatedAt = new Date()

    // Save to database
    await prisma.doc.update({
      where: { id: session.docId },
      data: {
        content: session.content,
        version: session.version,
        updatedAt: new Date(),
      },
    })

    // Broadcast the change
    this.broadcastToSession(session.id, {
      type: 'edit',
      userId: event.userId,
      data: { changes, version: session.version },
    }, event.userId)

    // Trigger AI suggestions after a delay
    this.scheduleAISuggestion(session, event.userId)
  }

  /**
   * Handle cursor position updates
   */
  private async handleCursor(session: CollaborationSession, event: CollaborationEvent) {
    const participant = session.participants.find(p => p.userId === event.userId)
    if (participant) {
      participant.cursor = event.data

      this.broadcastToSession(session.id, {
        type: 'cursor',
        userId: event.userId,
        data: { cursor: event.data },
      }, event.userId)
    }
  }

  /**
   * Handle text selection updates
   */
  private async handleSelection(session: CollaborationSession, event: CollaborationEvent) {
    const participant = session.participants.find(p => p.userId === event.userId)
    if (participant) {
      participant.selection = event.data

      this.broadcastToSession(session.id, {
        type: 'selection',
        userId: event.userId,
        data: { selection: event.data },
      }, event.userId)
    }
  }

  /**
   * Handle AI-powered suggestions
   */
  private async handleAISuggestion(session: CollaborationSession, event: CollaborationEvent) {
    const { context, position } = event.data

    const ai = await getAIProviderWithFallback()
    const suggestion = await ai.chat(`Given this code context, suggest a completion:

Context: ${context}

Suggest the next logical code to write. Keep it concise and follow the existing patterns.`)

    this.broadcastToSession(session.id, {
      type: 'ai-suggestion',
      userId: event.userId,
      data: { suggestion, position },
    })
  }

  /**
   * Schedule AI suggestion after user stops typing
   */
  private scheduleAISuggestion(session: CollaborationSession, userId: string) {
    const key = `${session.id}-${userId}`

    // Clear existing timeout
    if (this.aiSuggestionTimeouts.has(key)) {
      clearTimeout(this.aiSuggestionTimeouts.get(key)!)
    }

    // Schedule new suggestion
    const timeout = setTimeout(async () => {
      try {
        const participant = session.participants.find(p => p.userId === userId)
        if (participant?.cursor) {
          // Get context around cursor
          const lines = session.content.split('\n')
          const cursorLine = participant.cursor.line
          const context = lines.slice(
            Math.max(0, cursorLine - 3),
            Math.min(lines.length, cursorLine + 3)
          ).join('\n')

          const ai = await getAIProviderWithFallback()
          const suggestion = await ai.chat(`Complete this code naturally:

${context}

Suggest the next 1-3 lines of code. Only return the code, no explanation.`)

          this.broadcastToSession(session.id, {
            type: 'ai-suggestion',
            userId,
            data: {
              suggestion: suggestion.trim(),
              position: participant.cursor,
            },
          })
        }
      } catch (error) {
        console.error('AI suggestion error:', error)
      }
    }, 2000) // Wait 2 seconds after user stops typing

    this.aiSuggestionTimeouts.set(key, timeout)
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnect(sessionId: string, userId: string) {
    const session = Array.from(this.sessions.values()).find(s => s.id === sessionId)
    if (session) {
      session.participants = session.participants.filter(p => p.userId !== userId)

      // Broadcast user left
      this.broadcastToSession(session.id, {
        type: 'user-left',
        userId,
      })

      // Clean up empty sessions
      if (session.participants.length === 0) {
        this.sessions.delete(session.docId)
      }
    }
  }

  /**
   * Broadcast message to all participants in a session
   */
  private broadcastToSession(sessionId: string, message: any, excludeUserId?: string) {
    const session = Array.from(this.sessions.values()).find(s => s.id === sessionId)
    if (!session) return

    session.participants.forEach(participant => {
      if (participant.userId !== excludeUserId) {
        const connectionId = `${participant.userId}-${sessionId}`
        const ws = this.connections.get(connectionId)

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message))
        }
      }
    })
  }

  /**
   * Apply changes to document content (simplified)
   */
  private applyChanges(content: string, changes: any[]): string {
    let result = content

    // Apply changes in reverse order to maintain indices
    changes.sort((a, b) => b.from - a.from)

    for (const change of changes) {
      if (change.type === 'insert') {
        result = result.slice(0, change.from) + change.text + result.slice(change.from)
      } else if (change.type === 'delete') {
        result = result.slice(0, change.from) + result.slice(change.to)
      }
    }

    return result
  }

  /**
   * Generate a consistent color for each user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ]

    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Get session info
   */
  getSession(docId: string): CollaborationSession | null {
    return this.sessions.get(docId) || null
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values())
  }
}

// Singleton
let collaborationEngineInstance: CollaborationEngine | null = null

export function getCollaborationEngine(): CollaborationEngine {
  if (!collaborationEngineInstance) {
    collaborationEngineInstance = new CollaborationEngine()
  }
  return collaborationEngineInstance
}
