/**
 * Page Object 模式构建器
 */
import type { Page } from '@playwright/test'

/**
 * Page Object 基类
 */
export abstract class PageObject {
  constructor(protected page: Page) { }

  /**
   * 导航到页面
   */
  abstract goto(): Promise<void>

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 获取页面标题
   */
  async getTitle(): Promise<string> {
    return this.page.title()
  }

  /**
   * 获取页面 URL
   */
  getUrl(): string {
    return this.page.url()
  }
}

/**
 * Page Object 构建器
 */
export class PageObjectBuilder<T extends Record<string, any>> {
  private selectors: T
  private page: Page

  constructor(page: Page, selectors: T) {
    this.page = page
    this.selectors = selectors
  }

  /**
   * 构建 Page Object
   */
  build(): PageObjectProxy<T> {
    const proxy = new Proxy(this.selectors, {
      get: (target, prop: string) => {
        const selector = target[prop]

        if (typeof selector === 'string') {
          return this.createElementProxy(selector)
        }

        return selector
      },
    })

    return proxy as PageObjectProxy<T>
  }

  /**
   * 创建元素代理
   */
  private createElementProxy(selector: string) {
    return {
      locator: () => this.page.locator(selector),
      click: () => this.page.click(selector),
      fill: (value: string) => this.page.fill(selector, value),
      getText: () => this.page.locator(selector).textContent(),
      isVisible: () => this.page.locator(selector).isVisible(),
      isEnabled: () => this.page.locator(selector).isEnabled(),
      getAttribute: (attr: string) =>
        this.page.locator(selector).getAttribute(attr),
      waitFor: (options?: any) =>
        this.page.waitForSelector(selector, options),
      scrollIntoView: () =>
        this.page.locator(selector).scrollIntoViewIfNeeded(),
    }
  }
}

/**
 * Page Object 代理类型
 */
export type PageObjectProxy<T> = {
  [K in keyof T]: T[K] extends string
  ? {
    locator: () => ReturnType<Page['locator']>
    click: () => Promise<void>
    fill: (value: string) => Promise<void>
    getText: () => Promise<string | null>
    isVisible: () => Promise<boolean>
    isEnabled: () => Promise<boolean>
    getAttribute: (attr: string) => Promise<string | null>
    waitFor: (options?: any) => Promise<void>
    scrollIntoView: () => Promise<void>
  }
  : T[K]
}

/**
 * 创建 Page Object
 */
export function createPageObject<T extends Record<string, any>>(
  page: Page,
  selectors: T
): PageObjectProxy<T> {
  return new PageObjectBuilder(page, selectors).build()
}

/**
 * 定义 Page Object
 */
export function definePageObject<T extends Record<string, string>>(
  selectors: T
) {
  return (page: Page) => createPageObject(page, selectors)
}

