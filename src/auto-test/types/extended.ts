/**
 * @ldesign/testing - Extended Types
 * 扩展自动化测试套件类型定义
 */

import type { Page } from '@playwright/test'
import type { Severity, Priority, Viewport } from './index.js'

// ============================================================================
// 安全测试类型 (Security Testing)
// ============================================================================

/**
 * XSS 漏洞类型
 */
export type XSSType = 'reflected' | 'stored' | 'dom-based'

/**
 * XSS 漏洞
 */
export interface XSSVulnerability {
  /** 漏洞类型 */
  type: XSSType
  /** 发现位置 */
  location: string
  /** 输入点 */
  inputPoint: string
  /** 输出点 */
  outputPoint?: string
  /** payload */
  payload: string
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
  /** 修复建议 */
  remediation: string
}

/**
 * CSRF 问题
 */
export interface CSRFIssue {
  /** 端点 */
  endpoint: string
  /** HTTP 方法 */
  method: string
  /** 问题类型 */
  type: 'missing-token' | 'weak-token' | 'token-not-validated' | 'same-site-missing'
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
  /** 修复建议 */
  remediation: string
}

/**
 * 注入风险
 */
export interface InjectionRisk {
  /** 注入类型 */
  type: 'sql' | 'nosql' | 'ldap' | 'xpath' | 'command' | 'template'
  /** 位置 */
  location: string
  /** 输入参数 */
  parameter: string
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
  /** 修复建议 */
  remediation: string
}

/**
 * 敏感数据泄露
 */
export interface SensitiveDataLeak {
  /** 泄露类型 */
  type: 'api-key' | 'token' | 'password' | 'pii' | 'credentials' | 'secret'
  /** 发现位置 */
  location: string
  /** 数据模式 */
  pattern: string
  /** 文件路径 */
  filePath?: string
  /** 行号 */
  lineNumber?: number
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
  /** 修复建议 */
  remediation: string
}

/**
 * 安全头问题
 */
export interface SecurityHeaderIssue {
  /** 头名称 */
  header: string
  /** 问题类型 */
  type: 'missing' | 'misconfigured' | 'weak'
  /** 当前值 */
  currentValue?: string
  /** 建议值 */
  recommendedValue: string
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
}

/**
 * 依赖漏洞
 */
export interface DependencyVulnerability {
  /** 包名 */
  packageName: string
  /** 当前版本 */
  currentVersion: string
  /** 漏洞版本范围 */
  vulnerableVersions: string
  /** 修复版本 */
  patchedVersion?: string
  /** CVE ID */
  cveId?: string
  /** CVSS 评分 */
  cvssScore?: number
  /** 严重程度 */
  severity: Severity
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 参考链接 */
  references: string[]
}

/**
 * Cookie 安全问题
 */
export interface CookieSecurityIssue {
  /** Cookie 名称 */
  cookieName: string
  /** 问题类型 */
  type: 'no-httponly' | 'no-secure' | 'no-samesite' | 'weak-samesite' | 'sensitive-data'
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
  /** 修复建议 */
  remediation: string
}

/**
 * 安全测试配置
 */
export interface SecurityTestConfig {
  /** 是否启用 */
  enabled?: boolean
  /** XSS 检测 */
  xss?: {
    enabled?: boolean
    payloads?: string[]
    checkDomBased?: boolean
  }
  /** CSRF 检测 */
  csrf?: {
    enabled?: boolean
    checkSameSite?: boolean
  }
  /** 注入检测 */
  injection?: {
    enabled?: boolean
    types?: Array<'sql' | 'nosql' | 'command'>
  }
  /** 敏感数据检测 */
  sensitiveData?: {
    enabled?: boolean
    patterns?: string[]
    scanFiles?: boolean
  }
  /** 安全头检测 */
  headers?: {
    enabled?: boolean
    required?: string[]
  }
  /** 依赖漏洞扫描 */
  dependencies?: {
    enabled?: boolean
    auditLevel?: 'low' | 'moderate' | 'high' | 'critical'
  }
  /** Cookie 安全检测 */
  cookies?: {
    enabled?: boolean
  }
  /** 忽略的路径 */
  ignorePaths?: string[]
}

