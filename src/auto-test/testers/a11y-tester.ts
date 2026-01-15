/**
 * @ldesign/testing - Accessibility (A11y) Tester
 * 无障碍测试器 - WCAG 2.1 合规检测、屏幕阅读器兼容性、键盘导航测试
 */

import type { Page } from '@playwright/test'

/**
 * WCAG 级别
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA'

/**
 * WCAG 准则分类
 */
export type WCAGCategory = 'perceivable' | 'operable' | 'understandable' | 'robust'

/**
 * 无障碍问题
 */
export interface A11yIssue {
  id: string
  type: string
  wcagCriteria: string
  wcagLevel: WCAGLevel
  category: WCAGCategory
  description: string
  element?: string
  selector?: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  suggestion: string
  helpUrl?: string
}

/**
 * 键盘导航结果
 */
export interface KeyboardNavResult {
  focusableElements: number
  tabbableElements: number
  focusTrapDetected: boolean
  missingFocusIndicator: string[]
  tabOrderIssues: string[]
}

/**
 * 颜色对比结果
 */
export interface ColorContrastResult {
  passes: number
  failures: number
  issues: Array<{
    element: string
    foreground: string
    background: string
    ratio: number
    requiredRatio: number
  }>
}

/**
 * ARIA 检查结果
 */
export interface ARIACheckResult {
  validRoles: number
  invalidRoles: string[]
  missingLabels: string[]
  hiddenFromAT: number
  liveRegions: number
}

/**
 * 无障碍测试结果
 */
export interface A11yTestResult {
  issues: A11yIssue[]
  keyboard: KeyboardNavResult
  colorContrast: ColorContrastResult
  aria: ARIACheckResult
  score: number
  wcagCompliance: {
    level: WCAGLevel
    passRate: number
    criticalIssues: number
  }
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
}

/**
 * 无障碍测试配置
 */
export interface A11yTestConfig {
  enabled?: boolean
  wcagLevel?: WCAGLevel
  runAxe?: boolean
  checkKeyboard?: boolean
  checkColorContrast?: boolean
  checkARIA?: boolean
  checkForms?: boolean
  checkImages?: boolean
  checkLinks?: boolean
  checkHeadings?: boolean
  checkLandmarks?: boolean
  timeout?: number
  ignoreRules?: string[]
}

/**
 * 默认配置
 */
export const DEFAULT_A11Y_CONFIG: Required<A11yTestConfig> = {
  enabled: true,
  wcagLevel: 'AA',
  runAxe: true,
  checkKeyboard: true,
  checkColorContrast: true,
  checkARIA: true,
  checkForms: true,
  checkImages: true,
  checkLinks: true,
  checkHeadings: true,
  checkLandmarks: true,
  timeout: 30000,
  ignoreRules: [],
}

/**
 * WCAG 准则映射
 */
export const WCAG_CRITERIA: Record<string, { level: WCAGLevel; category: WCAGCategory; title: string }> = {
  '1.1.1': { level: 'A', category: 'perceivable', title: 'Non-text Content' },
  '1.2.1': { level: 'A', category: 'perceivable', title: 'Audio-only and Video-only' },
  '1.3.1': { level: 'A', category: 'perceivable', title: 'Info and Relationships' },
  '1.3.2': { level: 'A', category: 'perceivable', title: 'Meaningful Sequence' },
  '1.4.1': { level: 'A', category: 'perceivable', title: 'Use of Color' },
  '1.4.3': { level: 'AA', category: 'perceivable', title: 'Contrast (Minimum)' },
  '1.4.4': { level: 'AA', category: 'perceivable', title: 'Resize Text' },
  '1.4.11': { level: 'AA', category: 'perceivable', title: 'Non-text Contrast' },
  '2.1.1': { level: 'A', category: 'operable', title: 'Keyboard' },
  '2.1.2': { level: 'A', category: 'operable', title: 'No Keyboard Trap' },
  '2.4.1': { level: 'A', category: 'operable', title: 'Bypass Blocks' },
  '2.4.2': { level: 'A', category: 'operable', title: 'Page Titled' },
  '2.4.3': { level: 'A', category: 'operable', title: 'Focus Order' },
  '2.4.4': { level: 'A', category: 'operable', title: 'Link Purpose (In Context)' },
  '2.4.6': { level: 'AA', category: 'operable', title: 'Headings and Labels' },
  '2.4.7': { level: 'AA', category: 'operable', title: 'Focus Visible' },
  '3.1.1': { level: 'A', category: 'understandable', title: 'Language of Page' },
  '3.2.1': { level: 'A', category: 'understandable', title: 'On Focus' },
  '3.2.2': { level: 'A', category: 'understandable', title: 'On Input' },
  '3.3.1': { level: 'A', category: 'understandable', title: 'Error Identification' },
  '3.3.2': { level: 'A', category: 'understandable', title: 'Labels or Instructions' },
  '4.1.1': { level: 'A', category: 'robust', title: 'Parsing' },
  '4.1.2': { level: 'A', category: 'robust', title: 'Name, Role, Value' },
}

