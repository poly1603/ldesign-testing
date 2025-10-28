/**
 * 批量生成文档文件的脚本
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docs = {
  'guide/configuration.md': `# 配置

详细的配置选项说明。

## defineConfig

\`\`\`typescript
import { defineConfig } from '@ldesign/testing'

export default defineConfig({
  // 配置选项
})
\`\`\`

## 完整配置示例

查看 [API 文档](/api/config) 了解所有配置选项。
`,

  'guide/unit-testing.md': `# 单元测试

基于 Vitest 的单元测试指南。

## 基础示例

\`\`\`typescript
import { describe, it, expect } from 'vitest'

describe('单元测试', () => {
  it('基础测试', () => {
    expect(1 + 1).toBe(2)
  })
})
\`\`\`

查看更多 [示例](/examples/basic)。
`,

  'guide/e2e-testing.md': `# E2E 测试

使用 Playwright 进行端到端测试。

## 基础示例

\`\`\`typescript
import { test, expect } from '@playwright/test'

test('E2E 测试', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Home/)
})
\`\`\`
`,

  'guide/component-testing.md': `# 组件测试

Vue 和 React 组件测试。

## Vue 组件

\`\`\`typescript
import { mount } from '@vue/test-utils'
import MyComponent from './MyComponent.vue'

it('渲染组件', () => {
  const wrapper = mount(MyComponent)
  expect(wrapper.text()).toContain('Hello')
})
\`\`\`

## React 组件

\`\`\`typescript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

it('渲染组件', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
\`\`\`
`,

  'guide/api-testing.md': `# API 测试

RESTful API 测试指南。

\`\`\`typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'

describe('API 测试', () => {
  it('GET /', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(200)
  })
})
\`\`\`
`,

  'guide/mocking.md': `# Mock 工具

强大的 Mock 数据生成和 API Mock。

## Mock 数据生成

\`\`\`typescript
import { mockFactory } from '@ldesign/testing'

const users = mockFactory.user(10)
const products = mockFactory.product(20)
\`\`\`

## 支持的数据类型

- user, product, article, comment, order
- company, event, payment, blog, notification
- task, course

查看 [Mock API](/api/mock) 了解更多。
`,

  'guide/coverage.md': `# 覆盖率

测试覆盖率分析和报告。

## 生成覆盖率报告

\`\`\`bash
npx ltesting coverage
\`\`\`

## 配置阈值

\`\`\`typescript
export default defineConfig({
  coverage: {
    threshold: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
})
\`\`\`

查看 [覆盖率 API](/api/coverage)。
`,

  'guide/snapshot.md': `# 快照测试

组件快照和视觉回归测试。

## 组件快照

\`\`\`typescript
import { ComponentSnapshot } from '@ldesign/testing'

const snapshot = await ComponentSnapshot.create(component, {
  name: 'Button',
  props: { type: 'primary' }
})
\`\`\`

## 更新快照

\`\`\`bash
npx ltesting snapshot update
\`\`\`
`,

  'guide/performance.md': `# 性能测试

基准测试和性能分析。

## 基准测试

\`\`\`typescript
import { BenchmarkRunner } from '@ldesign/testing'

const result = await BenchmarkRunner.compare(
  () => method1(),
  () => method2()
)

console.log(\`\${result.faster} is \${result.ratio}x faster\`)
\`\`\`

## 性能装饰器

\`\`\`typescript
import { benchmark } from '@ldesign/testing'

class MyClass {
  @benchmark()
  async heavyOperation() {
    // ...
  }
}
\`\`\`

查看 [性能 API](/api/benchmark)。
`,

  'guide/test-generation.md': `# 测试生成

自动生成测试文件。

## 使用 CLI

\`\`\`bash
# 生成单元测试
npx ltesting generate --file src/utils/helper.ts

# 生成 E2E 测试
npx ltesting generate --file src/pages/Home.vue --type e2e
\`\`\`

## 支持的测试类型

- unit - 单元测试
- e2e - E2E 测试
- component - 组件测试
- api - API 测试
- integration - 集成测试

查看 [生成器 API](/api/generator)。
`,

  'guide/parallel.md': `# 并行测试

多进程并行执行测试。

## 配置

\`\`\`typescript
export default defineConfig({
  parallel: {
    enabled: true,
    workers: 4
  }
})
\`\`\`

## CLI 选项

\`\`\`bash
npx ltesting run --max-concurrency 8
\`\`\`
`,

  'api/overview.md': `# API 概览

\`@ldesign/testing\` 的完整 API 参考。

## 导出模块

- **配置** - defineConfig, ConfigLoader
- **测试工具** - waitFor, retry, sleep
- **断言** - 14+ 自定义断言
- **Mock** - mockFactory, 12+ 数据类型
- **覆盖率** - CoverageReporter, CoverageAnalyzer
- **性能** - BenchmarkRunner, benchmark
- **生成器** - TestGenerator

查看各个模块的详细文档。
`,

  'examples/basic.md': `# 基础示例

基础测试示例。

\`\`\`typescript
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
\`\`\`
`,

  'examples/mock.md': `# Mock 示例

Mock 数据使用示例。

\`\`\`typescript
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
\`\`\`
`
}

// 生成文档文件
Object.entries(docs).forEach(([file, content]) => {
  const filePath = path.join(__dirname, file)
  const dir = path.dirname(filePath)
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8')
  console.log(`✓ Created: ${file}`)
})

console.log('\n✓ All documentation files created!')