/**
 * 安全测试结果
 */
export interface SecurityTestResult {
  /** XSS 漏洞 */
  xssVulnerabilities: XSSVulnerability[]
  /** CSRF 问题 */
  csrfIssues: CSRFIssue[]
  /** 注入风险 */
  injectionRisks: InjectionRisk[]
  /** 敏感数据泄露 */
  sensitiveDataLeaks: SensitiveDataLeak[]
  /** 安全头问题 */
  headerIssues: SecurityHeaderIssue[]
  /** 依赖漏洞 */
  dependencyVulnerabilities: DependencyVulnerability[]
  /** Cookie 安全问题 */
  cookieIssues: CookieSecurityIssue[]
  /** 总问题数 */
  totalIssues: number
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 合约测试类型 (Contract Testing)
// ============================================================================

/**
 * API 规范类型
 */
export type SpecType = 'openapi' | 'swagger' | 'graphql' | 'jsonschema' | 'asyncapi'

/**
 * 合约违规
 */
export interface ContractViolation {
  /** 违规类型 */
  type: 'request' | 'response' | 'schema' | 'type' | 'required' | 'format'
  /** 端点 */
  endpoint: string
  /** HTTP 方法 */
  method?: string
  /** 路径 */
  path: string
  /** 期望值 */
  expected: string
  /** 实际值 */
  actual: string
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
}

/**
 * Schema 验证结果
 */
export interface SchemaValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误列表 */
  errors: Array<{
    path: string
    message: string
    keyword: string
  }>
}

/**
 * 向后兼容性问题
 */
export interface BreakingChange {
  /** 变更类型 */
  type:
    | 'endpoint-removed'
    | 'field-removed'
    | 'type-changed'
    | 'required-added'
    | 'enum-removed'
  /** 位置 */
  location: string
  /** 旧规范 */
  oldSpec: string
  /** 新规范 */
  newSpec: string
  /** 严重程度 */
  severity: Severity
  /** 描述 */
  description: string
}

/**
 * 合约测试配置
 */
export interface ContractTestConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 规范类型 */
  specType?: SpecType
  /** 规范文件路径 */
  specFile?: string
  /** GraphQL schema 文件路径 */
  graphqlSchema?: string
  /** 基础 URL */
  baseUrl?: string
  /** 验证请求 */
  validateRequests?: boolean
  /** 验证响应 */
  validateResponses?: boolean
  /** 严格模式 (额外字段报错) */
  strictMode?: boolean
  /** 检测向后兼容性 */
  checkBackwardCompatibility?: boolean
  /** 旧规范文件 (用于兼容性检测) */
  previousSpecFile?: string
  /** 忽略的端点 */
  ignoreEndpoints?: string[]
}

/**
 * 合约测试结果
 */
