# E2E 测试示例

使用 Playwright 的端到端测试示例。

## 基础 E2E 测试

```typescript
import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test('应该正确加载', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/首页/)
  })

  test('应该显示导航栏', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
  })
})
```

## 表单测试

```typescript
import { test, expect } from '@playwright/test'
import { fillForm } from '@ldesign/testing'

test.describe('登录表单', () => {
  test('应该成功登录', async ({ page }) => {
    await page.goto('/login')
    
    await fillForm(page, {
      '#email': 'user@example.com',
      '#password': 'password123'
    })
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('.welcome')).toBeVisible()
  })

  test('应该显示验证错误', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.error')).toContainText('请填写邮箱')
  })
})
```

## 使用 Page Object 模式

```typescript
import { test, expect } from '@playwright/test'
import { createPageObject } from '@ldesign/testing'

test.describe('购物流程', () => {
  test('应该完成购物', async ({ page }) => {
    // 创建 Page Object
    const homePage = createPageObject(page, {
      searchInput: '#search',
      searchButton: 'button[type="submit"]',
      firstProduct: '.product:first-child'
    })
    
    await page.goto('/')
    
    // 搜索产品
    await homePage.searchInput.fill('手机')
    await homePage.searchButton.click()
    
    // 点击第一个产品
    await homePage.firstProduct.click()
    
    await expect(page).toHaveURL(/\/product/)
  })
})
```

## 等待和重试

```typescript
import { test, expect } from '@playwright/test'
import { waitForElement, clickAndWait } from '@ldesign/testing'

test.describe('异步操作', () => {
  test('应该等待数据加载', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待元素出现
    await waitForElement(page, '.data-loaded', {
      timeout: 10000
    })
    
    expect(await page.locator('.user-name').textContent()).toBeTruthy()
  })

  test('应该等待导航完成', async ({ page }) => {
    await page.goto('/')
    
    // 点击并等待导航
    await clickAndWait(page, 'a[href="/about"]')
    
    await expect(page).toHaveURL('/about')
  })
})
```

## 多浏览器测试

```typescript
import { test, expect } from '@playwright/test'

test.describe('跨浏览器兼容性', () => {
  test('在 Chromium 中测试', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在 Chromium 中运行')
    
    await page.goto('/')
    // Chromium 特定的测试
  })

  test('在所有浏览器中测试', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })
})
```

## 截图和视频

```typescript
import { test, expect } from '@playwright/test'

test.describe('视觉测试', () => {
  test('应该匹配截图', async ({ page }) => {
    await page.goto('/')
    
    // 截取整个页面
    await expect(page).toHaveScreenshot('homepage.png')
  })

  test('应该匹配元素截图', async ({ page }) => {
    await page.goto('/')
    
    const element = page.locator('.hero')
    await expect(element).toHaveScreenshot('hero-section.png')
  })
})
```

## 使用 Mock 数据

```typescript
import { test, expect } from '@playwright/test'
import { mockFactory } from '@ldesign/testing'

test.describe('API Mock', () => {
  test('应该使用 mock 数据', async ({ page }) => {
    // 拦截 API 请求
    await page.route('/api/users', route => {
      const mockUsers = mockFactory.user(10)
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUsers)
      })
    })
    
    await page.goto('/users')
    
    await expect(page.locator('.user-item')).toHaveCount(10)
  })
})
```

## 移动端测试

```typescript
import { test, expect, devices } from '@playwright/test'

test.describe('移动端', () => {
  test.use(devices['iPhone 13'])

  test('应该在移动设备上正确显示', async ({ page }) => {
    await page.goto('/')
    
    // 检查移动菜单
    await expect(page.locator('.mobile-menu')).toBeVisible()
    await expect(page.locator('.desktop-menu')).not.toBeVisible()
  })
})
```

## 性能测试

```typescript
import { test, expect } from '@playwright/test'

test.describe('性能', () => {
  test('应该快速加载', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000) // 3秒内加载
  })
})
```

## 相关链接

- [Playwright 文档](https://playwright.dev/)
- [E2E 测试指南](/guide/e2e-testing)
- [浏览器工具 API](/api/test-utils)
