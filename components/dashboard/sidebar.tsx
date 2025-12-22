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
    <aside className="fixed left-0 top-0 h-full w-64 bg-black border-r border-gray-600 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-600">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <span className="text-xl font-bold text-white">DocAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ backgroundColor: '#2d2d2d' }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Section & Logout */}
      <div className="p-4 border-t border-gray-600">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-red-400 hover:bg-gray-700 rounded-md"
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span className="text-sm">Sign out</span>
        </Button>
      </div>
    </aside>
  )
}



