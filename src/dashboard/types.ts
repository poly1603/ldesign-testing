/**
 * @ldesign/testing - Dashboard Types
 * 可视化 UI 类型定义
 */

/**
 * Dashboard 配置
 */
export interface DashboardConfig {
  /** 服务端口 */
  port: number
  /** 主机地址 */
  host: string
  /** 是否自动打开浏览器 */
  open: boolean
  /** 报告目录 */
  reportsDir: string
  /** 历史数据保留天数 */
  historyDays: number
  /** 是否启用 WebSocket */
  enableWebSocket: boolean
  /** 主题 */
  theme: 'light' | 'dark' | 'auto'
  /** 自定义标题 */
  title: string
  /** Logo URL */
  logo: string
  /** 刷新间隔（毫秒） */
  refreshInterval: number
}

/**
 * 测试运行状态
 */
export type TestRunStatus = 'idle' | 'running' | 'passed' | 'failed' | 'error'

/**
 * 实时测试事件
 */
export interface TestEvent {
  type: 'start' | 'progress' | 'complete' | 'error' | 'log'
  timestamp: number
  data: TestEventData
}

export interface TestEventData {
  runId?: string
  testName?: string
  testPath?: string
  status?: TestRunStatus
  duration?: number
  message?: string
  progress?: number
  total?: number
  passed?: number
  failed?: number
  skipped?: number
  result?: TestResultSummary
}

/**
 * 测试结果摘要
 */
export interface TestResultSummary {
  id: string
  timestamp: number
  duration: number
  status: TestRunStatus
  totalTests: number
  passed: number
  failed: number
  skipped: number
  score: number
  grade: string
  categories: {
    memory: number
    performance: number
    ui: number
    api: number
    page: number
    security?: number
    contract?: number
    mutation?: number
  }
  failedTests: FailedTestInfo[]
}

export interface FailedTestInfo {
  name: string
  path: string
  error: string
  duration: number
}

/**
 * 历史趋势数据
 */
export interface TrendData {
  date: string
  score: number
  passed: number
  failed: number
  duration: number
  coverage?: number
}

/**
 * Dashboard 统计数据
 */
export interface DashboardStats {
  totalRuns: number
  averageScore: number
  averageDuration: number
  passRate: number
  lastRun: TestResultSummary | null
  trends: TrendData[]
  recentRuns: TestResultSummary[]
}

/**
 * 配置编辑器状态
 */
export interface ConfigEditorState {
  config: Record<string, unknown>
  schema: ConfigSchema
  errors: ConfigError[]
  isDirty: boolean
}

export interface ConfigSchema {
  properties: Record<string, ConfigProperty>
  required: string[]
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  default?: unknown
  enum?: unknown[]
  items?: ConfigProperty
  properties?: Record<string, ConfigProperty>
}

export interface ConfigError {
  path: string
  message: string
}

/**
 * WebSocket 消息类型
 */
export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'command' | 'config'
  channel?: string
  payload?: unknown
}

/**
 * API 响应
 */
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

/**
 * 报告列表项
 */
export interface ReportListItem {
  id: string
  filename: string
  format: string
  size: number
  createdAt: number
  score?: number
  grade?: string
}

/**
 * 测试文件信息
 */
export interface TestFileInfo {
  path: string
  name: string
  type: 'unit' | 'e2e' | 'integration' | 'component' | 'api'
  lastRun?: number
  status?: TestRunStatus
  duration?: number
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  name: string
  version: string
  path: string
  framework?: string
  testFramework?: string
  totalTestFiles: number
  lastUpdated: number
}
