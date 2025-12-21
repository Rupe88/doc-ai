'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/utils/auth-client'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault()
    await logout()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center space-x-2 mb-8 group">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <Sparkles className="w-8 h-8 text-foreground" />
        </motion.div>
        <span className="text-xl font-bold text-foreground">DocAI</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-foreground text-background shadow-github'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="w-5 h-5 mr-3" />
        Logout
      </Button>
    </aside>
  )
}



