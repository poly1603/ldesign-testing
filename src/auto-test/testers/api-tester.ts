/**
 * @ldesign/testing - API Tester
 * API 测试器 - 使用 Playwright 拦截 HTTP 请求，验证 API 调用和错误处理
 */

import type { Page, Route, Request } from '@playwright/test'
import type {
  APITestResult,
  RequestDetail,
  DuplicateRequest,
  SlowRequest,
  ErrorHandlingResult,
  APIConfig,
  Suggestion,
} from '../types/index.js'

/**
 * 错误模拟类型
 */
type ErrorType = 'timeout' | 'network' | 'http-error'

/**
 * 错误模拟配置
 */
interface ErrorSimulation {
  /** URL 匹配模式 */
  pattern: string
  /** 错误类型 */
  errorType: ErrorType
  /** HTTP 状态码（用于 http-error 类型） */
  statusCode?: number
  /** 是否已触发 */
  triggered: boolean
}

/**
 * API 测试器类
 * 负责拦截和记录 HTTP 请求，检测重复请求，验证错误处理
 */
export class APITester {
  private page: Page | null = null
  private requests: RequestDetail[] = []
  private config: APIConfig
  private errorSimulations: ErrorSimulation[] = []
  private errorHandlingTests: Array<{
    scenario: string
    passed: boolean
    description: string
  }> = []

  constructor(config: APIConfig = {}) {
    this.config = {
      enabled: true,
      timeoutThreshold: 5000,
      testErrorHandling: true,
      ignorePatterns: [],
      ...config,
    }
  }

  /**
   * 开始拦截请求
   * @param page Playwright Page 对象
   */
  async startIntercepting(page: Page): Promise<void> {
    this.page = page
    this.requests = []
    this.errorHandlingTests = []

    // 设置请求拦截器
    await page.route('**/*', async (route: Route, request: Request) => {
      const url = request.url()

      // 检查是否应该忽略此请求
      if (this.shouldIgnoreRequest(url)) {
        await route.continue()
        return
      }

      // 检查是否需要模拟错误
      const errorSim = this.findErrorSimulation(url)
      if (errorSim && !errorSim.triggered) {
        errorSim.triggered = true
        await this.simulateErrorResponse(route, errorSim)
        return
      }

      // 记录请求开始时间
      const startTime = Date.now()

      // 继续请求并获取响应
      try {
        const response = await route.fetch()
        const responseTime = Date.now() - startTime

        // 获取响应体大小
        const responseBody = await response.body()
        const responseSize = responseBody.length

        // 记录请求详情
        const requestDetail: RequestDetail = {
          url,
          method: request.method(),
          headers: request.headers(),
          body: this.parseRequestBody(request),
          status: response.status(),
          responseTime,
          responseSize,
          timestamp: startTime,
        }

        this.requests.push(requestDetail)

        // 继续响应
        await route.fulfill({
          response,
        })
      } catch (error) {
        // 请求失败，记录错误
        const requestDetail: RequestDetail = {
          url,
          method: request.method(),
          headers: request.headers(),
          body: this.parseRequestBody(request),
          status: 0,
          responseTime: Date.now() - startTime,
          responseSize: 0,
          timestamp: startTime,
        }

        this.requests.push(requestDetail)

        // 继续请求（让浏览器处理错误）
        await route.continue()
      }
    })
  }

