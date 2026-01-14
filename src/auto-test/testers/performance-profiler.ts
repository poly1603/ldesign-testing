/**
 * @ldesign/testing - Performance Profiler
 * 性能分析器 - 测量 Core Web Vitals、资源加载、长任务等性能指标
 */

import type { Page } from '@playwright/test'
import lighthouse from 'lighthouse'
// web-vitals functions would be used in client-side context
// import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'
import type {
  PerformanceTestResult,
  WebVitalsResult,
  ResourceAnalysis,
  LongTask,
  NetworkConditionResult,
  NetworkCondition,
  PerformanceConfig,
  ResourceType,
  ResourceGroup,
  SlowResource,
  Suggestion,
} from '../types/index.js'

/**
 * 性能分析器类
 * 负责测量应用性能指标，包括 Lighthouse 审计、Core Web Vitals、资源分析等
 */
export class PerformanceProfiler {
  private config: PerformanceConfig
  private webVitalsCache: Partial<WebVitalsResult> = {}

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enabled: true,
      networkConditions: ['wifi', '4g', '3g'],
      thresholds: {
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        FCP: 1800,
        TTFB: 800,
      },
      ...config,
    }
  }

  /**
   * 运行 Lighthouse 审计
   */
  async runLighthouse(url: string): Promise<number> {
    try {
      // 使用 Lighthouse 进行性能审计
      const result = await lighthouse(url, {
        logLevel: 'error',
        output: 'json',
        onlyCategories: this.config.lighthouse?.categories || ['performance'],
        formFactor: this.config.lighthouse?.throttling === 'mobile' ? 'mobile' : 'desktop',
        throttling:
          this.config.lighthouse?.throttling === 'mobile'
            ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
            }
            : undefined,
      })

      // 提取性能分数
      const performanceScore =
        result?.lhr?.categories?.performance?.score ?? 0
      return Math.round(performanceScore * 100)
    } catch (error) {
      console.warn('Lighthouse audit failed:', error)
      return 0
    }
  }

  /**
   * 测量 Core Web Vitals
   */
  async measureWebVitals(page: Page): Promise<WebVitalsResult> {
    // 重置指标
    this.webVitalsCache = {}

    // 在页面上下文中注入 web-vitals 测量代码
    await page.evaluate(() => {
      // 动态导入 web-vitals（假设已在页面中可用）
      // 实际实现中，我们需要将 web-vitals 代码注入到页面中
      const metrics: Record<string, number> = {}

        // 存储指标到 window 对象供后续读取
        ; (window as any).__webVitalsMetrics = metrics

      // 模拟测量（实际应使用真实的 web-vitals 库）
      // 这里我们使用 Performance API 获取基本指标
      const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (perfEntries) {
        // FCP - First Contentful Paint
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
        if (fcpEntry) {
          metrics.FCP = fcpEntry.startTime
        }

        // TTFB - Time to First Byte
        metrics.TTFB = perfEntries.responseStart - perfEntries.requestStart

        // LCP - Largest Contentful Paint (需要 PerformanceObserver)
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            metrics.LCP = lastEntry.renderTime || lastEntry.loadTime
          })
          observer.observe({ type: 'largest-contentful-paint', buffered: true })
        } catch (e) {
          // LCP 不可用
        }

        // FID - First Input Delay (需要用户交互)
        metrics.FID = 0

        // CLS - Cumulative Layout Shift
        try {
          const observer = new PerformanceObserver((list) => {
            let cls = 0
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value
              }
            }
            metrics.CLS = cls
          })
          observer.observe({ type: 'layout-shift', buffered: true })
        } catch (e) {
          metrics.CLS = 0
        }

        // INP - Interaction to Next Paint
        metrics.INP = 0
      }
    })

    // 等待一段时间让指标收集完成
    await page.waitForTimeout(2000)

    // 读取收集的指标
    const metrics = await page.evaluate(() => {
      return (window as any).__webVitalsMetrics || {}
    })

    // 构建结果
    const result: WebVitalsResult = {
      LCP: metrics.LCP || 0,
      FID: metrics.FID || 0,
      CLS: metrics.CLS || 0,
      FCP: metrics.FCP || 0,
      TTFB: metrics.TTFB || 0,
      INP: metrics.INP || 0,
    }

    this.webVitalsCache = result
    return result
  }

  /**
   * 获取缓存的 Web Vitals 指标
   */
  getCachedWebVitals(): Partial<WebVitalsResult> {
    return this.webVitalsCache
  }

  /**
   * 分析资源加载
   */
  async analyzeResources(page: Page): Promise<ResourceAnalysis> {
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

      return entries.map((entry) => {
        // 确定资源类型
        let type: ResourceType = 'other'
        if (entry.initiatorType === 'script' || entry.name.endsWith('.js')) {
          type = 'script'
        } else if (entry.initiatorType === 'link' || entry.name.endsWith('.css')) {
          type = 'stylesheet'
        } else if (entry.initiatorType === 'img' || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(entry.name)) {
          type = 'image'
        } else if (/\.(woff|woff2|ttf|otf|eot)$/i.test(entry.name)) {
          type = 'font'
        }

        return {
          url: entry.name,
          type,
          size: entry.transferSize || entry.encodedBodySize || 0,
          loadTime: entry.duration,
          startTime: entry.startTime,
        }
      })
    })

    // 按类型分组
    const byType: Record<ResourceType, ResourceGroup> = {
      script: { count: 0, totalSize: 0, avgLoadTime: 0 },
      stylesheet: { count: 0, totalSize: 0, avgLoadTime: 0 },
      image: { count: 0, totalSize: 0, avgLoadTime: 0 },
      font: { count: 0, totalSize: 0, avgLoadTime: 0 },
      other: { count: 0, totalSize: 0, avgLoadTime: 0 },
    }

    let totalSize = 0
    const slowResources: SlowResource[] = []

    for (const resource of resources) {
      const group = byType[resource.type]
      group.count++
      group.totalSize += resource.size
      group.avgLoadTime += resource.loadTime

      totalSize += resource.size

      // 识别慢资源（加载时间超过 1 秒）
      if (resource.loadTime > 1000) {
        slowResources.push({
          url: resource.url,
          type: resource.type,
          size: resource.size,
          loadTime: resource.loadTime,
        })
      }
    }

    // 计算平均加载时间
    for (const type of Object.keys(byType) as ResourceType[]) {
      const group = byType[type]
      if (group.count > 0) {
        group.avgLoadTime = group.avgLoadTime / group.count
      }
    }

    // 按加载时间排序慢资源
    slowResources.sort((a, b) => b.loadTime - a.loadTime)

    return {
      totalResources: resources.length,
      totalSize,
      byType,
      slowResources: slowResources.slice(0, 10), // 只返回前 10 个最慢的资源
    }
  }

  /**
   * 检测长任务（Long Tasks）
   */
  async detectLongTasks(page: Page): Promise<LongTask[]> {
    // 在页面中设置 PerformanceObserver 监听长任务
    await page.evaluate(() => {
      ; (window as any).__longTasks = []

      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            ; (window as any).__longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration,
              name: entry.name,
            })
          }
        })
        observer.observe({ type: 'longtask', buffered: true })
      } catch (e) {
        // Long Task API 不可用
      }
    })

    // 等待一段时间让长任务被捕获
    await page.waitForTimeout(3000)

    // 读取长任务
    const longTasks = await page.evaluate(() => {
      return (window as any).__longTasks || []
    })

    return longTasks
  }

  /**
   * 在不同网络条件下测试性能
   */
  async testNetworkConditions(
    page: Page,
    url: string
  ): Promise<NetworkConditionResult[]> {
    const results: NetworkConditionResult[] = []
    const conditions = this.config.networkConditions || ['wifi']

    for (const condition of conditions) {
      // 设置网络条件
      await this.setNetworkCondition(page, condition)

      // 导航到页面
      const startTime = Date.now()
      await page.goto(url, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - startTime

      // 测量 Web Vitals
      const webVitals = await this.measureWebVitals(page)

      results.push({
        condition,
        webVitals,
        loadTime,
      })
    }

    return results
  }

  /**
   * 设置网络条件
   */
  private async setNetworkCondition(
    page: Page,
    condition: NetworkCondition
  ): Promise<void> {
    const cdpSession = await page.context().newCDPSession(page)

    const conditions = {
      '3g': {
        offline: false,
        downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
        uploadThroughput: (750 * 1024) / 8, // 750 Kbps
        latency: 150, // 150ms
      },
      '4g': {
        offline: false,
        downloadThroughput: (9 * 1024 * 1024) / 8, // 9 Mbps
        uploadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
        latency: 50, // 50ms
      },
      wifi: {
        offline: false,
        downloadThroughput: (30 * 1024 * 1024) / 8, // 30 Mbps
        uploadThroughput: (15 * 1024 * 1024) / 8, // 15 Mbps
        latency: 10, // 10ms
      },
    }

    await cdpSession.send('Network.emulateNetworkConditions', conditions[condition])
  }

  /**
   * 生成性能建议
   */
  generateSuggestions(result: PerformanceTestResult): Suggestion[] {
    const suggestions: Suggestion[] = []
    const thresholds = this.config.thresholds || {}

    // LCP 建议
    if (result.webVitals.LCP > (thresholds.LCP || 2500)) {
      suggestions.push({
        id: 'perf-lcp-slow',
        category: 'performance',
        priority: 'high',
        title: 'Largest Contentful Paint (LCP) 过慢',
        description: `当前 LCP 为 ${result.webVitals.LCP.toFixed(0)}ms，超过推荐值 ${thresholds.LCP}ms。LCP 测量页面主要内容的加载速度。`,
        expectedImpact: '优化 LCP 可以显著提升用户感知的页面加载速度',
        references: [
          'https://web.dev/lcp/',
          'https://web.dev/optimize-lcp/',
        ],
      })
    }

    // FID 建议
    if (result.webVitals.FID > (thresholds.FID || 100)) {
      suggestions.push({
        id: 'perf-fid-slow',
        category: 'performance',
        priority: 'high',
        title: 'First Input Delay (FID) 过长',
        description: `当前 FID 为 ${result.webVitals.FID.toFixed(0)}ms，超过推荐值 ${thresholds.FID}ms。FID 测量用户首次交互的响应延迟。`,
        expectedImpact: '优化 FID 可以提升页面交互响应速度',
        references: [
          'https://web.dev/fid/',
          'https://web.dev/optimize-fid/',
        ],
      })
    }

    // CLS 建议
    if (result.webVitals.CLS > (thresholds.CLS || 0.1)) {
      suggestions.push({
        id: 'perf-cls-high',
        category: 'performance',
        priority: 'medium',
        title: 'Cumulative Layout Shift (CLS) 过高',
        description: `当前 CLS 为 ${result.webVitals.CLS.toFixed(3)}，超过推荐值 ${thresholds.CLS}。CLS 测量页面布局稳定性。`,
        expectedImpact: '优化 CLS 可以减少页面布局抖动，提升用户体验',
        references: [
          'https://web.dev/cls/',
          'https://web.dev/optimize-cls/',
        ],
      })
    }

    // 长任务建议
    if (result.longTasks.length > 0) {
      const totalLongTaskTime = result.longTasks.reduce(
        (sum, task) => sum + task.duration,
        0
      )
      suggestions.push({
        id: 'perf-long-tasks',
        category: 'performance',
        priority: 'high',
        title: `检测到 ${result.longTasks.length} 个长任务`,
        description: `长任务总时长 ${totalLongTaskTime.toFixed(0)}ms。长任务会阻塞主线程，影响页面响应性。`,
        expectedImpact: '拆分长任务可以提升页面响应速度和交互流畅度',
        codeExample: `// 使用 setTimeout 拆分长任务
function processLargeArray(array) {
  const chunkSize = 100
  let index = 0
  
  function processChunk() {
    const end = Math.min(index + chunkSize, array.length)
    for (let i = index; i < end; i++) {
      // 处理数组项
    }
    index = end
    if (index < array.length) {
      setTimeout(processChunk, 0)
    }
  }
  
  processChunk()
}`,
        references: [
          'https://web.dev/optimize-long-tasks/',
        ],
      })
    }

    // 慢资源建议
    if (result.resources.slowResources.length > 0) {
      const slowestResource = result.resources.slowResources[0]
      suggestions.push({
        id: 'perf-slow-resources',
        category: 'performance',
        priority: 'medium',
        title: `检测到 ${result.resources.slowResources.length} 个慢资源`,
        description: `最慢的资源加载时间为 ${slowestResource.loadTime.toFixed(0)}ms (${slowestResource.url})。`,
        location: slowestResource.url,
        expectedImpact: '优化资源加载可以减少页面加载时间',
        references: [
          'https://web.dev/optimize-resource-loading/',
        ],
      })
    }

    // 大资源建议
    const largeResources = result.resources.slowResources.filter(
      (r) => r.size > 500 * 1024 // 500KB
    )
    if (largeResources.length > 0) {
      suggestions.push({
        id: 'perf-large-resources',
        category: 'performance',
        priority: 'medium',
        title: `检测到 ${largeResources.length} 个大资源`,
        description: `这些资源大小超过 500KB，建议进行压缩或代码分割。`,
        expectedImpact: '减小资源大小可以加快下载速度',
        references: [
          'https://web.dev/reduce-javascript-payloads-with-code-splitting/',
        ],
      })
    }

    return suggestions
  }

  /**
   * 计算性能评分
   */
  calculateScore(result: PerformanceTestResult): number {
    let score = 100
    const thresholds = this.config.thresholds || {}

    // LCP 评分（权重 30%）
    const lcpScore = this.calculateMetricScore(
      result.webVitals.LCP,
      thresholds.LCP || 2500,
      4000
    )
    score -= (100 - lcpScore) * 0.3

    // FID 评分（权重 20%）
    const fidScore = this.calculateMetricScore(
      result.webVitals.FID,
      thresholds.FID || 100,
      300
    )
    score -= (100 - fidScore) * 0.2

    // CLS 评分（权重 20%）
    const clsScore = this.calculateMetricScore(
      result.webVitals.CLS,
      thresholds.CLS || 0.1,
      0.25
    )
    score -= (100 - clsScore) * 0.2

    // 长任务评分（权重 15%）
    const longTaskScore = result.longTasks.length === 0 ? 100 : Math.max(0, 100 - result.longTasks.length * 10)
    score -= (100 - longTaskScore) * 0.15

    // 资源评分（权重 15%）
    const resourceScore = result.resources.slowResources.length === 0 ? 100 : Math.max(0, 100 - result.resources.slowResources.length * 5)
    score -= (100 - resourceScore) * 0.15

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 计算单个指标的评分
   */
  private calculateMetricScore(
    value: number,
    goodThreshold: number,
    poorThreshold: number
  ): number {
    if (value <= goodThreshold) {
      return 100
    } else if (value >= poorThreshold) {
      return 0
    } else {
      // 线性插值
      const range = poorThreshold - goodThreshold
      const position = value - goodThreshold
      return Math.round(100 - (position / range) * 100)
    }
  }

  /**
   * 运行完整的性能测试
   */
  async runTest(page: Page, url: string): Promise<PerformanceTestResult> {
    // 运行 Lighthouse
    const lighthouseScore = await this.runLighthouse(url)

    // 导航到页面
    await page.goto(url, { waitUntil: 'networkidle' })

    // 测量 Web Vitals
    const webVitals = await this.measureWebVitals(page)

    // 分析资源
    const resources = await this.analyzeResources(page)

    // 检测长任务
    const longTasks = await this.detectLongTasks(page)

    // 测试网络条件
    const networkConditions = await this.testNetworkConditions(page, url)

    // 构建结果
    const result: PerformanceTestResult = {
      lighthouseScore,
      webVitals,
      resources,
      longTasks,
      networkConditions,
      score: 0, // 稍后计算
    }

    // 计算评分
    result.score = this.calculateScore(result)

    return result
  }
}
