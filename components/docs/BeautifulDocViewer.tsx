'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'

interface Doc {
  id: string
  title: string
  slug: string
  content: string
  type: 'OVERVIEW' | 'FUNCTION' | 'CLASS' | 'API' | 'GUIDE'
  filePath?: string
  lineStart?: number
  lineEnd?: number
  metadata?: any
}

interface BeautifulDocViewerProps {
  repoId: string
  repoName: string
  onSync?: () => void
}

export function BeautifulDocViewer({ repoId, repoName, onSync }: BeautifulDocViewerProps) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [fullContent, setFullContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchDocs()
  }, [repoId])

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/repos/${repoId}/docs`, {
        credentials: 'include',
      })
      const result = await response.json()
      if (result.success && result.data?.docs) {
        setDocs(result.data.docs)
        // Auto-select overview doc
        const overview = result.data.docs.find((d: Doc) => d.type === 'OVERVIEW')
        if (overview) {
          selectDoc(overview)
        }
      }
    } catch (error) {
      console.error('Failed to fetch docs:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectDoc = async (doc: Doc) => {
    setSelectedDoc(doc)
    
    // If we already have content from the list, use it immediately
    if (doc.content && doc.content.length > 50) {
      setFullContent(doc.content)
      setContentLoading(false)
      return
    }
    
    // Otherwise fetch full content
    setContentLoading(true)
    
    try {
      const response = await fetch(`/api/docs/${doc.id}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.error('Failed to fetch doc:', response.status)
        setFullContent(doc.content || 'Failed to load content. Please try regenerating.')
        return
      }
      
      const result = await response.json()
      
      if (result.success && result.data?.content) {
        setFullContent(result.data.content)
      } else if (doc.content) {
        setFullContent(doc.content)
      } else {
        setFullContent('# No Content Generated\n\nThe documentation content is empty. Please try regenerating the docs.')
      }
    } catch (error) {
      console.error('Failed to fetch doc content:', error)
      setFullContent(doc.content || '# Error Loading Content\n\nFailed to load documentation. Please refresh and try again.')
    } finally {
      setContentLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch(`/api/sync/${repoId}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        await fetchDocs()
        onSync?.()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleCopy = async () => {
    if (fullContent) {
      await navigator.clipboard.writeText(fullContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/docs/${repoId}/${selectedDoc?.slug}`
    await navigator.clipboard.writeText(shareUrl)
    alert('Share link copied to clipboard!')
  }

  const handleDownload = () => {
    if (fullContent && selectedDoc) {
      const blob = new Blob([fullContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedDoc.title.replace(/[^a-z0-9]/gi, '_')}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.filePath?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = filterType === 'all' || doc.type === filterType
    return matchesSearch && matchesType
  })

  const docsByType = {
    OVERVIEW: filteredDocs.filter(d => d.type === 'OVERVIEW'),
    API: filteredDocs.filter(d => d.type === 'API'),
    FUNCTION: filteredDocs.filter(d => d.type === 'FUNCTION'),
    CLASS: filteredDocs.filter(d => d.type === 'CLASS'),
    GUIDE: filteredDocs.filter(d => d.type === 'GUIDE'),
  }

  const typeLabels = {
    OVERVIEW: { label: 'Overview', icon: '📋', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    API: { label: 'API Endpoints', icon: '/', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
    FUNCTION: { label: 'Functions', icon: 'fn', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
    CLASS: { label: 'Classes', icon: '{}', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    GUIDE: { label: 'Guides', icon: '📖', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
  }

  // Custom markdown renderer with syntax highlighting
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'typescript'
      
      return !inline ? (
        <div className="relative group">
          <button
            onClick={() => {
              navigator.clipboard.writeText(String(children))
            }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 px-2 py-1 rounded text-xs"
          >
            Copy
          </button>
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            className="rounded-lg !bg-muted/80 !mt-2 !mb-2"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      )
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full"
        />
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
        <CardContent className="py-16 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">No Documentation Yet</h3>
          <p className="text-muted-foreground mb-6">
            Generate comprehensive documentation for your codebase with AI-powered analysis.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Sidebar - Doc Navigation */}
      <div className="col-span-3 bg-muted/20 rounded-xl p-4 overflow-y-auto border border-border/50">
        {/* Header with Sync */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">{docs.length} Documents</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="text-xs"
          >
            {syncing ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ↻
              </motion.span>
            ) : (
              '↻ Sync'
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground/50"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filterType === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {Object.entries(typeLabels).map(([type, { label }]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filterType === type ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Doc List */}
        <div className="space-y-4">
          {Object.entries(docsByType).map(([type, typeDocs]) => {
            if (typeDocs.length === 0) return null
            const { label, icon, color } = typeLabels[type as keyof typeof typeLabels]
            
            return (
              <div key={type}>
                <div className={`text-xs font-semibold px-2 py-1 rounded-md mb-2 border ${color}`}>
                  <span className="mr-1">{icon}</span> {label} ({typeDocs.length})
                </div>
                <div className="space-y-1">
                  {typeDocs.map(doc => (
                    <motion.button
                      key={doc.id}
                      whileHover={{ x: 4 }}
                      onClick={() => selectDoc(doc)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedDoc?.id === doc.id
                          ? 'bg-foreground text-background'
                          : 'hover:bg-muted text-foreground/80'
                      }`}
                    >
                      <div className="font-medium truncate">{doc.title}</div>
                      {doc.filePath && (
                        <div className="text-xs opacity-60 truncate">{doc.filePath}</div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content - Doc Viewer */}
      <div className="col-span-9 bg-muted/10 rounded-xl border border-border/50 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {selectedDoc ? (
            <motion.div
              key={selectedDoc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Doc Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded border ${typeLabels[selectedDoc.type]?.color || 'bg-muted'}`}>
                        {selectedDoc.type}
                      </span>
                      <h1 className="text-xl font-bold">{selectedDoc.title}</h1>
                    </div>
                    {selectedDoc.filePath && (
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        {selectedDoc.filePath}
                        {selectedDoc.lineStart && `:${selectedDoc.lineStart}`}
                        {selectedDoc.lineEnd && `-${selectedDoc.lineEnd}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopy}
                      className="text-xs"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleShare}
                      className="text-xs"
                    >
                      Share
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownload}
                      className="text-xs"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Doc Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {contentLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full"
                    />
                  </div>
                ) : (
                  <article className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                    <ReactMarkdown components={MarkdownComponents}>
                      {fullContent || 'No content available'}
                    </ReactMarkdown>
                  </article>
                )}
                
                {/* Metadata section for functions/classes */}
                {selectedDoc.metadata && (selectedDoc.type === 'FUNCTION' || selectedDoc.type === 'CLASS') && (
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <h3 className="text-lg font-semibold mb-4">Metadata</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedDoc.metadata.parameters && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground">Parameters:</span>
                          <span className="ml-2">{selectedDoc.metadata.parameters.length}</span>
                        </div>
                      )}
                      {selectedDoc.metadata.returnType && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground">Returns:</span>
                          <code className="ml-2 text-purple-400">{selectedDoc.metadata.returnType}</code>
                        </div>
                      )}
                      {selectedDoc.metadata.complexity && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground">Complexity:</span>
                          <span className={`ml-2 ${selectedDoc.metadata.complexity > 10 ? 'text-red-400' : 'text-green-400'}`}>
                            {selectedDoc.metadata.complexity}
                          </span>
                        </div>
                      )}
                      {selectedDoc.metadata.isAsync !== undefined && (
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground">Async:</span>
                          <span className="ml-2">{selectedDoc.metadata.isAsync ? 'Yes' : 'No'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center text-muted-foreground"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <p>Select a document to view</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
