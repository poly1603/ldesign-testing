/**
 * @ldesign/testing - Memory Analyzer
 * 内存分析器 - 使用 Chrome DevTools Protocol 检测内存泄漏和内存使用情况
 */

import type { Page, CDPSession } from 'playwright'
import type {
  MemoryTestResult,
  MemoryDataPoint,
  MemoryLeak,
  MemoryConfig,
} from '../types'

/**
 * 堆快照数据
 */
interface HeapSnapshot {
  /** 快照时间戳 */
  timestamp: number
  /** 总堆大小 */
  totalHeapSize: number
  /** 已使用堆大小 */
  usedHeapSize: number
  /** 堆限制 */
  heapSizeLimit: number
  /** 节点统计 */
  nodes?: {
    detachedDOMNodes: number
    eventListeners: number
    timers: number
  }
}

/**
 * 内存阈值警告
 */
interface MemoryThresholdWarning {
  /** 警告类型 */
  type: 'warning' | 'error'
  /** 警告消息 */
  message: string
  /** 当前值 */
  currentValue: number
  /** 阈值 */
  threshold: number
  /** 时间戳 */
  timestamp: number
}

/**
 * 内存分析器类
 * 负责监控内存使用、检测内存泄漏、生成内存报告
 */
export class MemoryAnalyzer {
  private page: Page | null = null
  private cdpSession: CDPSession | null = null
  private timeline: MemoryDataPoint[] = []
  private snapshots: HeapSnapshot[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private config: MemoryConfig
  private thresholdWarnings: MemoryThresholdWarning[] = []

  constructor(config: MemoryConfig = {}) {
    this.config = {
      enabled: true,
      threshold: 100, // 默认 100MB
      leakSensitivity: 'medium',
      ...config,
    }
  }

  /**
   * 开始内存监控
   * @param page Playwright Page 对象
   */
  async startMonitoring(page: Page): Promise<void> {
    this.page = page
    this.timeline = []
    this.snapshots = []

    // 创建 CDP 会话
    this.cdpSession = await page.context().newCDPSession(page)

    // 启用堆分析器
    await this.cdpSession.send('HeapProfiler.enable')

    // 记录初始堆快照
    await this.takeHeapSnapshot()

    // 开始定期采样内存数据
    this.monitoringInterval = setInterval(async () => {
      await this.sampleMemory()
    }, 1000) // 每秒采样一次
  }

  /**
   * 停止监控并获取结果
   */
  async stopMonitoring(): Promise<MemoryTestResult> {
    if (!this.page || !this.cdpSession) {
      throw new Error('Memory monitoring not started')
    }

    // 停止定期采样
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // 记录最终堆快照
    await this.takeHeapSnapshot()

    // 检测内存泄漏
    const leaks = await this.detectLeaks()

    // 如果有阈值警告，将其转换为泄漏报告
    if (this.thresholdWarnings.length > 0) {
      const errorWarnings = this.thresholdWarnings.filter((w) => w.type === 'error')
      if (errorWarnings.length > 0) {
        const lastError = errorWarnings[errorWarnings.length - 1]
        leaks.push({
          type: 'unknown',
          size: lastError.currentValue - lastError.threshold,
          description: `内存使用持续超过配置阈值 (${this.config.threshold} MB)，共触发 ${errorWarnings.length} 次错误警告`,
          suggestion:
            '检查应用是否存在内存泄漏。考虑增加内存阈值或优化内存使用。使用浏览器开发工具的内存分析器进行详细分析。',
        })
      }
    }

    // 计算统计数据
    const initialHeapSize = this.timeline[0]?.usedJSHeapSize || 0
    const finalHeapSize =
      this.timeline[this.timeline.length - 1]?.usedJSHeapSize || 0
    const peakHeapSize = Math.max(
      ...this.timeline.map((dp) => dp.usedJSHeapSize)
    )
    const growthRate =
      initialHeapSize > 0 ? (finalHeapSize - initialHeapSize) / initialHeapSize : 0

    // 计算评分
    const score = this.calculateScore(
      finalHeapSize,
      peakHeapSize,
      growthRate,
      leaks
    )

    // 禁用堆分析器
    await this.cdpSession.send('HeapProfiler.disable')

    return {
      initialHeapSize,
      finalHeapSize,
      peakHeapSize,
      growthRate,
      leaks,
      timeline: this.timeline,
      score,
    }
  }

  /**
   * 获取阈值警告列表
   */
  getThresholdWarnings(): MemoryThresholdWarning[] {
    return [...this.thresholdWarnings]
  }

  /**
   * 获取堆快照
   */
  async takeHeapSnapshot(): Promise<HeapSnapshot> {
    if (!this.cdpSession) {
      throw new Error('CDP session not initialized')
    }

    // 触发垃圾回收（如果可用）
    try {
      await this.cdpSession.send('HeapProfiler.collectGarbage')
    } catch {
      // 忽略错误，某些环境可能不支持
    }

    // 获取堆使用情况
    const heapUsage = await this.cdpSession.send('Runtime.getHeapUsage')

    const snapshot: HeapSnapshot = {
      timestamp: Date.now(),
      totalHeapSize: heapUsage.usedSize + heapUsage.totalSize,
      usedHeapSize: heapUsage.usedSize,
      heapSizeLimit: heapUsage.totalSize,
    }

    this.snapshots.push(snapshot)
    return snapshot
  }

  /**
   * 采样内存数据
   */
  private async sampleMemory(): Promise<void> {
    if (!this.page) return

    try {
      // 使用 page.evaluate 获取 performance.memory
      const memoryInfo = await this.page.evaluate(() => {
        const perf = performance as Performance & {
          memory?: {
            usedJSHeapSize: number
            totalJSHeapSize: number
            jsHeapSizeLimit: number
          }
        }
        return perf.memory
          ? {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
          }
          : null
      })

      if (memoryInfo) {
        const dataPoint: MemoryDataPoint = {
          timestamp: Date.now(),
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
        }

        this.timeline.push(dataPoint)

        // 检查是否超过阈值
        this.checkThreshold(dataPoint)
      }
    } catch (error) {
      // 忽略采样错误，继续监控
      console.warn('Failed to sample memory:', error)
    }
  }

  /**
   * 检查内存阈值
   */
  private checkThreshold(dataPoint: MemoryDataPoint): void {
    const thresholdBytes = (this.config.threshold || 100) * 1024 * 1024
    const usedMB = dataPoint.usedJSHeapSize / (1024 * 1024)

    // 警告阈值：80% 的配置阈值
    const warningThreshold = thresholdBytes * 0.8
    // 错误阈值：100% 的配置阈值
    const errorThreshold = thresholdBytes

    if (dataPoint.usedJSHeapSize > errorThreshold) {
      // 避免重复警告（每 5 秒最多一次）
      const lastError = this.thresholdWarnings
        .filter((w) => w.type === 'error')
        .pop()

      if (!lastError || Date.now() - lastError.timestamp > 5000) {
        this.thresholdWarnings.push({
          type: 'error',
          message: `内存使用超过阈值: ${usedMB.toFixed(2)} MB > ${this.config.threshold} MB`,
          currentValue: dataPoint.usedJSHeapSize,
          threshold: errorThreshold,
          timestamp: Date.now(),
        })

        console.error(
          `[MemoryAnalyzer] ERROR: Memory usage exceeded threshold: ${usedMB.toFixed(2)} MB`
        )
      }
    } else if (dataPoint.usedJSHeapSize > warningThreshold) {
      // 避免重复警告（每 10 秒最多一次）
      const lastWarning = this.thresholdWarnings
        .filter((w) => w.type === 'warning')
        .pop()

      if (!lastWarning || Date.now() - lastWarning.timestamp > 10000) {
        this.thresholdWarnings.push({
          type: 'warning',
          message: `内存使用接近阈值: ${usedMB.toFixed(2)} MB (阈值: ${this.config.threshold} MB)`,
          currentValue: dataPoint.usedJSHeapSize,
          threshold: warningThreshold,
          timestamp: Date.now(),
        })

        console.warn(
          `[MemoryAnalyzer] WARNING: Memory usage approaching threshold: ${usedMB.toFixed(2)} MB`
        )
      }
    }
  }

  /**
   * 检测内存泄漏
   */
  async detectLeaks(): Promise<MemoryLeak[]> {
    const leaks: MemoryLeak[] = []

    if (this.snapshots.length < 2) {
      return leaks
    }

    const initialSnapshot = this.snapshots[0]
    const finalSnapshot = this.snapshots[this.snapshots.length - 1]

    // 检测内存增长
    const memoryGrowth = finalSnapshot.usedHeapSize - initialSnapshot.usedHeapSize

    // 根据灵敏度设置阈值
    const sensitivityThresholds = {
      low: 50 * 1024 * 1024, // 50MB
      medium: 20 * 1024 * 1024, // 20MB
      high: 10 * 1024 * 1024, // 10MB
    }

    const threshold =
      sensitivityThresholds[this.config.leakSensitivity || 'medium']

    if (memoryGrowth > threshold) {
      leaks.push({
        type: 'unknown',
        size: memoryGrowth,
        description: `检测到显著的内存增长: ${this.formatBytes(memoryGrowth)}`,
        suggestion:
          '检查是否有未清理的事件监听器、定时器或闭包引用。使用浏览器开发工具的内存分析器进行详细分析。',
      })
    }

    // 检测 detached DOM 节点
    const detachedDOMLeaks = await this.detectDetachedDOM()
    leaks.push(...detachedDOMLeaks)

    // 检测事件监听器泄漏
    const eventListenerLeaks = await this.detectEventListenerLeaks()
    leaks.push(...eventListenerLeaks)

    // 检测定时器泄漏
    const timerLeaks = await this.detectTimerLeaks()
    leaks.push(...timerLeaks)

    return leaks
  }

  /**
   * 检测 detached DOM 节点
   */
  private async detectDetachedDOM(): Promise<MemoryLeak[]> {
    if (!this.page || !this.cdpSession) return []

    try {
      // 使用 CDP 获取堆快照并分析 detached DOM 节点
      // 这里使用简化的方法：通过页面脚本检测
      const detachedInfo = await this.page.evaluate(() => {
        // 创建一个临时容器来检测 detached 节点
        const detachedNodes: Array<{ tag: string; id?: string; className?: string }> = []

        // 遍历所有可能的 detached 节点
        // 注意：这是一个简化的实现，真实场景需要更复杂的堆分析
        const allElements = document.querySelectorAll('*')
        let detachedCount = 0

        allElements.forEach((el) => {
          // 检查元素是否真正连接到 document
          if (!document.contains(el)) {
            detachedCount++
            if (detachedNodes.length < 10) { // 只记录前 10 个
              detachedNodes.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || undefined,
                className: el.className || undefined,
              })
            }
          }
        })

        return { count: detachedCount, nodes: detachedNodes }
      })

      if (detachedInfo.count > 0) {
        const leaks: MemoryLeak[] = []

        // 根据灵敏度决定是否报告
        const threshold = this.getDetachedDOMThreshold()

        if (detachedInfo.count > threshold) {
          const nodeDescriptions = detachedInfo.nodes
            .map((n) => {
              const parts = [n.tag]
              if (n.id) parts.push(`#${n.id}`)
              if (n.className) parts.push(`.${n.className}`)
              return parts.join('')
            })
            .join(', ')

          leaks.push({
            type: 'detached-dom',
            size: detachedInfo.count * 1024, // 估算每个节点 1KB
            location: nodeDescriptions ? `示例节点: ${nodeDescriptions}` : undefined,
            description: `检测到 ${detachedInfo.count} 个 detached DOM 节点，这些节点已从 DOM 树中移除但仍被 JavaScript 引用`,
            suggestion:
              '确保在移除 DOM 元素前清理所有事件监听器和引用。使用 WeakMap 或 WeakSet 存储 DOM 引用。考虑使用框架提供的生命周期钩子进行清理。',
          })
        }

        return leaks
      }
    } catch (error) {
      console.warn('Failed to detect detached DOM:', error)
    }