export interface ContractTestResult {
  /** 规范类型 */
  specType: SpecType
  /** 测试的端点数 */
  endpointsTested: number
  /** 违规列表 */
  violations: ContractViolation[]
  /** 向后兼容性问题 */
  breakingChanges: BreakingChange[]
  /** Schema 验证结果 */
  schemaValidation: SchemaValidationResult
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 兼容性测试类型 (Compatibility Testing)
// ============================================================================

/**
 * 浏览器配置
 */
export interface BrowserConfig {
  /** 浏览器名称 */
  name: 'chromium' | 'firefox' | 'webkit' | 'edge'
  /** 版本 */
  version?: string
  /** 是否无头模式 */
  headless?: boolean
}

/**
 * 设备配置
 */
export interface DeviceConfig {
  /** 设备名称 */
  name: string
  /** 用户代理 */
  userAgent: string
  /** 视口 */
  viewport: Viewport
  /** 设备像素比 */
  deviceScaleFactor: number
  /** 是否移动设备 */
  isMobile: boolean
  /** 是否支持触摸 */
  hasTouch: boolean
}

/**
 * CSS 兼容性问题
 */
export interface CSSCompatibilityIssue {
  /** 属性名 */
  property: string
  /** 值 */
  value?: string
  /** 不支持的浏览器 */
  unsupportedBrowsers: string[]
  /** 文件路径 */
  filePath: string
  /** 行号 */
  lineNumber: number
  /** 严重程度 */
  severity: Severity
  /** 替代方案 */
  alternative?: string
}

/**
 * JavaScript API 兼容性问题
 */
export interface JSCompatibilityIssue {
  /** API 名称 */
  api: string
  /** 不支持的浏览器 */
  unsupportedBrowsers: string[]
  /** 文件路径 */
  filePath: string
  /** 行号 */
  lineNumber: number
  /** 严重程度 */
  severity: Severity
  /** Polyfill 名称 */
  polyfill?: string
}

/**
 * 浏览器测试结果
 */
export interface BrowserTestResult {
  /** 浏览器 */
  browser: BrowserConfig
  /** 是否通过 */
  passed: boolean
  /** 失败数 */
  failures: number
  /** 截图 */
  screenshots: string[]
  /** 控制台错误 */
  consoleErrors: string[]
  /** 渲染问题 */
  renderingIssues: string[]
}

/**
 * 兼容性测试配置
 */
export interface CompatibilityTestConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 浏览器列表 */
  browsers?: BrowserConfig[]
  /** 设备列表 */
  devices?: DeviceConfig[]
  /** 需要检测的特性列表 */
  features?: string[]
  /** browserslist 查询 */
  browserslistQuery?: string
  /** 检测 CSS 兼容性 */
  checkCSS?: boolean
  /** 检测 JS API 兼容性 */
  checkJSAPI?: boolean
  /** 生成 Polyfill 建议 */
  suggestPolyfills?: boolean
}

/**
 * 兼容性测试结果
 */
export interface CompatibilityTestResult {
  /** 测试的浏览器数 */
  browsersTested: number
  /** CSS 兼容性问题 */
  cssIssues: CSSCompatibilityIssue[]
  /** JS API 兼容性问题 */
  jsIssues: JSCompatibilityIssue[]
  /** 各浏览器测试结果 */
  browserResults: BrowserTestResult[]
  /** 建议的 Polyfills */
  suggestedPolyfills: string[]
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 国际化测试类型 (i18n Testing)
// ============================================================================

/**
 * 缺失翻译
 */
export interface MissingTranslation {
  /** 键名 */
  key: string
  /** 缺失的语言 */
  missingLocales: string[]
  /** 默认值 */
  defaultValue?: string
  /** 使用位置 */
  usedIn: string[]
}

/**
 * 硬编码字符串
 */
export interface HardcodedString {
  /** 字符串内容 */
  content: string
  /** 文件路径 */
  filePath: string
  /** 行号 */
  lineNumber: number
  /** 上下文 */
  context: string
  /** 建议的键名 */
  suggestedKey?: string
}

/**
 * 格式问题
 */
export interface FormatIssue {
  /** 问题类型 */
  type: 'date' | 'number' | 'currency' | 'plural'
  /** 语言 */
  locale: string
  /** 键名 */
  key: string
  /** 当前值 */
  currentValue: string
  /** 期望格式 */
  expectedFormat: string
  /** 描述 */
  description: string
}

/**
 * RTL 布局问题
 */
export interface RTLIssue {
  /** 元素选择器 */
  selector: string
  /** 问题类型 */
  type: 'direction' | 'alignment' | 'margin' | 'padding' | 'float'
  /** 截图 */
  screenshot?: string
  /** 描述 */
  description: string
  /** 修复建议 */
  suggestion: string
}

/**
 * 文本截断问题
 */
export interface TruncationIssue {
  /** 元素选择器 */
  selector: string
  /** 语言 */
  locale: string
  /** 原始文本 */
  originalText: string
  /** 显示文本 */
  displayedText: string
  /** 截图 */
  screenshot?: string
}

/**
 * i18n 测试配置
 */
export interface I18nTestConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 语言列表 */
  locales?: string[]
  /** 翻译文件目录 */
  translationDir?: string
  /** 检测硬编码字符串 */
  checkHardcoded?: boolean
  /** 检测格式问题 */
  checkFormats?: boolean
  /** 检测 RTL */
  checkRTL?: boolean
  /** RTL 语言列表 */
  rtlLocales?: string[]
  /** 检测截断 */
  checkTruncation?: boolean
  /** 忽略的文件模式 */
  ignorePatterns?: string[]
}

