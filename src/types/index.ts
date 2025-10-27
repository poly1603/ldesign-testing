/**
 * @ldesign/testing 类型定义
 */

/**
 * 测试框架类型
 */
export type TestFramework = 'vitest' | 'jest'

/**
 * E2E 框架类型
 */
export type E2EFramework = 'playwright' | 'cypress'

/**
 * 覆盖率报告格式
 */
export type CoverageReporter = 'text' | 'json' | 'html' | 'lcov' | 'cobertura'

/**
 * 预设配置名称
 */
export type PresetName = 'base' | 'vue' | 'react' | 'node' | 'library'

/**
 * 测试配置接口
 */
export interface TestingConfig {
  /** 测试框架 */
  framework?: TestFramework
  /** 测试目录 */
  testDir?: string
  /** 测试文件匹配模式 */
  testMatch?: string[]
  /** 单元测试配置 */
  unit?: UnitTestConfig
  /** E2E 测试配置 */
  e2e?: E2EConfig
  /** 覆盖率配置 */
  coverage?: CoverageConfig
  /** Mock 配置 */
  mock?: MockConfig
  /** 快照配置 */
  snapshot?: SnapshotConfig
  /** 并行配置 */
  parallel?: ParallelConfig
  /** 忽略的文件或目录 */
  ignore?: string[]
  /** 是否在监听模式下运行 */
  watch?: boolean
  /** 环境变量 */
  env?: Record<string, string>
}

/**
 * 单元测试配置
 */
export interface UnitTestConfig {
  /** 测试目录 */
  testDir?: string
  /** 测试文件匹配模式 */
  testMatch?: string[]
  /** 全局设置文件 */
  setupFiles?: string[]
  /** 超时时间（毫秒） */
  timeout?: number
  /** 是否在测试后自动清理 mock */
  clearMocks?: boolean
  /** 是否在测试后自动重置 mock */
  resetMocks?: boolean
  /** 是否在测试后自动恢复 mock */
  restoreMocks?: boolean
  /** 全局变量 */
  globals?: Record<string, any>
}

/**
 * E2E 测试配置
 */
export interface E2EConfig {
  /** E2E 框架 */
  framework?: E2EFramework
  /** 基础 URL */
  baseUrl?: string
  /** 测试目录 */
  testDir?: string
  /** 浏览器类型 */
  browsers?: Array<'chromium' | 'firefox' | 'webkit'>
  /** 是否无头模式 */
  headless?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 重试次数 */
  retries?: number
  /** 截图配置 */
  screenshot?: 'on' | 'off' | 'only-on-failure'
  /** 视频录制 */
  video?: 'on' | 'off' | 'retain-on-failure'
}

/**
 * 覆盖率配置
 */
export interface CoverageConfig {
  /** 是否启用覆盖率 */
  enabled?: boolean
  /** 覆盖率提供者 */
  provider?: 'v8' | 'istanbul'
  /** 报告格式 */
  reporter?: CoverageReporter[]
  /** 输出目录 */
  reportsDirectory?: string
  /** 包含的文件 */
  include?: string[]
  /** 排除的文件 */
  exclude?: string[]
  /** 覆盖率阈值 */
  threshold?: CoverageThreshold
}

/**
 * 覆盖率阈值
 */
export interface CoverageThreshold {
  /** 分支覆盖率 */
  branches?: number
  /** 函数覆盖率 */
  functions?: number
  /** 行覆盖率 */
  lines?: number
  /** 语句覆盖率 */
  statements?: number
}

/**
 * Mock 配置
 */
export interface MockConfig {
  /** 是否在测试后自动清理 mock */
  clearMocks?: boolean
  /** 是否在测试后自动重置 mock */
  resetMocks?: boolean
  /** 是否在测试后自动恢复 mock */
  restoreMocks?: boolean
  /** Faker 配置 */
  faker?: FakerConfig
  /** MSW 配置 */
  msw?: MSWConfig
}

/**
 * Faker 配置
 */
export interface FakerConfig {
  /** 语言设置 */
  locale?: string
  /** 随机数种子 */
  seed?: number
}

/**
 * MSW 配置
 */
export interface MSWConfig {
  /** API 基础 URL */
  baseUrl?: string
  /** 处理器文件路径 */
  handlers?: string
  /** 是否启用日志 */
  quiet?: boolean
}

