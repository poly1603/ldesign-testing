/**
 * @ldesign/testing - Auto Test Suite Types
 * 自动化测试套件核心类型定义
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 框架名称类型
 */
export type FrameworkName =
  | 'vue3'
  | 'vue2'
  | 'react'
  | 'preact'
  | 'angular'
  | 'svelte'
  | 'solid'
  | 'vanilla'

/**
 * 构建工具类型
 */
export type BuildTool =
  | 'vite'
  | 'webpack'
  | 'rollup'
  | 'esbuild'
  | 'parcel'
  | 'unknown'

/**
 * 测试类型
 */
export type TestType = 'memory' | 'performance' | 'ui' | 'api' | 'page'

/**
 * 资源类型
 */
export type ResourceType = 'script' | 'stylesheet' | 'image' | 'font' | 'other'

/**
 * 网络条件类型
 */
export type NetworkCondition = '3g' | '4g' | 'wifi'

/**
 * 严重程度
 */
export type Severity = 'error' | 'warning' | 'info'

/**
 * 优先级
 */
export type Priority = 'high' | 'medium' | 'low'

/**
 * 评级
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

// ============================================================================
// 项目检测相关类型
// ============================================================================

/**
 * 框架信息
 */
export interface FrameworkInfo {
  /** 框架名称 */
  name: FrameworkName
  /** 框架版本 */
  version: string
  /** 配置文件路径 */
  configFile?: string
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  /** 项目根目录 */
  root: string
  /** 检测到的框架列表 */
  frameworks: FrameworkInfo[]
  /** 构建工具 */
  buildTool: BuildTool
  /** 包管理器 */
  packageManager: 'npm' | 'yarn' | 'pnpm'
  /** 是否为 monorepo */
  isMonorepo: boolean
  /** 入口文件 */
  entryPoints: string[]
}

// ============================================================================
// 配置相关类型
// ============================================================================

/**
 * 视口配置
 */
export interface Viewport {
  /** 视口名称 */
  name: string
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

/**
 * 内存测试配置
 */
export interface MemoryConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 内存阈值 (MB) */
  threshold?: number
  /** 泄漏检测灵敏度 */
  leakSensitivity?: 'low' | 'medium' | 'high'
}

/**
 * 性能测试配置
 */
export interface PerformanceConfig {
  /** 是否启用 */
  enabled?: boolean
  /** Lighthouse 配置 */
  lighthouse?: {
    categories?: string[]
    throttling?: 'mobile' | 'desktop'
  }
  /** 网络条件 */
  networkConditions?: NetworkCondition[]
  /** 性能阈值 */
  thresholds?: {
    LCP?: number
    FID?: number
    CLS?: number
    FCP?: number
    TTFB?: number
  }
}

/**
 * UI 测试配置
 */
export interface UIConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 视口尺寸列表 */
  viewports?: Viewport[]
  /** 视觉回归阈值 */
  visualThreshold?: number
  /** 基准截图目录 */
  baselineDir?: string
  /** 是否测试暗黑模式 */
  testDarkMode?: boolean
}

/**
 * API 测试配置
 */
export interface APIConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 忽略的 URL 模式 */
  ignorePatterns?: string[]
  /** 超时阈值 (ms) */
  timeoutThreshold?: number
  /** 是否测试错误处理 */
  testErrorHandling?: boolean
}

/**
 * 页面测试配置
 */
export interface PageConfig {
  /** 是否启用 */
  enabled?: boolean
  /** 是否检测 SEO */
  checkSEO?: boolean
  /** 是否检测无障碍 */
  checkAccessibility?: boolean
  /** WCAG 等级 */
  wcagLevel?: 'A' | 'AA' | 'AAA'
  /** 国际化语言列表 */
  i18nLocales?: string[]
}

/**
 * 报告配置
 */
export interface ReportConfig {
  /** 输出目录 */
  outputDir?: string
  /** 报告格式 */
  formats?: ('html' | 'json' | 'markdown' | 'junit')[]
  /** 是否打开报告 */
  open?: boolean
  /** 是否保存历史 */
  saveHistory?: boolean
}

/**
 * 评分权重配置
 */
export interface ScoreWeights {
  /** 内存权重 (默认 0.15) */
  memory: number
  /** 性能权重 (默认 0.30) */
  performance: number
  /** UI 权重 (默认 0.20) */
  ui: number
  /** API 权重 (默认 0.15) */
  api: number
  /** 页面权重 (默认 0.20) */
  page: number
}

