'use client'

import { Button } from './button'
import { ArrowRight, Play, Snowflake } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Winter Background Effects */}
      <div className="absolute inset-0">
        {/* Animated snow particles */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full opacity-30 animate-pulse delay-300"></div>
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-cyan-200 rounded-full opacity-25 animate-pulse delay-700"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full opacity-40 animate-pulse delay-1000"></div>

        {/* Ice crystal effects */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-cyan-400/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Winter Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 mb-8">
            <Snowflake className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">Winter Special</span>
            <span className="text-sm text-gray-300 font-medium">4 repos FREE forever</span>
          </div>

          {/* Eye-catching Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 font-poppins leading-tight">
            <span className="block bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
              Never Write
            </span>
            <span className="block bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
              Documentation
            </span>
            <span className="block text-white mt-2">
              Again.
            </span>
          </h1>

          <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent font-poppins mb-8">
            Your Codebase, Perfected.
          </div>

          {/* Compelling winter-themed copy */}
          <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto mb-12 font-poppins leading-relaxed">
            Experience the <span className="text-cyan-400 font-semibold">frozen revolution</span> in documentation.
            DocAI reads every file and generates comprehensive docs in <span className="text-green-400 font-bold">56 seconds</span>.
          </p>

          {/* Eye-catching feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg px-4 py-3 backdrop-blur-sm">
              <span className="text-blue-400 font-semibold text-sm">AI-Powered</span>
            </div>

            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg px-4 py-3 backdrop-blur-sm">
              <span className="text-green-400 font-bold text-lg">56s</span>
              <span className="text-green-400 font-semibold text-sm">Average</span>
            </div>

            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg px-4 py-3 backdrop-blur-sm">
              <span className="text-purple-400 font-semibold text-sm">4 Repos FREE</span>
            </div>
          </div>

          {/* CTA Buttons with winter glow */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <Button
                asChild
                size="lg"
                className="relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105"
              >
                <Link href="/api/github/connect" className="flex items-center gap-3">
                  <span>Try DocAI Free</span>
                </Link>
              </Button>
            </div>

            <div className="relative group">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-white/20 text-white hover:bg-white/10 hover:border-cyan-400/50 px-8 py-4 font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 group-hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Link href="/demo" className="flex items-center gap-3">
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Watch Live Demo</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Social proof with winter theme */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 font-poppins mb-2">56s</div>
              <div className="text-gray-400 text-sm font-medium">Average generation time</div>
            </div>

            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 font-poppins mb-2">20+</div>
              <div className="text-gray-400 text-sm font-medium">Happy developers</div>
            </div>

            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-purple-400 font-poppins mb-2">4</div>
              <div className="text-gray-400 text-sm font-medium">Free repositories</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}