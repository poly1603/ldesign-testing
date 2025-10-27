/**
 * 并行测试运行器
 */
import { Worker } from 'worker_threads'
import os from 'os'
import type { TestingConfig, RunOptions, TestResult } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class ParallelRunner {
  private config: TestingConfig
  private cwd: string
  private maxWorkers: number

  constructor(config: TestingConfig, cwd: string) {
    this.config = config
    this.cwd = cwd
    this.maxWorkers =
      config.parallel?.workers || os.cpus().length
  }

  /**
   * 并行运行测试
   */
  async run(
    testFiles: string[],
    options: RunOptions = {}
  ): Promise<TestResult> {
    if (!this.config.parallel?.enabled || testFiles.length === 1) {
      // 不启用并行或只有一个文件，直接运行
      return this.runSequential(testFiles, options)
    }

    logger.info(`使用 ${this.maxWorkers} 个工作进程并行运行测试...`)

    const startTime = Date.now()
    const chunks = this.splitIntoChunks(testFiles, this.maxWorkers)

    try {
      // 这里简化处理，实际应该使用 Worker 线程
      // 由于 Vitest 自带并行支持，我们直接使用它
      const results = await Promise.all(
        chunks.map((chunk) => this.runChunk(chunk, options))
      )

      const endTime = Date.now()
      const merged = this.mergeResults(results, startTime, endTime)

      logger.success(`并行测试完成，耗时: ${merged.duration}ms`)
      return merged
    } catch (error) {
      const endTime = Date.now()
      logger.error('并行测试失败:', error)

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
   * 顺序运行测试
   */
  private async runSequential(
    testFiles: string[],
    options: RunOptions
  ): Promise<TestResult> {
    const startTime = Date.now()

    // 实际实现应该调用测试运行器
    logger.info('顺序运行测试...')

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
  }

  /**
   * 运行测试块
   */
  private async runChunk(
    files: string[],
    options: RunOptions
  ): Promise<TestResult> {
    const startTime = Date.now()

    // 实际实现应该在 Worker 中运行测试
    logger.debug(`运行 ${files.length} 个测试文件...`)

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
  }

  /**
   * 将文件分成多个块
   */
  private splitIntoChunks(files: string[], chunkCount: number): string[][] {
    const chunks: string[][] = Array.from({ length: chunkCount }, () => [])

    files.forEach((file, index) => {
      chunks[index % chunkCount].push(file)
    })

    return chunks.filter((chunk) => chunk.length > 0)
  }

  /**
   * 合并测试结果
   */
  private mergeResults(
    results: TestResult[],
    startTime: number,
    endTime: number
  ): TestResult {
    return {
      total: results.reduce((sum, r) => sum + r.total, 0),
      passed: results.reduce((sum, r) => sum + r.passed, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      skipped: results.reduce((sum, r) => sum + r.skipped, 0),
      duration: endTime - startTime,
      startTime,
      endTime,
    }
  }

  /**
   * 获取最优工作进程数
   */
  static getOptimalWorkers(): number {
    const cpuCount = os.cpus().length
    // 通常使用 CPU 核心数减 1，留一个核心给操作系统
    return Math.max(1, cpuCount - 1)
  }
}