/**
 * 自动测试配置
 */
export interface AutoTestConfig {
  /** 项目根目录 */
  root?: string
  /** 测试目标 URL */
  targetUrl?: string
  /** 本地服务器配置 */
  server?: {
    command: string
    port: number
    readyPattern?: string
  }
  /** 启用的测试类型 */
  tests?: TestType[]
  /** 内存测试配置 */
  memory?: MemoryConfig
  /** 性能测试配置 */
  performance?: PerformanceConfig
  /** UI 测试配置 */
  ui?: UIConfig
  /** API 测试配置 */
  api?: APIConfig
  /** 页面测试配置 */
  page?: PageConfig
  /** 评分权重 */
  scoreWeights?: ScoreWeights
  /** 报告配置 */
  report?: ReportConfig
  /** CI 模式 */
  ci?: boolean
  /** 并行数 */
  parallel?: number
}

// ============================================================================
// 内存测试结果类型
// ============================================================================

/**
 * 内存数据点
 */
export interface MemoryDataPoint {
  /** 时间戳 */
  timestamp: number
  /** 已使用的 JS 堆大小 */
  usedJSHeapSize: number
  /** 总 JS 堆大小 */
  totalJSHeapSize: number
}

/**
 * 内存泄漏信息
 */
export interface MemoryLeak {
  /** 泄漏类型 */
  type: 'detached-dom' | 'event-listener' | 'closure' | 'timer' | 'unknown'
  /** 泄漏大小 (bytes) */
  size: number
  /** 可能的位置 */
  location?: string
  /** 详细描述 */
  description: string
  /** 修复建议 */
  suggestion: string
}

/**
 * 内存测试结果
 */
