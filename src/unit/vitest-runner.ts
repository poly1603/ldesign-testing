/**
 * Vitest 测试运行器
 */
import { execa } from 'execa'
import type { TestingConfig, RunOptions, TestResult } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class VitestRunner {
  private config: TestingConfig
  private cwd: string

  constructor(config: TestingConfig, cwd: string) {
    this.config = config
    this.cwd = cwd
  }

  /**
   * 运行测试
   */
  async run(options: RunOptions = {}): Promise<TestResult> {
    const args = this.buildArgs(options)
    const startTime = Date.now()

    logger.info('开始运行 Vitest 测试...')
    logger.debug(`命令: vitest ${args.join(' ')}`)

    try {
      const result = await execa('vitest', args, {
        cwd: this.cwd,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...this.config.env,
        },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      logger.success(`测试完成，耗时: ${duration}ms`)

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

      logger.error('测试失败')

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

    // 运行模式
    if (!options.watch) {
      args.push('run')
    }

    // 覆盖率
    if (options.coverage || this.config.coverage?.enabled) {
      args.push('--coverage')
    }

    // 更新快照
    if (options.updateSnapshot) {
      args.push('-u')
    }

    // 详细输出
    if (options.verbose) {
      args.push('--reporter=verbose')
    }

    // 失败时退出
    if (options.bail) {
      args.push('--bail', '1')
    }

    // 并发数
    if (options.maxConcurrency) {
      args.push('--max-concurrency', String(options.maxConcurrency))
    } else if (this.config.parallel?.workers) {
      args.push('--threads', '--pool-options.threads.maxThreads', String(this.config.parallel.workers))
    }

    // 测试文件过滤
    if (options.testNamePattern) {
      args.push('-t', options.testNamePattern)
    }

    // 测试路径过滤
    if (options.testPathPattern) {
      args.push(options.testPathPattern)
    }

    return args
  }

  /**
   * 运行特定文件
   */
  async runFiles(files: string[], options: RunOptions = {}): Promise<TestResult> {
    const args = this.buildArgs(options)
    args.push(...files)

    const startTime = Date.now()

    logger.info(`运行 ${files.length} 个测试文件...`)

    try {
      await execa('vitest', args, {
        cwd: this.cwd,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...this.config.env,
        },
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
}