/**
 * i18n 测试结果
 */
export interface I18nTestResult {
  /** 测试的语言数 */
  localesTested: number
  /** 缺失翻译 */
  missingTranslations: MissingTranslation[]
  /** 硬编码字符串 */
  hardcodedStrings: HardcodedString[]
  /** 格式问题 */
  formatIssues: FormatIssue[]
  /** RTL 问题 */
  rtlIssues: RTLIssue[]
  /** 截断问题 */
  truncationIssues: TruncationIssue[]
  /** 翻译覆盖率 */
  translationCoverage: Record<string, number>
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 变异测试类型 (Mutation Testing)
// ============================================================================

/**
 * 变异类型
 */
export type MutationType =
  | 'arithmetic'
  | 'comparison'
  | 'logical'
  | 'assignment'
  | 'unary'
  | 'string'
  | 'array'
  | 'object'
  | 'function'
  | 'conditional'
  | 'return'

/**
 * 变异状态
 */
export type MutantStatus = 'killed' | 'survived' | 'timeout' | 'error' | 'ignored'

/**
 * 变异体
 */
export interface Mutant {
  /** 变异体 ID */
  id: string
  /** 变异类型 */
  type: MutationType
  /** 文件路径 */
  filePath: string
  /** 行号 */
  lineNumber: number
  /** 列号 */
  columnNumber: number
  /** 原始代码 */
  originalCode: string
  /** 变异后代码 */
  mutatedCode: string
  /** 状态 */
  status: MutantStatus
  /** 杀死该变异体的测试 */
  killedBy?: string[]
  /** 描述 */
  description: string
}

/**
 * 存活的变异
 */
export interface SurvivedMutation {
  /** 变异体 */
  mutant: Mutant
  /** 建议添加的测试 */
  suggestedTests: string[]
  /** 优先级 */
  priority: Priority
}

/**
 * 变异测试配置
 */
export interface MutationTestConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 目标文件模式 */
  files?: string[]
  /** 排除文件模式 */
  excludeFiles?: string[]
  /** 变异类型 */
  mutators?: MutationType[]
  /** 超时时间 (ms) */
  timeout?: number
  /** 最大变异体数 */
  maxMutants?: number
  /** 采样率 (0-1) */
  sampleRate?: number
  /** 增量模式 (只测试变更的代码) */
  incremental?: boolean
}

/**
 * 变异测试结果
 */
