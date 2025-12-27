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
      className={`card-pricing relative p-8 transition-all ${
        popular
          ? 'border-blue-600 shadow-xl shadow-blue-600/10 scale-105'
          : 'hover:border-blue-600/70 hover:shadow-lg hover:shadow-blue-600/5'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-600 px-4 py-2 rounded-full text-white text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-blue-600/25 font-poppins">
            <Sparkles className="w-4 h-4" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-3 font-poppins">{name}</h3>
        <p className="text-gray-400 text-base mb-6 font-poppins">{description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-white font-poppins">{price}</span>
          <span className="text-gray-400 text-lg ml-2 font-poppins">/{period}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: delay + index * 0.1 }}
            className="flex items-start space-x-3"
          >
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-200 text-base font-poppins">{feature}</span>
          </motion.li>
        ))}
      </ul>

      <Button
        asChild
        className={`w-full font-poppins font-semibold ${
          popular
            ? 'btn-primary'
            : 'btn-secondary'
        }`}
      >
        <Link href="/api/github/connect">Get started</Link>
      </Button>
    </motion.div>
  )
}



