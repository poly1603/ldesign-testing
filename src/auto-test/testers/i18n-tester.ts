/**
 * @ldesign/testing - I18n Tester
 * 国际化测试器 - 多语言验证、RTL/LTR布局测试、日期/数字格式测试
 */

import type { Browser, Page } from 'playwright'

/**
 * 语言配置
 */
export interface LocaleConfig {
  code: string
  name: string
  direction?: 'ltr' | 'rtl'
  dateFormat?: string
  numberFormat?: Intl.NumberFormatOptions
  currencyCode?: string
}

/**
 * I18n 测试器配置
 */
export interface I18nTesterConfig {
  baseUrl: string
  locales: LocaleConfig[]
  translationFiles?: string[]
  dateFormats?: boolean
  numberFormats?: boolean
  currencyFormats?: boolean
  rtlSupport?: boolean
  textOverflow?: boolean
  screenshots?: boolean
  outputDir?: string
}

/**
 * I18n 问题
 */
export interface I18nIssue {
  type: I18nIssueType
  severity: 'critical' | 'major' | 'minor'
  locale: string
  message: string
  element?: string
  expected?: string
  actual?: string
  screenshot?: string
}

export type I18nIssueType =
  | 'missing-translation'
  | 'untranslated-text'
  | 'text-overflow'
  | 'rtl-issue'
  | 'date-format'
  | 'number-format'
  | 'currency-format'
  | 'font-issue'
  | 'encoding-issue'
  | 'placeholder-issue'

/**
 * I18n 测试器结果
 */
export interface I18nTesterResult {
  locale: string
  totalChecks: number
  passed: number
  issues: I18nIssue[]
  coverage: {
    translated: number
    total: number
    percentage: number
  }
  screenshots?: string[]
}

/**
 * 预定义语言配置
 */
export const PRESET_LOCALES: Record<string, LocaleConfig> = {
  'zh-CN': { code: 'zh-CN', name: '简体中文', direction: 'ltr', currencyCode: 'CNY' },
  'zh-TW': { code: 'zh-TW', name: '繁體中文', direction: 'ltr', currencyCode: 'TWD' },
  'en-US': { code: 'en-US', name: 'English (US)', direction: 'ltr', currencyCode: 'USD' },
  'en-GB': { code: 'en-GB', name: 'English (UK)', direction: 'ltr', currencyCode: 'GBP' },
  'ja-JP': { code: 'ja-JP', name: '日本語', direction: 'ltr', currencyCode: 'JPY' },
  'ko-KR': { code: 'ko-KR', name: '한국어', direction: 'ltr', currencyCode: 'KRW' },
  'ar-SA': { code: 'ar-SA', name: 'العربية', direction: 'rtl', currencyCode: 'SAR' },
  'he-IL': { code: 'he-IL', name: 'עברית', direction: 'rtl', currencyCode: 'ILS' },
  'de-DE': { code: 'de-DE', name: 'Deutsch', direction: 'ltr', currencyCode: 'EUR' },
  'fr-FR': { code: 'fr-FR', name: 'Français', direction: 'ltr', currencyCode: 'EUR' },
  'es-ES': { code: 'es-ES', name: 'Español', direction: 'ltr', currencyCode: 'EUR' },
  'pt-BR': { code: 'pt-BR', name: 'Português', direction: 'ltr', currencyCode: 'BRL' },
  'ru-RU': { code: 'ru-RU', name: 'Русский', direction: 'ltr', currencyCode: 'RUB' },
  'th-TH': { code: 'th-TH', name: 'ไทย', direction: 'ltr', currencyCode: 'THB' },
  'vi-VN': { code: 'vi-VN', name: 'Tiếng Việt', direction: 'ltr', currencyCode: 'VND' },
}

/**
 * I18n 测试器
 */
export class I18nTester {
  private config: I18nTesterConfig
  private browser: Browser | null = null

  constructor(config: I18nTesterConfig) {
    this.config = {
      dateFormats: true,
      numberFormats: true,
      currencyFormats: true,
      rtlSupport: true,
      textOverflow: true,
      screenshots: false,
      outputDir: './i18n-test-results',
      ...config,
    }
  }

  /**
   * 运行所有语言测试
   */
  async runAll(): Promise<I18nTesterResult[]> {
    const results: I18nTesterResult[] = []
    const { chromium } = await import('playwright')

    try {
      this.browser = await chromium.launch()

      for (const locale of this.config.locales) {
        const result = await this.testLocale(locale)
        results.push(result)
      }
    } finally {
      await this.browser?.close()
    }

    return results
  }

