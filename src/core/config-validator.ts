/**
 * 配置验证器
 */
import type { TestingConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'

export interface ValidationError {
  field: string
  message: string
}

export class ConfigValidator {
  /**
   * 验证配置
   */
  validate(config: TestingConfig): ValidationError[] {
    const errors: ValidationError[] = []

    // 验证框架
    if (config.framework && !['vitest', 'jest'].includes(config.framework)) {
      errors.push({
        field: 'framework',
        message: `无效的测试框架: ${config.framework}，支持 vitest, jest`,
      })
    }

    // 验证测试目录
    if (config.testDir && typeof config.testDir !== 'string') {
      errors.push({
        field: 'testDir',
        message: 'testDir 必须是字符串',
      })
    }

    // 验证覆盖率阈值
    if (config.coverage?.threshold) {
      const threshold = config.coverage.threshold
      const fields = ['branches', 'functions', 'lines', 'statements'] as const

      fields.forEach((field) => {
        const value = threshold[field]
        if (value !== undefined && (value < 0 || value > 100)) {
          errors.push({
            field: `coverage.threshold.${field}`,
            message: `覆盖率阈值必须在 0-100 之间，当前值: ${value}`,
          })
        }
      })
    }

    // 验证 E2E 框架
    if (config.e2e?.framework && !['playwright', 'cypress'].includes(config.e2e.framework)) {
      errors.push({
        field: 'e2e.framework',
        message: `无效的 E2E 框架: ${config.e2e.framework}，支持 playwright, cypress`,
      })
    }

    // 验证超时时间
    if (config.unit?.timeout !== undefined && config.unit.timeout < 0) {
      errors.push({
        field: 'unit.timeout',
        message: `超时时间必须大于 0，当前值: ${config.unit.timeout}`,
      })
    }

    if (config.e2e?.timeout !== undefined && config.e2e.timeout < 0) {
      errors.push({
        field: 'e2e.timeout',
        message: `超时时间必须大于 0，当前值: ${config.e2e.timeout}`,
      })
    }

    // 验证重试次数
    if (config.e2e?.retries !== undefined && config.e2e.retries < 0) {
      errors.push({
        field: 'e2e.retries',
        message: `重试次数必须大于等于 0，当前值: ${config.e2e.retries}`,
      })
    }

    // 验证并行配置
    if (config.parallel?.workers !== undefined && config.parallel.workers < 1) {
      errors.push({
        field: 'parallel.workers',
        message: `工作进程数必须大于 0，当前值: ${config.parallel.workers}`,
      })
    }

    // 验证快照阈值
    if (config.snapshot?.threshold !== undefined) {
      const threshold = config.snapshot.threshold
      if (threshold < 0 || threshold > 1) {
        errors.push({
          field: 'snapshot.threshold',
          message: `快照阈值必须在 0-1 之间，当前值: ${threshold}`,
        })
      }
    }

    return errors
  }

  /**
   * 验证并抛出错误
   */
  validateOrThrow(config: TestingConfig): void {
    const errors = this.validate(config)

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => `  - ${error.field}: ${error.message}`)
        .join('\n')

      const message = `配置验证失败:\n${errorMessages}`
      logger.error(message)
      throw new Error(message)
    }
  }

  /**
   * 检查配置警告
   */
  checkWarnings(config: TestingConfig): string[] {
    const warnings: string[] = []

    // 检查覆盖率阈值
    if (config.coverage?.enabled && config.coverage.threshold) {
      const threshold = config.coverage.threshold
      const allThresholds = [
        threshold.branches,
        threshold.functions,
        threshold.lines,
        threshold.statements,
      ].filter((v) => v !== undefined) as number[]

      if (allThresholds.some((v) => v < 50)) {
        warnings.push('覆盖率阈值低于 50% 可能不足以保证代码质量')
      }
    }

    // 检查并行配置
    if (config.parallel?.enabled && config.parallel.workers && config.parallel.workers > 16) {
      warnings.push('工作进程数过多可能导致系统资源不足')
    }

    // 检查 E2E 浏览器
    if (config.e2e?.browsers && config.e2e.browsers.length > 3) {
      warnings.push('同时测试多个浏览器可能增加测试时间')
    }

    return warnings
  }

  /**
   * 打印验证结果
   */
  printValidationResult(config: TestingConfig): void {
    const errors = this.validate(config)
    const warnings = this.checkWarnings(config)

    if (errors.length === 0 && warnings.length === 0) {
      logger.success('配置验证通过')
      return
    }

    if (errors.length > 0) {
      logger.error('配置验证失败:')
      errors.forEach((error) => {
        logger.error(`  - ${error.field}: ${error.message}`)
      })
    }

    if (warnings.length > 0) {
      logger.warn('配置警告:')
      warnings.forEach((warning) => {
        logger.warn(`  - ${warning}`)
      })
    }
  }
}

// 默认导出实例
export const configValidator = new ConfigValidator()