/**
 * 快照配置
 */
export interface SnapshotConfig {
  /** 快照目录 */
  snapshotDir?: string
  /** 快照格式 */
  snapshotFormat?: Record<string, any>
  /** 更新快照 */
  updateSnapshot?: 'all' | 'new' | 'none'
  /** 视觉回归阈值 */
  threshold?: number
}

/**
 * 并行配置
 */
export interface ParallelConfig {
  /** 是否启用并行执行 */
  enabled?: boolean
  /** 工作进程数 */
  workers?: number
  /** 分片配置 */
  shard?: {
    current: number
    total: number
  }
}

/**
 * 测试结果接口
 */
export interface TestResult {
  /** 总测试数 */
  total: number
  /** 通过的测试数 */
  passed: number
  /** 失败的测试数 */
  failed: number
  /** 跳过的测试数 */
  skipped: number
  /** 执行时间（毫秒） */
  duration: number
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime: number
  /** 测试文件列表 */
  testFiles?: TestFileResult[]
  /** 覆盖率信息 */
  coverage?: CoverageSummary
}

/**
 * 测试文件结果
 */
export interface TestFileResult {
  /** 文件路径 */
  file: string
  /** 测试数 */
  tests: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 跳过数 */
  skipped: number
  /** 执行时间 */
  duration: number
  /** 测试用例列表 */
  testCases?: TestCaseResult[]
}

/**
 * 测试用例结果
 */
export interface TestCaseResult {
  /** 测试名称 */
  name: string
  /** 测试状态 */
  status: 'passed' | 'failed' | 'skipped'
  /** 执行时间 */
  duration: number
  /** 错误信息 */
  error?: {
    message: string
    stack?: string
  }
}

/**
 * 覆盖率摘要
 */
export interface CoverageSummary {
  /** 行覆盖率 */
  lines: CoverageDetail
  /** 语句覆盖率 */
  statements: CoverageDetail
  /** 函数覆盖率 */
  functions: CoverageDetail
  /** 分支覆盖率 */
  branches: CoverageDetail
}

/**
 * 覆盖率详情
 */
export interface CoverageDetail {
  /** 总数 */
  total: number
  /** 覆盖数 */
  covered: number
  /** 跳过数 */
  skipped: number
  /** 百分比 */
  pct: number
}

/**
 * 运行选项
 */
export interface RunOptions {
  /** 测试类型 */
  type?: 'unit' | 'e2e' | 'all'
  /** 监听模式 */
  watch?: boolean
  /** 覆盖率 */
  coverage?: boolean
  /** 更新快照 */
  updateSnapshot?: boolean
  /** 详细输出 */
  verbose?: boolean
  /** 失败时退出 */
  bail?: boolean
  /** 最大并发数 */
  maxConcurrency?: number
  /** 测试文件过滤 */
  testNamePattern?: string
  /** 文件路径过滤 */
  testPathPattern?: string
}

/**
 * 初始化选项
 */
export interface InitOptions {
  /** 预设配置 */
  preset?: PresetName
  /** 是否覆盖已存在的配置 */
  force?: boolean
  /** 是否跳过交互式提示 */
  skipPrompts?: boolean
  /** 是否安装依赖 */
  install?: boolean
}

/**
 * Mock 数据选项
 */
export interface MockDataOptions {
  /** 数据类型 */
  type: string
  /** 数据数量 */
  count?: number
  /** 语言设置 */
  locale?: string
  /** 输出格式 */
  format?: 'json' | 'ts' | 'js'
  /** 输出文件 */
  output?: string
}

/**
 * 快照选项
 */
export interface SnapshotOptions {
  /** 操作类型 */
  action: 'update' | 'clean' | 'list'
  /** 测试名称模式 */
  testNamePattern?: string
}

/**
 * CLI 上下文
 */
export interface CLIContext {
  /** 当前工作目录 */
  cwd: string
  /** 配置 */
  config?: TestingConfig
  /** 是否为调试模式 */
  debug?: boolean
}

/**
 * 预设配置接口
 */
export interface PresetConfig {
  /** 预设名称 */
  name: PresetName
  /** 测试配置 */
  config: TestingConfig
}