/**
 * 无障碍测试器
 */
export class A11yTester {
  private config: Required<A11yTestConfig>

  constructor(config: A11yTestConfig = {}) {
    this.config = { ...DEFAULT_A11Y_CONFIG, ...config }
  }

  /**
   * 运行无障碍测试
   */
  async run(page: Page): Promise<A11yTestResult> {
    const result: A11yTestResult = {
      issues: [],
      keyboard: {
        focusableElements: 0,
        tabbableElements: 0,
        focusTrapDetected: false,
        missingFocusIndicator: [],
        tabOrderIssues: [],
      },
      colorContrast: {
        passes: 0,
        failures: 0,
        issues: [],
      },
      aria: {
        validRoles: 0,
        invalidRoles: [],
        missingLabels: [],
        hiddenFromAT: 0,
        liveRegions: 0,
      },
      score: 100,
      wcagCompliance: {
        level: this.config.wcagLevel,
        passRate: 100,
        criticalIssues: 0,
      },
      summary: {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      },
    }

    try {
      // 基础检查
      const basicIssues = await this.runBasicChecks(page)
      result.issues.push(...basicIssues)

      // 键盘导航检查
      if (this.config.checkKeyboard) {
        result.keyboard = await this.checkKeyboardNavigation(page)
        const keyboardIssues = this.convertKeyboardToIssues(result.keyboard)
        result.issues.push(...keyboardIssues)
      }

      // 颜色对比检查
      if (this.config.checkColorContrast) {
        result.colorContrast = await this.checkColorContrast(page)
        const contrastIssues = this.convertContrastToIssues(result.colorContrast)
        result.issues.push(...contrastIssues)
      }

      // ARIA 检查
      if (this.config.checkARIA) {
        result.aria = await this.checkARIA(page)
        const ariaIssues = this.convertARIAToIssues(result.aria)
        result.issues.push(...ariaIssues)
      }

      // 图片检查
      if (this.config.checkImages) {
        const imageIssues = await this.checkImages(page)
        result.issues.push(...imageIssues)
      }

      // 表单检查
      if (this.config.checkForms) {
        const formIssues = await this.checkForms(page)
        result.issues.push(...formIssues)
      }

      // 链接检查
      if (this.config.checkLinks) {
        const linkIssues = await this.checkLinks(page)
        result.issues.push(...linkIssues)
      }

      // 标题检查
      if (this.config.checkHeadings) {
        const headingIssues = await this.checkHeadings(page)
        result.issues.push(...headingIssues)
      }

      // 地标检查
      if (this.config.checkLandmarks) {
        const landmarkIssues = await this.checkLandmarks(page)
        result.issues.push(...landmarkIssues)
      }

      // 过滤忽略的规则
      result.issues = result.issues.filter(
        issue => !this.config.ignoreRules.includes(issue.id)
      )

      // 计算摘要
      result.summary = this.calculateSummary(result.issues)
      result.wcagCompliance.criticalIssues = result.summary.critical + result.summary.serious
      result.score = this.calculateScore(result)
      result.wcagCompliance.passRate = result.score

    } catch (error) {
      result.issues.push({
        id: 'test-error',
        type: 'error',
        wcagCriteria: 'N/A',
        wcagLevel: 'A',
        category: 'robust',
        description: `无障碍测试失败: ${error instanceof Error ? error.message : String(error)}`,
        impact: 'critical',
        suggestion: '检查页面是否正常加载',
      })
      result.score = 0
    }

    return result
  }

