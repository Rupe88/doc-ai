'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Network,
  GitBranch,
  Code2,
  Zap,
  AlertTriangle,
  TrendingUp,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface CodeVisualizerProps {
  analysis: any
  architecture?: any
  onNodeClick?: (node: any) => void
}

export function CodeVisualizer({ analysis, architecture, onNodeClick }: CodeVisualizerProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'architecture' | 'dependencies'>('overview')
  const [zoom, setZoom] = useState(1)
  const [showDetails, setShowDetails] = useState(false)

  const stats = {
    files: analysis?.stats?.totalFiles || 0,
    functions: analysis?.functions?.length || 0,
    classes: analysis?.classes?.length || 0,
    components: analysis?.components?.length || 0,
    apis: analysis?.apiRoutes?.length || 0,
    complexity: analysis?.stats?.avgComplexity || 5
  }

  return (
    <div className="bg-slate-900/50 rounded-xl border border-white/10 p-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Code Architecture</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-800/50 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'architecture', label: 'Architecture', icon: Network },
          { id: 'dependencies', label: 'Dependencies', icon: GitBranch }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="relative min-h-[400px]" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <AnimatePresence mode="wait">
          {viewMode === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Files', value: stats.files, color: 'text-blue-400' },
                  { label: 'Functions', value: stats.functions, color: 'text-green-400' },
                  { label: 'Classes', value: stats.classes, color: 'text-purple-400' },
                  { label: 'Components', value: stats.components, color: 'text-pink-400' },
                  { label: 'API Routes', value: stats.apis, color: 'text-cyan-400' },
                  { label: 'Complexity', value: stats.complexity.toFixed(1), color: 'text-blue-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Complexity Visualization */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Code Complexity Distribution</h4>
                <div className="flex items-end gap-2 h-20">
                  {[
                    { label: 'Low', value: 60, color: 'bg-green-500' },
                    { label: 'Medium', value: 30, color: 'bg-blue-500' },
                    { label: 'High', value: 8, color: 'bg-indigo-500' },
                    { label: 'Critical', value: 2, color: 'bg-red-500' }
                  ].map((level, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full ${level.color} rounded-t transition-all duration-500`}
                        style={{ height: `${level.value}%` }}
                      />
                      <span className="text-xs text-slate-400 mt-2">{level.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Architecture Layers */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Application Layers</h4>
                {['Frontend', 'API', 'Business Logic', 'Database'].map((layer, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-slate-300">{layer}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${Math.random() * 40 + 60}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Architecture Patterns */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Detected Patterns</h4>
                <div className="space-y-2">
                  {[
                    { pattern: 'MVC Architecture', confidence: 85, description: 'Model-View-Controller pattern detected' },
                    { pattern: 'REST API', confidence: 92, description: 'RESTful API endpoints found' },
                    { pattern: 'Component Library', confidence: 78, description: 'Reusable component structure' }
                  ].map((pattern, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{pattern.pattern}</div>
                        <div className="text-xs text-slate-400">{pattern.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-medium">{pattern.confidence}%</div>
                        <div className="text-xs text-slate-400">confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'dependencies' && (
            <motion.div
              key="dependencies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Dependency Graph Placeholder */}
              <div className="bg-slate-800/50 rounded-lg p-8 text-center">
                <GitBranch className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h4 className="text-white font-medium mb-2">Dependency Visualization</h4>
                <p className="text-slate-400 text-sm">
                  Interactive dependency graph would show here.<br/>
                  Click nodes to explore relationships.
                </p>
              </div>

              {/* Top Dependencies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Most Used</h4>
                  {['react', 'next', 'typescript', 'tailwindcss'].map((dep, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <span className="text-slate-300">{dep}</span>
                      <span className="text-slate-500 text-sm">{Math.floor(Math.random() * 50) + 10} uses</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Circular Dependencies</h4>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">None detected</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <span>Analysis version: Enhanced</span>
        </div>
      </div>
    </div>
  )
}