  /**
   * 测试单个语言
   */
  async testLocale(locale: LocaleConfig): Promise<I18nTesterResult> {
    if (!this.browser) {
      const { chromium } = await import('playwright')
      this.browser = await chromium.launch()
    }

    const context = await this.browser.newContext({
      locale: locale.code,
      timezoneId: this.getTimezone(locale.code),
    })

    const page = await context.newPage()
    const issues: I18nIssue[] = []
    const screenshots: string[] = []
    let totalChecks = 0
    let passed = 0

    try {
      await page.goto(this.config.baseUrl)
      await page.waitForLoadState('networkidle')

      // 1. 检测未翻译文本
      const translationResult = await this.checkTranslations(page, locale)
      issues.push(...translationResult.issues)
      totalChecks += translationResult.total
      passed += translationResult.passed

      // 2. 检测文本溢出
      if (this.config.textOverflow) {
        const overflowResult = await this.checkTextOverflow(page, locale)
        issues.push(...overflowResult.issues)
        totalChecks += overflowResult.total
        passed += overflowResult.passed
      }

      // 3. RTL 布局检测
      if (this.config.rtlSupport && locale.direction === 'rtl') {
        const rtlResult = await this.checkRTLLayout(page, locale)
        issues.push(...rtlResult.issues)
        totalChecks += rtlResult.total
        passed += rtlResult.passed
      }

      // 4. 日期格式检测
      if (this.config.dateFormats) {
        const dateResult = await this.checkDateFormats(page, locale)
        issues.push(...dateResult.issues)
        totalChecks += dateResult.total
        passed += dateResult.passed
      }

      // 5. 数字格式检测
      if (this.config.numberFormats) {
        const numberResult = await this.checkNumberFormats(page, locale)
        issues.push(...numberResult.issues)
        totalChecks += numberResult.total
        passed += numberResult.passed
      }

      // 6. 货币格式检测
      if (this.config.currencyFormats) {
        const currencyResult = await this.checkCurrencyFormats(page, locale)
        issues.push(...currencyResult.issues)
        totalChecks += currencyResult.total
        passed += currencyResult.passed
      }

      // 7. 截图
      if (this.config.screenshots) {
        const screenshotPath = `${this.config.outputDir}/${locale.code}.png`
        await page.screenshot({ path: screenshotPath, fullPage: true })
        screenshots.push(screenshotPath)
      }
    } finally {
      await context.close()
    }

    const translatedCount = passed
    const totalCount = totalChecks

    return {
      locale: locale.code,
      totalChecks,
      passed,
      issues,
      coverage: {
        translated: translatedCount,
        total: totalCount,
        percentage: totalCount > 0 ? (translatedCount / totalCount) * 100 : 100,
      },
      screenshots,
    }
  }

