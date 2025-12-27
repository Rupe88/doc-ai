'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  delay?: number
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="group relative h-full"
    >
      <div className="relative h-full bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 transition-all duration-300 hover:border-blue-500/30 hover:bg-gray-900/60 hover:shadow-xl hover:shadow-blue-500/5">
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10">
          {/* Icon with professional styling */}
          <div className="relative mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/20 group-hover:border-blue-400/40 transition-all duration-300">
              <Icon className="w-8 h-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 w-16 h-16 bg-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
          </div>

          {/* Title with better typography */}
          <h3 className="text-white font-bold text-xl mb-4 font-poppins leading-tight group-hover:text-blue-50 transition-colors duration-300">
            {title}
          </h3>

          {/* Description with improved spacing */}
          <p className="text-gray-400 text-base leading-relaxed font-poppins group-hover:text-gray-300 transition-colors duration-300">
            {description}
          </p>

          {/* Professional accent line */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </motion.div>
  )
}



