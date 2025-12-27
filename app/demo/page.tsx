'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  Sparkles, 
  FileText, 
  Shield, 
  BarChart3, 
  Code2, 
  ArrowRight,
  Check,
  Zap,
  Github
} from 'lucide-react'

// Pre-generated demo documentation for a sample project
const demoData = {
  repoName: 'next-saas-starter',
  stats: {
    files: 47,
    functions: 128,
    classes: 12,
    apiRoutes: 15,
    components: 23,
    generationTime: '28 seconds',
  },
  overview: `# next-saas-starter - Complete Documentation

## Project Overview

A modern SaaS starter template built with Next.js 14, featuring authentication, payments, and a beautiful UI.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type-safe development |
| Prisma | Database ORM |
| Tailwind CSS | Utility-first styling |
| NextAuth.js | Authentication |
| Stripe | Payment processing |

## Architecture

\`\`\`
src/
├── app/           # Next.js App Router pages
│   ├── api/       # API routes
│   ├── auth/      # Authentication pages
│   └── dashboard/ # Protected dashboard
├── components/    # React components
│   ├── ui/        # Base UI components
│   └── features/  # Feature components
├── lib/           # Utilities and services
└── prisma/        # Database schema
\`\`\`

## Getting Started

\`\`\`bash
# Clone and install
git clone https://github.com/example/next-saas-starter
cd next-saas-starter
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
\`\`\`

## Key Features

1. **Authentication** - GitHub, Google, Email magic links
2. **Subscription Management** - Stripe integration with webhooks
3. **Dashboard** - Beautiful, responsive admin interface
4. **API Routes** - 15 REST endpoints with validation
`,
  apiDocs: `# API Reference

## Authentication

### POST /api/auth/login
Authenticate user with credentials.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "token": "jwt_token_here"
  }
}
\`\`\`

---

### GET /api/users/me
Get current authenticated user.

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response (200):**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "pro"
  }
}
\`\`\`

---

### POST /api/subscriptions/create
Create a new subscription.

**Request:**
\`\`\`json
{
  "planId": "pro_monthly",
  "paymentMethodId": "pm_..."
}
\`\`\`
`,
  security: {
    score: 82,
    grade: 'B',
    issues: [
      { type: 'UNPROTECTED_ENDPOINT', severity: 'MEDIUM', message: 'POST /api/webhooks/stripe lacks rate limiting' },
      { type: 'MISSING_HEADER', severity: 'LOW', message: 'X-Content-Type-Options header not set' },
    ],
    recommendations: [
      'Add rate limiting to webhook endpoints',
      'Implement CSRF protection on forms',
      'Add security headers middleware',
    ]
  },
  quality: {
    score: 78,
    grade: 'C+',
    complexity: {
      average: 8.2,
      hotspots: [
        { name: 'processPayment', value: 24, file: 'lib/stripe.ts' },
        { name: 'syncSubscription', value: 18, file: 'lib/subscriptions.ts' },
      ]
    },
    techDebt: {
      hours: 12,
      category: 'Medium',
    }
  }
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'api', label: 'API Docs', icon: Code2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'quality', label: 'Quality', icon: BarChart3 },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const simulateGeneration = () => {
    setGenerating(true)
    setGenerated(false)
    
    // Simulate generation with progress
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-white text-lg">DocAI</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Demo</span>
          </Link>
          <a
            onClick={() => window.location.href = '/api/github/connect'}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
          >
            <Github className="w-4 h-4" />
            Try with your repo
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Demo Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Live Demo: AI Documentation in Action
          </motion.h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            See how DocAI generates comprehensive documentation for a real Next.js SaaS project.
            No login required.
          </p>
        </div>

        {/* Generate Button */}
        {!generated && (
          <div className="flex justify-center mb-8">
            <motion.button
              onClick={simulateGeneration}
              disabled={generating}
              whileHover={{ scale: generating ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 ${
                generating
                  ? 'bg-gray-600 text-gray-400 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {generating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Generating Documentation...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Docs for Demo Project
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Generation Progress */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
                <div className="space-y-3">
                  {[
                    { text: 'Cloning repository...', delay: 0 },
                    { text: 'Analyzing 47 files...', delay: 0.5 },
                    { text: 'Detecting 128 functions, 15 API routes...', delay: 1 },
                    { text: 'Running security scan...', delay: 1.5 },
                    { text: 'Generating AI documentation...', delay: 2 },
                  ].map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: step.delay }}
                      className="flex items-center gap-3 text-slate-300"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: step.delay + 0.3 }}
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </motion.div>
                      {step.text}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar */}
        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
          >
            {[
              { label: 'Files', value: demoData.stats.files },
              { label: 'Functions', value: demoData.stats.functions },
              { label: 'Classes', value: demoData.stats.classes },
              { label: 'API Routes', value: demoData.stats.apiRoutes },
              { label: 'Components', value: demoData.stats.components },
              { label: 'Generated In', value: demoData.stats.generationTime, highlight: true },
            ].map((stat, idx) => (
              <div 
                key={idx}
                className={`text-center p-4 rounded-lg ${
                  stat.highlight 
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
                    : 'bg-slate-800/50 border border-white/10'
                }`}
              >
                <div className={`text-2xl font-bold ${stat.highlight ? 'text-green-400' : 'text-white'}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Documentation Viewer */}
        {generated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/20">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-white bg-white/10 border-b-2 border-indigo-500'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono bg-black/30 p-4 rounded-lg">
                    {demoData.overview}
                  </pre>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono bg-black/30 p-4 rounded-lg">
                    {demoData.apiDocs}
                  </pre>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-amber-400">{demoData.security.score}</div>
                      <div className="text-sm text-slate-400">Security Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-amber-400">{demoData.security.grade}</div>
                      <div className="text-sm text-slate-400">Grade</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3">Issues Found</h3>
                    <div className="space-y-2">
                      {demoData.security.issues.map((issue, idx) => (
                        <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              issue.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              issue.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs text-slate-400">{issue.type}</span>
                          </div>
                          <p className="text-sm text-slate-300">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {demoData.security.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'quality' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-400">{demoData.quality.score}</div>
                      <div className="text-sm text-slate-400">Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-400">{demoData.quality.grade}</div>
                      <div className="text-sm text-slate-400">Grade</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-3">Complexity Hotspots</h3>
                    <div className="space-y-2">
                      {demoData.quality.complexity.hotspots.map((func, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                          <div>
                            <span className="text-white font-mono text-sm">{func.name}()</span>
                            <span className="text-slate-500 text-xs ml-2">{func.file}</span>
                          </div>
                          <span className={`font-bold ${
                            func.value > 20 ? 'text-red-400' : 
                            func.value > 10 ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {func.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Technical Debt</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-amber-400">{demoData.quality.techDebt.hours}h</span>
                      <span className="text-slate-400">estimated to fix ({demoData.quality.techDebt.category} priority)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to document YOUR codebase?
            </h2>
            <a
              onClick={() => window.location.href = '/api/github/connect'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer"
            >
              Connect GitHub - It's Free
            </a>
            <p className="text-slate-500 text-sm mt-3">
              No credit card required. 4 repos free forever.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

