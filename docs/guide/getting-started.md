# 快速开始

本指南将帮助你在 5 分钟内开始使用 `@ldesign/testing`。

## 安装

::: code-group

```bash [npm]
npm install @ldesign/testing --save-dev
```

```bash [pnpm]
pnpm add @ldesign/testing -D
```

```bash [yarn]
yarn add @ldesign/testing -D
```

:::

## 初始化配置

运行初始化命令，选择适合你项目的预设配置：

```bash
npx ltesting init
```

这将：

1. 创建 `testing.config.ts` 配置文件
2. 创建 `vitest.config.ts` (如果不存在)
3. 创建测试目录和示例测试文件
4. 安装必要的依赖（可选）

### 预设选项

- **Base（基础）** - 通用项目配置
- **Vue** - Vue 3 项目优化配置
- **React** - React 项目优化配置
- **Node.js** - 服务端项目配置
- **Library** - NPM 包开发配置

## 配置文件

初始化后会生成 `testing.config.ts`：

```typescript
import { defineConfig } from '@ldesign/testing'

export default defineConfig({
  // 测试框架
  framework: 'vitest',
  
  // 测试目录
  testDir: 'tests',
  
  // 单元测试配置
  unit: {
    timeout: 5000,
    clearMocks: true,
    resetMocks: true,
  },
  
  // E2E 测试配置
  e2e: {
    framework: 'playwright',
    baseUrl: 'http://localhost:3000',
    browsers: ['chromium', 'firefox', 'webkit'],
    headless: true,
  },
  
  // 覆盖率配置
  coverage: {
    enabled: true,
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    threshold: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Mock 配置
  mock: {
    clearMocks: true,
    faker: {
      locale: 'zh_CN',
    },
  },
  
  // 并行配置
  parallel: {
    enabled: true,
    workers: 4,
  },
})
```

## 编写第一个测试

创建测试文件 `tests/example.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'

describe('示例测试套件', () => {
  it('应该通过简单的断言', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该支持异步测试', async () => {
    const data = await Promise.resolve({ status: 'success' })
    expect(data.status).toBe('success')
  })
})
```

## 运行测试

### 运行所有测试

```bash
npx ltesting run
```

### 运行单元测试

```bash
npx ltesting run:unit
```

### 监听模式

```bash
npx ltesting run --watch
```

### 生成覆盖率报告

```bash
npx ltesting coverage
```

### 打开覆盖率 HTML 报告

```bash
npx ltesting coverage --open
```

## 使用测试工具

`@ldesign/testing` 提供了丰富的测试工具：

```typescript
import {
  waitFor,
  retry,
  sleep,
  createTestContext,
  cleanupTestContext,
} from '@ldesign/testing'

describe('测试工具示例', () => {
  it('等待条件成立', async () => {
    let ready = false
    setTimeout(() => { ready = true }, 100)
    
    await waitFor(() => ready, { timeout: 5000 })
    expect(ready).toBe(true)
  })

  it('重试失败的操作', async () => {
    let attempt = 0
    
    const result = await retry(async () => {
      attempt++
      if (attempt < 3) throw new Error('未就绪')
      return 'success'
    }, { retries: 5, delay: 100 })
    
    expect(result).toBe('success')
  })
})
```

## 使用自定义断言

```typescript
import {
  assertNotNullish,
  assertArrayLength,
  assertHasProperty,
  assertStringContains,
} from '@ldesign/testing'

describe('自定义断言示例', () => {
  it('断言非空', () => {
    const user = { id: '123', name: 'John' }
    assertNotNullish(user.name)
  })

  it('断言数组长度', () => {
    const items = [1, 2, 3, 4, 5]
    assertArrayLength(items, 5)
  })

  it('断言对象属性', () => {
    const config = { port: 3000, host: 'localhost' }
    assertHasProperty(config, 'port')
  })
})
```

## 使用 Mock 数据

```typescript
import { mockFactory } from '@ldesign/testing'

describe('Mock 数据示例', () => {
  it('生成用户数据', () => {
    const users = mockFactory.user(10)
    expect(Array.isArray(users)).toBe(true)
    expect(users).toHaveLength(10)
    expect(users[0]).toHaveProperty('name')
    expect(users[0]).toHaveProperty('email')
  })

  it('生成关联数据', () => {
    const data = mockFactory.relational({
      users: 5,
      orders: 10,
      products: 20,
    })
    
    expect(data.users).toHaveLength(5)
    expect(data.orders).toHaveLength(10)
    expect(data.products).toHaveLength(20)
  })
})
```

## CLI 命令速查

| 命令 | 说明 |
|------|------|
| `ltesting init` | 初始化配置 |
| `ltesting run` | 运行所有测试 |
| `ltesting run:unit` | 运行单元测试 |
| `ltesting run:e2e` | 运行 E2E 测试 |
| `ltesting coverage` | 生成覆盖率报告 |
| `ltesting snapshot update` | 更新快照 |
| `ltesting mock <type>` | 生成 Mock 数据 |
| `ltesting generate` | 生成测试文件 |

## package.json 脚本

建议在 `package.json` 中添加以下脚本：

```json
{
  "scripts": {
    "test": "ltesting run",
    "test:unit": "ltesting run:unit",
    "test:e2e": "ltesting run:e2e",
    "test:watch": "ltesting run --watch",
    "test:coverage": "ltesting coverage",
    "test:coverage:open": "ltesting coverage --open"
  }
}
```

## 下一步

现在你已经掌握了基础知识，接下来可以：

- 📖 阅读[配置指南](/guide/configuration)了解详细配置
- 🧪 学习[单元测试](/guide/unit-testing)最佳实践
- 🎭 探索[E2E 测试](/guide/e2e-testing)
- 🔄 使用[Mock 工具](/guide/mocking)生成测试数据
- 📊 配置[覆盖率](/guide/coverage)标准
- ⚡ 尝试[性能测试](/guide/performance)

## 常见问题

### 如何在现有项目中使用？

如果项目已有 Vitest 配置，`ltesting init` 不会覆盖它。你可以手动调整配置以使用 `@ldesign/testing` 的功能。

### 可以与其他测试工具一起使用吗？

可以！`@ldesign/testing` 设计为可以与其他工具配合使用。你可以只使用部分功能。

### TypeScript 支持如何？

完全支持！所有 API 都有完整的类型定义，享受智能提示和类型检查。

### 需要额外配置 Vitest 吗？

不需要，`ltesting init` 会自动生成必要的配置。如果需要自定义，可以修改 `vitest.config.ts`。

## 获取帮助

- 📖 查看 [API 文档](/api/overview)
- 💡 浏览 [示例代码](/examples/basic)
- 💬 提交 [GitHub Issue](https://github.com/ldesign/testing/issues)
