/**
 * @ldesign/testing - Compatibility Tester
 * 兼容性测试器 - 浏览器兼容性、跨设备测试、Polyfill 检测
 */

import type { Page } from '@playwright/test'
import type { Severity, Viewport } from '../types/index.js'

/**
 * 浏览器信息
 */
export interface BrowserInfo {
  name: 'chromium' | 'firefox' | 'webkit' | 'edge' | 'safari'
  version?: string
  userAgent?: string
}

/**
 * 设备测试配置
 */
export interface CompatibilityDeviceConfig {
  name: string
  viewport: Viewport
  userAgent: string
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
}

/**
 * 兼容性问题
 */
export interface CompatibilityIssue {
  type: 'js-error' | 'css-issue' | 'api-unsupported' | 'layout-broken' | 'feature-missing'
  browser?: BrowserInfo
  device?: string
  description: string
  selector?: string
  screenshot?: string
  severity: Severity
  suggestion: string
}

/**
 * Polyfill 检测结果
 */
export interface PolyfillResult {
  feature: string
  nativeSupport: boolean
  polyfillDetected: boolean
  polyfillName?: string
  recommendation: string
}

/**
 * 兼容性测试器结果
 */
export interface CompatibilityTesterResult {
  browsersTestedCount: number
  devicesTestedCount: number
  issues: CompatibilityIssue[]
  polyfills: PolyfillResult[]
  featureSupport: Record<string, boolean>
  score: number
}

/**
 * 兼容性测试器配置
 */
export interface CompatibilityTesterConfig {
  enabled?: boolean
  browsers?: BrowserInfo['name'][]
  devices?: CompatibilityDeviceConfig[]
  features?: string[]
  checkPolyfills?: boolean
  screenshotOnError?: boolean
  timeout?: number
}

/**
 * 默认配置
 */
