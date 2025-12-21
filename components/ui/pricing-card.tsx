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
      whileHover={{ scale: 1.05, y: -10 }}
      className={`relative rounded-2xl p-8 border-2 transition-all ${
        popular
          ? 'bg-card border-foreground shadow-github-lg scale-105'
          : 'bg-card border-border hover:border-foreground/50 hover:shadow-github'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-foreground px-4 py-1 rounded-full text-background text-sm font-semibold flex items-center space-x-1">
            <Sparkles className="w-4 h-4" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-5xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground ml-2">/{period}</span>
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
            <Check className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
            <span className="text-foreground">{feature}</span>
          </motion.li>
        ))}
      </ul>

      <Button
        asChild
        className={`w-full ${
          popular
            ? 'bg-foreground hover:bg-foreground/90 text-background'
            : 'bg-card hover:bg-card text-foreground border border-border'
        }`}
      >
        <Link href="/api/github/connect">Get Started</Link>
      </Button>
    </motion.div>
  )
}



