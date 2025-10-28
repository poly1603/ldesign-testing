# 基础示例

基础测试示例。

```typescript
import { describe, it, expect } from 'vitest'
import { waitFor, assertNotNullish } from '@ldesign/testing'

describe('基础测试', () => {
  it('简单断言', () => {
    expect(1 + 1).toBe(2)
  })

  it('异步测试', async () => {
    const data = await fetchData()
    assertNotNullish(data)
    expect(data.status).toBe('success')
  })

  it('等待条件', async () => {
    await waitFor(() => element.isVisible())
  })
})
```
