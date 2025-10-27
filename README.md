# @ldesign/testing

> 🧪 完整的测试工具集，让测试变得简单高效

## ✨ 特性

- 🧪 **单元测试** - Vitest 集成和强大的测试工具函数
- 🎭 **E2E 测试** - Playwright 无缝集成
- 📸 **快照测试** - 组件快照和视觉回归测试
- 📊 **覆盖率报告** - 详细的测试覆盖率统计和分析
- 🔄 **Mock 工具** - Faker.js 和 MSW 集成的强大 Mock 系统
- ⚡ **并行执行** - 多进程并行测试，提升测试速度
- 🎯 **预设配置** - 开箱即用的项目模板（Vue、React、Node.js等）
- 🛠️ **自定义断言** - 扩展的断言库，让测试更简洁

## 📦 安装

```bash
npm install @ldesign/testing --save-dev
# 或
pnpm add @ldesign/testing -D
```

## 🚀 快速开始

### 1. 初始化测试配置

```bash
npx ltesting init
```

交互式选择预设配置：
- **基础配置** - 通用项目配置
- **Vue 项目** - 针对 Vue 3 项目优化
- **React 项目** - 针对 React 项目优化
- **Node.js 项目** - 服务端项目配置
- **库项目** - NPM 包开发配置

### 2. 运行测试

```bash
# 运行所有测试
npx ltesting run

# 运行单元测试
npx ltesting run:unit

# 运行 E2E 测试
npx ltesting run:e2e

# 监听模式
npx ltesting run --watch

# 生成覆盖率报告
npx ltesting coverage

# 打开覆盖率报告
npx ltesting coverage --open
```

### 3. 快照管理

```bash
# 更新所有快照
npx ltesting snapshot update

# 清理未使用的快照
npx ltesting snapshot clean

# 列出所有快照
npx ltesting snapshot list
```

### 4. Mock 数据生成

```bash
# 生成用户数据
npx ltesting mock user --count 10 --output ./mocks/users.json

# 生成产品数据
npx ltesting mock product --count 20 --format ts

# 支持的数据类型：user, product, article, comment, order
```

## ⚙️ 配置

创建 `testing.config.ts`：

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
    workers: 4, // 工作进程数，默认为 CPU 核心数
  },
})
```

## 📖 API 文档

### 测试工具函数

```typescript
import {
  waitFor,
  waitForAsync,
  sleep,
  retry,
  createTestContext,
  cleanupTestContext,
} from '@ldesign/testing'

// 等待条件成立
await waitFor(() => element.isVisible(), {
  timeout: 5000,
  interval: 100,
})

// 重试执行
const result = await retry(async () => {
  return await fetchData()
}, {
  retries: 3,
  delay: 1000,
})
```

### 自定义断言

```typescript
import {
  assertHasProperty,
  assertType,
  assertThrows,
  assertDeepEqual,
} from '@ldesign/testing'

// 断言对象包含属性
assertHasProperty(obj, 'name')

// 断言类型
assertType(value, 'string')

// 断言抛出错误
await assertThrows(async () => {
  throw new Error('test')
}, 'test')

// 深度相等
assertDeepEqual(actual, expected)
```

### Mock 工具

```typescript
import {
  mockFactory,
  createMockFunction,
  spyOn,
} from '@ldesign/testing'

// 生成 Mock 数据
const users = mockFactory.user(10)
const products = mockFactory.product(20)

// 创建 Mock 函数
const mockFn = createMockFunction()
mockFn.mockReturnValue(42)
mockFn.mockResolvedValue({ data: 'test' })

// Spy 函数
const spy = spyOn(obj, 'method')
expect(spy).toHaveBeenCalled()
```

### E2E 测试

```typescript
import {
  waitForElement,
  fillForm,
  clickAndWait,
  createPageObject,
} from '@ldesign/testing'
import { test, expect } from '@playwright/test'

test('登录测试', async ({ page }) => {
  await page.goto('/login')
  
  // 填写表单
  await fillForm(page, {
    '#username': 'admin',
    '#password': '123456',
  })
  
  // 点击并等待导航
  await clickAndWait(page, '#submit')
  
  // 断言
  await expect(page).toHaveURL('/dashboard')
})

// Page Object 模式
const loginPage = createPageObject(page, {
  username: '#username',
  password: '#password',
  submit: '#submit',
})

await loginPage.username.fill('admin')
await loginPage.submit.click()
```

### 快照测试

```typescript
import { SnapshotManager, VisualSnapshot } from '@ldesign/testing'

// 组件快照
const snapshot = await ComponentSnapshot.create(component, {
  name: 'Button',
  props: { type: 'primary' },
})

// 视觉快照
const visualSnapshot = new VisualSnapshot()
await visualSnapshot.create(page, {
  name: 'homepage',
  fullPage: true,
})

// 比较快照
const result = await visualSnapshot.compare(page, {
  name: 'homepage',
  threshold: 0.01,
})
```

## 🎯 预设配置详情

### Base（基础配置）
- 适用于通用 TypeScript/JavaScript 项目
- 覆盖率阈值：80%
- Vitest + V8 覆盖率

### Vue（Vue 项目）
- Vue 3 测试环境配置
- 覆盖率阈值：70%
- 排除 .vue 配置文件

### React（React 项目）
- React Testing Library 集成
- 覆盖率阈值：70%
- 排除 .stories 文件

### Node.js（Node 项目）
- 服务端测试配置
- 超时时间：10s
- 覆盖率阈值：80%

### Library（库项目）
- 高覆盖率要求：90%
- 排除构建产物（dist、lib、es）
- 完整的测试配置

## 🔧 命令行选项

### init 命令
```bash
npx ltesting init [options]

Options:
  -p, --preset <preset>  预设配置 (base|vue|react|node|library)
  -f, --force            强制覆盖已存在的配置
  --skip-prompts         跳过交互式提示
  --no-install          不安装依赖
```

### run 命令
```bash
npx ltesting run [options]

Options:
  -t, --type <type>              测试类型 (unit|e2e|all)
  -w, --watch                    监听模式
  -c, --coverage                 生成覆盖率报告
  -u, --update-snapshot          更新快照
  -v, --verbose                  详细输出
  --bail                         失败时立即退出
  --max-concurrency <n>          最大并发数
  --test-name-pattern <pattern>  测试名称过滤
  --test-path-pattern <pattern>  测试路径过滤
```

## 🎓 示例

查看 [examples](./examples) 目录获取更多示例：
- [基础测试示例](./examples/basic.test.ts)
- [Vue 组件测试](./examples/vue.test.ts)
- [React 组件测试](./examples/react.test.tsx)
- [E2E 测试示例](./examples/e2e.spec.ts)
- [Mock 数据示例](./examples/mock.test.ts)

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

MIT © LDesign Team

## 🔗 相关链接

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Faker.js 文档](https://fakerjs.dev/)
- [MSW 文档](https://mswjs.io/)

---

**@ldesign/testing** - 让测试变得简单而强大 ✨