    return []
  }

  /**
   * 获取 detached DOM 阈值
   */
  private getDetachedDOMThreshold(): number {
    const thresholds = {
      low: 100,
      medium: 50,
      high: 20,
    }
    return thresholds[this.config.leakSensitivity || 'medium']
  }

  /**
   * 检测事件监听器泄漏
   */
  private async detectEventListenerLeaks(): Promise<MemoryLeak[]> {
    if (!this.page) return []

    try {
      // 注入监控脚本来跟踪事件监听器
      const listenerInfo = await this.page.evaluate(() => {
        // 统计页面上的事件监听器数量
        let totalListeners = 0
        const listenersByType: Record<string, number> = {}

        // 获取所有元素
        const allElements = document.querySelectorAll('*')

        // 常见的事件类型
        const eventTypes = [
          'click', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
          'keydown', 'keyup', 'keypress',
          'focus', 'blur', 'change', 'input',
          'scroll', 'resize', 'load', 'unload',
          'touchstart', 'touchmove', 'touchend',
        ]

        // 尝试检测事件监听器（这是一个近似方法）
        allElements.forEach((el) => {
          eventTypes.forEach((eventType) => {
            // 检查元素是否有该事件的监听器
            // 注意：这只能检测到通过 addEventListener 添加的监听器
            const hasListener = (el as any)[`on${eventType}`] !== null
            if (hasListener) {
              totalListeners++
              listenersByType[eventType] = (listenersByType[eventType] || 0) + 1
            }
          })
        })

        // 获取最多的事件类型
        const topListeners = Object.entries(listenersByType)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => `${type}(${count})`)

        return {
          total: totalListeners,
          byType: listenersByType,
          topListeners,
        }
      })

      const threshold = this.getEventListenerThreshold()

      if (listenerInfo.total > threshold) {
        return [
          {
            type: 'event-listener',
            size: listenerInfo.total * 100, // 估算每个监听器 100 bytes
            location: listenerInfo.topListeners.length > 0
              ? `主要事件类型: ${listenerInfo.topListeners.join(', ')}`
              : undefined,
            description: `检测到大量事件监听器 (${listenerInfo.total})，可能存在未清理的监听器`,
            suggestion:
              '确保在组件卸载时移除事件监听器。使用 removeEventListener 或框架提供的清理机制（如 Vue 的 onUnmounted、React 的 useEffect cleanup）。考虑使用事件委托减少监听器数量。',
          },
        ]
      }
    } catch (error) {
      console.warn('Failed to detect event listener leaks:', error)
    }

    return []
  }

  /**
   * 获取事件监听器阈值
   */
  private getEventListenerThreshold(): number {
    const thresholds = {
      low: 2000,
      medium: 1000,
      high: 500,
    }
    return thresholds[this.config.leakSensitivity || 'medium']
  }

  /**
   * 检测定时器泄漏
   */
  private async detectTimerLeaks(): Promise<MemoryLeak[]> {
    if (!this.page) return []

    try {
      // 注入监控脚本来跟踪定时器
      const timerInfo = await this.page.evaluate(() => {
        // 跟踪活跃的定时器
        // 注意：这需要在页面加载时注入监控代码，这里使用简化方法

        // 尝试通过全局对象检测定时器
        // 这是一个近似方法，实际需要在页面加载前注入监控
        let activeTimers = 0
        let activeIntervals = 0

        // 检查 window 对象上可能存在的定时器引用
        // 这只是一个示例，实际检测需要更复杂的机制
        const windowKeys = Object.keys(window)
        windowKeys.forEach((key) => {
          const value = (window as any)[key]
          if (typeof value === 'number' && value > 0 && value < 100000) {
            // 可能是定时器 ID（这是一个非常粗略的估计）
            activeTimers++
          }
        })

        return {
          timers: activeTimers,
          intervals: activeIntervals,
          total: activeTimers + activeIntervals,
        }
      })

      const threshold = this.getTimerThreshold()

      if (timerInfo.total > threshold) {
        return [
          {
            type: 'timer',
            size: timerInfo.total * 50, // 估算每个定时器 50 bytes
            location: `setTimeout: ${timerInfo.timers}, setInterval: ${timerInfo.intervals}`,
            description: `检测到大量未清理的定时器 (${timerInfo.total})，包括 ${timerInfo.timers} 个 timeout 和 ${timerInfo.intervals} 个 interval`,
            suggestion:
              '确保在组件卸载时清理所有定时器。使用 clearTimeout 和 clearInterval。在 Vue 中使用 onUnmounted，在 React 中使用 useEffect 的 cleanup 函数。考虑使用 requestAnimationFrame 替代高频定时器。',
          },
        ]
      }
    } catch (error) {
      console.warn('Failed to detect timer leaks:', error)
    }

    return []
  }

  /**
   * 获取定时器阈值
   */
  private getTimerThreshold(): number {
    const thresholds = {
      low: 200,
      medium: 100,
      high: 50,
    }
    return thresholds[this.config.leakSensitivity || 'medium']
  }

  /**
   * 计算内存评分
   */
  private calculateScore(
    finalHeapSize: number,
    peakHeapSize: number,
    growthRate: number,
    leaks: MemoryLeak[]
  ): number {
    let score = 100

    // 根据最终堆大小扣分
    const thresholdBytes = (this.config.threshold || 100) * 1024 * 1024
    if (finalHeapSize > thresholdBytes) {
      const excess = finalHeapSize - thresholdBytes
      score -= Math.min(30, (excess / thresholdBytes) * 30)
    }

    // 根据峰值堆大小扣分
    if (peakHeapSize > thresholdBytes * 1.5) {
      score -= 10
    }

    // 根据增长率扣分
    if (growthRate > 0.5) {
      // 增长超过 50%
      score -= Math.min(20, growthRate * 20)
    }

    // 根据泄漏数量扣分
    score -= Math.min(40, leaks.length * 10)

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