export interface MemoryTestResult {
  /** 初始堆大小 (bytes) */
  initialHeapSize: number
  /** 最终堆大小 (bytes) */
  finalHeapSize: number
  /** 峰值堆大小 (bytes) */
  peakHeapSize: number
  /** 内存增长率 */
  growthRate: number
  /** 检测到的内存泄漏 */
  leaks: MemoryLeak[]
  /** 内存使用时间线 */
  timeline: MemoryDataPoint[]
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 性能测试结果类型
// ============================================================================

/**
 * Core Web Vitals 结果
 */
export interface WebVitalsResult {
  /** Largest Contentful Paint (ms) */
  LCP: number
  /** First Input Delay (ms) */
  FID: number
  /** Cumulative Layout Shift */
  CLS: number
  /** First Contentful Paint (ms) */
  FCP: number
  /** Time to First Byte (ms) */
  TTFB: number
  /** Interaction to Next Paint (ms) */
  INP: number
}

/**
 * 资源组
 */
export interface ResourceGroup {
  /** 资源数量 */
  count: number
  /** 总大小 (bytes) */
  totalSize: number
  /** 平均加载时间 (ms) */
  avgLoadTime: number
}

/**
 * 慢资源
 */
export interface SlowResource {
  /** 资源 URL */
  url: string
  /** 资源类型 */
  type: ResourceType
  /** 大小 (bytes) */
  size: number
  /** 加载时间 (ms) */
  loadTime: number
}

/**
 * 资源分析结果
 */
export interface ResourceAnalysis {
  /** 总资源数 */
  totalResources: number
  /** 总大小 (bytes) */
  totalSize: number
  /** 按类型分组 */
  byType: Record<ResourceType, ResourceGroup>
  /** 慢资源列表 */
  slowResources: SlowResource[]
}

/**
 * 长任务
 */
export interface LongTask {
  /** 开始时间 (ms) */
  startTime: number
  /** 持续时间 (ms) */
  duration: number
  /** 任务名称 */
  name?: string
}

/**
 * 网络条件测试结果
 */
export interface NetworkConditionResult {
  /** 网络条件 */
  condition: NetworkCondition
  /** Web Vitals */
  webVitals: WebVitalsResult
  /** 加载时间 (ms) */
  loadTime: number
}

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  /** Lighthouse 分数 */
  lighthouseScore: number
  /** Core Web Vitals */
  webVitals: WebVitalsResult
  /** 资源分析 */
  resources: ResourceAnalysis
  /** 长任务列表 */
  longTasks: LongTask[]
  /** 网络条件测试结果 */
  networkConditions: NetworkConditionResult[]
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// UI 测试结果类型
// ============================================================================

/**
 * 视觉差异
 */
export interface VisualDifference {
  /** 页面路径 */
  path: string
  /** 差异百分比 */
  diffPercentage: number
  /** 基准截图路径 */
  baselineScreenshot: string
  /** 当前截图路径 */
  currentScreenshot: string
  /** 差异图路径 */
  diffScreenshot: string
}

/**
 * 视觉回归结果
 */
export interface VisualResult {
  /** 对比的页面数 */
  pagesCompared: number
  /** 差异数 */
  differencesFound: number
  /** 差异详情 */
  differences: VisualDifference[]
}

/**
 * 响应式测试结果
 */
export interface ResponsiveResult {
  /** 测试的视口数 */
  viewportsTested: number
  /** 问题数 */
  issuesFound: number
  /** 各视口结果 */
  viewportResults: Array<{
    viewport: Viewport
    issues: StyleIssue[]
    screenshot: string
  }>
}

/**
 * 交互验证结果
 */
export interface InteractionResult {
  /** 验证的元素数 */
  elementsValidated: number
  /** 问题数 */
  issuesFound: number
  /** 按钮验证 */
  buttons: { total: number; clickable: number; issues: string[] }
  /** 表单验证 */
  forms: { total: number; functional: number; issues: string[] }
  /** 链接验证 */
  links: { total: number; valid: number; issues: string[] }
}

/**
 * 样式问题
 */
export interface StyleIssue {
  /** 问题类型 */
  type: 'overflow' | 'overlap' | 'alignment' | 'contrast' | 'z-index'
  /** 元素选择器 */
  selector: string
  /** 问题描述 */
  description: string
  /** 截图 */
  screenshot?: string
  /** 严重程度 */
  severity: Severity
}

/**
 * 截图信息
 */
export interface Screenshot {
  /** 截图路径 */
  path: string
  /** 页面路径 */
  pagePath: string
  /** 视口 */
  viewport: Viewport
  /** 时间戳 */
  timestamp: number
}

/**
 * UI 测试结果
 */
export interface UITestResult {
  /** 测试的路由数 */
  routesTested: number
  /** 视觉回归结果 */
  visualRegression: VisualResult
  /** 响应式测试结果 */
  responsive: ResponsiveResult
  /** 交互验证结果 */
  interactions: InteractionResult
  /** 样式问题 */
  styleIssues: StyleIssue[]
  /** 截图列表 */
  screenshots: Screenshot[]
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// API 测试结果类型
// ============================================================================

/**
 * 请求详情
 */
export interface RequestDetail {
  /** 请求 URL */
  url: string
  /** 请求方法 */
  method: string
  /** 请求头 */
  headers: Record<string, string>
  /** 请求体 */
  body?: unknown
  /** 响应状态码 */
  status: number
  /** 响应时间 (ms) */
  responseTime: number
  /** 响应大小 (bytes) */
  responseSize: number
  /** 时间戳 */
  timestamp: number
}

/**
 * 重复请求
 */
export interface DuplicateRequest {
  /** 请求 URL */
  url: string
  /** 请求方法 */
  method: string
  /** 重复次数 */
  count: number
  /** 时间间隔 (ms) */
  interval: number
}

/**
 * 慢请求
 */
export interface SlowRequest {
  /** 请求 URL */
  url: string
  /** 请求方法 */
  method: string
  /** 响应时间 (ms) */
  responseTime: number
  /** 阈值 (ms) */
  threshold: number
}

/**
 * 错误处理测试结果
 */
export interface ErrorHandlingResult {
  /** 测试的场景数 */
  scenariosTested: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 详情 */
  details: Array<{
    scenario: string
    passed: boolean
    description: string
  }>
}

/**
 * API 测试结果
 */
export interface APITestResult {
  /** 拦截的请求总数 */
  totalRequests: number
  /** 成功请求数 */
  successfulRequests: number
  /** 失败请求数 */
  failedRequests: number
  /** 重复请求 */
  duplicateRequests: DuplicateRequest[]
  /** 慢请求 */
  slowRequests: SlowRequest[]
  /** 错误处理测试结果 */
  errorHandling: ErrorHandlingResult
  /** 请求详情列表 */
  requests: RequestDetail[]
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 页面测试结果类型
// ============================================================================

/**
 * SEO 问题
 */
export interface SEOIssue {
  /** 问题类型 */
  type: string
  /** 问题描述 */
  description: string
  /** 严重程度 */
  severity: Severity
  /** 修复建议 */
  suggestion: string
}

/**
 * SEO 分析结果
 */
export interface SEOResult {
  /** 是否有 title */
  hasTitle: boolean
  /** title 内容 */
  title?: string
  /** 是否有 meta description */
  hasMetaDescription: boolean
  /** meta description 内容 */
  metaDescription?: string
  /** heading 结构是否正确 */
  hasProperHeadingStructure: boolean
  /** 图片是否有 alt */
  imagesWithAlt: number
  /** 图片总数 */
  totalImages: number
  /** SEO 问题列表 */
  issues: SEOIssue[]
}

/**
 * 无障碍违规
 */
export interface AccessibilityViolation {
  /** 规则 ID */
  id: string
  /** 影响程度 */
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  /** 描述 */
  description: string
  /** 帮助链接 */
  helpUrl: string
  /** 受影响的元素 */
  nodes: Array<{
    selector: string
    html: string
  }>
}

/**
 * 无障碍检测结果
 */
export interface AccessibilityResult {
  /** 违规数 */
  violations: number
  /** 通过数 */
  passes: number
  /** 违规详情 */
  violationDetails: AccessibilityViolation[]
  /** WCAG 等级 */
  wcagLevel: 'A' | 'AA' | 'AAA' | 'none'
}

/**
 * 控制台错误
 */
export interface ConsoleError {
  /** 错误类型 */
  type: 'error' | 'warning' | 'log'
  /** 错误消息 */
  message: string
  /** 来源 URL */
  source?: string
  /** 行号 */
  line?: number
  /** 列号 */
  column?: number
  /** 时间戳 */
  timestamp: number
}

/**
 * 死链接
 */
export interface BrokenLink {
  /** 链接 URL */
  url: string
  /** 链接文本 */
  text: string
  /** 状态码 */
  statusCode: number
  /** 所在页面 */
  foundOn: string
}

/**
 * 国际化验证结果
 */
export interface I18nResult {
  /** 测试的语言数 */
  localesTested: number
  /** 问题数 */
  issuesFound: number
  /** 各语言结果 */
  localeResults: Array<{
    locale: string
    missingKeys: string[]
    issues: string[]
  }>
}

/**
 * 页面测试结果
 */
export interface PageTestResult {
  /** SEO 分析结果 */
  seo: SEOResult
  /** 无障碍检测结果 */
  accessibility: AccessibilityResult
  /** 控制台错误 */
  consoleErrors: ConsoleError[]
  /** 死链接 */
  brokenLinks: BrokenLink[]
  /** 国际化验证结果 */
  i18n?: I18nResult
  /** 评分 (0-100) */
  score: number
}

// ============================================================================
// 评分和报告类型
// ============================================================================

/**
 * 评分对比
 */
export interface ScoreComparison {
  /** 上次评分 */
  previousScore: number
  /** 当前评分 */
  currentScore: number
  /** 变化值 */
  change: number
  /** 变化百分比 */
  changePercentage: number
}

/**
 * 行业对比
 */
export interface BenchmarkComparison {
  /** 行业平均分 */
  industryAverage: number
  /** 百分位排名 */
  percentile: number
  /** 对比结果 */
  status: 'above' | 'average' | 'below'
}

/**
 * 评分结果
 */
export interface ScoreResult {
  /** 综合评分 (0-100) */
  overall: number
  /** 各类别评分 */
  categories: {
    memory: number
    performance: number
    ui: number
    api: number
    page: number
  }
  /** 评级 */
  grade: Grade
  /** 与上次对比 */
  comparison?: ScoreComparison
  /** 行业对比 */
  benchmark: BenchmarkComparison
  /** 需要关注的类别 */
  flaggedCategories: TestType[]
}

/**
 * 优化建议
 */
export interface Suggestion {
  /** 建议 ID */
  id: string
  /** 类别 */
  category: TestType
  /** 优先级 */
  priority: Priority
  /** 标题 */
  title: string
  /** 详细描述 */
  description: string
  /** 影响的文件/位置 */
  location?: string
  /** 代码示例 */
  codeExample?: string
  /** 预期收益 */
  expectedImpact: string
  /** 参考链接 */
  references?: string[]
}

/**
 * 测试套件结果
 */
export interface TestSuiteResult {
  /** 测试开始时间 */
  startTime: number
  /** 测试结束时间 */
  endTime: number
  /** 总耗时 (ms) */
  duration: number
  /** 项目信息 */
  projectInfo: ProjectInfo
  /** 各模块测试结果 */
  results: {
    memory?: MemoryTestResult
    performance?: PerformanceTestResult
    ui?: UITestResult
    api?: APITestResult
    page?: PageTestResult
  }
  /** 综合评分 */
  score: ScoreResult
  /** 优化建议 */
  suggestions: Suggestion[]
}

// ============================================================================
// 数据库模型
// ============================================================================

/**
 * 测试运行记录
 */
export interface TestRunRecord {
  /** 记录 ID */
  id: number
  /** 项目名称 */
  projectName: string
  /** 时间戳 */
  timestamp: number
  /** 耗时 (ms) */
  duration: number
  /** 综合评分 */
  overallScore: number
  /** 内存评分 */
  memoryScore: number
  /** 性能评分 */
  performanceScore: number
  /** UI 评分 */
  uiScore: number
  /** API 评分 */
  apiScore: number
  /** 页面评分 */
  pageScore: number
  /** 评级 */
  grade: string
  /** 结果 JSON */
  resultJson: string
  /** 建议 JSON */
  suggestionsJson: string
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 错误码
 */
export enum ErrorCode {
  // 配置错误
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',