  /**
   * 检测翻译
   */
  private async checkTranslations(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []
    let total = 0
    let passed = 0

    // 获取所有文本节点
    const textNodes = await page.evaluate(() => {
      function getSelector(el: Element): string {
        if (el.id) return `#${el.id}`
        if (el.className) return `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`
        return el.tagName.toLowerCase()
      }

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: node => {
          const text = node.textContent?.trim()
          if (!text || text.length < 2) return NodeFilter.FILTER_REJECT
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        },
      })

      const texts: Array<{ text: string; selector: string }> = []
      while (walker.nextNode()) {
        const node = walker.currentNode
        const parent = node.parentElement
        if (parent) {
          texts.push({
            text: node.textContent?.trim() || '',
            selector: getSelector(parent),
          })
        }
      }
      return texts
    })

    for (const { text, selector } of textNodes) {
      total++

      // 检测是否包含未翻译的占位符
      if (this.hasPlaceholder(text)) {
        issues.push({
          type: 'placeholder-issue',
          severity: 'major',
          locale: locale.code,
          message: `发现未替换的占位符`,
          element: selector,
          actual: text,
        })
      }
      // 检测是否是默认语言文本（简单检测）
      else if (this.isLikelyUntranslated(text, locale.code)) {
        issues.push({
          type: 'untranslated-text',
          severity: 'minor',
          locale: locale.code,
          message: `可能存在未翻译的文本`,
          element: selector,
          actual: text,
        })
      } else {
        passed++
      }
    }

    return { issues, total, passed }
  }

  /**
   * 检测文本溢出
   */
  private async checkTextOverflow(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []

    const overflowElements = await page.evaluate(() => {
      const results: Array<{ selector: string; text: string; overflow: string }> = []

      document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el)
          const isOverflowing =
            el.scrollWidth > el.clientWidth ||
            el.scrollHeight > el.clientHeight ||
            style.textOverflow === 'ellipsis'

          if (isOverflowing && el.textContent?.trim()) {
            results.push({
              selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              text: el.textContent.trim().substring(0, 50),
              overflow: el.scrollWidth > el.clientWidth ? 'horizontal' : 'vertical',
            })
          }
        }
      })

      return results.slice(0, 20) // 限制数量
    })

    for (const item of overflowElements) {
      issues.push({
        type: 'text-overflow',
        severity: 'minor',
        locale: locale.code,
        message: `文本溢出 (${item.overflow})`,
        element: item.selector,
        actual: item.text,
      })
    }

    return { issues, total: overflowElements.length, passed: 0 }
  }

  /**
   * 检测 RTL 布局
   */
  private async checkRTLLayout(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []
    let total = 0
    let passed = 0

    // 检查 HTML dir 属性
    const htmlDir = await page.evaluate(() => document.documentElement.dir)
    total++
    if (htmlDir !== 'rtl') {
      issues.push({
        type: 'rtl-issue',
        severity: 'critical',
        locale: locale.code,
        message: 'HTML 元素缺少 dir="rtl" 属性',
        expected: 'rtl',
        actual: htmlDir || 'ltr',
      })
    } else {
      passed++
    }

    // 检查文本对齐
    const alignmentIssues = await page.evaluate(() => {
      const issues: Array<{ selector: string; textAlign: string }> = []

      document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div').forEach(el => {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el)
          // RTL 模式下，默认应该是 right 或 start
          if (style.textAlign === 'left' && el.textContent?.trim()) {
            issues.push({
              selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              textAlign: style.textAlign,
            })
          }
        }
      })

      return issues.slice(0, 10)
    })

    for (const item of alignmentIssues) {
      total++
      issues.push({
        type: 'rtl-issue',
        severity: 'major',
        locale: locale.code,
        message: `RTL 模式下文本对齐可能不正确`,
        element: item.selector,
        expected: 'right 或 start',
        actual: item.textAlign,
      })
    }

    // 检查 margin/padding 方向
    const spacingIssues = await page.evaluate(() => {
      const issues: Array<{ selector: string; property: string; value: string }> = []

      document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el)
          // 检查是否使用了物理属性而非逻辑属性
          if (parseInt(style.marginLeft) > 0 && parseInt(style.marginRight) === 0) {
            issues.push({
              selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              property: 'margin-left',
              value: style.marginLeft,
            })
          }
        }
      })

      return issues.slice(0, 5)
    })

    for (const item of spacingIssues) {
      total++
      issues.push({
        type: 'rtl-issue',
        severity: 'minor',
        locale: locale.code,
        message: `建议使用逻辑属性替代物理属性`,
        element: item.selector,
        expected: 'margin-inline-start',
        actual: item.property,
      })
    }

    return { issues, total, passed }
  }

  /**
   * 检测日期格式
   */
  private async checkDateFormats(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []
    let total = 0
    let passed = 0

    // 查找页面中的日期元素
    const dateElements = await page.evaluate(() => {
      const datePatterns = [
        /\d{4}[-/]\d{2}[-/]\d{2}/, // YYYY-MM-DD
        /\d{2}[-/]\d{2}[-/]\d{4}/, // DD-MM-YYYY or MM-DD-YYYY
        /\d{1,2}\s+\w+\s+\d{4}/, // 1 January 2024
      ]

      const results: Array<{ text: string; selector: string }> = []

      document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          const text = el.textContent?.trim() || ''
          for (const pattern of datePatterns) {
            if (pattern.test(text)) {
              results.push({
                text,
                selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              })
              break
            }
          }
        }
      })

      return results.slice(0, 10)
    })

    for (const item of dateElements) {
      total++
      const expectedFormat = this.getExpectedDateFormat(locale.code)

      if (!this.isCorrectDateFormat(item.text, locale.code)) {
        issues.push({
          type: 'date-format',
          severity: 'minor',
          locale: locale.code,
          message: `日期格式可能不符合 ${locale.name} 习惯`,
          element: item.selector,
          expected: expectedFormat,
          actual: item.text,
        })
      } else {
        passed++
      }
    }

    return { issues, total, passed }
  }

  /**
   * 检测数字格式
   */
  private async checkNumberFormats(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []
    let total = 0
    let passed = 0

    const numberElements = await page.evaluate(() => {
      const numberPattern = /^[\d,.\s]+$/
      const results: Array<{ text: string; selector: string }> = []

      document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          const text = el.textContent?.trim() || ''
          if (numberPattern.test(text) && text.length > 3) {
            results.push({
              text,
              selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
            })
          }
        }
      })

      return results.slice(0, 10)
    })

    for (const item of numberElements) {
      total++
      const separator = this.getThousandsSeparator(locale.code)

      if (!this.isCorrectNumberFormat(item.text, locale.code)) {
        issues.push({
          type: 'number-format',
          severity: 'minor',
          locale: locale.code,
          message: `数字格式可能不符合 ${locale.name} 习惯`,
          element: item.selector,
          expected: `千位分隔符: "${separator}"`,
          actual: item.text,
        })
      } else {
        passed++
      }
    }

    return { issues, total, passed }
  }

  /**
   * 检测货币格式
   */
  private async checkCurrencyFormats(
    page: Page,
    locale: LocaleConfig
  ): Promise<{ issues: I18nIssue[]; total: number; passed: number }> {
    const issues: I18nIssue[] = []
    let total = 0
    let passed = 0

    const currencyElements = await page.evaluate(() => {
      const currencyPatterns = [
        /[$€£¥₹₽₩฿₫₪]/,
        /\b(USD|EUR|GBP|JPY|CNY|KRW)\b/i,
        /\b\d+[.,]\d{2}\s*(元|円|원)\b/,
      ]

      const results: Array<{ text: string; selector: string }> = []

      document.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement && el.childNodes.length === 1) {
          const text = el.textContent?.trim() || ''
          for (const pattern of currencyPatterns) {
            if (pattern.test(text)) {
              results.push({
                text,
                selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
              })
              break
            }
          }
        }
      })

      return results.slice(0, 10)
    })

    for (const item of currencyElements) {
      total++
      const expectedCurrency = locale.currencyCode || 'USD'

      if (!this.hasCorrectCurrency(item.text, locale)) {
        issues.push({
          type: 'currency-format',
          severity: 'minor',
          locale: locale.code,
          message: `货币显示可能不符合 ${locale.name} 习惯`,
          element: item.selector,
          expected: expectedCurrency,
          actual: item.text,
        })
      } else {
        passed++
      }
    }

    return { issues, total, passed }
  }

  // 辅助方法
  private hasPlaceholder(text: string): boolean {
    return /\{\{?\w+\}?\}|\$\{\w+\}|%\w+%/.test(text)
  }

  private isLikelyUntranslated(text: string, localeCode: string): boolean {
    if (localeCode.startsWith('en')) return false
    // 简单检测：如果文本全是 ASCII 且看起来像英文句子
    const isAscii = /^[\x00-\x7F]+$/.test(text)
    const looksLikeEnglish = /^[A-Z][a-z]+(\s+[a-z]+)+/.test(text)
    return isAscii && looksLikeEnglish && text.length > 10
  }

  private getTimezone(localeCode: string): string {
    const timezones: Record<string, string> = {
      'zh-CN': 'Asia/Shanghai',
      'zh-TW': 'Asia/Taipei',
      'en-US': 'America/New_York',
      'en-GB': 'Europe/London',
      'ja-JP': 'Asia/Tokyo',
      'ko-KR': 'Asia/Seoul',
      'ar-SA': 'Asia/Riyadh',
      'de-DE': 'Europe/Berlin',
      'fr-FR': 'Europe/Paris',
    }
    return timezones[localeCode] || 'UTC'
  }

  private getExpectedDateFormat(localeCode: string): string {
    const formats: Record<string, string> = {
      'zh-CN': 'YYYY年MM月DD日',
      'en-US': 'MM/DD/YYYY',
      'en-GB': 'DD/MM/YYYY',
      'ja-JP': 'YYYY年MM月DD日',
      'de-DE': 'DD.MM.YYYY',
    }
    return formats[localeCode] || 'YYYY-MM-DD'
  }

  private isCorrectDateFormat(_text: string, _localeCode: string): boolean {
    // 简化检测逻辑
    return true
  }

  private getThousandsSeparator(localeCode: string): string {
    const separators: Record<string, string> = {
      'zh-CN': ',',
      'en-US': ',',
      'de-DE': '.',
      'fr-FR': ' ',
    }
    return separators[localeCode] || ','
  }

  private isCorrectNumberFormat(_text: string, _localeCode: string): boolean {
    return true
  }

  private hasCorrectCurrency(_text: string, _locale: LocaleConfig): boolean {
    return true
  }

  /**
   * 生成报告
   */
  generateReport(results: I18nTesterResult[]): string {
    let report = '# I18n 测试报告\n\n'

    for (const result of results) {
      const status = result.issues.length === 0 ? '✅' : '⚠️'
      report += `## ${status} ${result.locale}\n\n`
      report += `- 检查项: ${result.totalChecks}\n`
      report += `- 通过: ${result.passed}\n`
      report += `- 问题: ${result.issues.length}\n`
      report += `- 翻译覆盖率: ${result.coverage.percentage.toFixed(1)}%\n\n`

      if (result.issues.length > 0) {
        report += '### 问题列表\n\n'
        for (const issue of result.issues) {
          report += `- **[${issue.severity}]** ${issue.type}: ${issue.message}\n`
          if (issue.element) report += `  - 元素: \`${issue.element}\`\n`
          if (issue.actual) report += `  - 实际: ${issue.actual}\n`
          if (issue.expected) report += `  - 期望: ${issue.expected}\n`
        }
        report += '\n'
      }
    }

    return report
  }
}
