'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Github } from 'lucide-react'
import { Button } from './button'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-poppins ${
        scrolled
          ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 shadow-lg shadow-blue-600/5'
          : 'bg-gray-900/90 backdrop-blur-md'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span className="text-xl font-bold text-white font-poppins">DocAI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/demo"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium font-poppins px-3 py-2 rounded-lg hover:bg-blue-600/10"
            >
              Live Demo
            </Link>
            <Link
              href="/#features"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium font-poppins px-3 py-2 rounded-lg hover:bg-blue-600/10"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium font-poppins px-3 py-2 rounded-lg hover:bg-blue-600/10"
            >
              Pricing
            </Link>
            <Link
              href="/api/github/connect"
              className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2 text-sm font-medium font-poppins px-3 py-2 rounded-lg hover:bg-blue-600/10"
            >
              <Github className="w-4 h-4" />
              <span>Sign in</span>
            </Link>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 font-poppins font-semibold"
            >
              <Link href="/api/github/connect">Get started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-700/50"
          >
            <div className="px-4 py-6 space-y-4">
              <Link
                href="/demo"
                className="block text-blue-400 hover:text-blue-300 transition-colors font-medium font-poppins px-4 py-3 rounded-lg hover:bg-blue-600/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                Live Demo
              </Link>
              <Link
                href="/#features"
                className="block text-gray-300 hover:text-white transition-colors font-medium font-poppins px-4 py-3 rounded-lg hover:bg-blue-600/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="block text-gray-300 hover:text-white transition-colors font-medium font-poppins px-4 py-3 rounded-lg hover:bg-blue-600/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/api/github/connect"
                className="block text-gray-300 hover:text-white transition-colors font-medium font-poppins px-4 py-3 rounded-lg hover:bg-blue-600/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-poppins font-semibold shadow-lg shadow-blue-600/25"
              >
                <Link href="/api/github/connect" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}



