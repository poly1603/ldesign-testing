# API 测试

RESTful API 测试指南。

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'

describe('API 测试', () => {
  it('GET /', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(200)
  })
})
```
