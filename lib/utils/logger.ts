type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: any
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    const envLevel = process.env.LOG_LEVEL || 'INFO'
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    return levels.indexOf(level) >= levels.indexOf(envLevel as LogLevel)
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    }

    const logString = JSON.stringify(entry)

    switch (level) {
      case 'ERROR':
        console.error(logString)
        break
      case 'WARN':
        console.warn(logString)
        break
      case 'INFO':
        console.log(logString)
        break
      case 'DEBUG':
        console.debug(logString)
        break
    }
  }

  error(message: string, data?: Record<string, any>) {
    this.log('ERROR', message, data)
  }

  warn(message: string, data?: Record<string, any>) {
    this.log('WARN', message, data)
  }

  info(message: string, data?: Record<string, any>) {
    this.log('INFO', message, data)
  }

  debug(message: string, data?: Record<string, any>) {
    this.log('DEBUG', message, data)
  }
}

export const logger = new Logger()

