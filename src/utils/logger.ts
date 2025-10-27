/**
 * 日志工具
 */
import chalk from 'chalk'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

export class Logger {
  private debug_enabled: boolean

  constructor(debug = false) {
    this.debug_enabled = debug
  }

  debug(message: string, ...args: any[]): void {
    if (this.debug_enabled) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(`[INFO] ${message}`), ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(chalk.yellow(`[WARN] ${message}`), ...args)
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red(`[ERROR] ${message}`), ...args)
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args)
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    switch (level) {
      case 'debug':
        this.debug(message, ...args)
        break
      case 'info':
        this.info(message, ...args)
        break
      case 'warn':
        this.warn(message, ...args)
        break
      case 'error':
        this.error(message, ...args)
        break
      case 'success':
        this.success(message, ...args)
        break
    }
  }

  setDebug(enabled: boolean): void {
    this.debug_enabled = enabled
  }
}

// 默认导出实例
export const logger = new Logger()

