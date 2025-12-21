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
  Shield,
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

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        const data = await response.json()
        
        if (data.success && data.data?.user) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [router])

  const features = [
    {
      icon: Zap,
      title: 'Instant Documentation',
      description: 'Generate comprehensive docs in 30 seconds. No manual writing - ever.',
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
      icon: Shield,
      title: 'Security Scanning',
      description: 'Find vulnerabilities: SQL injection, XSS, hardcoded secrets, and 15+ security issues.',
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
    { feature: 'Auto-generate docs', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'AI Chat with codebase', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Security scanning', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Code quality metrics', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'API auto-detection', us: true, mintlify: true, readme: true, gitbook: false },
    { feature: 'Dependency analysis', us: true, mintlify: false, readme: false, gitbook: false },
    { feature: 'Free tier', us: true, mintlify: false, readme: false, gitbook: true },
    { feature: 'Starting price', usVal: 'FREE', mintVal: '$150/mo', readmeVal: '$99/mo', gitVal: '$100/mo' },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'For individual developers',
      features: [
        '3 repositories',
        '5 generations/hour',
        'AI chat with codebase',
        'Security scanning',
        'Code quality metrics',
        'API documentation',
      ],
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'month',
      description: 'For serious developers',
      features: [
        '20 repositories',
        'Unlimited generations',
        'Priority processing',
        'Advanced analytics',
        'Export to PDF/Markdown',
        'Email support',
      ],
      popular: true,
    },
    {
      name: 'Team',
      price: '$49',
      period: 'seat/month',
      description: 'For development teams',
      features: [
        'Unlimited repositories',
        'Team collaboration',
        'Shared documentation',
        'Admin dashboard',
        'Priority support',
        'Custom integrations',
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
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Social Proof */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-foreground">30s</div>
              <div className="text-muted-foreground">Avg generation time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">100%</div>
              <div className="text-muted-foreground">Code coverage</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">FREE</div>
              <div className="text-muted-foreground">To start</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">15+</div>
              <div className="text-muted-foreground">Security checks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Developers <span className="text-red-500">Hate</span> Writing Docs
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p className="flex items-start gap-3">
                  <span className="text-red-500">X</span>
                  Takes days or weeks to write manually
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500">X</span>
                  Gets outdated the moment code changes
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500">X</span>
                  Boring, repetitive, and nobody wants to do it
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-red-500">X</span>
                  Expensive tools that still require manual work
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                How We <span className="text-green-500">Solve</span> It
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p className="flex items-start gap-3">
                  <span className="text-green-500">+</span>
                  Generate complete docs in 30 seconds
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-green-500">+</span>
                  Auto-sync when you push to GitHub
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-green-500">+</span>
                  AI reads and understands your entire codebase
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-green-500">+</span>
                  100% FREE to use - no credit card required
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              More Powerful Than <span className="text-foreground">Any Alternative</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deep code analysis that actually understands your codebase
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything Gets <span className="text-foreground">Documented</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Not just functions and classes - EVERYTHING
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'API Routes', icon: '/' },
              { name: 'Controllers', icon: 'C' },
              { name: 'Services', icon: 'S' },
              { name: 'Models', icon: 'M' },
              { name: 'Functions', icon: 'fn' },
              { name: 'Classes', icon: '{}' },
              { name: 'Components', icon: '<>' },
              { name: 'Hooks', icon: 'use' },
              { name: 'Middlewares', icon: 'MW' },
              { name: 'Utilities', icon: 'util' },
              { name: 'Types', icon: 'T' },
              { name: 'Interfaces', icon: 'I' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-muted/30 border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
              >
                <div className="text-2xl font-mono font-bold text-foreground mb-2">{item.icon}</div>
                <div className="text-sm text-muted-foreground">{item.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-foreground">Us</span>?
            </h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 px-4 font-semibold">Feature</th>
                  <th className="py-4 px-4 font-semibold text-green-500">DocAI</th>
                  <th className="py-4 px-4 font-semibold text-muted-foreground">Mintlify</th>
                  <th className="py-4 px-4 font-semibold text-muted-foreground">ReadMe</th>
                  <th className="py-4 px-4 font-semibold text-muted-foreground">GitBook</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="py-3 px-4">
                      {row.usVal || (row.us ? <span className="text-green-500 text-xl">+</span> : <span className="text-red-500">-</span>)}
                    </td>
                    <td className="py-3 px-4">
                      {row.mintVal || (row.mintlify ? <span className="text-green-500">+</span> : <span className="text-muted-foreground">-</span>)}
                    </td>
                    <td className="py-3 px-4">
                      {row.readmeVal || (row.readme ? <span className="text-green-500">+</span> : <span className="text-muted-foreground">-</span>)}
                    </td>
                    <td className="py-3 px-4">
                      {row.gitVal || (row.gitbook ? <span className="text-green-500">+</span> : <span className="text-muted-foreground">-</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Start <span className="text-foreground">Free</span>, Scale When Ready
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No credit card required. Upgrade only when you need more.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      <section className="py-20 bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-muted/50 to-muted/20 border border-border rounded-2xl p-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Document Your Code in <span className="text-green-500">30 Seconds</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join developers who stopped wasting time on documentation
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a
                href="/api/github/connect"
                className="inline-flex items-center px-8 py-4 bg-foreground hover:bg-foreground/90 text-background rounded-lg text-lg font-semibold shadow-lg transition-all"
              >
                Get Started Free
                <Sparkles className="ml-2 w-5 h-5" />
              </a>
            </motion.div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required - 3 repos free forever
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 DocAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
