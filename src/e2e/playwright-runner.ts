/**
 * Playwright E2E 测试运行器
 */
import { execa } from 'execa'
import type { TestingConfig, RunOptions, TestResult } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class PlaywrightRunner {
  private config: TestingConfig
  private cwd: string

  constructor(config: TestingConfig, cwd: string) {
    this.config = config
    this.cwd = cwd
  }

  /**
   * 运行 E2E 测试
   */
  async run(options: RunOptions = {}): Promise<TestResult> {
    const args = this.buildArgs(options)
    const startTime = Date.now()

    logger.info('开始运行 Playwright E2E 测试...')
    logger.debug(`命令: playwright test ${args.join(' ')}`)

    try {
      await execa('playwright', ['test', ...args], {
        cwd: this.cwd,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...this.config.env,
        },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      logger.success(`E2E 测试完成，耗时: ${duration}ms`)

      return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration,
        startTime,
        endTime,
      }
    } catch (error: any) {
      const endTime = Date.now()
      const duration = endTime - startTime

      logger.error('E2E 测试失败')

      return {
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        startTime,
        endTime,
      }
    }
  }

  /**
   * 构建命令参数
   */
  private buildArgs(options: RunOptions): string[] {
    const args: string[] = []
    const e2eConfig = this.config.e2e

    // 项目/浏览器
    if (e2eConfig?.browsers) {
      e2eConfig.browsers.forEach((browser) => {
        args.push('--project', browser)
      })
    }

    // 无头模式
    if (e2eConfig?.headless === false) {
      args.push('--headed')
    }

    // 失败时退出
    if (options.bail) {
      args.push('-x')
    }

    // 重试
    if (e2eConfig?.retries !== undefined) {
      args.push('--retries', String(e2eConfig.retries))
    }

    // 并发数
    if (options.maxConcurrency) {
      args.push('--workers', String(options.maxConcurrency))
    } else if (this.config.parallel?.workers) {
      args.push('--workers', String(this.config.parallel.workers))
    }

    // 测试名称过滤
    if (options.testNamePattern) {
      args.push('-g', options.testNamePattern)
    }

    return args
  }

  /**
   * 运行特定浏览器
   */
  async runBrowser(
    browser: 'chromium' | 'firefox' | 'webkit',
    options: RunOptions = {}
  ): Promise<TestResult> {
    const args = this.buildArgs(options)
    args.push('--project', browser)

    const startTime = Date.now()

    logger.info(`运行 ${browser} 浏览器测试...`)

    try {
      await execa('playwright', ['test', ...args], {
        cwd: this.cwd,
        stdio: 'inherit',
      })

      const endTime = Date.now()

      return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: endTime - startTime,
        startTime,
        endTime,
      }
    } catch (error: any) {
      const endTime = Date.now()

      return {
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: endTime - startTime,
        startTime,
        endTime,
      }
    }
  }

  /**
   * 显示报告
   */
  async showReport(): Promise<void> {
    logger.info('打开测试报告...')
    await execa('playwright', ['show-report'], {
      cwd: this.cwd,
      stdio: 'inherit',
    })
  }
}

