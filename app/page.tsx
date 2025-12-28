'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/navbar'
import { Hero } from '@/components/ui/hero'
import { FeatureCard } from '@/components/ui/feature-card'
import { PricingCard } from '@/components/ui/pricing-card'
import {
  Zap,
  Code2,
  Search,
  GitBranch,
  Sparkles,
  Brain,
  FileText,
  Lock,
  Rocket,
  BarChart3,
  MessageSquare,
  Network,
  Bug,
  Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check if user is already logged in and handle auth errors
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for error parameters in URL
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')

        if (error) {
          // Handle different error types
          switch (error) {
            case 'auth_failed':
              setAuthError('Authentication failed. Please check your GitHub OAuth configuration.')
              break
            case 'access_denied':
              setAuthError('GitHub access was denied. Please grant the required permissions.')
              break
            case 'oauth_not_configured':
              setAuthError('GitHub OAuth is not configured. Please set up environment variables.')
              break
            case 'no_code':
              setAuthError('Authorization code missing. Please try the login process again.')
              break
            case 'token_exchange_failed':
              setAuthError('Failed to exchange authorization token. Please check your GitHub app settings.')
              break
            case 'no_access_token':
              setAuthError('No access token received from GitHub. Please try again.')
              break
            case 'network_error':
              setAuthError('Network error during authentication. Please check your connection.')
              break
            case 'invalid_client':
              setAuthError('Invalid GitHub client credentials. Please check your OAuth app configuration.')
              break
            case 'redirect_uri_mismatch':
              setAuthError('Redirect URI mismatch. Please update your GitHub app redirect URI to match your deployment URL.')
              break
            case 'oauth_not_configured':
              setAuthError('GitHub OAuth is not configured. Please check your environment variables.')
              break
            case 'app_url_not_configured':
              setAuthError('App URL is not configured. Please set NEXT_PUBLIC_APP_URL in your environment variables.')
              break
            case 'invalid_redirect_uri':
              setAuthError('Invalid redirect URI configuration. Please check your NEXT_PUBLIC_APP_URL format.')
              break
            default:
              setAuthError('An authentication error occurred. Please try again.')
          }
          // Clear the error from URL
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        const data = await response.json()

        if (data.success && data.data?.user) {
          // User is logged in, redirect immediately without flash
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [])

  const features = [
    {
      icon: Zap,
      title: 'Instant Documentation',
      description: 'Generate comprehensive docs in 56 seconds. No manual writing - ever.',
    },
    {
      icon: Brain,
      title: 'Deep AI Understanding',
      description: 'AI reads EVERY file - functions, classes, routes, services, models, and more.',
    },
    {
      icon: MessageSquare,
      title: 'Chat with Your Code',
      description: 'Ask questions about your codebase. Get instant, accurate answers with code references.',
    },
    {
      icon: Code2,
      title: 'API Auto-Documentation',
      description: 'Automatically detect and document all API endpoints with OpenAPI spec generation.',
    },
    {
      icon: BarChart3,
      title: 'Code Quality Metrics',
      description: 'Complexity analysis, tech debt tracking, code smells, and maintainability scores.',
    },
    {
      icon: Network,
      title: 'Dependency Graphs',
      description: 'Visualize imports, find circular dependencies, identify orphan files.',
    },
    {
      icon: Layers,
      title: 'Architecture Analysis',
      description: 'Understand your app layers: controllers, services, models, utilities, middleware.',
    },
    {
      icon: GitBranch,
      title: 'Auto-Sync on Push',
      description: 'Webhooks keep docs up-to-date. Push to GitHub, docs update automatically.',
    },
  ]

  const comparisons = [
    { feature: 'AI Documentation Generation', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Chat with Codebase (RAG)', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Advanced Security Scanning (16+ patterns)', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Performance Profiling & Optimization', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Real-time Collaborative Editing', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Custom AI Model Fine-tuning', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Code Execution Sandbox', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'API Auto-Documentation', us: true, mintlify: true, readme: true, gitbook: false },
    { feature: 'Advanced Analytics & Code Churn', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Dependency Analysis & Drift Detection', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Free tier', us: true, mintlify: false, readme: false, gitbook: true },
    { feature: 'Starting price', usVal: 'FREE', mintVal: '$150/mo', readmeVal: '$99/mo', gitVal: '$100/mo' },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for individual developers',
      features: [
        '4 repositories',
        '1 documentation generation per day',
        'AI chat with codebase',
        'Basic security scanning',
        'Code quality metrics',
        'API auto-documentation',
        'GitHub integration',
      ],
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'month',
      description: 'For growing development teams',
      features: [
        'Unlimited repositories',
        'Unlimited generations',
        'Advanced security scanning (16+ patterns)',
        'Real-time collaborative editing',
        'Performance profiling & optimization',
        'Advanced analytics & code churn',
        'Priority support',
        'Export capabilities',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: 'seat/month',
      description: 'For large organizations',
      features: [
        'Everything in Pro',
        'Custom AI model fine-tuning',
        'Code execution sandbox',
        'Advanced dependency analysis',
        'Team management & SSO',
        'Dedicated support manager',
        'Custom integrations',
        'Compliance reporting',
      ],
    },
  ]

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Error Display */}
      {authError && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm max-w-md">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="absolute top-2 right-2 text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Problem/Solution Section - Notebook Style */}
      <section className="py-24 bg-gray-900/20 relative overflow-hidden">
        {/* Notebook background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.1) 0px,
              rgba(255,255,255,0.1) 1px,
              transparent 1px,
              transparent 24px
            )`
          }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold text-white font-poppins mb-4"
              >
                Problem vs. Solution
              </motion.h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Problem Side */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-red-400 font-bold text-sm">✗</span>
                  </div>
                  <h3 className="text-xl font-bold text-red-400 font-poppins">Manual Documentation</h3>
                </div>

                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="relative pl-6 border-l-2 border-red-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-300 text-base font-poppins leading-relaxed">
                      Takes days or weeks to write manually, wasting valuable development time
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="relative pl-6 border-l-2 border-red-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-300 text-base font-poppins leading-relaxed">
                      Gets outdated the moment code changes, becoming unreliable
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="relative pl-6 border-l-2 border-red-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-300 text-base font-poppins leading-relaxed">
                      Expensive tools that still require significant manual work
                    </p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Big Underline Separator */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.7 }}
                className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-px h-32 bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center absolute -left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </motion.div>

              {/* Solution Side */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-green-400 font-bold text-sm">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-400 font-poppins">DocAI Solution</h3>
                </div>

                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="relative pl-6 border-l-2 border-green-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-200 text-base font-poppins leading-relaxed font-medium">
                      Generate complete documentation in 56 seconds automatically
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="relative pl-6 border-l-2 border-green-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-200 text-base font-poppins leading-relaxed font-medium">
                      Auto-sync when you push to GitHub - always up-to-date
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="relative pl-6 border-l-2 border-green-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <p className="text-gray-200 text-base font-poppins leading-relaxed font-medium">
                      AI understands your entire codebase with 47+ analysis types
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="relative pl-6 border-l-2 border-blue-500/30"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                    <p className="text-blue-200 text-base font-poppins leading-relaxed font-medium">
                      100% FREE to start - no credit card required
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Mobile Separator */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.8 }}
              className="md:hidden mt-8 mb-4"
            >
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <div className="flex justify-center mt-2">
                <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-block mb-6"
            >
              <div className="px-6 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full">
                <span className="text-blue-400 font-semibold text-sm font-poppins tracking-wide uppercase">
                  Advanced AI Technology
                </span>
              </div>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins leading-tight">
              Enterprise-Grade <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">AI Features</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto font-poppins leading-relaxed">
              Revolutionary deep code intelligence that surpasses traditional documentation tools with cutting-edge AI analysis and automation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What Gets Documented */}
      <section className="py-24 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins">
              Complete Code <span className="gradient-text">Analysis Coverage</span>
            </h2>
            <p className="text-xl text-gray-300 font-poppins font-medium">
              Every aspect of your codebase is automatically analyzed and documented
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: 'API Routes', icon: '🌐', category: 'Backend' },
              { name: 'Controllers', icon: '🎛️', category: 'Backend' },
              { name: 'Services', icon: '⚙️', category: 'Backend' },
              { name: 'Models', icon: '🗄️', category: 'Data' },
              { name: 'Functions', icon: '🔧', category: 'Logic' },
              { name: 'Classes', icon: '🏗️', category: 'Structure' },
              { name: 'Components', icon: '🧩', category: 'Frontend' },
              { name: 'Hooks', icon: '🪝', category: 'Frontend' },
              { name: 'Middleware', icon: '🔀', category: 'Backend' },
              { name: 'Utilities', icon: '🛠️', category: 'Tools' },
              { name: 'Types', icon: '🏷️', category: 'Types' },
              { name: 'Interfaces', icon: '📋', category: 'Types' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="card-feature p-6 text-center group hover:scale-105 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="text-lg font-bold text-white font-poppins mb-1">{item.name}</div>
                <div className="text-sm text-gray-400 font-poppins">{item.category}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins">
              Why Choose <span className="gradient-text">DocAI</span>?
            </h2>
            <p className="text-lg text-gray-300 font-poppins">See how we compare to traditional documentation tools</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden backdrop-blur-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/80">
                  <tr>
                    <th className="py-6 px-6 text-left font-bold text-white font-poppins text-lg">Feature</th>
                    <th className="py-6 px-6 text-center font-bold text-blue-400 font-poppins text-lg">DocAI</th>
                    <th className="py-6 px-6 text-center font-semibold text-gray-400 font-poppins">Mintlify</th>
                    <th className="py-6 px-6 text-center font-semibold text-gray-400 font-poppins">ReadMe</th>
                    <th className="py-6 px-6 text-center font-semibold text-gray-400 font-poppins">GitBook</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                      <td className="py-5 px-6 text-gray-200 font-poppins font-medium">{row.feature}</td>
                      <td className="py-5 px-6 text-center">
                        {row.usVal ? (
                          <span className="text-green-400 font-bold font-poppins text-lg">{row.usVal}</span>
                        ) : (
                          <span className={`text-2xl ${row.us ? 'text-green-400' : 'text-red-400'}`}>
                            {row.us ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        {row.mintVal ? (
                          <span className="text-gray-400 font-poppins">{row.mintVal}</span>
                        ) : (
                          <span className={`text-lg ${row.mintlify ? 'text-green-400' : 'text-gray-500'}`}>
                            {row.mintlify ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        {row.readmeVal ? (
                          <span className="text-gray-400 font-poppins">{row.readmeVal}</span>
                        ) : (
                          <span className={`text-lg ${row.readme ? 'text-green-400' : 'text-gray-500'}`}>
                            {row.readme ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        {row.gitVal ? (
                          <span className="text-gray-400 font-poppins">{row.gitVal}</span>
                        ) : (
                          <span className={`text-lg ${row.gitbook ? 'text-green-400' : 'text-gray-500'}`}>
                            {row.gitbook ? '✓' : '✗'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 font-poppins">
              Start <span className="text-green-400">Free</span>, Scale When Ready
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto font-poppins font-medium">
              No credit card required. Upgrade only when your team needs enterprise features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={index}
                name={plan.name}
                price={plan.price}
                period={plan.period}
                description={plan.description}
                features={plan.features}
                popular={plan.popular}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900/50">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 shadow-2xl"
          >
            <div className="mb-8">
              <motion.h2
                className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins leading-tight"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{
                  background: 'linear-gradient(45deg, #ffffff, #3b82f6, #8b5cf6, #10b981, #ffffff)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Transform Your <span className="text-blue-400">Development Workflow</span>
              </motion.h2>
              <p className="text-xl text-gray-300 font-poppins font-medium leading-relaxed">
                Join thousands of developers who have automated their documentation process with enterprise-grade AI technology
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mb-6"
            >
              <motion.a
                onClick={() => window.location.href = '/api/github/connect'}
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-300 group"
                whileHover={{ scale: 1.02 }}
              >
                Start Free Today
                <Sparkles className="ml-3 w-5 h-5 group-hover:rotate-12 transition-transform" />
              </motion.a>
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 font-poppins">
              {[
                { color: "bg-green-400", text: "No credit card required" },
                { color: "bg-blue-400", text: "Full access to all features" },
                { color: "bg-purple-400", text: "Cancel anytime" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 group"
                >
                  <div className={`w-2 h-2 ${item.color} rounded-full group-hover:animate-pulse`}></div>
                  <span className="group-hover:text-gray-300 transition-colors duration-300">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/80 border-t border-gray-700/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-white font-poppins">DocAI</span>
              </div>
              <p className="text-gray-400 font-poppins leading-relaxed max-w-md">
                The most powerful AI documentation platform for modern development teams.
                Transform your codebase into comprehensive, accurate documentation instantly.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold font-poppins mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors font-poppins">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors font-poppins">Pricing</a></li>
                <li><a href="/demo" className="text-gray-400 hover:text-white transition-colors font-poppins">Demo</a></li>
                <li><a onClick={() => window.location.href = '/api/github/connect'} className="text-gray-400 hover:text-white transition-colors font-poppins cursor-pointer">Get Started</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold font-poppins mb-4">Company</h3>
              <ul className="space-y-3">
                <li><span className="text-gray-400 font-poppins">About</span></li>
                <li><span className="text-gray-400 font-poppins">Blog</span></li>
                <li><span className="text-gray-400 font-poppins">Careers</span></li>
                <li><span className="text-gray-400 font-poppins">Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 font-poppins text-sm">
              &copy; 2024 DocAI. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-gray-400 font-poppins text-sm">Made with ❤️ for developers</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
    </div>
  )
}
