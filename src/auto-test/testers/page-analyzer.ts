/**
 * @ldesign/testing - Page Analyzer
 * 页面分析器 - 分析页面内容、SEO、无障碍性、控制台错误等
 */

import type { Page } from '@playwright/test'
import type {
  PageTestResult,
  PageConfig,
  SEOResult,
  AccessibilityResult,
  ConsoleError,
  BrokenLink,
  I18nResult,
  SEOIssue,
  AccessibilityViolation,
} from '../types/index.js'
import { AutoTestError, ErrorCode } from '../types/index.js'
import { AxeBuilder } from '@axe-core/playwright'

/**
 * 页面分析器类
 */
export class PageAnalyzer {
  private config: PageConfig
  private consoleErrors: ConsoleError[] = []

  constructor(config: PageConfig = {}) {
    this.config = {
      enabled: true,
      checkSEO: true,
      checkAccessibility: true,
      wcagLevel: 'AA',
      i18nLocales: [],
      ...config,
    }
  }

  /**
   * 运行完整的页面分析
   */
  async runTests(page: Page, url: string): Promise<PageTestResult> {
    try {
      // 开始捕获控制台错误
      this.startCapturingConsoleErrors(page)

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

      // 等待动态内容加载
      await this.waitForDynamicContent(page)

      // 分析 SEO
      const seo = this.config.checkSEO
        ? await this.analyzeSEO(page)
        : this.getEmptySEOResult()

      // 检测无障碍问题
      const accessibility = this.config.checkAccessibility
        ? await this.checkAccessibility(page)
        : this.getEmptyAccessibilityResult()

      // 检测死链接
      const brokenLinks = await this.findBrokenLinks(page)

      // 验证国际化
      const i18n =
        this.config.i18nLocales && this.config.i18nLocales.length > 0
          ? await this.validateI18n(page, this.config.i18nLocales)
          : undefined

      // 计算评分
      const score = this.calculateScore(
        seo,
        accessibility,
        this.consoleErrors,
        brokenLinks,
        i18n
      )

      return {
        seo,
        accessibility,
        consoleErrors: [...this.consoleErrors],
        brokenLinks,
        i18n,
        score,
      }
    } catch (error) {
      throw new AutoTestError(
        `页面分析失败: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.TEST_FAILED,
        error
      )
    }
  }

  /**
   * 分析 SEO
   * Requirements: 6.2
   */
  async analyzeSEO(page: Page): Promise<SEOResult> {
    const issues: SEOIssue[] = []

    // 获取 title
    const title = await page.title().catch(() => undefined)
    const hasTitle = !!title && title.length > 0

    if (!hasTitle) {
      issues.push({
        type: 'missing-title',
        description: '页面缺少 title 标签',
        severity: 'error',
        suggestion: '添加描述性的 <title> 标签',
      })
    } else if (title && title.length < 10) {
      issues.push({
        type: 'short-title',
        description: `title 太短 (${title.length} 字符)`,
        severity: 'warning',
        suggestion: 'title 应该在 10-60 字符之间',
      })
    } else if (title && title.length > 60) {
      issues.push({
        type: 'long-title',
        description: `title 太长 (${title.length} 字符)`,
        severity: 'warning',
        suggestion: 'title 应该在 10-60 字符之间',
      })
    }

    // 获取 meta description
    const metaDescription = await page
      .$eval('meta[name="description"]', (el) => el.getAttribute('content'))
      .catch(() => undefined)
    const hasMetaDescription = !!metaDescription && metaDescription.length > 0

    if (!hasMetaDescription) {
      issues.push({
        type: 'missing-meta-description',
        description: '页面缺少 meta description',
        severity: 'error',
        suggestion: '添加 <meta name="description" content="..."> 标签',
      })
    } else if (metaDescription && metaDescription.length < 50) {
      issues.push({
        type: 'short-meta-description',
        description: `meta description 太短 (${metaDescription.length} 字符)`,
        severity: 'warning',
        suggestion: 'meta description 应该在 50-160 字符之间',
      })
    } else if (metaDescription && metaDescription.length > 160) {
      issues.push({
        type: 'long-meta-description',
        description: `meta description 太长 (${metaDescription.length} 字符)`,
        severity: 'warning',
        suggestion: 'meta description 应该在 50-160 字符之间',
      })
    }

    // 检查 heading 结构
    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      const levels = headings.map((h) => parseInt(h.tagName.substring(1), 10))

      // 检查是否有 h1
      const hasH1 = levels.includes(1)
      const h1Count = levels.filter((l) => l === 1).length

      // 检查层级是否跳跃
      let hasSkippedLevel = false
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
          hasSkippedLevel = true
          break
        }
      }

      return {
        hasH1,
        h1Count,
        hasSkippedLevel,
        levels,
      }
    })

    let hasProperHeadingStructure = true

    if (!headingStructure.hasH1) {
      issues.push({
        type: 'missing-h1',
        description: '页面缺少 h1 标签',
        severity: 'error',
        suggestion: '每个页面应该有一个 h1 标签',
      })
      hasProperHeadingStructure = false
    } else if (headingStructure.h1Count > 1) {
      issues.push({
        type: 'multiple-h1',
        description: `页面有 ${headingStructure.h1Count} 个 h1 标签`,
        severity: 'warning',
        suggestion: '每个页面应该只有一个 h1 标签',
      })
      hasProperHeadingStructure = false
    }

    if (headingStructure.hasSkippedLevel) {
      issues.push({
        type: 'skipped-heading-level',
        description: 'heading 层级跳跃（例如从 h1 直接到 h3）',
        severity: 'warning',
        suggestion: 'heading 应该按顺序使用，不要跳级',
      })
      hasProperHeadingStructure = false
    }

    // 检查图片 alt 属性
    const imageStats = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      const totalImages = images.length
      const imagesWithAlt = images.filter((img) => {
        const alt = img.getAttribute('alt')
        return alt !== null && alt.trim().length > 0
      }).length

      return {
        totalImages,
        imagesWithAlt,
      }
    })

    if (imageStats.totalImages > 0 && imageStats.imagesWithAlt < imageStats.totalImages) {
      issues.push({
        type: 'missing-image-alt',
        description: `${imageStats.totalImages - imageStats.imagesWithAlt} 张图片缺少 alt 属性`,
        severity: 'error',
        suggestion: '所有图片都应该有描述性的 alt 属性',
      })
    }

    return {
      hasTitle,
      title,
      hasMetaDescription,
      metaDescription: metaDescription ?? undefined,
      hasProperHeadingStructure,
      imagesWithAlt: imageStats.imagesWithAlt,
      totalImages: imageStats.totalImages,
      issues,
    }
  }

  /**
   * 检测无障碍问题
   * Requirements: 6.3
   */
  async checkAccessibility(page: Page): Promise<AccessibilityResult> {
    try {
      // 使用 axe-core 进行无障碍检测
      const axe = new AxeBuilder({ page } as any)

      // 根据配置的 WCAG 等级设置规则
      const wcagLevel = this.config.wcagLevel || 'AA'
      const wcagTags = [`wcag2${wcagLevel.toLowerCase()}`]

      // 运行 axe 分析
      const results = await axe.withTags(wcagTags).analyze()

      // 转换违规信息
      const violationDetails: AccessibilityViolation[] = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact as 'critical' | 'serious' | 'moderate' | 'minor',
        description: violation.description,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          selector: node.target.join(', '),
          html: node.html,
        })),
      }))

      // 确定 WCAG 等级
      let achievedLevel: 'A' | 'AA' | 'AAA' | 'none' = 'none'
      if (results.violations.length === 0) {
        achievedLevel = wcagLevel as 'A' | 'AA' | 'AAA'
      } else {
        // 如果有违规，检查是否至少达到 A 级
        const criticalViolations = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        )
        if (criticalViolations.length === 0) {
          achievedLevel = 'A'
        }
      }

      return {
        violations: results.violations.length,
        passes: results.passes.length,
        violationDetails,
        wcagLevel: achievedLevel,
      }
    } catch (error) {
      console.warn('无障碍检测失败:', error)
      return this.getEmptyAccessibilityResult()
    }
  }

  /**
   * 捕获控制台错误
   * Requirements: 6.5
   */
  private startCapturingConsoleErrors(page: Page): void {
    // 清空之前的错误
    this.consoleErrors = []

    // 监听控制台消息
    page.on('console', (msg) => {
      const type = msg.type()
      if (type === 'error' || type === 'warning') {
        this.consoleErrors.push({
          type: type as 'error' | 'warning',
          message: msg.text(),
          timestamp: Date.now(),
        })
      }
    })

    // 监听页面错误
    page.on('pageerror', (error) => {
      this.consoleErrors.push({
        type: 'error',
        message: error.message,
        source: error.stack,
        timestamp: Date.now(),
      })
    })
  }

  /**
   * 等待动态内容加载完成
   * Requirements: 6.1, 6.4
   */
  private async waitForDynamicContent(page: Page): Promise<void> {
    try {
      // 等待网络空闲
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      // 等待常见的加载指示器消失
      await page
        .waitForSelector('.loading, .spinner, [data-loading="true"]', {
          state: 'hidden',
          timeout: 5000,
        })
        .catch(() => {
          // 如果没有找到加载指示器，忽略错误
        })

      // 等待一小段时间让动画完成
      await page.waitForTimeout(500)

      // 检测空状态
      const hasEmptyState = await page.evaluate(() => {
        const emptyStateSelectors = [
          '.empty-state',
          '.no-data',
          '[data-empty="true"]',
          '.placeholder',
        ]

        for (const selector of emptyStateSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent && element.textContent.trim().length > 0) {
            return true
          }
        }

        return false
      })

      if (hasEmptyState) {
        console.log('检测到空状态')
      }
    } catch (error) {
      console.warn('等待动态内容失败:', error)
    }
  }

  /**
   * 检测死链接
   * Requirements: 6.7
   */
  async findBrokenLinks(page: Page): Promise<BrokenLink[]> {
    const brokenLinks: BrokenLink[] = []
    const currentUrl = page.url()

    try {
      // 获取页面上的所有链接
      const links = await page.$$eval('a[href]', (anchors) =>
        anchors.map((a) => ({
          url: a.getAttribute('href') || '',
          text: a.textContent?.trim() || '',
        }))
      )

      // 验证每个链接
      for (const link of links) {
        try {
          // 跳过锚点链接和特殊协议
          if (
            link.url.startsWith('#') ||
            link.url.startsWith('mailto:') ||
            link.url.startsWith('tel:') ||
            link.url.startsWith('javascript:')
          ) {
            continue
          }

          // 构建完整 URL
          let fullUrl: string
          try {
            fullUrl = new URL(link.url, currentUrl).href
          } catch {
            // 如果 URL 无效，标记为死链接
            brokenLinks.push({
              url: link.url,
              text: link.text,
              statusCode: 0,
              foundOn: currentUrl,
            })
            continue
          }

          // 发送 HEAD 请求检查链接
          const response = await page.request.head(fullUrl, {
            timeout: 5000,
            failOnStatusCode: false,
          })

          const statusCode = response.status()

          // 如果状态码是 4xx 或 5xx，标记为死链接
          if (statusCode >= 400) {
            brokenLinks.push({
              url: fullUrl,
              text: link.text,
              statusCode,
              foundOn: currentUrl,
            })
          }
        } catch (error) {
          // 请求失败，标记为死链接
          brokenLinks.push({
            url: link.url,
            text: link.text,
            statusCode: 0,
            foundOn: currentUrl,
          })
        }
      }
    } catch (error) {
      console.warn('死链接检测失败:', error)
    }

    return brokenLinks
  }

  /**
   * 验证国际化
   * Requirements: 6.6
   */
  async validateI18n(page: Page, locales: string[]): Promise<I18nResult> {
    const localeResults: I18nResult['localeResults'] = []
    let totalIssues = 0

    for (const locale of locales) {
      const issues: string[] = []
      const missingKeys: string[] = []

      try {
        // 尝试切换语言
        const switched = await page.evaluate((loc) => {
          // 尝试常见的语言切换方法

          // 方法1: 查找语言切换按钮
          const langButton = document.querySelector(
            `[data-lang="${loc}"], [data-locale="${loc}"], [lang="${loc}"]`
          )
          if (langButton) {
            (langButton as HTMLElement).click()
            return true
          }

          // 方法2: 设置 HTML lang 属性
          const html = document.documentElement
          html.setAttribute('lang', loc)

          // 方法3: 触发自定义事件
          window.dispatchEvent(new CustomEvent('locale-change', { detail: { locale: loc } }))

          return false
        }, locale)

        // 等待语言切换完成
        await page.waitForTimeout(1000)

        // 检查是否有未翻译的文本（简化版）
        const untranslatedText = await page.evaluate(() => {
          const textNodes: string[] = []
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
          )

          let node
          while ((node = walker.nextNode())) {
            const text = node.textContent?.trim()
            // 检查是否包含占位符或键名（简化检测）
            if (
              text &&
              (text.includes('{{') ||
                text.includes('${') ||
                text.match(/^[A-Z_]+$/) ||
                text.includes('i18n.'))
            ) {
              textNodes.push(text)
            }
          }

          return textNodes
        })

        if (untranslatedText.length > 0) {
          issues.push(`发现 ${untranslatedText.length} 处可能未翻译的文本`)
          missingKeys.push(...untranslatedText.slice(0, 5)) // 只记录前5个
        }

        if (!switched) {
          issues.push('未找到语言切换功能')
        }

        totalIssues += issues.length
      } catch (error) {
        issues.push(`语言切换失败: ${error}`)
        totalIssues++
      }

      localeResults.push({
        locale,
        missingKeys,
        issues,
      })
    }

    return {
      localesTested: locales.length,
      issuesFound: totalIssues,
      localeResults,
    }
  }

  /**
   * 计算页面测试评分
   */
  private calculateScore(
    seo: SEOResult,
    accessibility: AccessibilityResult,
    consoleErrors: ConsoleError[],
    brokenLinks: BrokenLink[],
    i18n?: I18nResult
  ): number {
    let score = 100

    // SEO 评分（权重 30%）
    const seoScore = this.calculateSEOScore(seo)
    score -= (100 - seoScore) * 0.3

    // 无障碍评分（权重 30%）
    const a11yScore = this.calculateAccessibilityScore(accessibility)
    score -= (100 - a11yScore) * 0.3

    // 控制台错误扣分（权重 20%）
    const errorCount = consoleErrors.filter((e) => e.type === 'error').length
    const warningCount = consoleErrors.filter((e) => e.type === 'warning').length
    const consoleScore = Math.max(0, 100 - errorCount * 10 - warningCount * 5)
    score -= (100 - consoleScore) * 0.2

    // 死链接扣分（权重 10%）
    const brokenLinkScore = Math.max(0, 100 - brokenLinks.length * 10)
    score -= (100 - brokenLinkScore) * 0.1

    // 国际化扣分（权重 10%）
    if (i18n) {
      const i18nScore = Math.max(0, 100 - i18n.issuesFound * 10)
      score -= (100 - i18nScore) * 0.1
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 计算 SEO 评分
   */
  private calculateSEOScore(seo: SEOResult): number {
    let score = 100

    // 根据问题严重程度扣分
    seo.issues.forEach((issue) => {
      if (issue.severity === 'error') score -= 15
      else if (issue.severity === 'warning') score -= 10
      else score -= 5
    })

    // 图片 alt 属性扣分
    if (seo.totalImages > 0) {
      const altRatio = seo.imagesWithAlt / seo.totalImages
      if (altRatio < 1) {
        score -= (1 - altRatio) * 20
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 计算无障碍评分
   */
  private calculateAccessibilityScore(accessibility: AccessibilityResult): number {
    let score = 100

    // 根据违规数量和严重程度扣分
    accessibility.violationDetails.forEach((violation) => {
      switch (violation.impact) {
        case 'critical':
          score -= 20
          break
        case 'serious':
          score -= 15
          break
        case 'moderate':
          score -= 10
          break
        case 'minor':
          score -= 5
          break
      }
    })

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 获取空的 SEO 结果
   */
  private getEmptySEOResult(): SEOResult {
    return {
      hasTitle: false,
      hasMetaDescription: false,
      hasProperHeadingStructure: false,
      imagesWithAlt: 0,
      totalImages: 0,
      issues: [],
    }
  }

  /**
   * 获取空的无障碍结果
   */
  private getEmptyAccessibilityResult(): AccessibilityResult {
    return {
      violations: 0,
      passes: 0,
      violationDetails: [],
      wcagLevel: 'none',
    }
  }
}