  /**
   * 停止拦截并获取结果
   */
  async stopIntercepting(): Promise<APITestResult> {
    if (!this.page) {
      throw new Error('API interception not started')
    }

    // 移除路由拦截器
    await this.page.unroute('**/*')

    // 分析请求数据
    const totalRequests = this.requests.length
    const failedRequests = this.requests.filter(
      (r) => r.status === 0 || r.status >= 400
    ).length

    // 检测重复请求
    const duplicateRequests = this.detectDuplicateRequests()

    // 检测慢请求
    const slowRequests = this.detectSlowRequests()

    // 构建错误处理结果
    const errorHandling: ErrorHandlingResult = {
      scenariosTested: this.errorHandlingTests.length,
      passed: this.errorHandlingTests.filter((t) => t.passed).length,
      failed: this.errorHandlingTests.filter((t) => !t.passed).length,
      details: this.errorHandlingTests,
    }

    // 计算评分
    const successfulRequests = totalRequests - failedRequests
    const score = this.calculateScore(
      totalRequests,
      successfulRequests,
      failedRequests,
      duplicateRequests,
      slowRequests,
      errorHandling
    )

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      duplicateRequests,
      slowRequests,
      errorHandling,
      requests: this.requests,
      score,
    }
  }

  /**
   * 模拟 API 错误
   * @param pattern URL 匹配模式（支持通配符）
   * @param error 错误类型
   */
  simulateError(pattern: string, error: ErrorType): void {
    this.errorSimulations.push({
      pattern,
      errorType: error,
      statusCode: error === 'http-error' ? 500 : undefined,
      triggered: false,
    })
  }

  /**
   * 模拟特定 HTTP 错误状态码
   * @param pattern URL 匹配模式
   * @param statusCode HTTP 状态码
   */
  simulateHttpError(pattern: string, statusCode: number): void {
    this.errorSimulations.push({
      pattern,
      errorType: 'http-error',
      statusCode,
      triggered: false,
    })
  }

  /**
   * 检测重复请求
   */
  private detectDuplicateRequests(): DuplicateRequest[] {
    const duplicates: DuplicateRequest[] = []
    const requestMap = new Map<string, RequestDetail[]>()

    // 按 URL + Method 分组
    for (const request of this.requests) {
      const key = `${request.method}:${request.url}`
      if (!requestMap.has(key)) {
        requestMap.set(key, [])
      }
      requestMap.get(key)!.push(request)
    }

    // 查找重复请求
    for (const [key, requests] of requestMap.entries()) {
      if (requests.length > 1) {
        // 计算平均时间间隔
        const timestamps = requests.map((r) => r.timestamp).sort((a, b) => a - b)
        let totalInterval = 0
        for (let i = 1; i < timestamps.length; i++) {
          totalInterval += timestamps[i] - timestamps[i - 1]
        }
        const avgInterval = totalInterval / (timestamps.length - 1)

        // Split only on the first colon to handle URLs with colons
        const colonIndex = key.indexOf(':')
        const method = key.substring(0, colonIndex)
        const url = key.substring(colonIndex + 1)

        duplicates.push({
          url,
          method,
          count: requests.length,
          interval: Math.round(avgInterval),
        })
      }
    }

    // 按重复次数排序
    duplicates.sort((a, b) => b.count - a.count)

    return duplicates
  }

  /**
   * 检测慢请求
   */
  private detectSlowRequests(): SlowRequest[] {
    const threshold = this.config.timeoutThreshold || 5000
    const slowRequests: SlowRequest[] = []

    for (const request of this.requests) {
      if (request.responseTime > threshold) {
        slowRequests.push({
          url: request.url,
          method: request.method,
          responseTime: request.responseTime,
          threshold,
        })
      }
    }

    // 按响应时间排序
    slowRequests.sort((a, b) => b.responseTime - a.responseTime)

    return slowRequests
  }

  /**
   * 检查是否应该忽略请求
   */
  private shouldIgnoreRequest(url: string): boolean {
    const ignorePatterns = this.config.ignorePatterns || []

    for (const pattern of ignorePatterns) {
      // 简单的通配符匹配
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      if (regex.test(url)) {
        return true
      }
    }

    return false
  }

  /**
   * 查找错误模拟配置
   */
  private findErrorSimulation(url: string): ErrorSimulation | undefined {
    return this.errorSimulations.find((sim) => {
      const regex = new RegExp(sim.pattern.replace(/\*/g, '.*'))
      return regex.test(url)
    })
  }

  /**
   * 模拟错误响应
   */
  private async simulateErrorResponse(
    route: Route,
    errorSim: ErrorSimulation
  ): Promise<void> {
    const request = route.request()

    // 记录错误模拟测试
    const testScenario = {
      scenario: `${errorSim.errorType} for ${request.url()}`,
      passed: false,
      description: '',
    }

    try {
      switch (errorSim.errorType) {
        case 'timeout':
          // 模拟超时：延迟很长时间后中止
          await new Promise((resolve) => setTimeout(resolve, 10000))
          await route.abort('timedout')
          testScenario.description = '模拟请求超时'
          break

        case 'network':
          // 模拟网络错误
          await route.abort('failed')
          testScenario.description = '模拟网络错误'
          break

        case 'http-error':
          // 模拟 HTTP 错误状态码
          await route.fulfill({
            status: errorSim.statusCode || 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Simulated error',
              message: `HTTP ${errorSim.statusCode || 500} error`,
            }),
          })
          testScenario.description = `模拟 HTTP ${errorSim.statusCode || 500} 错误`
          break
      }

      // 等待一段时间，观察应用是否崩溃
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 检查页面是否仍然可用
      if (this.page) {
        try {
          await this.page.evaluate(() => document.title)
          testScenario.passed = true
          testScenario.description += ' - 应用正确处理了错误'
        } catch {
          testScenario.passed = false
          testScenario.description += ' - 应用在错误后崩溃或无响应'
        }
      }
    } catch (error) {
      testScenario.passed = false
      testScenario.description += ` - 错误模拟失败: ${error}`
    }

    this.errorHandlingTests.push(testScenario)
  }

  /**
   * 解析请求体
   */
  private parseRequestBody(request: Request): unknown {
    try {
      const postData = request.postData()
      if (!postData) return undefined

      // 尝试解析为 JSON
      try {
        return JSON.parse(postData)
      } catch {
        // 如果不是 JSON，返回原始字符串
        return postData
      }
    } catch {
      return undefined
    }
  }

  /**
   * 计算 API 测试评分
   */
  private calculateScore(
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    duplicateRequests: DuplicateRequest[],
    slowRequests: SlowRequest[],
    errorHandling: ErrorHandlingResult
  ): number {
    let score = 100

    // 如果没有请求，返回满分
    if (totalRequests === 0) {
      return 100
    }

    // 根据失败率扣分（权重 30%）
    const failureRate = failedRequests / totalRequests
    score -= failureRate * 30

    // 根据重复请求扣分（权重 20%）
    const duplicateScore = Math.max(
      0,
      100 - duplicateRequests.length * 10
    )
    score -= (100 - duplicateScore) * 0.2

    // 根据慢请求扣分（权重 20%）
    const slowScore = Math.max(0, 100 - slowRequests.length * 5)
    score -= (100 - slowScore) * 0.2

    // 根据错误处理测试结果扣分（权重 30%）
    if (errorHandling.scenariosTested > 0) {
      const errorHandlingScore =
        (errorHandling.passed / errorHandling.scenariosTested) * 100
      score -= (100 - errorHandlingScore) * 0.3
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 生成优化建议
   */
  generateSuggestions(result: APITestResult): Suggestion[] {
    const suggestions: Suggestion[] = []

    // 重复请求建议
    if (result.duplicateRequests.length > 0) {
      const topDuplicate = result.duplicateRequests[0]
      suggestions.push({
        id: 'api-duplicate-requests',
        category: 'api',
        priority: 'high',
        title: `检测到 ${result.duplicateRequests.length} 组重复请求`,
        description: `最严重的重复请求: ${topDuplicate.method} ${topDuplicate.url}，重复 ${topDuplicate.count} 次，平均间隔 ${topDuplicate.interval}ms。`,
        location: topDuplicate.url,
        expectedImpact: '减少重复请求可以降低服务器负载和网络流量',
        codeExample: `// 使用请求去重或缓存
const cache = new Map()

async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url)
  }
  
  const response = await fetch(url)
  const data = await response.json()
  cache.set(url, data)
  
  return data
}`,
        references: [
          'https://developer.mozilla.org/en-US/docs/Web/API/Cache',
        ],
      })
    }

    // 慢请求建议
    if (result.slowRequests.length > 0) {
      const slowest = result.slowRequests[0]
      suggestions.push({
        id: 'api-slow-requests',
        category: 'api',
        priority: 'medium',
        title: `检测到 ${result.slowRequests.length} 个慢请求`,
        description: `最慢的请求: ${slowest.method} ${slowest.url}，响应时间 ${slowest.responseTime}ms，超过阈值 ${slowest.threshold}ms。`,
        location: slowest.url,
        expectedImpact: '优化慢请求可以提升应用响应速度',
        references: [
          'https://web.dev/optimize-ttfb/',
        ],
      })
    }

    // 错误处理建议
    if (result.errorHandling.failed > 0) {
      suggestions.push({
        id: 'api-error-handling',
        category: 'api',
        priority: 'high',
        title: `${result.errorHandling.failed} 个错误处理测试失败`,
        description: `应用在某些 API 错误场景下未能正确处理。详情: ${result.errorHandling.details
          .filter((d) => !d.passed)
          .map((d) => d.scenario)
          .join(', ')}`,
        expectedImpact: '改进错误处理可以提升应用稳定性和用户体验',
        codeExample: `// 使用 try-catch 和错误边界
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    // 显示用户友好的错误消息
    showErrorMessage('无法加载数据，请稍后重试')
    return null
  }
}`,
        references: [
          'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful',
        ],
      })
    }

    // 失败请求建议
    if (result.failedRequests > result.totalRequests * 0.1) {
      // 失败率超过 10%
      suggestions.push({
        id: 'api-high-failure-rate',
        category: 'api',
        priority: 'high',
        title: 'API 请求失败率过高',
        description: `${result.failedRequests} / ${result.totalRequests} 请求失败 (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`,
        expectedImpact: '降低失败率可以提升应用可靠性',
        references: [
          'https://web.dev/reliable/',
        ],
      })
    }

    return suggestions
  }

  /**
   * 运行完整的 API 测试
   */
  async runTest(page: Page, url: string): Promise<APITestResult> {
    // 开始拦截
    await this.startIntercepting(page)

    // 如果配置了错误处理测试，设置错误模拟
    if (this.config.testErrorHandling) {
      // 模拟一些常见的错误场景
      // 注意：这些模拟需要在实际请求发生前设置
      // 实际使用时，应该根据应用的 API 端点进行配置
    }

    // 导航到页面
    await page.goto(url, { waitUntil: 'networkidle' })

    // 等待一段时间让请求完成
    await page.waitForTimeout(3000)

    // 停止拦截并获取结果
    const result = await this.stopIntercepting()

    return result
  }
}
