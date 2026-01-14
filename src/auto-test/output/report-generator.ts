/**
 * @ldesign/testing - Report Generator
 * 测试报告增强模块 - 统一HTML报告、趋势分析、通知集成
 */

import type {
  ReportGeneratorConfig,
  ReportGenerationResult,
  GeneratedReport,
  TrendDataPoint,
  FailureRootCause,
  NotificationChannel,
  NotificationChannelType,
  ReportFormat,
} from '../types/extended.js'
import type { TestSuiteResult, Grade } from '../types/index.js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 默认报告生成配置
 */
export const DEFAULT_REPORT_CONFIG: Required<ReportGeneratorConfig> = {
  outputDir: './test-reports',
  formats: ['html', 'json'],
  includeScreenshots: true,
  includeTrends: true,
  trendDays: 30,
  notificationChannels: [],
  customTemplate: '',
  badgeOutput: '',
  title: 'Test Report',
  logo: '',
}

/**
 * 历史数据存储
 */
interface HistoryData {
  runs: TrendDataPoint[]
}

/**
 * 测试报告生成器
 */
export class ReportGenerator {
  private config: Required<ReportGeneratorConfig>
  private historyPath: string

  constructor(config: ReportGeneratorConfig = {}) {
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config }
    this.historyPath = path.join(this.config.outputDir, '.history.json')
  }

  /**
   * 生成测试报告
   */
  async generate(result: TestSuiteResult): Promise<ReportGenerationResult> {
    // 确保输出目录存在
    this.ensureOutputDir()

    const generationResult: ReportGenerationResult = {
      reports: [],
      trends: undefined,
      rootCauses: undefined,
      notifications: undefined,
    }

    // 生成各格式报告
    for (const format of this.config.formats) {
      const report = await this.generateReport(result, format)
      generationResult.reports.push(report)
    }

    // 生成趋势数据
    if (this.config.includeTrends) {
      generationResult.trends = await this.generateTrends(result)
    }

    // 分析失败根因
    generationResult.rootCauses = this.analyzeRootCauses(result)

    // 生成徽章
    if (this.config.badgeOutput) {
      await this.generateBadge(result)
    }

    // 发送通知
    if (this.config.notificationChannels.length > 0) {
      generationResult.notifications = await this.sendNotifications(result)
    }

    // 保存历史数据
    await this.saveHistory(result)

    return generationResult
  }

  /**
   * 确保输出目录存在
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }
  }

  /**
   * 生成单个格式的报告
   */
  private async generateReport(
    result: TestSuiteResult,
    format: ReportFormat
  ): Promise<GeneratedReport> {
    const timestamp = Date.now()
    const filename = `report-${new Date().toISOString().split('T')[0]}.${format}`
    const filepath = path.join(this.config.outputDir, filename)

    let content: string

    switch (format) {
      case 'html':
        content = this.generateHTMLReport(result)
        break
      case 'json':
        content = JSON.stringify(result, null, 2)
        break
      case 'markdown':
        content = this.generateMarkdownReport(result)
        break
      case 'junit':
        content = this.generateJUnitReport(result)
        break
      case 'csv':
        content = this.generateCSVReport(result)
        break
      default:
        content = JSON.stringify(result, null, 2)
    }

    fs.writeFileSync(filepath, content, 'utf-8')

    return {
      path: filepath,
      format,
      size: Buffer.byteLength(content, 'utf-8'),
      generatedAt: timestamp,
    }
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTMLReport(result: TestSuiteResult): string {
    const { score, suggestions, results, projectInfo } = result
    const gradeColor = this.getGradeColor(score.grade)

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 2rem; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .score-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .score-main { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; color: white; background: ${gradeColor}; }
    .score-details h2 { font-size: 1.5rem; margin-bottom: 8px; }
    .score-categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .category { background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
    .category-name { font-size: 0.875rem; color: #666; margin-bottom: 4px; }
    .category-score { font-size: 1.5rem; font-weight: bold; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section h3 { font-size: 1.25rem; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #eee; }
    .suggestion-list { list-style: none; }
    .suggestion-item { padding: 12px 16px; margin-bottom: 8px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
    .suggestion-item.high { border-left-color: #e74c3c; }
    .suggestion-item.medium { border-left-color: #f39c12; }
    .suggestion-item.low { border-left-color: #27ae60; }
    .suggestion-title { font-weight: 600; margin-bottom: 4px; }
    .suggestion-desc { color: #666; font-size: 0.875rem; }
    .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .result-card { background: #f8f9fa; padding: 16px; border-radius: 8px; }
    .result-card h4 { margin-bottom: 12px; color: #667eea; }
    .result-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .result-item:last-child { border-bottom: none; }
    .result-label { color: #666; }
    .result-value { font-weight: 600; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-error { background: #f8d7da; color: #721c24; }
    .footer { text-align: center; padding: 24px; color: #666; font-size: 0.875rem; }
    @media (max-width: 768px) {
      .score-main { flex-direction: column; text-align: center; }
      .score-circle { width: 100px; height: 100px; font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${this.config.logo ? `<img src="${this.config.logo}" alt="Logo" style="height: 40px; margin-bottom: 16px;">` : ''}
      <h1>${this.config.title}</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>项目: ${projectInfo.root} | 框架: ${projectInfo.frameworks.map((f) => f.name).join(', ') || '未检测'}</p>
    </div>

    <div class="score-card">
      <div class="score-main">
        <div class="score-circle">${score.grade}</div>
        <div class="score-details">
          <h2>综合评分: ${score.overall.toFixed(1)}</h2>
          <p>本次测试耗时 ${(result.duration / 1000).toFixed(2)} 秒</p>
          ${score.comparison ? `<p>与上次相比: ${score.comparison.change >= 0 ? '+' : ''}${score.comparison.change.toFixed(1)} (${score.comparison.changePercentage.toFixed(1)}%)</p>` : ''}
        </div>
      </div>
      <div class="score-categories">
        <div class="category">
          <div class="category-name">内存</div>
          <div class="category-score" style="color: ${this.getScoreColor(score.categories.memory)}">${score.categories.memory.toFixed(0)}</div>
        </div>
        <div class="category">
          <div class="category-name">性能</div>
          <div class="category-score" style="color: ${this.getScoreColor(score.categories.performance)}">${score.categories.performance.toFixed(0)}</div>
        </div>
        <div class="category">
          <div class="category-name">UI</div>
          <div class="category-score" style="color: ${this.getScoreColor(score.categories.ui)}">${score.categories.ui.toFixed(0)}</div>
        </div>
        <div class="category">
          <div class="category-name">API</div>
          <div class="category-score" style="color: ${this.getScoreColor(score.categories.api)}">${score.categories.api.toFixed(0)}</div>
        </div>
        <div class="category">
          <div class="category-name">页面</div>
          <div class="category-score" style="color: ${this.getScoreColor(score.categories.page)}">${score.categories.page.toFixed(0)}</div>
        </div>
      </div>
    </div>

    ${suggestions.length > 0 ? `
    <div class="section">
      <h3>优化建议 (${suggestions.length})</h3>
      <ul class="suggestion-list">
        ${suggestions.slice(0, 10).map((s) => `
        <li class="suggestion-item ${s.priority}">
          <div class="suggestion-title">${s.title}</div>
          <div class="suggestion-desc">${s.description}</div>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h3>测试结果详情</h3>
      <div class="results-grid">
        ${results.memory ? `
        <div class="result-card">
          <h4>🧠 内存分析</h4>
          <div class="result-item">
            <span class="result-label">初始堆大小</span>
            <span class="result-value">${(results.memory.initialHeapSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div class="result-item">
            <span class="result-label">峰值堆大小</span>
            <span class="result-value">${(results.memory.peakHeapSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div class="result-item">
            <span class="result-label">内存泄漏</span>
            <span class="result-value">${results.memory.leaks.length} 个</span>
          </div>
        </div>
        ` : ''}

        ${results.performance ? `
        <div class="result-card">
          <h4>⚡ 性能分析</h4>
          <div class="result-item">
            <span class="result-label">Lighthouse 分数</span>
            <span class="result-value">${results.performance.lighthouseScore}</span>
          </div>
          <div class="result-item">
            <span class="result-label">LCP</span>
            <span class="result-value">${results.performance.webVitals.LCP.toFixed(0)} ms</span>
          </div>
          <div class="result-item">
            <span class="result-label">CLS</span>
            <span class="result-value">${results.performance.webVitals.CLS.toFixed(3)}</span>
          </div>
          <div class="result-item">
            <span class="result-label">FID</span>
            <span class="result-value">${results.performance.webVitals.FID.toFixed(0)} ms</span>
          </div>
        </div>
        ` : ''}

        ${results.ui ? `
        <div class="result-card">
          <h4>🎨 UI 测试</h4>
          <div class="result-item">
            <span class="result-label">测试路由数</span>
            <span class="result-value">${results.ui.routesTested}</span>
          </div>
          <div class="result-item">
            <span class="result-label">视觉差异</span>
            <span class="result-value">${results.ui.visualRegression.differencesFound} 个</span>
          </div>
          <div class="result-item">
            <span class="result-label">样式问题</span>
            <span class="result-value">${results.ui.styleIssues.length} 个</span>
          </div>
        </div>
        ` : ''}

        ${results.api ? `
        <div class="result-card">
          <h4>🔌 API 测试</h4>
          <div class="result-item">
            <span class="result-label">总请求数</span>
            <span class="result-value">${results.api.totalRequests}</span>
          </div>
          <div class="result-item">
            <span class="result-label">成功率</span>
            <span class="result-value">${results.api.totalRequests ? ((results.api.successfulRequests / results.api.totalRequests) * 100).toFixed(1) : 0}%</span>
          </div>
          <div class="result-item">
            <span class="result-label">慢请求</span>
            <span class="result-value">${results.api.slowRequests.length} 个</span>
          </div>
        </div>
        ` : ''}

        ${results.page ? `
        <div class="result-card">
          <h4>📄 页面分析</h4>
          <div class="result-item">
            <span class="result-label">无障碍违规</span>
            <span class="result-value">${results.page.accessibility.violations} 个</span>
          </div>
          <div class="result-item">
            <span class="result-label">SEO 问题</span>
            <span class="result-value">${results.page.seo.issues.length} 个</span>
          </div>
          <div class="result-item">
            <span class="result-label">死链接</span>
            <span class="result-value">${results.page.brokenLinks.length} 个</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer">
      <p>由 @ldesign/testing 生成 | ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdownReport(result: TestSuiteResult): string {
    const { score, suggestions, projectInfo, duration } = result

    let md = `# ${this.config.title}\n\n`
    md += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`

    md += `## 概览\n\n`
    md += `- **综合评分**: ${score.overall.toFixed(1)} (${score.grade})\n`
    md += `- **测试耗时**: ${(duration / 1000).toFixed(2)} 秒\n`
    md += `- **项目路径**: ${projectInfo.root}\n`
    md += `- **框架**: ${projectInfo.frameworks.map((f) => f.name).join(', ') || '未检测'}\n\n`

    md += `## 分类评分\n\n`
    md += `| 分类 | 评分 |\n`
    md += `| --- | --- |\n`
    md += `| 内存 | ${score.categories.memory.toFixed(0)} |\n`
    md += `| 性能 | ${score.categories.performance.toFixed(0)} |\n`
    md += `| UI | ${score.categories.ui.toFixed(0)} |\n`
    md += `| API | ${score.categories.api.toFixed(0)} |\n`
    md += `| 页面 | ${score.categories.page.toFixed(0)} |\n\n`

    if (suggestions.length > 0) {
      md += `## 优化建议\n\n`
      for (const s of suggestions.slice(0, 10)) {
        md += `### ${s.title}\n\n`
        md += `- **优先级**: ${s.priority}\n`
        md += `- **分类**: ${s.category}\n`
        md += `- **描述**: ${s.description}\n`
        if (s.expectedImpact) {
          md += `- **预期收益**: ${s.expectedImpact}\n`
        }
        md += `\n`
      }
    }

    return md
  }

  /**
   * 生成 JUnit XML 报告
   */
  private generateJUnitReport(result: TestSuiteResult): string {
    const { results, duration } = result
    const timestamp = new Date().toISOString()

    let failures = 0
    let tests = 0

    // 统计测试数和失败数
    if (results.memory) {
      tests++
      if (results.memory.score < 60) failures++
    }
    if (results.performance) {
      tests++
      if (results.performance.score < 60) failures++
    }
    if (results.ui) {
      tests++
      if (results.ui.score < 60) failures++
    }
    if (results.api) {
      tests++
      if (results.api.score < 60) failures++
    }
    if (results.page) {
      tests++
      if (results.page.score < 60) failures++
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<testsuites name="${this.config.title}" tests="${tests}" failures="${failures}" time="${(duration / 1000).toFixed(3)}" timestamp="${timestamp}">\n`
    xml += `  <testsuite name="AutoTest" tests="${tests}" failures="${failures}" time="${(duration / 1000).toFixed(3)}">\n`

    if (results.memory) {
      xml += `    <testcase name="Memory Analysis" classname="AutoTest.Memory" time="0">\n`
      if (results.memory.score < 60) {
        xml += `      <failure message="Memory score below threshold">Score: ${results.memory.score}</failure>\n`
      }
      xml += `    </testcase>\n`
    }

    if (results.performance) {
      xml += `    <testcase name="Performance Analysis" classname="AutoTest.Performance" time="0">\n`
      if (results.performance.score < 60) {
        xml += `      <failure message="Performance score below threshold">Score: ${results.performance.score}</failure>\n`
      }
      xml += `    </testcase>\n`
    }

    if (results.ui) {
      xml += `    <testcase name="UI Testing" classname="AutoTest.UI" time="0">\n`
      if (results.ui.score < 60) {
        xml += `      <failure message="UI score below threshold">Score: ${results.ui.score}</failure>\n`
      }
      xml += `    </testcase>\n`
    }

    if (results.api) {
      xml += `    <testcase name="API Testing" classname="AutoTest.API" time="0">\n`
      if (results.api.score < 60) {
        xml += `      <failure message="API score below threshold">Score: ${results.api.score}</failure>\n`
      }
      xml += `    </testcase>\n`
    }

    if (results.page) {
      xml += `    <testcase name="Page Analysis" classname="AutoTest.Page" time="0">\n`
      if (results.page.score < 60) {
        xml += `      <failure message="Page score below threshold">Score: ${results.page.score}</failure>\n`
      }
      xml += `    </testcase>\n`
    }

    xml += `  </testsuite>\n`
    xml += `</testsuites>\n`

    return xml
  }

  /**
   * 生成 CSV 报告
   */
  private generateCSVReport(result: TestSuiteResult): string {
    const { score, results } = result
    const rows: string[][] = []

    rows.push(['Category', 'Metric', 'Value'])
    rows.push(['Overall', 'Score', score.overall.toString()])
    rows.push(['Overall', 'Grade', score.grade])

    rows.push(['Memory', 'Score', score.categories.memory.toString()])
    rows.push(['Performance', 'Score', score.categories.performance.toString()])
    rows.push(['UI', 'Score', score.categories.ui.toString()])
    rows.push(['API', 'Score', score.categories.api.toString()])
    rows.push(['Page', 'Score', score.categories.page.toString()])

    if (results.performance?.webVitals) {
      rows.push(['Performance', 'LCP', results.performance.webVitals.LCP.toString()])
      rows.push(['Performance', 'FID', results.performance.webVitals.FID.toString()])
      rows.push(['Performance', 'CLS', results.performance.webVitals.CLS.toString()])
    }

    return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  }

  /**
   * 生成趋势数据
   */
  private async generateTrends(result: TestSuiteResult): Promise<TrendDataPoint[]> {
    const history = this.loadHistory()
    const newPoint: TrendDataPoint = {
      timestamp: Date.now(),
      totalTests: 5, // 假设 5 个测试类别
      passed: Object.values(result.results).filter((r) => r && r.score >= 60).length,
      failed: Object.values(result.results).filter((r) => r && r.score < 60).length,
      skipped: 5 - Object.values(result.results).filter((r) => r).length,
      coverage: result.score.overall,
      duration: result.duration,
    }

    history.runs.push(newPoint)

    // 只保留指定天数的数据
    const cutoffTime = Date.now() - this.config.trendDays * 24 * 60 * 60 * 1000
    history.runs = history.runs.filter((run) => run.timestamp > cutoffTime)

    return history.runs
  }

  /**
   * 分析失败根因
   */
  private analyzeRootCauses(result: TestSuiteResult): FailureRootCause[] {
    const causes: FailureRootCause[] = []
    const causeMap = new Map<FailureRootCause['type'], string[]>()

    // 分析各类问题
    if (result.results.memory?.leaks.length) {
      const tests = result.results.memory.leaks.map((l) => l.type)
      causeMap.set('script-error', tests)
    }

    if (result.results.api?.failedRequests && result.results.api.failedRequests > 0) {
      causeMap.set('network', ['API requests failed'])
    }

    if (result.results.page?.consoleErrors.length) {
      const errors = result.results.page.consoleErrors
        .filter((e) => e.type === 'error')
        .map((e) => e.message)
      if (errors.length) {
        causeMap.set('script-error', [...(causeMap.get('script-error') || []), ...errors])
      }
    }

    // 转换为结果格式
    for (const [type, tests] of causeMap) {
      causes.push({
        type,
        frequency: tests.length,
        affectedTests: tests,
        suggestedFix: this.getSuggestedFix(type),
      })
    }

    return causes.sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * 获取建议修复方案
   */
  private getSuggestedFix(type: FailureRootCause['type']): string {
    const fixes: Record<FailureRootCause['type'], string> = {
      assertion: '检查断言条件是否正确，确保测试数据一致',
      timeout: '增加超时时间或优化被测试代码的性能',
      network: '检查网络连接和 API 端点可用性',
      'element-not-found': '确保元素选择器正确，增加等待时间',
      'script-error': '检查 JavaScript 错误并修复代码问题',
      environment: '检查测试环境配置和依赖版本',
    }
    return fixes[type] || '请检查测试日志获取更多信息'
  }

  /**
   * 生成状态徽章
   */
  private async generateBadge(result: TestSuiteResult): Promise<void> {
    const { score } = result
    const color = this.getGradeColor(score.grade).replace('#', '')

    // SVG 徽章
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a"><rect width="120" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h60v20H0z"/>
    <path fill="#${color}" d="M60 0h60v20H60z"/>
    <path fill="url(#b)" d="M0 0h120v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="30" y="15" fill="#010101" fill-opacity=".3">tests</text>
    <text x="30" y="14">tests</text>
    <text x="90" y="15" fill="#010101" fill-opacity=".3">${score.grade} ${score.overall.toFixed(0)}</text>
    <text x="90" y="14">${score.grade} ${score.overall.toFixed(0)}</text>
  </g>
</svg>`

    fs.writeFileSync(this.config.badgeOutput, svg, 'utf-8')
  }

  /**
   * 发送通知
   */
  private async sendNotifications(
    result: TestSuiteResult
  ): Promise<Array<{ channel: NotificationChannelType; sent: boolean; error?: string }>> {
    const notifications: Array<{
      channel: NotificationChannelType
      sent: boolean
      error?: string
    }> = []

    for (const channel of this.config.notificationChannels) {
      if (!channel.enabled) continue

      // 只在失败时通知
      if (channel.config.onlyOnFailure && result.score.overall >= 60) {
        continue
      }

      try {
        await this.sendNotification(channel, result)
        notifications.push({ channel: channel.type, sent: true })
      } catch (error) {
        notifications.push({
          channel: channel.type,
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return notifications
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(
    channel: NotificationChannel,
    result: TestSuiteResult
  ): Promise<void> {
    const message = this.formatNotificationMessage(result, channel.config.includeDetails)

    switch (channel.type) {
      case 'slack':
      case 'teams':
      case 'webhook':
        if (channel.config.webhookUrl) {
          await this.sendWebhook(channel.config.webhookUrl, message, channel.type)
        }
        break
      case 'email':
        // 邮件发送需要额外配置，这里只是占位
        console.log('Email notification:', channel.config.emails, message)
        break
    }
  }

  /**
   * 发送 Webhook
   */
  private async sendWebhook(
    url: string,
    message: string,
    type: NotificationChannelType
  ): Promise<void> {
    let payload: object

    switch (type) {
      case 'slack':
        payload = { text: message }
        break
      case 'teams':
        payload = { text: message }
        break
      default:
        payload = { message }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }
  }

  /**
   * 格式化通知消息
   */
  private formatNotificationMessage(result: TestSuiteResult, includeDetails = false): string {
    const { score, projectInfo, duration } = result
    const emoji = score.overall >= 80 ? '✅' : score.overall >= 60 ? '⚠️' : '❌'

    let message = `${emoji} 测试报告: ${score.grade} (${score.overall.toFixed(1)})\n`
    message += `项目: ${path.basename(projectInfo.root)}\n`
    message += `耗时: ${(duration / 1000).toFixed(2)}s\n`

    if (includeDetails) {
      message += `\n分类评分:\n`
      message += `- 内存: ${score.categories.memory.toFixed(0)}\n`
      message += `- 性能: ${score.categories.performance.toFixed(0)}\n`
      message += `- UI: ${score.categories.ui.toFixed(0)}\n`
      message += `- API: ${score.categories.api.toFixed(0)}\n`
      message += `- 页面: ${score.categories.page.toFixed(0)}\n`
    }

    return message
  }

  /**
   * 加载历史数据
   */
  private loadHistory(): HistoryData {
    if (fs.existsSync(this.historyPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'))
      } catch {
        return { runs: [] }
      }
    }
    return { runs: [] }
  }

  /**
   * 保存历史数据
   */
  private async saveHistory(result: TestSuiteResult): Promise<void> {
    const history = this.loadHistory()
    const newPoint: TrendDataPoint = {
      timestamp: Date.now(),
      totalTests: 5,
      passed: Object.values(result.results).filter((r) => r && r.score >= 60).length,
      failed: Object.values(result.results).filter((r) => r && r.score < 60).length,
      skipped: 5 - Object.values(result.results).filter((r) => r).length,
      coverage: result.score.overall,
      duration: result.duration,
    }
    history.runs.push(newPoint)

    // 只保留指定天数的数据
    const cutoffTime = Date.now() - this.config.trendDays * 24 * 60 * 60 * 1000
    history.runs = history.runs.filter((run) => run.timestamp > cutoffTime)

    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf-8')
  }

  /**
   * 获取评级颜色
   */
  private getGradeColor(grade: Grade): string {
    const colors: Record<Grade, string> = {
      A: '#27ae60',
      B: '#2ecc71',
      C: '#f39c12',
      D: '#e67e22',
      F: '#e74c3c',
    }
    return colors[grade]
  }

  /**
   * 获取分数颜色
   */
  private getScoreColor(score: number): string {
    if (score >= 90) return '#27ae60'
    if (score >= 80) return '#2ecc71'
    if (score >= 70) return '#f39c12'
    if (score >= 60) return '#e67e22'
    return '#e74c3c'
  }
}

/**
 * 创建报告生成器实例
 */
export function createReportGenerator(config?: ReportGeneratorConfig): ReportGenerator {
  return new ReportGenerator(config)
}

/**
 * 默认报告生成器实例
 */
export const reportGenerator = new ReportGenerator()
