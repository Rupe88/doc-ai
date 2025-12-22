'use client'

import { motion } from 'framer-motion'
import { Button } from './button'
import { Check, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
  delay?: number
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  delay = 0,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`relative rounded-md p-6 border transition-all hover:shadow-lg ${
        popular
          ? 'bg-gray-800 border-blue-600 shadow-lg scale-105'
          : 'bg-gray-800 border-gray-600 hover:border-blue-500/50 hover:bg-gray-700'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-600 px-3 py-1 rounded-full text-white text-xs font-medium flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Most popular</span>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-3xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground text-sm ml-1">/{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: delay + index * 0.1 }}
            className="flex items-start space-x-2"
          >
            <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-white text-sm">{feature}</span>
          </motion.li>
        ))}
      </ul>

      <Button
        asChild
        className={`w-full ${
          popular
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg'
            : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500'
        }`}
      >
        <Link href="/api/github/connect">Get started</Link>
      </Button>
    </motion.div>
  )
}