  // 项目检测错误
  PROJECT_NOT_DETECTED = 'PROJECT_NOT_DETECTED',
  UNSUPPORTED_FRAMEWORK = 'UNSUPPORTED_FRAMEWORK',

  // 服务器错误
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_TIMEOUT = 'SERVER_TIMEOUT',

  // 浏览器错误
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  PAGE_LOAD_FAILED = 'PAGE_LOAD_FAILED',

  // 测试错误
  TEST_TIMEOUT = 'TEST_TIMEOUT',
  TEST_FAILED = 'TEST_FAILED',

  // 报告错误
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * 自动测试错误
 */
export class AutoTestError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AutoTestError'
  }
}

// ============================================================================
// 工具函数类型
// ============================================================================

/**
 * 评分计算函数
 */
export type ScoreCalculatorFn = (
  results: TestSuiteResult['results'],
  weights?: ScoreWeights
) => ScoreResult

/**
 * 验证评分是否在有效范围内
 */
export function isValidScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100
}

/**
 * 验证评分权重是否有效（总和为 1）
 */
export function isValidWeights(weights: ScoreWeights): boolean {
  const sum =
    weights.memory +
    weights.performance +
    weights.ui +
    weights.api +
    weights.page
  return Math.abs(sum - 1.0) < 0.001 // 允许浮点误差
}

/**
 * 计算加权评分
 */
export function calculateWeightedScore(
  categories: ScoreResult['categories'],
  weights: ScoreWeights
): number {
  const score =
    categories.memory * weights.memory +
    categories.performance * weights.performance +
    categories.ui * weights.ui +
    categories.api * weights.api +
    categories.page * weights.page

  // 确保结果在 0-100 范围内
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100))
}

