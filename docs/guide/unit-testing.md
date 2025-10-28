# 单元测试

基于 Vitest 的单元测试指南。

## 基础示例

```typescript
import { describe, it, expect } from 'vitest'

describe('单元测试', () => {
  it('基础测试', () => {
    expect(1 + 1).toBe(2)
  })
})
```

查看更多 [示例](/examples/basic)。
