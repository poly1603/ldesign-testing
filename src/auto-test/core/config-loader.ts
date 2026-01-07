/**
 * @ldesign/testing - Auto Test Config Loader
 * 配置加载器，支持加载和验证测试配置
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AutoTestConfig } from '../types/index.js'
import { DEFAULT_AUTO_TEST_CONFIG } from '../types/index.js'
import { AutoTestError, ErrorCode } from '../types/index.js'

/**
 * 配置加载器类
 */
export class AutoTestConfigLoader {
  /**
   * 加载配置
   * @param cwd 项目根目录，默认为当前工作目录
   * @returns 合并后的配置
   */
  async load(cwd: string = process.cwd()): Promise<AutoTestConfig> {
    const root = resolve(cwd)

    // 尝试加载配置文件
    const userConfig = await this.loadConfigFile(root)

    // 应用环境变量覆盖
    const configWithEnv = this.applyEnvironmentVariables(userConfig)

    // 合并默认配置
    const finalConfig = this.mergeWithDefaults(configWithEnv, root)

    // 验证配置
    this.validateConfig(finalConfig)

    return finalConfig
  }

  /**
   * 加载配置文件
   * @param root 项目根目录
   * @returns 用户配置，如果不存在则返回空对象
   */
  private async loadConfigFile(root: string): Promise<Partial<AutoTestConfig>> {
    // 支持的配置文件名
    const configFiles = [
      'auto-test.config.ts',
      'auto-test.config.js',
      'auto-test.config.mjs',
      '.auto-testrc.ts',
      '.auto-testrc.js',
    ]

    // 查找配置文件
    for (const configFile of configFiles) {
      const configPath = join(root, configFile)
      if (existsSync(configPath)) {
        try {
          return await this.importConfigFile(configPath)
        } catch (error) {
          throw new AutoTestError(
            `Failed to load config file ${configFile}: ${error}`,
            ErrorCode.CONFIG_INVALID,
            { configPath, error }
          )
        }
      }
    }

    // 如果没有找到配置文件，返回空对象
    return {}
  }

  /**
   * 导入配置文件
   * @param configPath 配置文件路径
   * @returns 配置对象
   */
  private async importConfigFile(
    configPath: string
  ): Promise<Partial<AutoTestConfig>> {
    // 将文件路径转换为 file:// URL
    const fileUrl = pathToFileURL(configPath).href

    // 动态导入配置文件
    const module = await import(fileUrl)

    // 支持 default export 和 named export
    const config = module.default || module.config || module

    // 如果是函数，调用它
    if (typeof config === 'function') {
      return await config()
    }

    return config
  }

  /**
   * 应用环境变量覆盖
   * @param config 用户配置
   * @returns 应用环境变量后的配置
   */
  private applyEnvironmentVariables(
    config: Partial<AutoTestConfig>
  ): Partial<AutoTestConfig> {
    const result = { ...config }

    // AUTO_TEST_TARGET_URL
    if (process.env.AUTO_TEST_TARGET_URL) {
      result.targetUrl = process.env.AUTO_TEST_TARGET_URL
    }

    // AUTO_TEST_CI
    if (process.env.AUTO_TEST_CI !== undefined) {
      result.ci = process.env.AUTO_TEST_CI === 'true'
    }

    // AUTO_TEST_PARALLEL
    if (process.env.AUTO_TEST_PARALLEL) {
      const parallel = parseInt(process.env.AUTO_TEST_PARALLEL, 10)
      if (!isNaN(parallel) && parallel > 0) {
        result.parallel = parallel
      }
    }

    // AUTO_TEST_OUTPUT_DIR
    if (process.env.AUTO_TEST_OUTPUT_DIR) {
      result.report = {
        ...result.report,
        outputDir: process.env.AUTO_TEST_OUTPUT_DIR,
      }
    }

    // AUTO_TEST_TESTS (逗号分隔的测试类型列表)
    if (process.env.AUTO_TEST_TESTS) {
      const tests = process.env.AUTO_TEST_TESTS.split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
      if (tests.length > 0) {
        result.tests = tests as any[]
      }
    }

    // AUTO_TEST_MEMORY_THRESHOLD
    if (process.env.AUTO_TEST_MEMORY_THRESHOLD) {
      const threshold = parseInt(process.env.AUTO_TEST_MEMORY_THRESHOLD, 10)
      if (!isNaN(threshold) && threshold > 0) {
        result.memory = {
          ...result.memory,
          threshold,
        }
      }
    }

    // AUTO_TEST_PERFORMANCE_LCP
    if (process.env.AUTO_TEST_PERFORMANCE_LCP) {
      const lcp = parseInt(process.env.AUTO_TEST_PERFORMANCE_LCP, 10)
      if (!isNaN(lcp) && lcp > 0) {
        result.performance = {
          ...result.performance,
          thresholds: {
            ...result.performance?.thresholds,
            LCP: lcp,
          },
        }
      }
    }

    return result
  }