export const DEFAULT_COMPATIBILITY_CONFIG: Required<CompatibilityTesterConfig> = {
  enabled: true,
  browsers: ['chromium', 'firefox', 'webkit'],
  devices: [
    {
      name: 'iPhone 14',
      viewport: { name: 'iPhone 14', width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
    {
      name: 'iPad Pro',
      viewport: { name: 'iPad Pro', width: 1024, height: 1366 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    {
      name: 'Desktop',
      viewport: { name: 'Desktop', width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  ],
  features: [
    'Promise',
    'fetch',
    'IntersectionObserver',
    'ResizeObserver',
    'MutationObserver',
    'CustomEvent',
    'Symbol',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'Proxy',
    'Reflect',
    'Array.from',
    'Array.prototype.includes',
    'Object.assign',
    'Object.entries',
    'String.prototype.includes',
    'String.prototype.startsWith',
    'String.prototype.endsWith',
    'Number.isNaN',
    'Number.isFinite',
    'requestAnimationFrame',
    'requestIdleCallback',
    'CSS.supports',
    'matchMedia',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'WebSocket',
    'Worker',
    'ServiceWorker',
  ],
  checkPolyfills: true,
  screenshotOnError: true,
  timeout: 30000,
}

/**
 * 常见 CSS 特性检测
 */
const CSS_FEATURES = [
  { name: 'flexbox', css: 'display: flex' },
  { name: 'grid', css: 'display: grid' },
  { name: 'css-variables', css: '--test: 1' },
  { name: 'sticky', css: 'position: sticky' },
  { name: 'gap', css: 'gap: 1px' },
  { name: 'aspect-ratio', css: 'aspect-ratio: 1' },
  { name: 'backdrop-filter', css: 'backdrop-filter: blur(1px)' },
  { name: 'container-queries', css: 'container-type: inline-size' },
  { name: 'subgrid', css: 'grid-template-columns: subgrid' },
  { name: 'scroll-snap', css: 'scroll-snap-type: x mandatory' },
  { name: 'clip-path', css: 'clip-path: circle(50%)' },
  { name: 'mask', css: '-webkit-mask: none' },
]

/**
 * 兼容性测试器
 */
export class CompatibilityTester {
  private config: Required<CompatibilityTesterConfig>

  constructor(config: CompatibilityTesterConfig = {}) {
    this.config = { ...DEFAULT_COMPATIBILITY_CONFIG, ...config }
  }

  /**
   * 运行兼容性测试
   */
  async run(page: Page, url: string): Promise<CompatibilityTesterResult> {
    const result: CompatibilityTesterResult = {
      browsersTestedCount: 0,
      devicesTestedCount: 0,
      issues: [],
      polyfills: [],
      featureSupport: {},
      score: 100,
    }

    try {
      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout })

      // 检测 JavaScript 特性支持
      const featureSupport = await this.checkFeatureSupport(page)
      result.featureSupport = featureSupport

      // 检测 CSS 特性支持
      const cssSupport = await this.checkCSSSupport(page)
      Object.assign(result.featureSupport, cssSupport)

      // 检测 Polyfills
      if (this.config.checkPolyfills) {
        result.polyfills = await this.detectPolyfills(page, featureSupport)
      }

      // 跨设备测试
      for (const device of this.config.devices) {
        const deviceIssues = await this.testDevice(page, device)
        result.issues.push(...deviceIssues)
        result.devicesTestedCount++
      }

      // 检测 JS 错误
      const jsErrors = await this.collectJSErrors(page)
      result.issues.push(...jsErrors)

      // 计算分数
      result.score = this.calculateScore(result)

      result.browsersTestedCount = 1 // 当前浏览器

    } catch (error) {
      result.issues.push({
        type: 'js-error',
        description: `兼容性测试失败: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
        suggestion: '检查页面是否可以正常加载',
      })
      result.score = 0
    }

    return result
  }

  /**
   * 检测 JavaScript 特性支持
   */
  private async checkFeatureSupport(page: Page): Promise<Record<string, boolean>> {
    return page.evaluate((features) => {
      const support: Record<string, boolean> = {}

      for (const feature of features) {
        try {
          const parts = feature.split('.')
          let obj: unknown = window

          for (const part of parts) {
            if (obj && typeof obj === 'object' && part in (obj as Record<string, unknown>)) {
              obj = (obj as Record<string, unknown>)[part]
            } else if (typeof obj === 'function' && part === 'prototype') {
              obj = (obj as { prototype: unknown }).prototype
            } else {
              obj = undefined
              break
            }
          }

          support[feature] = obj !== undefined
        } catch {
          support[feature] = false
        }
      }

      return support
    }, this.config.features)
  }

  /**
   * 检测 CSS 特性支持
   */
  private async checkCSSSupport(page: Page): Promise<Record<string, boolean>> {
    return page.evaluate((cssFeatures) => {
      const support: Record<string, boolean> = {}

      for (const feature of cssFeatures) {
        try {
          if (typeof CSS !== 'undefined' && CSS.supports) {
            const [prop, value] = feature.css.split(':').map(s => s.trim())
            support[`css-${feature.name}`] = CSS.supports(prop, value)
          } else {
            // 回退检测方法
            const el = document.createElement('div')
            el.style.cssText = feature.css
            support[`css-${feature.name}`] = el.style.length > 0
          }
        } catch {
          support[`css-${feature.name}`] = false
        }
      }

      return support
    }, CSS_FEATURES)
  }

  /**
   * 检测 Polyfills
   */
  private async detectPolyfills(
    page: Page,
    featureSupport: Record<string, boolean>
  ): Promise<PolyfillResult[]> {
    const results: PolyfillResult[] = []

    const polyfillChecks = await page.evaluate(() => {
      const checks: Array<{ feature: string; isPolyfilled: boolean; polyfillName?: string }> = []

      // 检测常见的 Polyfill 库
      const w = window as unknown as Record<string, unknown>

      // core-js 检测
      if (w.__core_js_shared__ || w.core) {
        checks.push({ feature: 'core-js', isPolyfilled: true, polyfillName: 'core-js' })
      }

      // babel-polyfill 检测
      if (w._babelPolyfill) {
        checks.push({ feature: 'babel-polyfill', isPolyfilled: true, polyfillName: 'babel-polyfill' })
      }

      // Promise polyfill
      if ((Promise as unknown as Record<string, unknown>)._immediateFn) {
        checks.push({ feature: 'Promise', isPolyfilled: true, polyfillName: 'es6-promise' })
      }

      // fetch polyfill
      if ((w.fetch as unknown as Record<string, unknown>)?.polyfill) {
        checks.push({ feature: 'fetch', isPolyfilled: true, polyfillName: 'whatwg-fetch' })
      }

      // IntersectionObserver polyfill
      const io = w.IntersectionObserver as unknown as Record<string, unknown>
      if (io && io.toString().includes('polyfill')) {
        checks.push({ feature: 'IntersectionObserver', isPolyfilled: true, polyfillName: 'intersection-observer' })
      }

      return checks
    })

    // 合并检测结果
    for (const feature of this.config.features) {
      const nativeSupport = featureSupport[feature] ?? false
      const polyfillInfo = polyfillChecks.find(p => p.feature === feature)

      results.push({
        feature,
        nativeSupport,
        polyfillDetected: polyfillInfo?.isPolyfilled ?? false,
        polyfillName: polyfillInfo?.polyfillName,
        recommendation: this.getPolyfillRecommendation(feature, nativeSupport, polyfillInfo?.isPolyfilled ?? false),
      })
    }

    return results
  }

  /**
   * 获取 Polyfill 建议
   */
  private getPolyfillRecommendation(feature: string, nativeSupport: boolean, polyfillDetected: boolean): string {
    if (nativeSupport && !polyfillDetected) {
      return '原生支持，无需 Polyfill'
    }
    if (nativeSupport && polyfillDetected) {
      return '原生已支持，可考虑移除 Polyfill 以减少包大小'
    }
    if (!nativeSupport && polyfillDetected) {
      return '已添加 Polyfill，兼容性良好'
    }
    return `不支持且未添加 Polyfill，建议添加 ${feature} 的 Polyfill`
  }

  /**
   * 测试设备兼容性
   */
  private async testDevice(page: Page, device: CompatibilityDeviceConfig): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = []

    try {
      // 设置视口
      await page.setViewportSize({
        width: device.viewport.width,
        height: device.viewport.height,
      })

      // 等待页面重新渲染
      await page.waitForTimeout(500)

      // 检测布局问题
      const layoutIssues = await this.checkLayoutIssues(page, device)
      issues.push(...layoutIssues)

      // 检测触摸事件支持（如果是移动设备）
      if (device.hasTouch) {
        const touchIssues = await this.checkTouchSupport(page, device)
        issues.push(...touchIssues)
      }

      // 检测响应式问题
      const responsiveIssues = await this.checkResponsiveIssues(page, device)
      issues.push(...responsiveIssues)

    } catch (error) {
      issues.push({
        type: 'js-error',
        device: device.name,
        description: `设备 ${device.name} 测试失败: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'warning',
        suggestion: '检查页面在该设备上的渲染',
      })
    }

    return issues
  }

  /**
   * 检测布局问题
   */
  private async checkLayoutIssues(page: Page, device: CompatibilityDeviceConfig): Promise<CompatibilityIssue[]> {
    return page.evaluate((deviceInfo) => {
      const issues: CompatibilityIssue[] = []
      const vw = deviceInfo.viewport.width

      // 检测水平溢出
      const allElements = document.querySelectorAll('*')
      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.right > vw + 5) {
          issues.push({
            type: 'layout-broken' as const,
            device: deviceInfo.name,
            description: `元素 ${el.tagName}${el.id ? '#' + el.id : ''} 超出视口 ${Math.round(rect.right - vw)}px`,
            selector: el.tagName + (el.id ? '#' + el.id : el.className ? '.' + el.className.split(' ')[0] : ''),
            severity: 'warning' as const,
            suggestion: '检查元素的宽度设置，考虑使用 max-width 或 overflow 属性',
          })
        }
      })

      // 检测字体大小（移动设备最小16px）
      if (deviceInfo.isMobile) {
        const textElements = document.querySelectorAll('p, span, a, li, td, th, label')
        textElements.forEach((el) => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize)
          if (fontSize < 12) {
            issues.push({
              type: 'layout-broken' as const,
              device: deviceInfo.name,
              description: `元素字体过小 (${fontSize}px)，移动设备上可能难以阅读`,
              selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              severity: 'info' as const,
              suggestion: '移动设备上建议最小字体为 14px',
            })
          }
        })
      }

      // 限制返回数量
      return issues.slice(0, 10)
    }, device)
  }

  /**
   * 检测触摸支持
   */
  private async checkTouchSupport(page: Page, device: CompatibilityDeviceConfig): Promise<CompatibilityIssue[]> {
    return page.evaluate((deviceName) => {
      const issues: CompatibilityIssue[] = []

      // 检测点击目标大小
      const clickables = document.querySelectorAll('a, button, [onclick], [role="button"], input, select')
      clickables.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.width < 44 || rect.height < 44) {
          issues.push({
            type: 'css-issue' as const,
            device: deviceName,
            description: `触摸目标过小 (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
            selector: el.tagName + (el.id ? '#' + el.id : ''),
            severity: 'warning' as const,
            suggestion: 'WCAG 建议触摸目标至少 44x44px',
          })
        }
      })

      // 检测 hover 依赖
      const styleSheets = Array.from(document.styleSheets)
      let hoverRulesCount = 0
      styleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || [])
          rules.forEach((rule) => {
            if (rule instanceof CSSStyleRule && rule.selectorText?.includes(':hover')) {
              hoverRulesCount++
            }
          })
        } catch {
          // CORS 限制
        }
      })

      if (hoverRulesCount > 20) {
        issues.push({
          type: 'css-issue' as const,
          device: deviceName,
          description: `检测到 ${hoverRulesCount} 个 :hover 规则，触摸设备可能体验不佳`,
          severity: 'info' as const,
          suggestion: '考虑为触摸设备提供替代交互方式',
        })
      }

      return issues.slice(0, 5)
    }, device.name)
  }

  /**
   * 检测响应式问题
   */
  private async checkResponsiveIssues(page: Page, device: CompatibilityDeviceConfig): Promise<CompatibilityIssue[]> {
    return page.evaluate((deviceInfo) => {
      const issues: CompatibilityIssue[] = []

      // 检测固定宽度元素
      const elements = document.querySelectorAll('div, section, article, main, aside')
      elements.forEach((el) => {
        const computed = window.getComputedStyle(el)
        const width = computed.width

        if (width && width.endsWith('px')) {
          const pxValue = parseFloat(width)
          if (pxValue > deviceInfo.viewport.width) {
            issues.push({
              type: 'css-issue' as const,
              device: deviceInfo.name,
              description: `元素使用固定宽度 ${width}，超出视口`,
              selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              severity: 'warning' as const,
              suggestion: '使用相对单位 (%, vw) 或 max-width 代替固定宽度',
            })
          }
        }
      })

      // 检测图片响应式
      const images = document.querySelectorAll('img')
      images.forEach((img) => {
        const hasResponsive = img.srcset || img.sizes || img.style.maxWidth === '100%'
        if (!hasResponsive && img.naturalWidth > deviceInfo.viewport.width) {
          issues.push({
            type: 'css-issue' as const,
            device: deviceInfo.name,
            description: `图片 ${img.src.split('/').pop()} 可能在小屏幕上显示过大`,
            severity: 'info' as const,
            suggestion: '使用 srcset/sizes 或 max-width: 100% 实现响应式图片',
          })
        }
      })

      return issues.slice(0, 5)
    }, device)
  }

  /**
   * 收集 JS 错误
   */
  private async collectJSErrors(page: Page): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = []

    // 获取控制台错误
    const consoleErrors = await page.evaluate(() => {
      // 这里无法直接获取历史错误，但可以检测一些常见问题
      const errors: string[] = []

      // 检测未定义变量
      try {
        if (typeof (window as unknown as Record<string, unknown>).jQuery === 'undefined' &&
            document.querySelector('[data-jquery], [data-toggle]')) {
          errors.push('检测到 jQuery 依赖但 jQuery 未加载')
        }
      } catch { /* ignore */ }

      return errors
    })

    for (const error of consoleErrors) {
      issues.push({
        type: 'js-error',
        description: error,
        severity: 'error',
        suggestion: '检查依赖是否正确加载',
      })
    }

    return issues
  }

  /**
   * 计算兼容性分数
   */
  private calculateScore(result: CompatibilityTesterResult): number {
    let score = 100

    // 根据问题严重程度扣分
    for (const issue of result.issues) {
      if (issue.severity === 'error') score -= 10
      else if (issue.severity === 'warning') score -= 5
      else if (issue.severity === 'info') score -= 2
    }

    // 根据特性支持扣分
    const unsupportedFeatures = Object.values(result.featureSupport).filter(v => !v).length
    score -= unsupportedFeatures * 2

    // 根据缺失 Polyfill 扣分
    const missingPolyfills = result.polyfills.filter(p => !p.nativeSupport && !p.polyfillDetected)
    score -= missingPolyfills.length * 3

    return Math.max(0, Math.min(100, score))
  }
}
