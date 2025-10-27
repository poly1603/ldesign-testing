/**
 * 浏览器操作工具
 */
import type { Page } from '@playwright/test'

/**
 * 等待元素出现
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  await page.waitForSelector(selector, {
    timeout: options.timeout ?? 30000,
  })
}

/**
 * 等待导航完成
 */
export async function waitForNavigation(
  page: Page,
  options: { timeout?: number; url?: string | RegExp } = {}
): Promise<void> {
  await page.waitForLoadState('networkidle', {
    timeout: options.timeout ?? 30000,
  })

  if (options.url) {
    await page.waitForURL(options.url, {
      timeout: options.timeout ?? 30000,
    })
  }
}

/**
 * 填写表单
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
): Promise<void> {
  for (const [selector, value] of Object.entries(formData)) {
    await page.fill(selector, value)
  }
}

/**
 * 点击并等待导航
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  await Promise.all([
    page.waitForLoadState('networkidle', {
      timeout: options.timeout ?? 30000,
    }),
    page.click(selector),
  ])
}

/**
 * 滚动到元素
 */
export async function scrollToElement(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

/**
 * 获取元素文本
 */
export async function getText(
  page: Page,
  selector: string
): Promise<string> {
  return page.locator(selector).textContent() || ''
}

/**
 * 获取元素属性
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  return page.locator(selector).getAttribute(attribute)
}

/**
 * 检查元素是否可见
 */
export async function isVisible(
  page: Page,
  selector: string
): Promise<boolean> {
  return page.locator(selector).isVisible()
}

/**
 * 检查元素是否启用
 */
export async function isEnabled(
  page: Page,
  selector: string
): Promise<boolean> {
  return page.locator(selector).isEnabled()
}

/**
 * 等待请求
 */
export async function waitForRequest(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<any> {
  return page.waitForRequest(urlPattern, {
    timeout: options.timeout ?? 30000,
  })
}

/**
 * 等待响应
 */
export async function waitForResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<any> {
  return page.waitForResponse(urlPattern, {
    timeout: options.timeout ?? 30000,
  })
}

/**
 * 模拟 API 响应
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

/**
 * 截图
 */
export async function screenshot(
  page: Page,
  path: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  await page.screenshot({
    path,
    fullPage: options.fullPage ?? false,
  })
}

/**
 * 获取控制台日志
 */
export function collectConsoleLog(page: Page): string[] {
  const logs: string[] = []

  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`)
  })

  return logs
}

/**
 * 获取网络错误
 */
export function collectNetworkErrors(page: Page): string[] {
  const errors: string[] = []

  page.on('requestfailed', (request) => {
    errors.push(`请求失败: ${request.url()} - ${request.failure()?.errorText}`)
  })

  return errors
}