  /**
   * 合并默认配置
   * @param userConfig 用户配置
   * @param root 项目根目录
   * @returns 合并后的配置
   */
  private mergeWithDefaults(
    userConfig: Partial<AutoTestConfig>,
    root: string
  ): AutoTestConfig {
    // 深度合并配置对象
    const merged: AutoTestConfig = {
      ...DEFAULT_AUTO_TEST_CONFIG,
      ...userConfig,
      root: userConfig.root || root,
    }

    // 合并嵌套对象
    if (userConfig.memory) {
      merged.memory = {
        ...DEFAULT_AUTO_TEST_CONFIG.memory,
        ...userConfig.memory,
      }
    }

    if (userConfig.performance) {
      merged.performance = {
        ...DEFAULT_AUTO_TEST_CONFIG.performance,
        ...userConfig.performance,
        thresholds: {
          ...DEFAULT_AUTO_TEST_CONFIG.performance?.thresholds,
          ...userConfig.performance.thresholds,
        },
      }
    }

    if (userConfig.ui) {
      merged.ui = {
        ...DEFAULT_AUTO_TEST_CONFIG.ui,
        ...userConfig.ui,
      }
    }

    if (userConfig.api) {
      merged.api = {
        ...DEFAULT_AUTO_TEST_CONFIG.api,
        ...userConfig.api,
      }
    }

    if (userConfig.page) {
      merged.page = {
        ...DEFAULT_AUTO_TEST_CONFIG.page,
        ...userConfig.page,
      }
    }

    if (userConfig.scoreWeights) {
      merged.scoreWeights = {
        ...DEFAULT_AUTO_TEST_CONFIG.scoreWeights,
        ...userConfig.scoreWeights,
      }
    }

    if (userConfig.report) {
      merged.report = {
        ...DEFAULT_AUTO_TEST_CONFIG.report,
        ...userConfig.report,
      }
    }

    return merged
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @throws {AutoTestError} 如果配置无效
   */
  private validateConfig(config: AutoTestConfig): void {
    const errors: string[] = []

    // 验证 tests 数组
    if (config.tests && !Array.isArray(config.tests)) {
      errors.push('config.tests must be an array')
    }

    if (config.tests && config.tests.length > 0) {
      const validTestTypes = ['memory', 'performance', 'ui', 'api', 'page']
      for (const test of config.tests) {
        if (!validTestTypes.includes(test)) {
          errors.push(
            `Invalid test type: ${test}. Valid types are: ${validTestTypes.join(', ')}`
          )
        }
      }
    }

    // 验证 parallel
    if (config.parallel !== undefined) {
      if (typeof config.parallel !== 'number' || config.parallel < 1) {
        errors.push('config.parallel must be a positive number')
      }
    }

    // 验证 memory 配置
    if (config.memory) {
      if (
        config.memory.threshold !== undefined &&
        (typeof config.memory.threshold !== 'number' ||
          config.memory.threshold <= 0)
      ) {
        errors.push('config.memory.threshold must be a positive number')
      }

      if (
        config.memory.leakSensitivity !== undefined &&
        !['low', 'medium', 'high'].includes(config.memory.leakSensitivity)
      ) {
        errors.push(
          'config.memory.leakSensitivity must be one of: low, medium, high'
        )
      }
    }

    // 验证 performance 配置
    if (config.performance?.thresholds) {
      const thresholds = config.performance.thresholds
      const thresholdKeys = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB']

      for (const key of thresholdKeys) {
        const value = thresholds[key as keyof typeof thresholds]
        if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
          errors.push(`config.performance.thresholds.${key} must be a positive number`)
        }
      }
    }

    // 验证 ui 配置
    if (config.ui?.viewports) {
      if (!Array.isArray(config.ui.viewports)) {
        errors.push('config.ui.viewports must be an array')
      } else {
        for (let i = 0; i < config.ui.viewports.length; i++) {
          const viewport = config.ui.viewports[i]
          if (!viewport.name || typeof viewport.name !== 'string') {
            errors.push(`config.ui.viewports[${i}].name is required and must be a string`)
          }
          if (
            typeof viewport.width !== 'number' ||
            viewport.width <= 0
          ) {
            errors.push(`config.ui.viewports[${i}].width must be a positive number`)
          }
          if (
            typeof viewport.height !== 'number' ||
            viewport.height <= 0
          ) {
            errors.push(`config.ui.viewports[${i}].height must be a positive number`)
          }
        }
      }
    }

    // 验证 scoreWeights
    if (config.scoreWeights) {
      const weights = config.scoreWeights
      const sum =
        weights.memory +
        weights.performance +
        weights.ui +
        weights.api +
        weights.page

      if (Math.abs(sum - 1.0) > 0.001) {
        errors.push(
          `config.scoreWeights must sum to 1.0 (current sum: ${sum.toFixed(3)})`
        )
      }

      // 验证每个权重都是非负数
      const weightKeys = ['memory', 'performance', 'ui', 'api', 'page'] as const
      for (const key of weightKeys) {
        if (weights[key] < 0) {
          errors.push(`config.scoreWeights.${key} must be non-negative`)
        }
      }
    }

    // 验证 report 配置
    if (config.report?.formats) {
      if (!Array.isArray(config.report.formats)) {
        errors.push('config.report.formats must be an array')
      } else {
        const validFormats = ['html', 'json', 'markdown', 'junit']
        for (const format of config.report.formats) {
          if (!validFormats.includes(format)) {
            errors.push(
              `Invalid report format: ${format}. Valid formats are: ${validFormats.join(', ')}`
            )
          }
        }
      }
    }

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new AutoTestError(
        `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
        ErrorCode.CONFIG_INVALID,
        { errors }
      )
    }
  }
}

/**
 * 创建配置加载器实例
 */
export function createConfigLoader(): AutoTestConfigLoader {
  return new AutoTestConfigLoader()
}