  /**
   * 基础检查
   */
  private async runBasicChecks(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []

      // 检查页面标题
      if (!document.title || document.title.trim() === '') {
        issues.push({
          id: 'page-title',
          type: 'document',
          wcagCriteria: '2.4.2',
          wcagLevel: 'A' as const,
          category: 'operable' as const,
          description: '页面缺少标题',
          impact: 'serious' as const,
          suggestion: '添加描述性的 <title> 标签',
        })
      }

      // 检查 lang 属性
      const htmlLang = document.documentElement.lang
      if (!htmlLang) {
        issues.push({
          id: 'html-lang',
          type: 'document',
          wcagCriteria: '3.1.1',
          wcagLevel: 'A' as const,
          category: 'understandable' as const,
          description: '页面缺少语言声明',
          impact: 'serious' as const,
          suggestion: '在 <html> 标签上添加 lang 属性',
        })
      }

      // 检查视口缩放
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        const content = viewport.getAttribute('content') || ''
        if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
          issues.push({
            id: 'viewport-zoom',
            type: 'document',
            wcagCriteria: '1.4.4',
            wcagLevel: 'AA' as const,
            category: 'perceivable' as const,
            description: '页面禁止了用户缩放',
            impact: 'serious' as const,
            suggestion: '移除 user-scalable=no 和 maximum-scale=1 限制',
          })
        }
      }

      // 检查跳过链接
      const skipLink = document.querySelector('a[href="#main"], a[href="#content"], [class*="skip"]')
      if (!skipLink) {
        issues.push({
          id: 'skip-link',
          type: 'navigation',
          wcagCriteria: '2.4.1',
          wcagLevel: 'A' as const,
          category: 'operable' as const,
          description: '页面缺少跳过导航链接',
          impact: 'moderate' as const,
          suggestion: '添加 "跳到主要内容" 链接',
        })
      }

      return issues
    })
  }

  /**
   * 键盘导航检查
   */
  private async checkKeyboardNavigation(page: Page): Promise<KeyboardNavResult> {
    return page.evaluate(() => {
      const result: KeyboardNavResult = {
        focusableElements: 0,
        tabbableElements: 0,
        focusTrapDetected: false,
        missingFocusIndicator: [],
        tabOrderIssues: [],
      }

      // 获取可聚焦元素
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]',
      ].join(', ')

      const focusable = document.querySelectorAll(focusableSelectors)
      result.focusableElements = focusable.length

      // 检查 tabindex
      const tabbable = Array.from(focusable).filter((el) => {
        const tabindex = el.getAttribute('tabindex')
        return tabindex === null || parseInt(tabindex) >= 0
      })
      result.tabbableElements = tabbable.length

      // 检查焦点指示器
      focusable.forEach((el) => {
        const computed = window.getComputedStyle(el)

        // 简单检查：查看是否有 outline
        if (computed.outline === 'none' || computed.outline === '0px none') {
          const selector = el.tagName.toLowerCase() +
            (el.id ? '#' + el.id : '') +
            (el.className ? '.' + String(el.className).split(' ')[0] : '')
          result.missingFocusIndicator.push(selector)
        }
      })

      // 限制数量
      result.missingFocusIndicator = result.missingFocusIndicator.slice(0, 10)

      // 检查 tabindex 顺序问题
      const positiveTabindex = Array.from(focusable).filter((el) => {
        const tabindex = el.getAttribute('tabindex')
        return tabindex && parseInt(tabindex) > 0
      })

      if (positiveTabindex.length > 0) {
        result.tabOrderIssues.push(`发现 ${positiveTabindex.length} 个使用正数 tabindex 的元素`)
      }

      return result
    })
  }

  /**
   * 颜色对比检查
   */
  private async checkColorContrast(page: Page): Promise<ColorContrastResult> {
    return page.evaluate(() => {
      const result: ColorContrastResult = {
        passes: 0,
        failures: 0,
        issues: [],
      }

      // 解析颜色
      function parseColor(color: string): { r: number; g: number; b: number } | null {
        const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (rgb) {
          return { r: parseInt(rgb[1]), g: parseInt(rgb[2]), b: parseInt(rgb[3]) }
        }
        return null
      }

      // 计算相对亮度
      function getLuminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
      }

      // 计算对比度
      function getContrastRatio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
        const l1 = getLuminance(fg.r, fg.g, fg.b)
        const l2 = getLuminance(bg.r, bg.g, bg.b)
        const lighter = Math.max(l1, l2)
        const darker = Math.min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
      }

      // 检查文本元素
      const textElements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button')

      textElements.forEach((el) => {
        const computed = window.getComputedStyle(el)
        const fgColor = parseColor(computed.color)
        const bgColor = parseColor(computed.backgroundColor)

        if (fgColor && bgColor && bgColor.r !== 0 || bgColor?.g !== 0 || bgColor?.b !== 0) {
          const ratio = getContrastRatio(fgColor!, bgColor!)
          const fontSize = parseFloat(computed.fontSize)
          const isBold = parseInt(computed.fontWeight) >= 700
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold)
          const requiredRatio = isLargeText ? 3 : 4.5

          if (ratio >= requiredRatio) {
            result.passes++
          } else {
            result.failures++
            if (result.issues.length < 10) {
              result.issues.push({
                element: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
                foreground: computed.color,
                background: computed.backgroundColor,
                ratio: Math.round(ratio * 100) / 100,
                requiredRatio,
              })
            }
          }
        }
      })

      return result
    })
  }

  /**
   * ARIA 检查
   */
  private async checkARIA(page: Page): Promise<ARIACheckResult> {
    return page.evaluate(() => {
      const result: ARIACheckResult = {
        validRoles: 0,
        invalidRoles: [],
        missingLabels: [],
        hiddenFromAT: 0,
        liveRegions: 0,
      }

      // 有效的 ARIA 角色
      const validRoles = new Set([
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell',
        'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition',
        'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell',
        'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
        'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
        'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
        'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search',
        'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab',
        'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
        'tree', 'treegrid', 'treeitem',
      ])

      // 检查所有带 role 属性的元素
      const elementsWithRole = document.querySelectorAll('[role]')
      elementsWithRole.forEach((el) => {
        const role = el.getAttribute('role')
        if (role && validRoles.has(role)) {
          result.validRoles++
        } else if (role) {
          result.invalidRoles.push(`${el.tagName.toLowerCase()}[role="${role}"]`)
        }
      })

      // 检查需要标签的交互元素
      const interactiveElements = document.querySelectorAll('button, input, select, textarea, [role="button"], [role="textbox"]')
      interactiveElements.forEach((el) => {
        const hasLabel =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title') ||
          (el.tagName === 'INPUT' && (el as HTMLInputElement).placeholder) ||
          el.id && document.querySelector(`label[for="${el.id}"]`)

        if (!hasLabel) {
          const selector = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          result.missingLabels.push(selector)
        }
      })

      // 检查 aria-hidden 元素
      result.hiddenFromAT = document.querySelectorAll('[aria-hidden="true"]').length

      // 检查 live regions
      result.liveRegions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]').length

      // 限制数量
      result.invalidRoles = result.invalidRoles.slice(0, 10)
      result.missingLabels = result.missingLabels.slice(0, 10)

      return result
    })
  }

  /**
   * 图片检查
   */
  private async checkImages(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []

      document.querySelectorAll('img').forEach((img) => {
        const alt = img.getAttribute('alt')
        const isDecorative = img.getAttribute('role') === 'presentation' || alt === ''

        if (alt === null && !isDecorative) {
          issues.push({
            id: 'image-alt',
            type: 'image',
            wcagCriteria: '1.1.1',
            wcagLevel: 'A' as const,
            category: 'perceivable' as const,
            description: `图片缺少 alt 属性`,
            element: img.src.split('/').pop() || 'unknown',
            selector: 'img' + (img.id ? '#' + img.id : `[src*="${img.src.split('/').pop()}"]`),
            impact: 'critical' as const,
            suggestion: '为图片添加描述性的 alt 属性，或使用 alt="" 标记装饰性图片',
          })
        }

        // 检查图片链接
        if (img.parentElement?.tagName === 'A' && !alt) {
          issues.push({
            id: 'image-link-alt',
            type: 'image',
            wcagCriteria: '2.4.4',
            wcagLevel: 'A' as const,
            category: 'operable' as const,
            description: `链接内的图片缺少 alt 文本`,
            selector: 'a > img',
            impact: 'serious' as const,
            suggestion: '为链接图片添加描述链接目的的 alt 文本',
          })
        }
      })

      return issues.slice(0, 20)
    })
  }

  /**
   * 表单检查
   */
  private async checkForms(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []

      // 检查表单控件
      document.querySelectorAll('input, select, textarea').forEach((el) => {
        const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        const type = input.type || 'text'

        // 跳过隐藏和提交按钮
        if (type === 'hidden' || type === 'submit' || type === 'button') return

        // 检查标签
        const hasLabel =
          input.getAttribute('aria-label') ||
          input.getAttribute('aria-labelledby') ||
          (input.id && document.querySelector(`label[for="${input.id}"]`)) ||
          input.closest('label')

        if (!hasLabel) {
          issues.push({
            id: 'form-label',
            type: 'form',
            wcagCriteria: '3.3.2',
            wcagLevel: 'A' as const,
            category: 'understandable' as const,
            description: `表单控件缺少标签`,
            element: `${input.tagName.toLowerCase()}[type="${type}"]`,
            selector: input.tagName.toLowerCase() + (input.id ? '#' + input.id : `[name="${input.name}"]`),
            impact: 'critical' as const,
            suggestion: '使用 <label> 或 aria-label 为表单控件添加标签',
          })
        }

        // 检查必填字段
        if (input.required && !input.getAttribute('aria-required')) {
          issues.push({
            id: 'form-required',
            type: 'form',
            wcagCriteria: '3.3.2',
            wcagLevel: 'A' as const,
            category: 'understandable' as const,
            description: `必填字段应使用 aria-required 标记`,
            selector: input.tagName.toLowerCase() + (input.id ? '#' + input.id : ''),
            impact: 'minor' as const,
            suggestion: '添加 aria-required="true" 属性',
          })
        }
      })

      return issues.slice(0, 20)
    })
  }

  /**
   * 链接检查
   */
  private async checkLinks(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []

      document.querySelectorAll('a[href]').forEach((link) => {
        const text = link.textContent?.trim()
        const ariaLabel = link.getAttribute('aria-label')
        const title = link.getAttribute('title')

        // 空链接
        if (!text && !ariaLabel && !title && !link.querySelector('img[alt]')) {
          issues.push({
            id: 'link-empty',
            type: 'link',
            wcagCriteria: '2.4.4',
            wcagLevel: 'A' as const,
            category: 'operable' as const,
            description: `链接没有可访问的文本`,
            selector: 'a[href="' + link.getAttribute('href') + '"]',
            impact: 'serious' as const,
            suggestion: '为链接添加描述性文本或 aria-label',
          })
        }

        // 通用链接文本
        const genericTexts = ['click here', 'here', 'read more', 'learn more', '点击这里', '更多', '详情']
        if (text && genericTexts.includes(text.toLowerCase())) {
          issues.push({
            id: 'link-generic',
            type: 'link',
            wcagCriteria: '2.4.4',
            wcagLevel: 'A' as const,
            category: 'operable' as const,
            description: `链接文本 "${text}" 不够具体`,
            selector: `a:contains("${text}")`,
            impact: 'moderate' as const,
            suggestion: '使用描述链接目的的文本，而不是通用词语',
          })
        }

        // 新窗口链接
        if (link.getAttribute('target') === '_blank' && !ariaLabel?.includes('新窗口') && !title?.includes('new')) {
          issues.push({
            id: 'link-new-window',
            type: 'link',
            wcagCriteria: '3.2.5',
            wcagLevel: 'AAA' as const,
            category: 'understandable' as const,
            description: `在新窗口打开的链接应提示用户`,
            impact: 'minor' as const,
            suggestion: '添加视觉和文本提示，告知用户链接将在新窗口打开',
          })
        }
      })

      return issues.slice(0, 20)
    })
  }

  /**
   * 标题检查
   */
  private async checkHeadings(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))

      // 检查是否有 h1
      const h1s = headings.filter(h => h.tagName === 'H1')
      if (h1s.length === 0) {
        issues.push({
          id: 'heading-h1',
          type: 'heading',
          wcagCriteria: '2.4.6',
          wcagLevel: 'AA' as const,
          category: 'operable' as const,
          description: '页面缺少 h1 标题',
          impact: 'moderate' as const,
          suggestion: '每个页面应有一个描述页面主题的 h1 标题',
        })
      } else if (h1s.length > 1) {
        issues.push({
          id: 'heading-multiple-h1',
          type: 'heading',
          wcagCriteria: '2.4.6',
          wcagLevel: 'AA' as const,
          category: 'operable' as const,
          description: `页面有 ${h1s.length} 个 h1 标题`,
          impact: 'moderate' as const,
          suggestion: '通常每个页面只应有一个 h1 标题',
        })
      }

      // 检查标题层级
      let lastLevel = 0
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName[1])

        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push({
            id: 'heading-skip',
            type: 'heading',
            wcagCriteria: '2.4.6',
            wcagLevel: 'AA' as const,
            category: 'operable' as const,
            description: `标题层级从 h${lastLevel} 跳到 h${level}`,
            element: heading.tagName.toLowerCase(),
            impact: 'moderate' as const,
            suggestion: '保持标题层级连续，不要跳过层级',
          })
        }

        // 检查空标题
        if (!heading.textContent?.trim()) {
          issues.push({
            id: 'heading-empty',
            type: 'heading',
            wcagCriteria: '2.4.6',
            wcagLevel: 'AA' as const,
            category: 'operable' as const,
            description: `空的 ${heading.tagName.toLowerCase()} 标题`,
            impact: 'serious' as const,
            suggestion: '移除空标题或添加内容',
          })
        }

        lastLevel = level
      })

      return issues
    })
  }

  /**
   * 地标检查
   */
  private async checkLandmarks(page: Page): Promise<A11yIssue[]> {
    return page.evaluate(() => {
      const issues: A11yIssue[] = []

      // 检查主要地标
      const hasMain = document.querySelector('main, [role="main"]')
      const hasNav = document.querySelector('nav, [role="navigation"]')

      if (!hasMain) {
        issues.push({
          id: 'landmark-main',
          type: 'landmark',
          wcagCriteria: '2.4.1',
          wcagLevel: 'A' as const,
          category: 'operable' as const,
          description: '页面缺少 main 地标',
          impact: 'moderate' as const,
          suggestion: '使用 <main> 元素或 role="main" 标记主要内容区域',
        })
      }

      if (!hasNav) {
        issues.push({
          id: 'landmark-nav',
          type: 'landmark',
          wcagCriteria: '2.4.1',
          wcagLevel: 'A' as const,
          category: 'operable' as const,
          description: '页面缺少 navigation 地标',
          impact: 'minor' as const,
          suggestion: '使用 <nav> 元素或 role="navigation" 标记导航区域',
        })
      }

      // 检查多个相同地标是否有标签
      const navs = document.querySelectorAll('nav, [role="navigation"]')
      if (navs.length > 1) {
        navs.forEach((nav, index) => {
          if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
            issues.push({
              id: 'landmark-label',
              type: 'landmark',
              wcagCriteria: '2.4.1',
              wcagLevel: 'A' as const,
              category: 'operable' as const,
              description: `第 ${index + 1} 个导航区域缺少标签`,
              impact: 'moderate' as const,
              suggestion: '当有多个相同类型的地标时，使用 aria-label 区分它们',
            })
          }
        })
      }

      return issues
    })
  }

  /**
   * 转换键盘检查结果为问题
   */
  private convertKeyboardToIssues(keyboard: KeyboardNavResult): A11yIssue[] {
    const issues: A11yIssue[] = []

    if (keyboard.missingFocusIndicator.length > 0) {
      issues.push({
        id: 'focus-visible',
        type: 'keyboard',
        wcagCriteria: '2.4.7',
        wcagLevel: 'AA',
        category: 'operable',
        description: `${keyboard.missingFocusIndicator.length} 个元素可能缺少焦点指示器`,
        impact: 'serious',
        suggestion: '确保所有可聚焦元素在获得焦点时有明显的视觉指示',
      })
    }

    for (const issue of keyboard.tabOrderIssues) {
      issues.push({
        id: 'tab-order',
        type: 'keyboard',
        wcagCriteria: '2.4.3',
        wcagLevel: 'A',
        category: 'operable',
        description: issue,
        impact: 'moderate',
        suggestion: '避免使用正数 tabindex，让元素按 DOM 顺序获得焦点',
      })
    }

    if (keyboard.focusTrapDetected) {
      issues.push({
        id: 'focus-trap',
        type: 'keyboard',
        wcagCriteria: '2.1.2',
        wcagLevel: 'A',
        category: 'operable',
        description: '检测到可能的键盘陷阱',
        impact: 'critical',
        suggestion: '确保用户可以使用键盘从任何组件中移出焦点',
      })
    }

    return issues
  }

  /**
   * 转换颜色对比结果为问题
   */
  private convertContrastToIssues(contrast: ColorContrastResult): A11yIssue[] {
    return contrast.issues.map(issue => ({
      id: 'color-contrast',
      type: 'contrast',
      wcagCriteria: '1.4.3',
      wcagLevel: 'AA' as WCAGLevel,
      category: 'perceivable' as WCAGCategory,
      description: `颜色对比度不足 (${issue.ratio}:1，需要 ${issue.requiredRatio}:1)`,
      element: issue.element,
      impact: 'serious' as const,
      suggestion: `调整前景色 (${issue.foreground}) 或背景色 (${issue.background}) 以达到所需对比度`,
    }))
  }

  /**
   * 转换 ARIA 检查结果为问题
   */
  private convertARIAToIssues(aria: ARIACheckResult): A11yIssue[] {
    const issues: A11yIssue[] = []

    for (const role of aria.invalidRoles) {
      issues.push({
        id: 'aria-invalid-role',
        type: 'aria',
        wcagCriteria: '4.1.2',
        wcagLevel: 'A',
        category: 'robust',
        description: `无效的 ARIA 角色: ${role}`,
        impact: 'serious',
        suggestion: '使用有效的 ARIA 角色或移除 role 属性',
      })
    }

    for (const label of aria.missingLabels) {
      issues.push({
        id: 'aria-missing-label',
        type: 'aria',
        wcagCriteria: '4.1.2',
        wcagLevel: 'A',
        category: 'robust',
        description: `交互元素缺少可访问名称: ${label}`,
        element: label,
        impact: 'critical',
        suggestion: '添加 aria-label、aria-labelledby 或关联的 <label>',
      })
    }

    return issues
  }

  /**
   * 计算摘要
   */
  private calculateSummary(issues: A11yIssue[]): A11yTestResult['summary'] {
    return {
      critical: issues.filter(i => i.impact === 'critical').length,
      serious: issues.filter(i => i.impact === 'serious').length,
      moderate: issues.filter(i => i.impact === 'moderate').length,
      minor: issues.filter(i => i.impact === 'minor').length,
    }
  }

  /**
   * 计算分数
   */
  private calculateScore(result: A11yTestResult): number {
    let score = 100
    const { summary } = result

    // 扣分
    score -= summary.critical * 15
    score -= summary.serious * 10
    score -= summary.moderate * 5
    score -= summary.minor * 2

    return Math.max(0, Math.min(100, score))
  }
}