export interface MutationTestResult {
  /** 总变异体数 */
  totalMutants: number
  /** 被杀死的变异体数 */
  killedMutants: number
  /** 存活的变异体数 */
  survivedMutants: number
  /** 超时的变异体数 */
  timedOutMutants: number
  /** 错误的变异体数 */
  errorMutants: number
  /** 忽略的变异体数 */
  ignoredMutants: number
  /** 变异分数 (killed / (total - ignored)) */
  mutationScore: number
  /** 变异体详情 */
  mutants: Mutant[]
  /** 存活的变异 */
  survivedMutations: SurvivedMutation[]
  /** 按文件统计 */
  byFile: Record<
    string,
    {
      total: number
      killed: number
      survived: number
      score: number
    }
  >
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 可测试性分析类型 (Testability Analysis)
// ============================================================================

/**
 * 复杂度指标
 */
export interface ComplexityMetrics {
  /** 平均圈复杂度 */
  averageCyclomaticComplexity: number
  /** 最大圈复杂度 */
  maxCyclomaticComplexity: number
  /** 高复杂度函数 */
  highComplexityFunctions: Array<{
    name: string
    filePath: string
    lineNumber: number
    complexity: number
  }>
  /** 认知复杂度 */
  cognitiveComplexity: number
  /** 代码行数 */
  linesOfCode: number
  /** 函数数 */
  functionCount: number
}

/**
 * 耦合度指标
 */
export interface CouplingMetrics {
  /** 传入耦合 (被依赖数) */
  afferentCoupling: number
  /** 传出耦合 (依赖数) */
  efferentCoupling: number
  /** 不稳定性 (Ce / (Ca + Ce)) */
  instability: number
  /** 高耦合模块 */
  highCouplingModules: Array<{
    name: string
    filePath: string
    dependencies: number
    dependents: number
  }>
}

/**
 * 覆盖率缺口
 */
export interface CoverageGap {
  /** 文件路径 */
  filePath: string
  /** 未覆盖的行 */
  uncoveredLines: number[]
  /** 未覆盖的分支 */
  uncoveredBranches: number[]
  /** 未覆盖的函数 */
  uncoveredFunctions: string[]
  /** 优先级 */
  priority: Priority
  /** 建议 */
  suggestion: string
}

/**
 * 反模式
 */
export interface AntiPattern {
  /** 模式名称 */
  name: string
  /** 类型 */
  type:
    | 'god-class'
    | 'long-method'
    | 'global-state'
    | 'hidden-dependency'
    | 'tight-coupling'
    | 'hard-coded-dependency'
  /** 文件路径 */
  filePath: string
  /** 行号 */
  lineNumber?: number
  /** 描述 */
  description: string
  /** 影响 */
  impact: string
  /** 重构建议 */
  refactoringSuggestion: string
}

/**
 * 可测试性建议
 */
export interface TestabilitySuggestion {
  /** 建议 ID */
  id: string
  /** 类型 */
  type:
    | 'reduce-complexity'
    | 'inject-dependency'
    | 'extract-method'
    | 'add-interface'
    | 'remove-global'
  /** 优先级 */
  priority: Priority
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 文件路径 */
  filePath: string
  /** 预期收益 */
  expectedBenefit: string
  /** 代码示例 */
  codeExample?: string
}

/**
 * 可测试性分析配置
 */
export interface TestabilityConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 目标文件模式 */
  files?: string[]
  /** 排除文件模式 */
  excludeFiles?: string[]
  /** 复杂度阈值 */
  complexityThreshold?: number
  /** 耦合度阈值 */
  couplingThreshold?: number
  /** 检测反模式 */
  checkAntiPatterns?: boolean
  /** 分析覆盖率缺口 */
  analyzeCoverageGaps?: boolean
  /** 覆盖率报告路径 */
  coverageReportPath?: string
}

/**
 * 可测试性分析结果
 */
export interface TestabilityReport {
  /** 综合评分 */
  overallScore: number
  /** 复杂度指标 */
  complexityMetrics: ComplexityMetrics
  /** 耦合度指标 */
  couplingMetrics: CouplingMetrics
  /** 覆盖率缺口 */
  coverageGaps: CoverageGap[]
  /** 反模式 */
  antiPatterns: AntiPattern[]
  /** 建议 */
  suggestions: TestabilitySuggestion[]
  /** 按文件评分 */
  fileScores: Record<string, number>
}

