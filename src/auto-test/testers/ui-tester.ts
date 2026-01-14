/**
 * @ldesign/testing - UI Tester
 * UI 测试器 - 执行 UI 测试、视觉回归、响应式布局和交互验证
 */

import type { Page } from '@playwright/test'
import type {
  UITestResult,
  UIConfig,
  VisualResult,
  ResponsiveResult,
  InteractionResult,
  StyleIssue,
  Screenshot,
  VisualDifference,
} from '../types/index.js'
import { AutoTestError, ErrorCode } from '../types/index.js'
import * as fs from 'fs-extra'
import * as path from 'path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

/**
 * UI 测试器类
 */
export class UITester {
  private config: UIConfig
  private baselineDir: string
  private outputDir: string

  constructor(config: UIConfig = {}, outputDir: string = './auto-test-reports') {
    this.config = {
      enabled: true,
      viewports: [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 },
      ],
      visualThreshold: 0.01,
      testDarkMode: true,
      ...config,
    }
    this.outputDir = outputDir
    this.baselineDir = config.baselineDir || path.join(outputDir, 'baseline')
  }

  /**
   * 运行完整的 UI 测试
   */
  async runTests(page: Page, baseUrl: string): Promise<UITestResult> {
    try {
      // 发现所有路由
      const routes = await this.discoverRoutes(page, baseUrl)

      // 初始化结果
      const screenshots: Screenshot[] = []
      const styleIssues: StyleIssue[] = []

      // 执行视觉回归测试
      const visualRegression = await this.visualRegression(page, routes, screenshots)

      // 测试响应式布局
      const responsive = await this.testResponsive(page, routes, screenshots, styleIssues)

      // 验证交互元素
      const interactions = await this.validateInteractions(page, routes)

      // 检测样式问题
      const additionalStyleIssues = await this.detectStyleIssues(page, routes)
      styleIssues.push(...additionalStyleIssues)

      // 计算评分
      const score = this.calculateScore(visualRegression, responsive, interactions, styleIssues)

      return {
        routesTested: routes.length,
        visualRegression,
        responsive,
        interactions,
        styleIssues,
        screenshots,
        score,
      }
    } catch (error) {
      throw new AutoTestError(
        `UI 测试失败: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.TEST_FAILED,
        error
      )
    }
  }

  /**
   * 发现所有路由
   * Requirements: 4.1
   */
  async discoverRoutes(page: Page, baseUrl: string): Promise<string[]> {
    const routes = new Set<string>()
    routes.add('/') // 始终包含根路由

    try {
      // 导航到首页
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })

      // 查找所有内部链接
      const links = await page.$$eval('a[href]', (anchors, base) => {
        return anchors
          .map((a) => {
            const href = a.getAttribute('href')
            if (!href) return null

            // 过滤外部链接、锚点和特殊协议
            if (
              href.startsWith('http://') ||
              href.startsWith('https://') ||
              href.startsWith('mailto:') ||
              href.startsWith('tel:') ||
              href.startsWith('#')
            ) {
              return null
            }

            // 处理相对路径
            try {
              const url = new URL(href, base)
              return url.pathname
            } catch {
              return href.startsWith('/') ? href : `/${href}`
            }
          })
          .filter((href): href is string => href !== null)
      }, baseUrl)

      // 添加发现的路由
      links.forEach((link) => routes.add(link))

      // 尝试从路由配置中发现路由（如果页面暴露了路由信息）
      const routerRoutes = await page.evaluate(() => {
        // 尝试从 Vue Router 获取路由
        if ((window as any).__VUE_ROUTER__) {
          return (window as any).__VUE_ROUTER__.getRoutes().map((r: any) => r.path)
        }
        // 尝试从 React Router 获取路由
        if ((window as any).__REACT_ROUTER__) {
          return (window as any).__REACT_ROUTER__.routes.map((r: any) => r.path)
        }
        return []
      }).catch(() => [])

      routerRoutes.forEach((route: string) => routes.add(route))

      return Array.from(routes).sort()
    } catch (error) {
      console.warn('路由发现失败，使用默认路由:', error)
      return ['/']
    }
  }

  /**
   * 执行视觉回归测试
   * Requirements: 4.2
   */
  async visualRegression(
    page: Page,
    routes: string[],
    screenshots: Screenshot[]
  ): Promise<VisualResult> {
    const differences: VisualDifference[] = []

    // 确保基准目录存在
    await fs.ensureDir(this.baselineDir)
    const currentDir = path.join(this.outputDir, 'current')
    await fs.ensureDir(currentDir)
    const diffDir = path.join(this.outputDir, 'diff')
    await fs.ensureDir(diffDir)

    for (const route of routes) {
      for (const viewport of this.config.viewports || []) {
        try {
          // 设置视口
          await page.setViewportSize({ width: viewport.width, height: viewport.height })

          // 导航到路由
          const url = page.url().replace(/\/[^/]*$/, route)
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

          // 等待页面稳定
          await page.waitForTimeout(1000)

          // 生成截图文件名
          const sanitizedRoute = route.replace(/\//g, '_') || 'index'
          const screenshotName = `${sanitizedRoute}_${viewport.name}.png`
          const baselinePath = path.join(this.baselineDir, screenshotName)
          const currentPath = path.join(currentDir, screenshotName)
          const diffPath = path.join(diffDir, screenshotName)

          // 截取当前页面
          await page.screenshot({ path: currentPath, fullPage: true })

          // 记录截图
          screenshots.push({
            path: currentPath,
            pagePath: route,
            viewport,
            timestamp: Date.now(),
          })

          // 如果基准截图存在，进行对比
          if (await fs.pathExists(baselinePath)) {
            const diffPercentage = await this.compareScreenshots(
              baselinePath,
              currentPath,
              diffPath
            )

            if (diffPercentage > (this.config.visualThreshold || 0.01)) {
              differences.push({
                path: route,
                diffPercentage,
                baselineScreenshot: baselinePath,
                currentScreenshot: currentPath,
                diffScreenshot: diffPath,
              })
            }
          } else {
            // 如果没有基准截图，将当前截图作为基准
            await fs.copy(currentPath, baselinePath)
          }
        } catch (error) {
          console.warn(`视觉回归测试失败 (${route}, ${viewport.name}):`, error)
        }
      }
    }

    return {
      pagesCompared: routes.length * (this.config.viewports?.length || 0),
      differencesFound: differences.length,
      differences,
    }
  }

  /**
   * 对比两张截图
   */
  private async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    diffPath: string
  ): Promise<number> {
    const baseline = PNG.sync.read(await fs.readFile(baselinePath))
    const current = PNG.sync.read(await fs.readFile(currentPath))

    const { width, height } = baseline
    const diff = new PNG({ width, height })

    const mismatchedPixels = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    )

    // 保存差异图
    await fs.writeFile(diffPath, PNG.sync.write(diff) as unknown as Uint8Array)

    // 返回差异百分比
    return mismatchedPixels / (width * height)
  }

  /**
   * 测试响应式布局
   * Requirements: 4.3
   */
  async testResponsive(
    page: Page,
    routes: string[],
    screenshots: Screenshot[],
    _styleIssues: StyleIssue[]
  ): Promise<ResponsiveResult> {
    const viewportResults: ResponsiveResult['viewportResults'] = []
    let totalIssues = 0

    for (const viewport of this.config.viewports || []) {
      const issues: StyleIssue[] = []

      try {
        // 设置视口
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        // 测试第一个路由（通常是首页）
        const route = routes[0] || '/'
        const url = page.url().replace(/\/[^/]*$/, route)
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

        // 检测响应式问题
        const responsiveIssues = await page.evaluate((vp) => {
          const issues: Array<{
            type: 'overflow' | 'overlap' | 'alignment'
            selector: string
            description: string
            severity: 'error' | 'warning' | 'info'
          }> = []

          // 检测水平溢出
          const elements = document.querySelectorAll('*')
          elements.forEach((el) => {
            const rect = el.getBoundingClientRect()
            if (rect.width > vp.width) {
              issues.push({
                type: 'overflow',
                selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
                description: `元素宽度 ${rect.width}px 超出视口宽度 ${vp.width}px`,
                severity: 'warning',
              })
            }
          })

          return issues
        }, viewport)

        issues.push(...responsiveIssues)
        totalIssues += issues.length

        // 截图
        const screenshotPath = path.join(
          this.outputDir,
          'responsive',
          `${viewport.name}.png`
        )
        await fs.ensureDir(path.dirname(screenshotPath))
        await page.screenshot({ path: screenshotPath, fullPage: true })

        viewportResults.push({
          viewport,
          issues,
          screenshot: screenshotPath,
        })

        screenshots.push({
          path: screenshotPath,
          pagePath: route,
          viewport,
          timestamp: Date.now(),
        })
      } catch (error) {
        console.warn(`响应式测试失败 (${viewport.name}):`, error)
      }
    }

    return {
      viewportsTested: this.config.viewports?.length || 0,
      issuesFound: totalIssues,
      viewportResults,
    }
  }

  /**
   * 验证交互元素
   * Requirements: 4.4, 4.6
   */
  async validateInteractions(page: Page, routes: string[]): Promise<InteractionResult> {
    let totalElements = 0
    const buttonIssues: string[] = []
    const formIssues: string[] = []
    const linkIssues: string[] = []

    // 测试第一个路由
    const route = routes[0] || '/'
    const url = page.url().replace(/\/[^/]*$/, route)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // 验证按钮
    const buttons = await page.$$('button, [role="button"], input[type="button"], input[type="submit"]')
    const clickableButtons = await Promise.all(
      buttons.map(async (btn) => {
        try {
          const isVisible = await btn.isVisible()
          const isEnabled = await btn.isEnabled()
          return isVisible && isEnabled
        } catch {
          return false
        }
      })
    )
    const clickableCount = clickableButtons.filter(Boolean).length
    if (clickableCount < buttons.length) {
      buttonIssues.push(`${buttons.length - clickableCount} 个按钮不可点击`)
    }

    // 验证表单
    const forms = await page.$$('form')
    const functionalForms = await Promise.all(
      forms.map(async (form) => {
        try {
          const hasAction = await form.evaluate((f) => {
            return !!(f as HTMLFormElement).action || !!(f as HTMLFormElement).onsubmit
          })
          return hasAction
        } catch {
          return false
        }
      })
    )
    const functionalCount = functionalForms.filter(Boolean).length
    if (functionalCount < forms.length) {
      formIssues.push(`${forms.length - functionalCount} 个表单缺少 action 或 submit 处理`)
    }

    // 验证链接
    const links = await page.$$('a[href]')
    const validLinks = await Promise.all(
      links.map(async (link) => {
        try {
          const href = await link.getAttribute('href')
          return href && href !== '#' && href !== 'javascript:void(0)'
        } catch {
          return false
        }
      })
    )
    const validCount = validLinks.filter(Boolean).length
    if (validCount < links.length) {
      linkIssues.push(`${links.length - validCount} 个链接无效或为空`)
    }

    // 测试暗黑模式切换（如果启用）
    if (this.config.testDarkMode) {
      try {
        // 尝试切换暗黑模式
        const darkModeToggled = await page.evaluate(() => {
          // 尝试常见的暗黑模式切换方法
          const html = document.documentElement
          void document.body // 保留引用以备将来使用

          // 方法1: 切换 class
          if (html.classList.contains('light')) {
            html.classList.remove('light')
            html.classList.add('dark')
            return true
          }
          if (html.classList.contains('dark')) {
            return true
          }

          // 方法2: 切换 data 属性
          if (html.getAttribute('data-theme') === 'light') {
            html.setAttribute('data-theme', 'dark')
            return true
          }

          // 方法3: 查找切换按钮
          const toggleBtn = document.querySelector('[data-theme-toggle], [aria-label*="dark"], [aria-label*="theme"]')
          if (toggleBtn) {
            (toggleBtn as HTMLElement).click()
            return true
          }

          return false
        })

        if (!darkModeToggled) {
          buttonIssues.push('未找到暗黑模式切换功能')
        }
      } catch (error) {
        console.warn('暗黑模式测试失败:', error)
      }
    }

    totalElements = buttons.length + forms.length + links.length

    return {
      elementsValidated: totalElements,
      issuesFound: buttonIssues.length + formIssues.length + linkIssues.length,
      buttons: {
        total: buttons.length,
        clickable: clickableCount,
        issues: buttonIssues,
      },
      forms: {
        total: forms.length,
        functional: functionalCount,
        issues: formIssues,
      },
      links: {
        total: links.length,
        valid: validCount,
        issues: linkIssues,
      },
    }
  }

  /**
   * 检测样式问题
   * Requirements: 4.5, 4.7
   */
  async detectStyleIssues(page: Page, routes: string[]): Promise<StyleIssue[]> {
    const issues: StyleIssue[] = []

    // 测试第一个路由
    const route = routes[0] || '/'
    const url = page.url().replace(/\/[^/]*$/, route)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // 检测样式问题
    const styleProblems = await page.evaluate(() => {
      const problems: Array<{
        type: 'overflow' | 'overlap' | 'alignment' | 'contrast' | 'z-index'
        selector: string
        description: string
        severity: 'error' | 'warning' | 'info'
      }> = []

      const elements = document.querySelectorAll('*')

      elements.forEach((el, index) => {
        const computed = window.getComputedStyle(el)
        void el.getBoundingClientRect() // 保留引用以备将来使用

        // 检测溢出
        if (computed.overflow === 'visible') {
          if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
            problems.push({
              type: 'overflow',
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : `:nth-child(${index})`),
              description: '内容溢出容器',
              severity: 'warning',
            })
          }
        }

        // 检测对比度（简化版）
        const bgColor = computed.backgroundColor
        const color = computed.color
        if (bgColor && color && bgColor !== 'rgba(0, 0, 0, 0)') {
          // 这里应该有更复杂的对比度计算，简化处理
          if (bgColor === color) {
            problems.push({
              type: 'contrast',
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : `:nth-child(${index})`),
              description: '文字和背景颜色相同，对比度不足',
              severity: 'error',
            })
          }
        }

        // 检测 z-index 异常
        const zIndex = parseInt(computed.zIndex, 10)
        if (!isNaN(zIndex) && zIndex > 9999) {
          problems.push({
            type: 'z-index',
            selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : `:nth-child(${index})`),
            description: `z-index 值过大: ${zIndex}`,
            severity: 'info',
          })
        }
      })

      return problems
    })

    issues.push(...styleProblems)

    // 为每个问题截图（限制数量）
    const maxScreenshots = 5
    for (let i = 0; i < Math.min(issues.length, maxScreenshots); i++) {
      const issue = issues[i]
      try {
        const element = await page.$(issue.selector)
        if (element) {
          const screenshotPath = path.join(
            this.outputDir,
            'style-issues',
            `issue-${i}.png`
          )
          await fs.ensureDir(path.dirname(screenshotPath))
          await element.screenshot({ path: screenshotPath })
          issue.screenshot = screenshotPath
        }
      } catch (error) {
        console.warn(`样式问题截图失败 (${issue.selector}):`, error)
      }
    }

    return issues
  }

  /**
   * 计算 UI 测试评分
   */
  private calculateScore(
    visualRegression: VisualResult,
    responsive: ResponsiveResult,
    interactions: InteractionResult,
    styleIssues: StyleIssue[]
  ): number {
    let score = 100

    // 视觉回归扣分（每个差异扣 5 分）
    score -= visualRegression.differencesFound * 5

    // 响应式问题扣分（每个问题扣 3 分）
    score -= responsive.issuesFound * 3

    // 交互问题扣分（每个问题扣 4 分）
    score -= interactions.issuesFound * 4

    // 样式问题扣分
    styleIssues.forEach((issue) => {
      if (issue.severity === 'error') score -= 5
      else if (issue.severity === 'warning') score -= 3
      else score -= 1
    })

    return Math.max(0, Math.min(100, score))
  }
}

