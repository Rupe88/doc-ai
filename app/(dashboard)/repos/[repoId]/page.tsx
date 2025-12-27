'use client'

import { useEffect, useState } from 'react'
import { UltraDocViewer } from '@/components/docs/UltraDocViewer'
import { UltraChatInterface } from '@/components/chat/UltraChatInterface'
import { PowerfulAnalyticsDashboard } from '@/components/docs/PowerfulAnalyticsDashboard'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MessageSquare,
  FileText,
  RefreshCw,
  ExternalLink,
  Github,
  ChevronRight,
} from 'lucide-react'

type TabType = 'docs' | 'chat' | 'analytics'

export default function RepoPage({ params }: { params: { repoId: string } }) {
  const [repoInfo, setRepoInfo] = useState<{ name: string; fullName: string } | null>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('docs')
  const [successShown, setSuccessShown] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<{
    status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number
    jobId?: string
    message?: string
  }>({ status: 'idle' })
  const [streamActive, setStreamActive] = useState(false)

  useEffect(() => {
    fetchDocs()
    fetchRepoInfo()
  }, [params.repoId])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    // Poll for generation status if generating
    if (generationStatus.status === 'pending' || generationStatus.status === 'processing') {
      interval = setInterval(() => {
        if (generationStatus.jobId && generationStatus.status !== 'completed') {
          checkGenerationStatus(generationStatus.jobId)
        }
      }, 3000) // Increased from 2000ms to reduce server load
    } else if (generationStatus.status === 'completed') {
      const timeout = setTimeout(() => {
        fetchDocs()
        setGenerationStatus({ status: 'idle' })
        setSuccessShown(false) // Reset for next generation
      }, 2000) // Increased from 1000ms
      return () => clearTimeout(timeout)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [generationStatus.status, generationStatus.jobId])

  const fetchRepoInfo = async () => {
    try {
      const response = await fetch(`/api/repos/${params.repoId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setRepoInfo({ name: data.data.name, fullName: data.data.fullName })
        }
      }
    } catch (error) {
      console.error('Failed to fetch repo info:', error)
    }
  }

  const fetchDocs = async () => {
    try {
      const response = await fetch(`/api/repos/${params.repoId}/docs`, {
        credentials: 'include',
      })
      
      if (!response.ok) throw new Error('Failed to fetch docs')
      
      const data = await response.json()
      if (data.success && data.data?.docs) {
        setDocs(data.data.docs)
      }
    } catch (error) {
      console.error('Failed to fetch docs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocs = async () => {
    if (streamActive) {
      console.warn('Generation already in progress')
      return
    }

    setGenerating(true)
    setSuccessShown(false)
    setStreamActive(true)
    setGenerationStatus({ status: 'processing', progress: 5, message: 'Starting generation...' })

    try {
      // Use fetch with streaming for Server-Sent Events
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoId: params.repoId,
          options: {
            includeTests: false,
            includeExamples: true,
            depth: 'deep',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Server error: ${response.status}`)
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream for real-time progress
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('Failed to get response stream')
        }

        let buffer = ''
        let lastJobId: string | undefined
        let streamCompleted = false
        let lastUpdateTime = Date.now()
        
        // Timeout fallback - if no updates for 45 seconds, start polling
        const timeoutCheck = setInterval(() => {
          if (Date.now() - lastUpdateTime > 45000 && lastJobId && !streamCompleted) {
            console.log('[Generate] SSE timeout, switching to polling')
            clearInterval(timeoutCheck)
            reader.cancel()
          }
        }, 5000)
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            lastUpdateTime = Date.now()
            buffer += decoder.decode(value, { stream: true })
            
            // Parse SSE messages
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || '' // Keep incomplete message in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  
                  // Track the jobId for fallback polling
                  if (data.jobId) {
                    lastJobId = data.jobId
                  }
                  
                  if (data.type === 'progress') {
                    setGenerationStatus({
                      status: 'processing',
                      progress: data.progress,
                      message: data.message,
                      jobId: data.jobId,
                    })
                  } else if (data.type === 'complete') {
                    streamCompleted = true
                    setGenerationStatus({
                      status: 'completed',
                      progress: 100,
                      message: data.message,
                      jobId: data.jobId,
                    })
                    setSuccessShown(true)
                    setGenerating(false)
                    setStreamActive(false)
                    clearInterval(timeoutCheck)
                    return
                  } else if (data.type === 'error') {
                    clearInterval(timeoutCheck)
                    setStreamActive(false)
                    throw new Error(data.message)
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE message:', line)
                }
              }
            }
          }
        } finally {
          clearInterval(timeoutCheck)
        }
        
        // Stream ended without complete/error - fallback to polling if we have jobId
        if (!streamCompleted && lastJobId) {
          console.log('[Generate] SSE stream ended unexpectedly, falling back to polling')
          setGenerationStatus(prev => ({
            ...prev,
            jobId: lastJobId,
            message: 'Checking generation status...',
          }))
          // The useEffect polling will now kick in since we have a jobId
        } else if (!streamCompleted) {
          throw new Error('Generation stream ended unexpectedly')
        }
      } else {
        // Fallback to JSON response (for error cases)
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to generate documentation')
        }
        
        if (data.data?.status === 'COMPLETED' && !successShown) {
          setGenerationStatus({
            status: 'completed',
            progress: 100,
            jobId: data.data.jobId,
            message: 'Documentation generated successfully!',
          })
          setSuccessShown(true)
          // Let the useEffect handle the reset to avoid duplicate messages
          setGenerating(false)
        } else if (data.data?.status === 'FAILED') {
          throw new Error(data.data.error || 'Documentation generation failed')
        } else if (data.data?.jobId) {
          setGenerationStatus({
            status: 'processing',
            progress: 50,
            jobId: data.data.jobId,
            message: 'Generation in progress...',
          })
          checkGenerationStatus(data.data.jobId)
        }
      }
    } catch (error) {
      console.error('Failed to generate docs:', error)
      setGenerationStatus({
        status: 'failed',
        message: error instanceof Error ? error.message : 'Failed to generate documentation',
      })
      setGenerating(false)
      setStreamActive(false)
    }
  }

  const checkGenerationStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/generate/${jobId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const job = data.data

          // Prevent duplicate success messages
          if (job.status === 'COMPLETED' && generationStatus.status === 'completed') {
            return // Already completed, don't update
          }

          setGenerationStatus({
            status: job.status === 'COMPLETED' ? 'completed' :
                   job.status === 'FAILED' ? 'failed' :
                   job.status === 'PROCESSING' ? 'processing' : 'pending',
            progress: job.progress || 0,
            jobId,
            message: job.status === 'COMPLETED' ? 'Documentation generated successfully!' :
                    job.status === 'FAILED' ? job.error || 'Generation failed' :
                    job.status === 'PROCESSING' ? `Processing... ${job.progress || 0}%` :
                    'Waiting to start...',
          })

          if (job.status === 'COMPLETED') {
            setSuccessShown(true)
            setGenerating(false)
          } else if (job.status === 'FAILED') {
            setGenerating(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check generation status:', error)
      setGenerationStatus({
        status: 'failed',
        message: 'Failed to check generation status',
      })
      setGenerating(false)
    }
  }

  const tabs = [
    { id: 'docs' as TabType, label: 'Documentation', icon: FileText, badge: docs.length || null },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-400">Loading documentation...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-3">
              <a href="/dashboard" className="text-slate-500 hover:text-white transition-colors">
                Dashboard
              </a>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Github className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {repoInfo?.name || 'Repository'}
                  </h1>
                  {repoInfo?.fullName && (
                    <a
                      href={`https://github.com/${repoInfo.fullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    >
                      {repoInfo.fullName}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateDocs}
                disabled={generating || generationStatus.status === 'pending' || generationStatus.status === 'processing'}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              >
                {generating || generationStatus.status === 'pending' || generationStatus.status === 'processing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Docs</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-md">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Generation Status Banner */}
        <AnimatePresence>
          {(generationStatus.status !== 'idle' || generating) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`px-6 py-3 ${
                generationStatus.status === 'completed' ? 'bg-emerald-500/10 border-t border-emerald-500/20' :
                generationStatus.status === 'failed' ? 'bg-red-500/10 border-t border-red-500/20' :
                'bg-indigo-500/10 border-t border-indigo-500/20'
              }`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {generationStatus.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : generationStatus.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${
                        generationStatus.status === 'completed' ? 'text-emerald-400' :
                        generationStatus.status === 'failed' ? 'text-red-400' :
                        'text-indigo-400'
                      }`}>
                        {generationStatus.status === 'completed' ? 'Documentation Generated!' :
                         generationStatus.status === 'failed' ? 'Generation Failed' :
                         'Generating Documentation...'}
                      </p>
                      {generationStatus.message && (
                        <p className="text-xs text-slate-500">{generationStatus.message}</p>
                      )}
                    </div>
                  </div>
                  {generationStatus.progress !== undefined && generationStatus.status !== 'completed' && generationStatus.status !== 'failed' && (
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${generationStatus.progress}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        />
                      </div>
                      <span className="text-sm text-slate-400">{generationStatus.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'docs' && (
          <motion.div
            key="docs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-[calc(100vh-140px)]"
          >
            {docs.length > 0 ? (
              <UltraDocViewer
                docs={docs}
                repoName={repoInfo?.name || 'Repository'}
                repoFullName={repoInfo?.fullName || ''}
                onRefresh={() => {
                  setLoading(true)
                  fetchDocs()
                }}
                isRefreshing={loading}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-md mx-auto px-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Documentation Yet</h3>
                  <p className="text-slate-400 mb-8">
                    Generate comprehensive documentation for your codebase with AI-powered analysis.
                    Includes functions, classes, API endpoints, security analysis, and more.
                  </p>
                  <button
                    onClick={handleGenerateDocs}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Documentation
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-600 mt-4">
                    Usually takes 15-30 seconds
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-[calc(100vh-140px)]"
          >
            <UltraChatInterface
              repoId={params.repoId}
              repoName={repoInfo?.name || 'Repository'}
            />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-[calc(100vh-140px)] px-6 py-8"
          >
            <PowerfulAnalyticsDashboard repoId={params.repoId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