// ============================================================================
// 回归测试管理类型 (Regression Test Management)
// ============================================================================

/**
 * 回归测试策略
 */
export type RegressionStrategy = 'full' | 'affected' | 'priority' | 'smart' | 'risk-based'

/**
 * 优先级规则
 */
export interface PriorityRule {
  /** 规则名称 */
  name: string
  /** 匹配模式 */
  pattern: string
  /** 优先级 */
  priority: Priority
  /** 权重 */
  weight: number
}

/**
 * 测试影响分析
 */
export interface TestImpactAnalysis {
  /** 变更的文件 */
  changedFiles: string[]
  /** 受影响的测试 */
  affectedTests: Array<{
    testFile: string
    testName: string
    impactScore: number
    affectedBy: string[]
  }>
  /** 未受影响的测试 */
  unaffectedTests: string[]
}

/**
 * 历史测试结果
 */
export interface HistoricalTestResult {
  /** 测试名称 */
  testName: string
  /** 执行次数 */
  executionCount: number
  /** 失败次数 */
  failureCount: number
  /** 失败率 */
  failureRate: number
  /** 平均执行时间 */
  avgDuration: number
  /** 是否 flaky */
  isFlaky: boolean
  /** 上次失败时间 */
  lastFailure?: number
}

/**
 * 回归测试配置
 */
export interface RegressionConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 策略 */
  strategy?: RegressionStrategy
  /** 基准分支 */
  baseBranch?: string
  /** 包含 flaky 测试 */
  includeFlaky?: boolean
  /** 最大测试时间 (ms) */
  maxDuration?: number
  /** 优先级规则 */
  priorityRules?: PriorityRule[]
  /** 最小置信度 */
  minConfidence?: number
  /** 使用历史数据 */
  useHistory?: boolean
  /** 历史数据路径 */
  historyPath?: string
}

/**
 * 回归测试计划
 */
export interface RegressionTestPlan {
  /** 策略 */
  strategy: RegressionStrategy
  /** 选中的测试 */
  selectedTests: Array<{
    testFile: string
    testName: string
    priority: Priority
    reason: string
  }>
  /** 跳过的测试 */
  skippedTests: Array<{
    testFile: string
    testName: string
    reason: string
  }>
  /** 预计执行时间 */
  estimatedDuration: number
  /** 置信度 */
  confidence: number
}

/**
 * 回归测试结果
 */
export interface RegressionTestResult {
  /** 测试计划 */
  plan: RegressionTestPlan
  /** 影响分析 */
  impactAnalysis: TestImpactAnalysis
  /** 执行的测试数 */
  executedTests: number
  /** 跳过的测试数 */
  skippedTests: number
  /** 节省的时间 */
  timeSaved: number
  /** 覆盖的变更 */
  changesCovered: number
  /** 实际执行时间 */
  actualDuration: number
}

// ============================================================================
// 测试数据管理类型 (Test Data Management)
// ============================================================================

/**
 * 数据工厂选项
 */
export interface DataFactoryOptions<T> {
  /** 默认值 */
  defaults?: Partial<T>
  /** 序列起始值 */
  sequenceStart?: number
  /** 钩子 */
  hooks?: {
    beforeBuild?: (data: Partial<T>) => Partial<T>
    afterBuild?: (data: T) => T
  }
}

/**
 * 边界值类型
 */
export type EdgeCaseType =
  | 'empty'
  | 'null'
  | 'undefined'
  | 'min'
  | 'max'
  | 'boundary'
  | 'special-chars'
  | 'unicode'
  | 'long-string'
  | 'negative'
  | 'zero'
  | 'float'

/**
 * 数据快照
 */
export interface DataSnapshot<T> {
  /** 快照 ID */
  id: string
  /** 时间戳 */
  timestamp: number
  /** 数据 */
  data: T[]
  /** 描述 */
  description?: string
}

/**
 * 数据关系
 */
