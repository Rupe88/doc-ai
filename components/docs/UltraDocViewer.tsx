'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  BookOpen,
  Code2,
  Shield,
  Gauge,
  Layers,
  Database,
  Search,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  Terminal,
  Zap,
  FileCode,
  RefreshCw,
  Menu,
  X,
  Hash,
  Box,
  Cpu,
  Server,
  Lock,
  Unlock,
  ArrowRight,
} from 'lucide-react'

interface Doc {
  id: string
  title: string
  slug: string
  content: string
  type: string
  filePath?: string
  metadata?: any
}

interface UltraDocViewerProps {
  docs: Doc[]
  repoName: string
  repoFullName: string
  onRefresh?: () => void
  isRefreshing?: boolean
  analytics?: any
}

const typeConfig: Record<string, { icon: any; color: string; gradient: string; label: string }> = {
  OVERVIEW: { icon: BookOpen, color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500', label: 'Overview' },
  API: { icon: Terminal, color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500', label: 'API' },
  GUIDE: { icon: Zap, color: 'text-purple-400', gradient: 'from-purple-500 to-pink-500', label: 'Guide' },
  FUNCTION: { icon: Code2, color: 'text-orange-400', gradient: 'from-orange-500 to-amber-500', label: 'Functions' },
  CLASS: { icon: Layers, color: 'text-indigo-400', gradient: 'from-indigo-500 to-violet-500', label: 'Classes' },
  SECURITY: { icon: Shield, color: 'text-red-400', gradient: 'from-red-500 to-rose-500', label: 'Security' },
  QUALITY: { icon: Gauge, color: 'text-green-400', gradient: 'from-green-500 to-emerald-500', label: 'Quality' },
}

export function UltraDocViewer({
  docs,
  repoName,
  repoFullName,
  onRefresh,
  isRefreshing,
  analytics,
}: UltraDocViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['OVERVIEW', 'API']))
  const contentRef = useRef<HTMLDivElement>(null)

  // Set initial doc
  useEffect(() => {
    if (docs.length > 0 && !selectedDoc) {
      const overview = docs.find(d => d.type === 'OVERVIEW') || docs[0]
      setSelectedDoc(overview)
    }
  }, [docs, selectedDoc])

  // Filter docs by search
  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group docs by type
  const docsByType = filteredDocs.reduce((acc, doc) => {
    const type = doc.type || 'OTHER'
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {} as Record<string, Doc[]>)

  // Extract headings from content for TOC
  const extractHeadings = (content: string) => {
    const headings: { level: number; text: string; id: string }[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].replace(/[*`]/g, ''),
          id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        })
      }
    }
    
    return headings
  }

  const headings = selectedDoc ? extractHeadings(selectedDoc.content || '') : []

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTypes(newExpanded)
  }

  const copyToClipboard = async () => {
    if (!selectedDoc?.content) return
    await navigator.clipboard.writeText(selectedDoc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDoc = () => {
    if (!selectedDoc?.content) return
    const blob = new Blob([selectedDoc.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedDoc.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="flex h-full bg-[#08080c] overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-r border-white/5 flex flex-col bg-[#0a0a10]"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white truncate max-w-[160px]">
                      {repoName}
                    </h2>
                    <p className="text-xs text-slate-500">{docs.length} documents</p>
                  </div>
                </div>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              {Object.entries(docsByType).map(([type, typeDocs]) => {
                const config = typeConfig[type] || { icon: FileCode, color: 'text-slate-400', gradient: 'from-slate-500 to-slate-600', label: type }
                const Icon = config.icon
                const isExpanded = expandedTypes.has(type)

                return (
                  <div key={type} className="mb-1">
                    <button
                      onClick={() => toggleType(type)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </motion.div>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                        {config.label}
                      </span>
                      <span className="ml-auto text-xs text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                        {typeDocs.length}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 pl-4 border-l border-white/5">
                            {typeDocs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                  selectedDoc?.id === doc.id
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className="block truncate">{doc.title}</span>
                                {doc.filePath && (
                                  <span className="block text-xs text-slate-600 truncate mt-0.5">
                                    {doc.filePath}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </nav>

            {/* Stats */}
            {analytics && (
              <div className="p-4 border-t border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{analytics.security?.score || 85}</div>
                    <div className="text-xs text-slate-500">Security</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{analytics.quality?.score || 80}</div>
                    <div className="text-xs text-slate-500">Quality</div>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a10]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {selectedDoc && (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${typeConfig[selectedDoc.type]?.gradient || 'from-slate-500 to-slate-600'} flex items-center justify-center`}>
                  {(() => {
                    const Icon = typeConfig[selectedDoc.type]?.icon || FileCode
                    return <Icon className="w-3 h-3 text-white" />
                  })()}
                </div>
                <h1 className="text-white font-medium">{selectedDoc.title}</h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={downloadDoc}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="Download as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={`https://github.com/${repoFullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            {selectedDoc ? (
              <motion.div
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto px-8 py-8"
              >
                {/* Document Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig[selectedDoc.type]?.gradient || 'from-slate-500 to-slate-600'} flex items-center justify-center shadow-lg`}>
                      {(() => {
                        const Icon = typeConfig[selectedDoc.type]?.icon || FileCode
                        return <Icon className="w-5 h-5 text-white" />
                      })()}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">{selectedDoc.title}</h1>
                      {selectedDoc.filePath && (
                        <p className="text-sm text-slate-500 font-mono">{selectedDoc.filePath}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="prose-dark">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-3xl font-bold text-white mb-6 mt-10 first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-2xl font-bold text-white mb-4 mt-8 pb-2 border-b border-white/10">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-xl font-semibold text-white mb-3 mt-6">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 text-slate-300">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-300">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-slate-300">{children}</li>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      code: ({ className, children, ...props }) => {
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
                          <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0d0d14]">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                              <span className="text-xs text-slate-500 font-mono">{match[1]}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(String(children))
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                background: 'transparent',
                                fontSize: '0.875rem',
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        )
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="w-full border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="text-left p-3 bg-slate-800/50 border border-slate-700 font-semibold text-white text-sm">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="p-3 border border-slate-800 text-slate-300 text-sm">
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-400 my-4 bg-indigo-500/5 py-2 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {selectedDoc.content || 'No content available'}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a document to view</p>
                </div>
              </div>
            )}
          </div>

          {/* Table of Contents */}
          {selectedDoc && headings.length > 0 && (
            <aside className="w-56 border-l border-white/5 p-4 hidden xl:block overflow-y-auto">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                On this page
              </h4>
              <nav className="space-y-1">
                {headings.map((heading, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToHeading(heading.id)}
                    className={`block w-full text-left text-sm truncate transition-colors ${
                      heading.level === 1 ? 'text-slate-300 hover:text-white font-medium' :
                      heading.level === 2 ? 'text-slate-400 hover:text-white pl-3' :
                      'text-slate-500 hover:text-white pl-6'
                    }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}

