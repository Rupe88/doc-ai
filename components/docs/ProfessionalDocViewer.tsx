'use client'

import { useState, useEffect } from 'react'
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
  Puzzle,
  Search,
  ChevronRight,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  AlertTriangle,
  Zap,
  FileCode,
  Terminal,
  RefreshCw,
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

interface ProfessionalDocViewerProps {
  docs: Doc[]
  repoName: string
  repoFullName: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

const typeIcons: Record<string, any> = {
  OVERVIEW: BookOpen,
  API: Terminal,
  GUIDE: Zap,
  FUNCTION: Code2,
  CLASS: Layers,
  SECURITY: Shield,
  QUALITY: Gauge,
}

const typeColors: Record<string, string> = {
  OVERVIEW: 'from-blue-500 to-cyan-500',
  API: 'from-green-500 to-emerald-500',
  GUIDE: 'from-purple-500 to-pink-500',
  FUNCTION: 'from-orange-500 to-amber-500',
  CLASS: 'from-indigo-500 to-violet-500',
  SECURITY: 'from-red-500 to-rose-500',
  QUALITY: 'from-teal-500 to-green-500',
}

export function ProfessionalDocViewer({
  docs,
  repoName,
  repoFullName,
  onRefresh,
  isRefreshing,
}: ProfessionalDocViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

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

  // Extract table of contents from markdown
  const extractTOC = (content: string): { level: number; text: string; id: string }[] => {
    const headings: { level: number; text: string; id: string }[] = []
    const regex = /^(#{1,3})\s+(.+)$/gm
    let match

    while ((match = regex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2],
        id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      })
    }

    return headings
  }

  const toc = selectedDoc ? extractTOC(selectedDoc.content || '') : []

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

  const shareDoc = async () => {
    if (!selectedDoc) return
    const url = `${window.location.origin}/docs/${selectedDoc.id}`
    await navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="flex h-full bg-[#0a0a0f]">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 border-r border-white/5 flex flex-col bg-[#0d0d14]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">{repoName}</h2>
              <p className="text-xs text-gray-500">Documentation</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.entries(docsByType).map(([type, typeDocs]) => {
            const Icon = typeIcons[type] || FileCode
            const colorClass = typeColors[type] || 'from-gray-500 to-gray-600'

            return (
              <div key={type} className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className={`w-5 h-5 rounded bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  {type.replace(/_/g, ' ')}
                  <span className="ml-auto text-gray-600">{typeDocs.length}</span>
                </div>

                {typeDocs.map((doc) => (
                  <motion.button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    whileHover={{ x: 4 }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedDoc?.id === doc.id
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform ${
                      selectedDoc?.id === doc.id ? 'rotate-90' : ''
                    }`} />
                    <span className="truncate">{doc.title}</span>
                  </motion.button>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Regenerating...' : 'Regenerate Docs'}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.article
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto p-8"
              >
                {/* Document Header */}
                <header className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeColors[selectedDoc.type] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                      {(() => {
                        const Icon = typeIcons[selectedDoc.type] || FileCode
                        return <Icon className="w-5 h-5 text-white" />
                      })()}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">{selectedDoc.title}</h1>
                      {selectedDoc.filePath && (
                        <p className="text-sm text-gray-500 font-mono">{selectedDoc.filePath}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadDoc}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={shareDoc}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <a
                      href={`https://github.com/${repoFullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on GitHub
                    </a>
                  </div>
                </header>

                {/* Markdown Content */}
                <div className="prose prose-invert prose-violet max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-3xl font-bold text-white mt-8 mb-4 scroll-mt-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-white/10 scroll-mt-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="text-xl font-semibold text-white mt-6 mb-3 scroll-mt-4">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-4">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-300">{children}</li>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} className="text-violet-400 hover:text-violet-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-violet-500 pl-4 py-2 my-4 bg-violet-500/10 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2 bg-white/5 text-left text-sm font-medium text-white border-b border-white/10">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2 text-sm text-gray-300 border-b border-white/5">
                          {children}
                        </td>
                      ),
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match

                        if (isInline) {
                          return (
                            <code className="px-1.5 py-0.5 bg-white/10 rounded text-violet-300 text-sm font-mono">
                              {children}
                            </code>
                          )
                        }

                        return (
                          <div className="relative group my-4">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(String(children))
                                }}
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                              >
                                <Copy className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              className="!rounded-xl !bg-[#1a1a24] !p-4 !text-sm"
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        )
                      },
                    }}
                  >
                    {selectedDoc.content || 'No content available'}
                  </ReactMarkdown>
                </div>

                {/* Metadata */}
                {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 && (
                  <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Metadata</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedDoc.metadata).map(([key, value]) => (
                        <span key={key} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                          {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.article>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select a document to view</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Table of Contents */}
        {selectedDoc && toc.length > 3 && (
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-56 border-l border-white/5 p-4 hidden xl:block"
          >
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">On This Page</h3>
            <nav className="space-y-1">
              {toc.map((heading, index) => (
                <a
                  key={index}
                  href={`#${heading.id}`}
                  className={`block text-sm transition-colors ${
                    heading.level === 1 ? 'text-gray-300 font-medium' :
                    heading.level === 2 ? 'text-gray-400 pl-3' :
                    'text-gray-500 pl-6'
                  } hover:text-violet-400`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </motion.aside>
        )}
      </main>
    </div>
  )
}
