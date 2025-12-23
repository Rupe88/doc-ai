import { logger } from '../utils/logger'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'achievement'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    url?: string
    callback?: () => void
  }
  metadata?: any
}

export class NotificationManager {
  private notifications: Notification[] = []
  private listeners: ((notifications: Notification[]) => void)[] = []

  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }

    this.notifications.unshift(newNotification)

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }

    this.notifyListeners()

    logger.info('Notification added', {
      type: notification.type,
      title: notification.title
    })

    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        this.remove(newNotification.id)
      }, 5000)
    }

    return newNotification.id
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyListeners()
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  getAll(): Notification[] {
    return [...this.notifications]
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback([...this.notifications]))
  }

  // Predefined notification helpers
  notifyDocGenerated(repoName: string, jobId: string) {
    return this.add({
      type: 'success',
      title: 'Documentation Generated!',
      message: `Successfully generated comprehensive docs for ${repoName}`,
      action: {
        label: 'View Docs',
        url: `/repos/${jobId}`
      },
      metadata: { repoName, jobId }
    })
  }

  notifySecurityIssue(repoName: string, issueCount: number) {
    return this.add({
      type: 'warning',
      title: 'Security Issues Found',
      message: `Found ${issueCount} security issues in ${repoName}`,
      action: {
        label: 'Review Issues',
        url: `/repos/${repoName}/analytics`
      },
      metadata: { repoName, issueCount }
    })
  }

  notifyAchievement(title: string, description: string) {
    return this.add({
      type: 'achievement',
      title,
      message: description,
      metadata: { achievement: true }
    })
  }

  notifyError(title: string, message: string, action?: Notification['action']) {
    return this.add({
      type: 'error',
      title,
      message,
      action
    })
  }
}

// Global notification manager instance
export const notificationManager = new NotificationManager()

// Achievement system
export class AchievementSystem {
  private achievements = {
    first_doc: {
      id: 'first_doc',
      title: 'First Documentation',
      description: 'Generated your first set of docs!',
      icon: '🎉'
    },
    security_expert: {
      id: 'security_expert',
      title: 'Security Expert',
      description: 'Found and fixed 10+ security issues',
      icon: '🛡️'
    },
    code_master: {
      id: 'code_master',
      title: 'Code Master',
      description: 'Analyzed 50+ functions and classes',
      icon: '👑'
    },
    performance_guru: {
      id: 'performance_guru',
      title: 'Performance Guru',
      description: 'Optimized code with 20+ performance improvements',
      icon: '⚡'
    }
  }

  checkAchievements(userStats: any) {
    const unlocked: string[] = []

    if (userStats.totalDocs >= 1 && !userStats.achievements?.includes('first_doc')) {
      unlocked.push('first_doc')
    }

    if (userStats.securityIssuesFixed >= 10 && !userStats.achievements?.includes('security_expert')) {
      unlocked.push('security_expert')
    }

    if (userStats.functionsAnalyzed >= 50 && !userStats.achievements?.includes('code_master')) {
      unlocked.push('code_master')
    }

    if (userStats.performanceOptimizations >= 20 && !userStats.achievements?.includes('performance_guru')) {
      unlocked.push('performance_guru')
    }

    // Notify about unlocked achievements
    unlocked.forEach(achievementId => {
      const achievement = this.achievements[achievementId as keyof typeof this.achievements]
      notificationManager.notifyAchievement(
        `${achievement.icon} ${achievement.title}`,
        achievement.description
      )
    })

    return unlocked
  }
}

export const achievementSystem = new AchievementSystem()