export interface DataRelation {
  /** 关系名称 */
  name: string
  /** 目标工厂 */
  factory: string
  /** 关系类型 */
  type: 'hasOne' | 'hasMany' | 'belongsTo'
  /** 外键 */
  foreignKey: string
}

/**
 * 数据工厂配置
 */
export interface DataFactoryConfig {
  /** 输出目录 */
  outputDir?: string
  /** 启用快照 */
  enableSnapshots?: boolean
  /** 快照目录 */
  snapshotDir?: string
  /** 脱敏字段 */
  sensitiveFields?: string[]
  /** 脱敏方法 */
  maskingMethod?: 'hash' | 'random' | 'fixed'
}

// ============================================================================
// 测试报告增强类型 (Enhanced Reporting)
// ============================================================================

/**
 * 报告格式
 */
export type ReportFormat = 'html' | 'json' | 'markdown' | 'junit' | 'pdf' | 'csv'

/**
 * 通知渠道类型
 */
export type NotificationChannelType = 'slack' | 'teams' | 'email' | 'webhook'

/**
 * 通知渠道
 */
export interface NotificationChannel {
  /** 渠道类型 */
  type: NotificationChannelType
  /** 是否启用 */
  enabled: boolean
  /** 配置 */
  config: {
    /** Webhook URL */
    webhookUrl?: string
    /** 邮件地址 */
    emails?: string[]
    /** 只在失败时通知 */
    onlyOnFailure?: boolean
    /** 包含详情 */
    includeDetails?: boolean
  }
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  /** 时间戳 */
  timestamp: number
  /** 总测试数 */
  totalTests: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 跳过数 */
  skipped: number
  /** 覆盖率 */
  coverage: number
  /** 持续时间 */
  duration: number
}

/**
 * 失败根因
 */
export interface FailureRootCause {
  /** 根因类型 */
  type:
    | 'assertion'
    | 'timeout'
    | 'network'
    | 'element-not-found'
    | 'script-error'
    | 'environment'
  /** 频率 */
  frequency: number
  /** 相关测试 */
  affectedTests: string[]
  /** 建议修复 */
  suggestedFix?: string
}

/**
 * 报告生成配置
 */
export interface ReportGeneratorConfig {
  /** 输出目录 */
  outputDir?: string
  /** 报告格式 */
  formats?: ReportFormat[]
  /** 包含截图 */
  includeScreenshots?: boolean
  /** 包含趋势 */
  includeTrends?: boolean
  /** 趋势天数 */
  trendDays?: number
  /** 通知渠道 */
  notificationChannels?: NotificationChannel[]
  /** 自定义模板 */
  customTemplate?: string
  /** 徽章输出 */
  badgeOutput?: string
  /** 标题 */
  title?: string
  /** 品牌标志 */
  logo?: string
}

/**
 * 生成的报告
 */
export interface GeneratedReport {
  /** 报告路径 */
  path: string
  /** 格式 */
  format: ReportFormat
  /** 大小 (bytes) */
  size: number
  /** 生成时间 */
  generatedAt: number
}

/**
 * 报告生成结果
 */
export interface ReportGenerationResult {
  /** 生成的报告 */
  reports: GeneratedReport[]
  /** 趋势数据 */
  trends?: TrendDataPoint[]
  /** 失败根因分析 */
  rootCauses?: FailureRootCause[]
  /** 通知状态 */
  notifications?: Array<{
    channel: NotificationChannelType
    sent: boolean
    error?: string
  }>
}

// ============================================================================
// CI/CD 集成类型
// ============================================================================

/**
 * CI 提供商
 */
export type CIProvider = 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci' | 'travis'

/**
 * 分片配置
 */
export interface ShardingConfig {
  /** 是否启用 */
  enabled: boolean
  /** 分片总数 */
  total: number
  /** 当前分片索引 */
  current: number
  /** 分片策略 */
  strategy: 'round-robin' | 'duration-based' | 'file-based'
}

