'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Code2,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Tag,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'function' | 'class' | 'component' | 'api' | 'doc' | 'security'
  title: string
  description: string
  file: string
  line?: number
  relevance: number
  tags: string[]
  metadata?: any
}

interface AdvancedSearchProps {
  analysis: any
  docs: any[]
  onResultClick?: (result: SearchResult) => void
}

export function AdvancedSearch({ analysis, docs, onResultClick }: AdvancedSearchProps) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    type: 'all',
    file: '',
    severity: 'all',
    tags: [] as string[]
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Generate searchable data from analysis and docs
  const searchableData = useMemo(() => {
    const data: SearchResult[] = []

    // Add functions
    analysis.functions?.forEach((func: any) => {
      data.push({
        id: `func-${func.name}-${func.filePath}`,
        type: 'function',
        title: func.name,
        description: `Function with ${func.parameters?.length || 0} parameters, complexity ${func.complexity || 'N/A'}`,
        file: func.filePath,
        line: func.lineStart,
        relevance: 1,
        tags: ['function', func.isAsync ? 'async' : 'sync', func.isExported ? 'exported' : 'internal'],
        metadata: func
      })
    })

    // Add classes
    analysis.classes?.forEach((cls: any) => {
      data.push({
        id: `class-${cls.name}-${cls.filePath}`,
        type: 'class',
        title: cls.name,
        description: `Class with ${cls.methods?.length || 0} methods${cls.extends ? ` extending ${cls.extends}` : ''}`,
        file: cls.filePath,
        line: cls.lineStart,
        relevance: 1,
        tags: ['class', cls.extends ? 'inheritance' : 'base'],
        metadata: cls
      })
    })

    // Add components
    analysis.components?.forEach((comp: any) => {
      data.push({
        id: `comp-${comp.name}-${comp.filePath}`,
        type: 'component',
        title: comp.name,
        description: `React component with ${comp.props?.length || 0} props`,
        file: comp.filePath,
        line: comp.lineStart,
        relevance: 1,
        tags: ['component', 'react', comp.isServerComponent ? 'server' : 'client'],
        metadata: comp
      })
    })

    // Add API routes
    analysis.apiRoutes?.forEach((route: any) => {
      data.push({
        id: `api-${route.method}-${route.path}`,
        type: 'api',
        title: `${route.method} ${route.path}`,
        description: `API endpoint${route.isProtected ? ' (protected)' : ' (public)'}`,
        file: route.filePath,
        line: route.lineStart,
        relevance: 1,
        tags: ['api', route.method.toLowerCase(), route.isProtected ? 'protected' : 'public'],
        metadata: route
      })
    })

    // Add security issues
    analysis.security?.issues?.forEach((issue: any, idx: number) => {
      data.push({
        id: `sec-${idx}`,
        type: 'security',
        title: issue.message,
        description: `Security issue: ${issue.type} - ${issue.recommendation}`,
        file: issue.filePath,
        relevance: 0.9,
        tags: ['security', issue.severity, issue.type],
        metadata: issue
      })
    })

    // Add docs
    docs?.forEach((doc: any) => {
      data.push({
        id: `doc-${doc.id}`,
        type: 'doc',
        title: doc.title,
        description: doc.content?.substring(0, 200) + '...',
        file: doc.filePath || '',
        relevance: 0.8,
        tags: ['documentation', doc.type],
        metadata: doc
      })
    })

    return data
  }, [analysis, docs])

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    // Simulate search delay
    setTimeout(() => {
      const results = searchableData
        .filter(item => {
          // Text search
          const matchesQuery = query.toLowerCase().split(' ').every(term =>
            item.title.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term) ||
            item.file.toLowerCase().includes(term) ||
            item.tags.some(tag => tag.toLowerCase().includes(term))
          )

          // Type filter
          const matchesType = filters.type === 'all' || item.type === filters.type

          // File filter
          const matchesFile = !filters.file || item.file.toLowerCase().includes(filters.file.toLowerCase())

          // Severity filter (for security issues)
          const matchesSeverity = filters.severity === 'all' ||
            item.metadata?.severity === filters.severity ||
            (item.type !== 'security')

          // Tags filter
          const matchesTags = filters.tags.length === 0 ||
            filters.tags.some(tag => item.tags.includes(tag))

          return matchesQuery && matchesType && matchesFile && matchesSeverity && matchesTags
        })
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 50) // Limit results

      setSearchResults(results)
      setIsSearching(false)
    }, 300)
  }, [query, filters, searchableData])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'function': return <Code2 className="w-4 h-4" />
      case 'class': return <FileText className="w-4 h-4" />
      case 'component': return <Code2 className="w-4 h-4" />
      case 'api': return <MessageSquare className="w-4 h-4" />
      case 'security': return <AlertCircle className="w-4 h-4" />
      case 'doc': return <FileText className="w-4 h-4" />
      default: return <Search className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'function': return 'text-blue-400'
      case 'class': return 'text-purple-400'
      case 'component': return 'text-pink-400'
      case 'api': return 'text-green-400'
      case 'security': return 'text-red-400'
      case 'doc': return 'text-cyan-400'
      default: return 'text-slate-400'
    }
  }

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    searchableData.forEach(item => {
      item.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [searchableData])

  return (
    <div className="bg-slate-900/50 rounded-xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Advanced Code Search</h3>
        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full">
          {searchableData.length} items indexed
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search functions, classes, APIs, security issues..."
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Filters Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 p-4 bg-slate-800/30 rounded-lg border border-white/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="function">Functions</option>
                  <option value="class">Classes</option>
                  <option value="component">Components</option>
                  <option value="api">API Routes</option>
                  <option value="security">Security</option>
                  <option value="doc">Documentation</option>
                </select>
              </div>

              {/* File Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">File</label>
                <input
                  type="text"
                  value={filters.file}
                  onChange={(e) => setFilters(prev => ({ ...prev, file: e.target.value }))}
                  placeholder="Filter by file..."
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }))}
                        className="hover:text-indigo-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value && !filters.tags.includes(e.target.value)) {
                      setFilters(prev => ({
                        ...prev,
                        tags: [...prev.tags, e.target.value]
                      }))
                    }
                    e.target.value = ''
                  }}
                  className="w-full mt-1 px-3 py-2 bg-slate-700 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Add tag...</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="space-y-2">
        {isSearching ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Searching codebase...</p>
          </div>
        ) : query && searchResults.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No results found for "{query}"</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-4 cursor-pointer transition-colors border border-white/5 hover:border-white/10"
                  onClick={() => onResultClick?.(result)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(result.type)} bg-current/10`}>
                      {getTypeIcon(result.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium truncate">{result.title}</h4>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {result.type}
                        </span>
                        {result.metadata?.severity && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            result.metadata.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            result.metadata.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            result.metadata.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {result.metadata.severity}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                        {result.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {result.file}
                        </span>
                        {result.line && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Line {result.line}
                          </span>
                        )}
                      </div>

                      {result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.tags.slice(0, 5).map(tag => (
                            <span
                              key={tag}
                              className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : query === '' ? (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Enter a search query to explore your codebase</p>
            <p className="text-sm text-slate-500 mt-1">Search functions, classes, APIs, security issues, and more</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

