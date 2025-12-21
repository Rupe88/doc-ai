'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Code2,
  FileCode,
  Loader2,
  Trash2,
  ChevronDown,
  Copy,
  Check,
  Lightbulb,
  Shield,
  Bug,
  Zap,
  MessageSquare,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ type: string; name: string; filePath?: string; relevance: number }>
  timestamp: Date
}

interface UltraChatInterfaceProps {
  repoId: string
  repoName: string
  onClose?: () => void
}

const suggestedQuestions = [
  { icon: Code2, text: 'How does the authentication system work?', category: 'Architecture' },
  { icon: Shield, text: 'Are there any security vulnerabilities?', category: 'Security' },
  { icon: FileCode, text: 'Explain the main API endpoints', category: 'API' },
  { icon: Bug, text: 'What are the most complex functions?', category: 'Quality' },
  { icon: Zap, text: 'How can I improve the codebase?', category: 'Improvements' },
  { icon: Lightbulb, text: 'What patterns are used in this project?', category: 'Patterns' },
]

export function UltraChatInterface({ repoId, repoName, onClose }: UltraChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${repoId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
        setShowSuggestions(parsed.length === 0)
      } catch (e) {
        console.error('Failed to load chat history')
      }
    }
  }, [repoId])

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${repoId}`, JSON.stringify(messages))
    }
  }, [messages, repoId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    setShowSuggestions(false)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoId,
          message: content.trim(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          sources: data.data.sources,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error?.message || 'Failed to get response')
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearHistory = () => {
    setMessages([])
    setShowSuggestions(true)
    localStorage.removeItem(`chat_${repoId}`)
  }

  return (
    <div className="flex flex-col h-full bg-[#08080c]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a10]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Chat with {repoName}</h2>
            <p className="text-xs text-slate-500">Ask anything about your codebase</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="popLayout">
          {/* Welcome & Suggestions */}
          {showSuggestions && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              
              <h3 className="text-2xl font-bold text-white mb-3">
                Ask me anything about your code
              </h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                I have deep knowledge of your codebase. Ask about architecture, functions, security, or anything else.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {suggestedQuestions.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    onClick={() => sendMessage(q.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl text-left transition-all group"
                  >
                    <q.icon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      {q.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message List */}
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div className={`max-w-3xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                <div className="flex items-start gap-3">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`flex-1 ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-5 py-4 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white/5 border border-white/10 rounded-tl-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose-dark">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="text-slate-300 mb-3 last:mb-0 leading-relaxed">{children}</p>,
                              code: ({ className, children }) => {
                                const match = /language-(\w+)/.exec(className || '')
                                const isInline = !match
                                
                                if (isInline) {
                                  return (
                                    <code className="px-1.5 py-0.5 bg-slate-800 rounded text-indigo-300 text-sm font-mono">
                                      {children}
                                    </code>
                                  )
                                }

                                return (
                                  <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d14]">
                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/5">
                                      <span className="text-xs text-slate-500 font-mono">{match[1]}</span>
                                    </div>
                                    <SyntaxHighlighter
                                      style={oneDark}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        fontSize: '0.8rem',
                                      }}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  </div>
                                )
                              },
                              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-slate-300">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-slate-300">{children}</ol>,
                              li: ({ children }) => <li className="text-slate-300">{children}</li>,
                              a: ({ href, children }) => (
                                <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-white">{message.content}</p>
                      )}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.sources.slice(0, 3).map((source, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-xs"
                          >
                            <FileCode className="w-3 h-3 text-indigo-400" />
                            <span className="text-slate-400">{source.name}</span>
                            <span className="text-slate-600">({source.relevance}%)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {message.role === 'assistant' && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => copyMessage(message.id, message.content)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 mb-6"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span className="text-slate-400">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-[#0a0a10]/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your codebase..."
              rows={1}
              className="w-full px-5 py-4 pr-14 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-indigo-500/25"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}

