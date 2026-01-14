/**
 * @ldesign/testing - Dashboard Server
 * Web Dashboard 服务器实现
 */

import express, { Express, Request, Response, NextFunction } from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import type {
  DashboardConfig,
  TestEvent,
  TestResultSummary,
  DashboardStats,
  TrendData,
  ReportListItem,
  TestFileInfo,
  ProjectInfo,
  APIResponse,
  WSMessage,
  TestRunStatus,
} from './types.js'

/**
 * 默认配置
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  port: 4173,
  host: 'localhost',
  open: true,
  reportsDir: './test-reports',
  historyDays: 30,
  enableWebSocket: true,
  theme: 'auto',
  title: 'LDesign Testing Dashboard',
  logo: '',
  refreshInterval: 5000,
}

/**
 * Dashboard 服务器
 */
export class DashboardServer {
  private config: DashboardConfig
  private app: Express
  private server: HTTPServer | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private projectRoot: string
  private currentStatus: TestRunStatus = 'idle'
  private historyData: TestResultSummary[] = []

  constructor(config: Partial<DashboardConfig> = {}, projectRoot: string = process.cwd()) {
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config }
    this.projectRoot = projectRoot
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
    this.loadHistory()
  }

  /**
   * 配置中间件
   */
  private setupMiddleware(): void {
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    // CORS
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      next()
    })
  }

  /**
   * 配置路由
   */
  private setupRoutes(): void {
    // API 路由
    this.app.get('/api/stats', this.handleGetStats.bind(this))
    this.app.get('/api/reports', this.handleGetReports.bind(this))
    this.app.get('/api/reports/:id', this.handleGetReport.bind(this))
    this.app.get('/api/trends', this.handleGetTrends.bind(this))
    this.app.get('/api/tests', this.handleGetTests.bind(this))
    this.app.get('/api/project', this.handleGetProject.bind(this))
    this.app.get('/api/config', this.handleGetConfig.bind(this))
    this.app.post('/api/config', this.handleSaveConfig.bind(this))
    this.app.post('/api/run', this.handleRunTests.bind(this))
    this.app.get('/api/status', this.handleGetStatus.bind(this))

    // 静态文件和 SPA
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(this.generateDashboardHTML())
    })

    this.app.get('/assets/*', (req: Request, res: Response) => {
      const assetPath = req.path.replace('/assets/', '')
      res.sendFile(path.join(this.config.reportsDir, 'assets', assetPath))
    })
  }

  /**
   * 启动服务器
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app)

        // 设置 WebSocket
        if (this.config.enableWebSocket) {
          this.setupWebSocket()
        }

        this.server.listen(this.config.port, this.config.host, () => {
          const url = `http://${this.config.host}:${this.config.port}`
          console.log(`\n🚀 Dashboard 已启动: ${url}\n`)

          if (this.config.open) {
            this.openBrowser(url)
          }

          resolve(url)
        })

        this.server.on('error', (error: Error) => {
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // 关闭 WebSocket 连接
      for (const client of this.clients) {
        client.close()
      }
      this.clients.clear()

      if (this.wss) {
        this.wss.close()
      }

      if (this.server) {
        this.server.close(() => {
          console.log('\n👋 Dashboard 已关闭\n')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * 设置 WebSocket
   */
  private setupWebSocket(): void {
    if (!this.server) return

    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      console.log('📡 WebSocket 客户端已连接')

      // 发送当前状态
      this.sendToClient(ws, {
        type: 'event',
        channel: 'status',
        payload: { status: this.currentStatus },
      })

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString())
          this.handleWSMessage(ws, message)
        } catch (error) {
          console.error('WebSocket 消息解析失败:', error)
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        console.log('📡 WebSocket 客户端已断开')
      })
    })
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWSMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        // 订阅处理
        this.sendToClient(ws, {
          type: 'event',
          channel: message.channel,
          payload: { subscribed: true },
        })
        break
      case 'command':
        // 命令处理
        if (message.payload === 'run') {
          this.triggerTestRun()
        }
        break
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(event: TestEvent): void {
    const message: WSMessage = {
      type: 'event',
      channel: 'test',
      payload: event,
    }

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    }
  }

  /**
   * 发送消息给单个客户端
   */
  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * 触发测试运行
   */
  private triggerTestRun(): void {
    this.currentStatus = 'running'
    this.broadcast({
      type: 'start',
      timestamp: Date.now(),
      data: { status: 'running' },
    })
  }

  /**
   * 更新测试结果
   */
  updateResult(result: TestResultSummary): void {
    this.historyData.unshift(result)
    this.currentStatus = result.status
    this.saveHistory()

    this.broadcast({
      type: 'complete',
      timestamp: Date.now(),
      data: { result, status: result.status },
    })
  }

  /**
   * 加载历史数据
   */
  private loadHistory(): void {
    const historyPath = path.join(this.config.reportsDir, '.dashboard-history.json')
    try {
      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
        this.historyData = data.runs || []
      }
    } catch (error) {
      console.warn('加载历史数据失败:', error)
      this.historyData = []
    }
  }

  /**
   * 保存历史数据
   */
  private saveHistory(): void {
    const historyPath = path.join(this.config.reportsDir, '.dashboard-history.json')
    try {
      // 确保目录存在
      const dir = path.dirname(historyPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 只保留指定天数的数据
      const cutoff = Date.now() - this.config.historyDays * 24 * 60 * 60 * 1000
      this.historyData = this.historyData.filter((r) => r.timestamp > cutoff)

      fs.writeFileSync(historyPath, JSON.stringify({ runs: this.historyData }, null, 2))
    } catch (error) {
      console.warn('保存历史数据失败:', error)
    }
  }

  /**
   * 打开浏览器
   */
  private async openBrowser(url: string): Promise<void> {
    try {
      const { default: open } = await import('open')
      await open(url)
    } catch {
      // 如果 open 包不可用，尝试使用系统命令
      const { exec } = await import('child_process')
      const cmd =
        process.platform === 'win32'
          ? `start ${url}`
          : process.platform === 'darwin'
            ? `open ${url}`
            : `xdg-open ${url}`
      exec(cmd)
    }
  }

  // ============ API 处理器 ============

  /**
   * 获取统计数据
   */
  private handleGetStats(_req: Request, res: Response): void {
    const stats = this.calculateStats()
    this.sendResponse(res, stats)
  }

  /**
   * 获取报告列表
   */
  private handleGetReports(_req: Request, res: Response): void {
    const reports = this.getReportsList()
    this.sendResponse(res, reports)
  }

  /**
   * 获取单个报告
   */
  private handleGetReport(req: Request, res: Response): void {
    const { id } = req.params
    const report = this.historyData.find((r) => r.id === id)

    if (report) {
      this.sendResponse(res, report)
    } else {
      this.sendError(res, '报告未找到', 404)
    }
  }

  /**
   * 获取趋势数据
   */
  private handleGetTrends(_req: Request, res: Response): void {
    const trends = this.calculateTrends()
    this.sendResponse(res, trends)
  }

  /**
   * 获取测试文件列表
   */
  private async handleGetTests(_req: Request, res: Response): Promise<void> {
    try {
      const tests = await this.scanTestFiles()
      this.sendResponse(res, tests)
    } catch (error) {
      this.sendError(res, '扫描测试文件失败')
    }
  }

  /**
   * 获取项目信息
   */
  private async handleGetProject(_req: Request, res: Response): Promise<void> {
    try {
      const project = await this.getProjectInfo()
      this.sendResponse(res, project)
    } catch (error) {
      this.sendError(res, '获取项目信息失败')
    }
  }

  /**
   * 获取配置
   */
  private handleGetConfig(_req: Request, res: Response): void {
    const configPath = path.join(this.projectRoot, 'testing.config.ts')
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        this.sendResponse(res, { path: configPath, content })
      } else {
        this.sendResponse(res, { path: configPath, content: null })
      }
    } catch (error) {
      this.sendError(res, '读取配置失败')
    }
  }

  /**
   * 保存配置
   */
  private handleSaveConfig(req: Request, res: Response): void {
    const { content } = req.body
    const configPath = path.join(this.projectRoot, 'testing.config.ts')

    try {
      fs.writeFileSync(configPath, content, 'utf-8')
      this.sendResponse(res, { success: true })
    } catch (error) {
      this.sendError(res, '保存配置失败')
    }
  }

  /**
   * 运行测试
   */
  private handleRunTests(req: Request, res: Response): void {
    const { type } = req.body
    this.triggerTestRun()
    this.sendResponse(res, { started: true, type: type || 'all' })
  }

  /**
   * 获取状态
   */
  private handleGetStatus(_req: Request, res: Response): void {
    this.sendResponse(res, { status: this.currentStatus })
  }

  // ============ 辅助方法 ============

  /**
   * 计算统计数据
   */
  private calculateStats(): DashboardStats {
    const runs = this.historyData
    const totalRuns = runs.length

    if (totalRuns === 0) {
      return {
        totalRuns: 0,
        averageScore: 0,
        averageDuration: 0,
        passRate: 0,
        lastRun: null,
        trends: [],
        recentRuns: [],
      }
    }

    const averageScore = runs.reduce((sum, r) => sum + r.score, 0) / totalRuns
    const averageDuration = runs.reduce((sum, r) => sum + r.duration, 0) / totalRuns
    const passedRuns = runs.filter((r) => r.status === 'passed').length
    const passRate = (passedRuns / totalRuns) * 100

    return {
      totalRuns,
      averageScore: Math.round(averageScore * 10) / 10,
      averageDuration: Math.round(averageDuration),
      passRate: Math.round(passRate * 10) / 10,
      lastRun: runs[0] || null,
      trends: this.calculateTrends(),
      recentRuns: runs.slice(0, 10),
    }
  }

  /**
   * 计算趋势数据
   */
  private calculateTrends(): TrendData[] {
    const trendMap = new Map<string, TrendData>()

    for (const run of this.historyData) {
      const date = new Date(run.timestamp).toISOString().split('T')[0]

      if (!trendMap.has(date)) {
        trendMap.set(date, {
          date,
          score: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        })
      }

      const trend = trendMap.get(date)!
      trend.score = run.score // 使用最新的分数
      trend.passed += run.passed
      trend.failed += run.failed
      trend.duration = run.duration
    }

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * 获取报告列表
   */
  private getReportsList(): ReportListItem[] {
    const reportsDir = path.resolve(this.config.reportsDir)
    const reports: ReportListItem[] = []

    try {
      if (!fs.existsSync(reportsDir)) {
        return reports
      }

      const files = fs.readdirSync(reportsDir)

      for (const file of files) {
        if (file.startsWith('report-') && !file.startsWith('.')) {
          const filePath = path.join(reportsDir, file)
          const stat = fs.statSync(filePath)
          const ext = path.extname(file).slice(1)

          reports.push({
            id: file.replace(/\.[^.]+$/, ''),
            filename: file,
            format: ext,
            size: stat.size,
            createdAt: stat.mtimeMs,
          })
        }
      }
    } catch (error) {
      console.warn('读取报告目录失败:', error)
    }

    return reports.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 扫描测试文件
   */
  private async scanTestFiles(): Promise<TestFileInfo[]> {
    const fg = await import('fast-glob')
    const patterns = [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      '**/e2e/**/*.{ts,tsx,js,jsx}',
    ]

    const files = await fg.default(patterns, {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: false,
    })

    return files.map((file) => {
      const type = this.detectTestType(file)
      return {
        path: file,
        name: path.basename(file),
        type,
      }
    })
  }

  /**
   * 检测测试类型
   */
  private detectTestType(
    filePath: string
  ): 'unit' | 'e2e' | 'integration' | 'component' | 'api' {
    const lowerPath = filePath.toLowerCase()
    if (lowerPath.includes('e2e') || lowerPath.includes('playwright')) return 'e2e'
    if (lowerPath.includes('integration')) return 'integration'
    if (lowerPath.includes('component')) return 'component'
    if (lowerPath.includes('api')) return 'api'
    return 'unit'
  }

  /**
   * 获取项目信息
   */
  private async getProjectInfo(): Promise<ProjectInfo> {
    const pkgPath = path.join(this.projectRoot, 'package.json')
    let pkg = { name: 'unknown', version: '0.0.0' }

    try {
      if (fs.existsSync(pkgPath)) {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      }
    } catch {
      // ignore
    }

    const tests = await this.scanTestFiles()

    return {
      name: pkg.name,
      version: pkg.version,
      path: this.projectRoot,
      testFramework: 'vitest',
      totalTestFiles: tests.length,
      lastUpdated: Date.now(),
    }
  }

  /**
   * 发送成功响应
   */
  private sendResponse<T>(res: Response, data: T): void {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
    }
    res.json(response)
  }

  /**
   * 发送错误响应
   */
  private sendError(res: Response, message: string, status: number = 500): void {
    const response: APIResponse = {
      success: false,
      error: message,
      timestamp: Date.now(),
    }
    res.status(status).json(response)
  }

  /**
   * 生成 Dashboard HTML
   */
  private generateDashboardHTML(): string {
    const theme = this.config.theme
    const title = this.config.title

    return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>">
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-card: #ffffff;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      --accent-color: #6366f1;
      --accent-hover: #4f46e5;
      --success-color: #22c55e;
      --warning-color: #f59e0b;
      --error-color: #ef4444;
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    
    [data-theme="dark"] {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card: #1e293b;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border-color: #334155;
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    @media (prefers-color-scheme: dark) {
      [data-theme="auto"] {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-card: #1e293b;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --border-color: #334155;
      }
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .app {
      display: flex;
      min-height: 100vh;
    }
    
    /* 侧边栏 */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      z-index: 100;
    }
    
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent-color);
    }
    
    .logo-icon { font-size: 1.5rem; }
    
    .nav {
      flex: 1;
      padding: 16px 0;
      overflow-y: auto;
    }
    
    .nav-section {
      margin-bottom: 24px;
    }
    
    .nav-section-title {
      padding: 8px 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      color: var(--text-secondary);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nav-item:hover, .nav-item.active {
      background: var(--accent-color);
      color: white;
    }
    
    .nav-item-icon { font-size: 1.1rem; }
    
    /* 主内容区 */
    .main {
      flex: 1;
      margin-left: 260px;
      padding: 24px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .status-badge.idle { background: var(--bg-secondary); color: var(--text-secondary); }
    .status-badge.running { background: #dbeafe; color: #1d4ed8; }
    .status-badge.passed { background: #dcfce7; color: #15803d; }
    .status-badge.failed { background: #fee2e2; color: #b91c1c; }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: var(--accent-color);
      color: white;
    }
    
    .btn-primary:hover { background: var(--accent-hover); }
    
    .btn-secondary {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
    
    /* 统计卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .stat-change {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      margin-top: 4px;
    }
    
    .stat-change.positive { color: var(--success-color); }
    .stat-change.negative { color: var(--error-color); }
    
    /* 图表区 */
    .chart-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .chart-title {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .chart-container {
      height: 300px;
      position: relative;
    }
    
    /* 评分圆环 */
    .score-ring {
      position: relative;
      width: 120px;
      height: 120px;
    }
    
    .score-ring svg {
      transform: rotate(-90deg);
    }
    
    .score-ring-bg {
      fill: none;
      stroke: var(--border-color);
      stroke-width: 8;
    }
    
    .score-ring-progress {
      fill: none;
      stroke: var(--accent-color);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }
    
    .score-ring-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    
    .score-value {
      font-size: 1.75rem;
      font-weight: 700;
    }
    
    .score-grade {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    /* 表格 */
    .table-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .table-title {
      font-size: 1rem;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px 20px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    
    th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }
    
    tr:hover td { background: var(--bg-secondary); }
    
    /* 分类图标 */
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .category-badge.memory { background: #ede9fe; color: #7c3aed; }
    .category-badge.performance { background: #fef3c7; color: #d97706; }
    .category-badge.ui { background: #dbeafe; color: #2563eb; }
    .category-badge.api { background: #d1fae5; color: #059669; }
    .category-badge.page { background: #fee2e2; color: #dc2626; }
    .category-badge.security { background: #fce7f3; color: #db2777; }
    
    /* 进度条 */
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .progress-fill.success { background: var(--success-color); }
    .progress-fill.warning { background: var(--warning-color); }
    .progress-fill.error { background: var(--error-color); }
    
    /* 页面切换 */
    .page { display: none; }
    .page.active { display: block; }
    
    /* 加载动画 */
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Toast 通知 */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
    }
    
    .toast {
      padding: 12px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      margin-top: 8px;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .sidebar { width: 100%; height: auto; position: relative; }
      .main { margin-left: 0; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">🧪</span>
          <span>Testing</span>
        </div>
      </div>
      <nav class="nav">
        <div class="nav-section">
          <div class="nav-section-title">概览</div>
          <a class="nav-item active" data-page="dashboard">
            <span class="nav-item-icon">📊</span>
            <span>仪表盘</span>
          </a>
          <a class="nav-item" data-page="trends">
            <span class="nav-item-icon">📈</span>
            <span>趋势分析</span>
          </a>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">测试</div>
          <a class="nav-item" data-page="tests">
            <span class="nav-item-icon">🧪</span>
            <span>测试文件</span>
          </a>
          <a class="nav-item" data-page="reports">
            <span class="nav-item-icon">📋</span>
            <span>测试报告</span>
          </a>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">设置</div>
          <a class="nav-item" data-page="config">
            <span class="nav-item-icon">⚙️</span>
            <span>配置</span>
          </a>
        </div>
      </nav>
    </aside>
    
    <!-- 主内容 -->
    <main class="main">
      <!-- 仪表盘页面 -->
      <div class="page active" id="page-dashboard">
        <header class="header">
          <h1>测试仪表盘</h1>
          <div class="header-actions">
            <span class="status-badge idle" id="status-badge">
              <span>⏳</span>
              <span id="status-text">空闲</span>
            </span>
            <button class="btn btn-primary" id="run-tests-btn">
              <span>▶️</span>
              <span>运行测试</span>
            </button>
          </div>
        </header>
        
        <div class="stats-grid" id="stats-grid">
          <div class="stat-card">
            <div class="stat-label">总运行次数</div>
            <div class="stat-value" id="stat-total-runs">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">平均分数</div>
            <div class="stat-value" id="stat-avg-score">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">通过率</div>
            <div class="stat-value" id="stat-pass-rate">-</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">平均耗时</div>
            <div class="stat-value" id="stat-avg-duration">-</div>
          </div>
        </div>
        
        <div class="chart-section">
          <div class="chart-header">
            <h3 class="chart-title">最近运行结果</h3>
          </div>
          <div id="recent-runs-container">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
      
      <!-- 趋势页面 -->
      <div class="page" id="page-trends">
        <header class="header">
          <h1>趋势分析</h1>
        </header>
        <div class="chart-section">
          <div class="chart-header">
            <h3 class="chart-title">分数趋势</h3>
          </div>
          <div class="chart-container" id="trend-chart">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
      
      <!-- 测试文件页面 -->
      <div class="page" id="page-tests">
        <header class="header">
          <h1>测试文件</h1>
          <button class="btn btn-secondary" id="refresh-tests-btn">
            <span>🔄</span>
            <span>刷新</span>
          </button>
        </header>
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>类型</th>
                <th>路径</th>
              </tr>
            </thead>
            <tbody id="tests-table-body">
              <tr><td colspan="3" class="loading"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 报告页面 -->
      <div class="page" id="page-reports">
        <header class="header">
          <h1>测试报告</h1>
        </header>
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th>报告名称</th>
                <th>格式</th>
                <th>大小</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody id="reports-table-body">
              <tr><td colspan="4" class="loading"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 配置页面 -->
      <div class="page" id="page-config">
        <header class="header">
          <h1>配置</h1>
          <button class="btn btn-primary" id="save-config-btn">
            <span>💾</span>
            <span>保存配置</span>
          </button>
        </header>
        <div class="chart-section">
          <div class="chart-header">
            <h3 class="chart-title">testing.config.ts</h3>
          </div>
          <textarea id="config-editor" style="width:100%;height:400px;font-family:monospace;padding:16px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);resize:vertical;"></textarea>
        </div>
      </div>
    </main>
  </div>
  
  <div class="toast-container" id="toast-container"></div>
  
  <script>
    // Dashboard 客户端脚本
    const API_BASE = '';
    let ws = null;
    let currentPage = 'dashboard';
    
    // 页面切换
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        switchPage(page);
      });
    });
    
    function switchPage(page) {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      
      document.querySelector('[data-page="' + page + '"]').classList.add('active');
      document.getElementById('page-' + page).classList.add('active');
      currentPage = page;
      
      loadPageData(page);
    }
    
    // 加载页面数据
    async function loadPageData(page) {
      switch(page) {
        case 'dashboard': await loadDashboard(); break;
        case 'trends': await loadTrends(); break;
        case 'tests': await loadTests(); break;
        case 'reports': await loadReports(); break;
        case 'config': await loadConfig(); break;
      }
    }
    
    // API 请求
    async function api(endpoint) {
      try {
        const res = await fetch(API_BASE + '/api/' + endpoint);
        const data = await res.json();
        if (data.success) return data.data;
        throw new Error(data.error);
      } catch (e) {
        console.error('API 错误:', e);
        showToast('请求失败: ' + e.message, 'error');
        return null;
      }
    }
    
    async function apiPost(endpoint, body) {
      try {
        const res = await fetch(API_BASE + '/api/' + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) return data.data;
        throw new Error(data.error);
      } catch (e) {
        console.error('API 错误:', e);
        showToast('请求失败: ' + e.message, 'error');
        return null;
      }
    }
    
    // 加载仪表盘
    async function loadDashboard() {
      const stats = await api('stats');
      if (!stats) return;
      
      document.getElementById('stat-total-runs').textContent = stats.totalRuns;
      document.getElementById('stat-avg-score').textContent = stats.averageScore.toFixed(1);
      document.getElementById('stat-pass-rate').textContent = stats.passRate.toFixed(1) + '%';
      document.getElementById('stat-avg-duration').textContent = formatDuration(stats.averageDuration);
      
      renderRecentRuns(stats.recentRuns || []);
    }
    
    function renderRecentRuns(runs) {
      const container = document.getElementById('recent-runs-container');
      if (runs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">暂无测试记录</p>';
        return;
      }
      
      let html = '<table><thead><tr><th>时间</th><th>状态</th><th>分数</th><th>通过/失败</th><th>耗时</th></tr></thead><tbody>';
      
      for (const run of runs.slice(0, 10)) {
        const statusClass = run.status === 'passed' ? 'success' : run.status === 'failed' ? 'error' : 'warning';
        html += '<tr>';
        html += '<td>' + new Date(run.timestamp).toLocaleString() + '</td>';
        html += '<td><span class="status-badge ' + run.status + '">' + getStatusIcon(run.status) + ' ' + getStatusText(run.status) + '</span></td>';
        html += '<td><strong>' + run.score.toFixed(1) + '</strong> (' + run.grade + ')</td>';
        html += '<td><span style="color:var(--success-color)">' + run.passed + '</span> / <span style="color:var(--error-color)">' + run.failed + '</span></td>';
        html += '<td>' + formatDuration(run.duration) + '</td>';
        html += '</tr>';
      }
      
      html += '</tbody></table>';
      container.innerHTML = html;
    }
    
    // 加载趋势
    async function loadTrends() {
      const trends = await api('trends');
      if (!trends || trends.length === 0) {
        document.getElementById('trend-chart').innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">暂无趋势数据</p>';
        return;
      }
      
      renderTrendChart(trends);
    }
    
    function renderTrendChart(trends) {
      const container = document.getElementById('trend-chart');
      const width = container.clientWidth;
      const height = 280;
      const padding = 40;
      
      const maxScore = 100;
      const minScore = 0;
      
      let svg = '<svg width="' + width + '" height="' + height + '">';
      
      // 网格线
      for (let i = 0; i <= 4; i++) {
        const y = padding + (height - 2 * padding) * i / 4;
        svg += '<line x1="' + padding + '" y1="' + y + '" x2="' + (width - padding) + '" y2="' + y + '" stroke="var(--border-color)" stroke-dasharray="4"/>';
        svg += '<text x="' + (padding - 10) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--text-secondary)" font-size="12">' + (100 - i * 25) + '</text>';
      }
      
      // 数据线
      const points = trends.map((t, i) => {
        const x = padding + (width - 2 * padding) * i / (trends.length - 1 || 1);
        const y = padding + (height - 2 * padding) * (1 - (t.score - minScore) / (maxScore - minScore));
        return { x, y, data: t };
      });
      
      if (points.length > 1) {
        let path = 'M ' + points[0].x + ' ' + points[0].y;
        for (let i = 1; i < points.length; i++) {
          path += ' L ' + points[i].x + ' ' + points[i].y;
        }
        svg += '<path d="' + path + '" fill="none" stroke="var(--accent-color)" stroke-width="2"/>';
      }
      
      // 数据点
      for (const p of points) {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="var(--accent-color)"/>';
      }
      
      // X轴标签
      const step = Math.ceil(trends.length / 6);
      for (let i = 0; i < trends.length; i += step) {
        const x = padding + (width - 2 * padding) * i / (trends.length - 1 || 1);
        svg += '<text x="' + x + '" y="' + (height - 10) + '" text-anchor="middle" fill="var(--text-secondary)" font-size="11">' + trends[i].date.slice(5) + '</text>';
      }
      
      svg += '</svg>';
      container.innerHTML = svg;
    }
    
    // 加载测试文件
    async function loadTests() {
      const tests = await api('tests');
      const tbody = document.getElementById('tests-table-body');
      
      if (!tests || tests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:40px;">未找到测试文件</td></tr>';
        return;
      }
      
      let html = '';
      for (const test of tests) {
        html += '<tr>';
        html += '<td><strong>' + test.name + '</strong></td>';
        html += '<td><span class="category-badge ' + test.type + '">' + test.type + '</span></td>';
        html += '<td style="color:var(--text-secondary)">' + test.path + '</td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
    }
    
    // 加载报告
    async function loadReports() {
      const reports = await api('reports');
      const tbody = document.getElementById('reports-table-body');
      
      if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:40px;">暂无报告</td></tr>';
        return;
      }
      
      let html = '';
      for (const report of reports) {
        html += '<tr>';
        html += '<td><strong>' + report.filename + '</strong></td>';
        html += '<td>' + report.format.toUpperCase() + '</td>';
        html += '<td>' + formatSize(report.size) + '</td>';
        html += '<td>' + new Date(report.createdAt).toLocaleString() + '</td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
    }
    
    // 加载配置
    async function loadConfig() {
      const config = await api('config');
      const editor = document.getElementById('config-editor');
      
      if (config && config.content) {
        editor.value = config.content;
      } else {
        editor.value = '// 配置文件不存在，请创建 testing.config.ts';
      }
    }
    
    // 保存配置
    document.getElementById('save-config-btn').addEventListener('click', async () => {
      const content = document.getElementById('config-editor').value;
      const result = await apiPost('config', { content });
      if (result) {
        showToast('配置已保存', 'success');
      }
    });
    
    // 运行测试
    document.getElementById('run-tests-btn').addEventListener('click', async () => {
      const result = await apiPost('run', { type: 'all' });
      if (result) {
        showToast('测试已启动', 'success');
        updateStatus('running');
      }
    });
    
    // 刷新测试文件
    document.getElementById('refresh-tests-btn').addEventListener('click', () => {
      loadTests();
    });
    
    // WebSocket 连接
    function connectWebSocket() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host);
      
      ws.onopen = () => {
        console.log('WebSocket 已连接');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWSMessage(message);
        } catch (e) {
          console.error('WebSocket 消息解析失败:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket 已断开，5秒后重连...');
        setTimeout(connectWebSocket, 5000);
      };
    }
    
    function handleWSMessage(message) {
      if (message.type === 'event' && message.channel === 'test') {
        const event = message.payload;
        switch (event.type) {
          case 'start':
            updateStatus('running');
            showToast('测试开始运行', 'info');
            break;
          case 'complete':
            updateStatus(event.data.status);
            showToast('测试完成: ' + event.data.status, event.data.status === 'passed' ? 'success' : 'error');
            if (currentPage === 'dashboard') loadDashboard();
            break;
        }
      }
    }
    
    // 更新状态
    function updateStatus(status) {
      const badge = document.getElementById('status-badge');
      const text = document.getElementById('status-text');
      
      badge.className = 'status-badge ' + status;
      text.textContent = getStatusText(status);
    }
    
    function getStatusText(status) {
      const texts = { idle: '空闲', running: '运行中', passed: '通过', failed: '失败', error: '错误' };
      return texts[status] || status;
    }
    
    function getStatusIcon(status) {
      const icons = { idle: '⏳', running: '🔄', passed: '✅', failed: '❌', error: '⚠️' };
      return icons[status] || '❓';
    }
    
    // 格式化
    function formatDuration(ms) {
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
      return (ms / 60000).toFixed(1) + 'm';
    }
    
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
    
    // Toast 通知
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.borderLeftColor = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--accent-color)';
      toast.style.borderLeftWidth = '4px';
      toast.style.borderLeftStyle = 'solid';
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    
    // 初始化
    loadDashboard();
    connectWebSocket();
  </script>
</body>
</html>`
  }
}
