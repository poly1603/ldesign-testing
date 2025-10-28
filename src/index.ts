/**
 * @ldesign/testing
 * 完整的测试工具集
 */

// 导出类型
export * from './types/index.js'

// 导出核心功能
export { ConfigLoader, configLoader } from './core/config-loader.js'
export { ConfigValidator, configValidator } from './core/config-validator.js'
export { PresetManager, presetManager } from './core/preset-manager.js'

// 导出单元测试
export { VitestRunner } from './unit/vitest-runner.js'
export * from './unit/test-utils.js'
export * from './unit/assertions.js'

// 导出 E2E 测试
export { PlaywrightRunner } from './e2e/playwright-runner.js'
export * from './e2e/browser-utils.js'
export * from './e2e/page-object-builder.js'

// 导出 Mock 工具
export { MockFactory, mockFactory } from './mock/mock-factory.js'
export { FakerIntegration, fakerIntegration } from './mock/faker-integration.js'
export { MSWIntegration, mswIntegration } from './mock/msw-integration.js'
export * from './mock/function-mocker.js'

// 导出快照测试
export { SnapshotManager } from './snapshot/snapshot-manager.js'
export { ComponentSnapshot } from './snapshot/component-snapshot.js'
export { VisualSnapshot } from './snapshot/visual-snapshot.js'

// 导出覆盖率
export { CoverageReporter } from './coverage/coverage-reporter.js'
export { CoverageAnalyzer, coverageAnalyzer } from './coverage/coverage-analyzer.js'
export { ThresholdValidator, thresholdValidator } from './coverage/threshold-validator.js'

// 导出并行执行
export { ParallelRunner } from './parallel/parallel-runner.js'

// 导出预设配置
export * from './presets/index.js'

// 导出工具函数
export { Logger, logger } from './utils/logger.js'
export * from './utils/file-utils.js'
export * from './utils/path-utils.js'
export * from './utils/reporter.js'

// 导出性能测试
export { BenchmarkRunner, benchmark } from './performance/benchmark.js'
export type { BenchmarkOptions, BenchmarkResult } from './performance/benchmark.js'

// 导出测试生成器
export { TestGenerator } from './generator/test-generator.js'
export type { GeneratorOptions } from './generator/test-generator.js'

/**
 * 定义配置
 */
export function defineConfig(config: import('./types/index.js').TestingConfig) {
  return config
}

