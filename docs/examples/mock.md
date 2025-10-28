# Mock 示例

Mock 数据使用示例。

```typescript
import { mockFactory } from '@ldesign/testing'

// 生成用户数据
const users = mockFactory.user(10)

// 生成关联数据
const data = mockFactory.relational({
  users: 5,
  orders: 10,
  products: 20
})

// 批量生成
const batch = mockFactory.batch({
  users: { type: 'user', count: 10 },
  products: { type: 'product', count: 20 }
})
```
