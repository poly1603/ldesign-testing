# Mock 工具

强大的 Mock 数据生成和 API Mock。

## Mock 数据生成

```typescript
import { mockFactory } from '@ldesign/testing'

const users = mockFactory.user(10)
const products = mockFactory.product(20)
```

## 支持的数据类型

- user, product, article, comment, order
- company, event, payment, blog, notification
- task, course

查看 [Mock API](/api/mock) 了解更多。