/**
 * 根据评分获取评级
 */
export function getGradeFromScore(score: number): Grade {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * 默认评分权重
 */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  memory: 0.15,
  performance: 0.3,
  ui: 0.2,
  api: 0.15,
  page: 0.2,
}

/**
 * 默认配置
 */
export const DEFAULT_AUTO_TEST_CONFIG: AutoTestConfig = {
  tests: ['memory', 'performance', 'ui', 'api', 'page'],
  memory: {
    enabled: true,
    threshold: 100,
    leakSensitivity: 'medium',
  },
  performance: {
    enabled: true,
    networkConditions: ['wifi', '4g', '3g'],
    thresholds: {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      FCP: 1800,
      TTFB: 800,
    },
  },
  ui: {
    enabled: true,
    viewports: [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ],
    visualThreshold: 0.01,
    testDarkMode: true,
  },
  api: {
    enabled: true,
    timeoutThreshold: 5000,
    testErrorHandling: true,
  },
  page: {
    enabled: true,
    checkSEO: true,
    checkAccessibility: true,
    wcagLevel: 'AA',
  },
  scoreWeights: DEFAULT_SCORE_WEIGHTS,
  report: {
    outputDir: './auto-test-reports',
    formats: ['html', 'json'],
    open: true,
    saveHistory: true,
  },
  ci: false,
  parallel: 1,
}