/**
 * 缓存配置
 */
export interface CachingConfig {
  /** 是否启用 */
  enabled: boolean
  /** 缓存键 */
  key?: string
  /** 缓存路径 */
  paths?: string[]
  /** 过期时间 (秒) */
  ttl?: number
}

/**
 * 重试策略
 */
export interface RetryStrategy {
  /** 最大重试次数 */
  maxRetries: number
  /** 重试延迟 (ms) */
  retryDelay: number
  /** 只重试失败的测试 */
  onlyFailed: boolean
  /** Flaky 测试额外重试 */
  flakyRetries?: number
}

/**
 * PR 评论
 */
export interface PRComment {
  /** 评论 ID */
  id?: string
  /** 内容 */
  body: string
  /** 是否折叠 */
  collapsed?: boolean
  /** 包含的部分 */
  sections: Array<
    'summary' | 'coverage' | 'failures' | 'performance' | 'security' | 'suggestions'
  >
}

/**
 * CI 集成配置
 */
export interface CIConfig {
  /** 是否启用 */
  enabled?: boolean
  /** CI 提供商 */
  provider?: CIProvider
  /** 并行数 */
  parallel?: number
  /** 分片配置 */
  sharding?: ShardingConfig
  /** 缓存配置 */
  caching?: CachingConfig
  /** 重试策略 */
  retryStrategy?: RetryStrategy
  /** PR 评论配置 */
  prComment?: {
    enabled: boolean
    updateExisting: boolean
    sections: PRComment['sections']
  }
  /** 状态检查 */
  statusCheck?: {
    enabled: boolean
    context: string
    failOnWarning: boolean
  }
  /** 工件上传 */
  artifacts?: {
    enabled: boolean
    paths: string[]
    retention: number
  }
}

/**
 * CI 运行状态
 */
export interface CIRunStatus {
  /** 运行 ID */
  runId: string
  /** 状态 */
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled'
  /** 开始时间 */
  startedAt: number
  /** 结束时间 */
  finishedAt?: number
  /** 测试总数 */
  totalTests: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 分片信息 */
  shardInfo?: {
    index: number
    total: number
  }
  /** 工件 URL */
  artifactUrls?: string[]
}

// ============================================================================
// 综合类型
// ============================================================================

/**
 * 扩展测试配置
 */
export interface ExtendedTestConfig {
  /** 安全测试 */
  security?: SecurityTestConfig
  /** 合约测试 */
  contract?: ContractTestConfig
  /** 兼容性测试 */
  compatibility?: CompatibilityTestConfig
  /** i18n 测试 */
  i18n?: I18nTestConfig
  /** 变异测试 */
  mutation?: MutationTestConfig
  /** 可测试性分析 */
  testability?: TestabilityConfig
  /** 回归测试 */
  regression?: RegressionConfig
  /** 报告生成 */
  report?: ReportGeneratorConfig
  /** CI 集成 */
  ci?: CIConfig
}

/**
 * 扩展测试结果
 */
export interface ExtendedTestResults {
  /** 安全测试结果 */
  security?: SecurityTestResult
  /** 合约测试结果 */
  contract?: ContractTestResult
  /** 兼容性测试结果 */
  compatibility?: CompatibilityTestResult
  /** i18n 测试结果 */
  i18n?: I18nTestResult
  /** 变异测试结果 */
  mutation?: MutationTestResult
  /** 可测试性分析结果 */
  testability?: TestabilityReport
  /** 回归测试结果 */
  regression?: RegressionTestResult
}

/**
 * 测试器基类接口
 */
export interface BaseTester<TConfig, TResult> {
  /** 配置 */
  readonly config: TConfig
  /** 运行测试 */
  run(page?: Page): Promise<TResult>
  /** 获取分数 */
  getScore(result: TResult): number
  /** 生成建议 */
  generateSuggestions(result: TResult): string[]
}
