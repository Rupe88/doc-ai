'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  references?: Array<{ file: string; line: number }>
  timestamp: Date
}

interface EnhancedChatInterfaceProps {
  repoId: string
  repoName: string
  sessionId?: string
}

const SUGGESTED_QUESTIONS = [
  'What does this codebase do?',
  'What are the main components?',
  'How does authentication work?',
  'What API endpoints are available?',
  'Find security vulnerabilities',
  'How can I improve this code?',
]

// LocalStorage key for chat history
const getChatStorageKey = (repoId: string) => `chat_history_${repoId}`
const getSessionStorageKey = (repoId: string) => `chat_session_${repoId}`

export function EnhancedChatInterface({ repoId, repoName, sessionId: initialSessionId }: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    const loadChatHistory = () => {
      try {
        const savedMessages = localStorage.getItem(getChatStorageKey(repoId))
        const savedSessionId = localStorage.getItem(getSessionStorageKey(repoId))
        
        if (savedMessages) {
          const parsed = JSON.parse(savedMessages)
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
          setMessages(messagesWithDates)
          setShowSuggestions(messagesWithDates.length === 0)
        }
        
        if (savedSessionId) {
          setSessionId(savedSessionId)
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadChatHistory()
  }, [repoId])

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0) {
      try {
        localStorage.setItem(getChatStorageKey(repoId), JSON.stringify(messages))
        if (sessionId) {
          localStorage.setItem(getSessionStorageKey(repoId), sessionId)
        }
      } catch (error) {
        console.error('Failed to save chat history:', error)
      }
    }
  }, [messages, sessionId, repoId, isLoadingHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleClearHistory = () => {
    setMessages([])
    setSessionId(undefined)
    setShowSuggestions(true)
    localStorage.removeItem(getChatStorageKey(repoId))
    localStorage.removeItem(getSessionStorageKey(repoId))
  }

  const handleSend = async (message?: string) => {
    const messageToSend = message || input
    if (!messageToSend.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setShowSuggestions(false)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoId,
          message: messageToSend,
          sessionId,
        }),
      })

      const data = await response.json()
      
      if (data.success && data.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          references: data.data.references,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
        
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId)
        }
      } else {
        throw new Error(data.error?.message || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}` 
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  if (isLoadingHistory) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chat...</div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-b from-muted/20 to-background border-border/50">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Chat with {repoName}
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-xs">
              Clear History
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about the codebase - history persists across sessions
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Ask anything about the codebase. I understand the structure, functions, and patterns.
              </p>
              
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {SUGGESTED_QUESTIONS.map((question, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(question)}
                    className="px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
                  >
                    {question}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      msg.role === 'user' 
                        ? 'bg-foreground text-background' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                    }`}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    
                    <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block rounded-2xl px-4 py-3 relative ${
                        msg.role === 'user'
                          ? 'bg-foreground text-background rounded-tr-sm'
                          : 'bg-muted/50 border border-border/50 rounded-tl-sm'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        
                        {/* Copy button */}
                        <button
                          onClick={() => copyMessage(msg.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background/20 rounded"
                          title="Copy message"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* References */}
                      {msg.references && msg.references.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.references.slice(0, 5).map((ref, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
                            >
                              {ref.file}:{ref.line}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                  AI
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-foreground/50 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-foreground/50 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-foreground/50 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 p-4 bg-background/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the codebase..."
              className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/10 transition-all"
              disabled={loading}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={loading || !input.trim()}
              className="px-6 rounded-xl"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-background/20 border-t-background rounded-full"
                />
              ) : (
                'Send'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Chat history saved locally - Powered by Groq AI
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
