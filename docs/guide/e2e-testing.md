# E2E 测试

使用 Playwright 进行端到端测试。

## 基础示例

```typescript
import { test, expect } from '@playwright/test'

test('E2E 测试', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Home/)
})
```
