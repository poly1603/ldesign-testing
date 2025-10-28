---
layout: home

hero:
  name: "@ldesign/testing"
  text: "完整的企业级测试工具集"
  tagline: 整合 Vitest、Playwright、Mock 系统、覆盖率分析、性能测试等，让测试变得简单而强大
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic
    - theme: alt
      text: GitHub
      link: https://github.com/ldesign/testing

features:
  - icon: 🧪
    title: 单元测试
    details: 基于 Vitest 的强大单元测试支持，提供丰富的测试工具和自定义断言

  - icon: 🎭
    title: E2E 测试
    details: Playwright 无缝集成，支持多浏览器、Page Object 模式和可视化调试

  - icon: 📸
    title: 快照测试
    details: 组件快照和视觉回归测试，确保 UI 的一致性

  - icon: 📊
    title: 覆盖率分析
    details: 详细的覆盖率报告、智能分析和改进建议，帮助提升测试质量

  - icon: 🔄
    title: Mock 系统
    details: 12+ 种预定义数据类型、Faker.js 集成、MSW 支持，轻松生成测试数据

  - icon: ⚡
    title: 性能测试
    details: 基准测试、性能比较和性能监控，优化代码性能

  - icon: 🤖
    title: 测试生成
    details: 自动生成单元、E2E、组件、API 测试，节省开发时间

  - icon: 🚀
    title: 并行执行
    details: 多进程并行测试，大幅提升测试执行速度

  - icon: 🎯
    title: 预设配置
    details: Vue、React、Node.js、Library 等开箱即用的项目模板

  - icon: 🛠️
    title: 强大的 CLI
    details: 丰富的命令行工具，简化测试流程

  - icon: 📦
    title: TypeScript 优先
    details: 完整的 TypeScript 类型定义，提供优秀的开发体验

  - icon: 🌍
    title: 企业级
    details: 生产就绪，适用于大型项目和团队协作
---

## 快速安装

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

## 快速开始

### 1. 初始化配置

```bash
npx ltesting init
```

选择适合你项目的预设配置（Vue、React、Node.js 等）

### 2. 运行测试

```bash
# 运行所有测试
npx ltesting run

# 运行单元测试
npx ltesting run:unit

# 运行 E2E 测试
npx ltesting run:e2e

# 生成覆盖率报告
npx ltesting coverage
```

### 3. 编写测试

```typescript
import { describe, it, expect } from 'vitest'
import { waitFor, assertNotNullish } from '@ldesign/testing'

describe('示例测试', () => {
  it('应该通过基础断言', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该支持异步测试', async () => {
    const data = await fetchData()
    assertNotNullish(data)
    expect(data.status).toBe('success')
  })

  it('应该等待条件成立', async () => {
    await waitFor(() => element.isVisible(), {
      timeout: 5000
    })
  })
})
```

## 为什么选择 @ldesign/testing？

### 🎯 一站式解决方案

不需要单独配置多个测试工具，`@ldesign/testing` 整合了所有你需要的测试功能。

### 📚 丰富的功能

从基础的单元测试到高级的性能测试、从 Mock 数据到测试生成，应有尽有。

### 🚀 开箱即用

提供多种预设配置，快速开始测试，无需复杂配置。

### 💪 TypeScript 支持

完整的类型定义，享受智能提示和类型检查。

### 🌟 持续更新

跟随最新的测试最佳实践，保持工具的现代化。

## 社区与支持

- [GitHub 仓库](https://github.com/ldesign/testing)
- [报告问题](https://github.com/ldesign/testing/issues)
- [贡献指南](https://github.com/ldesign/testing/blob/main/CONTRIBUTING.md)

## 开源协议

[MIT License](https://github.com/ldesign/testing/blob/main/LICENSE) © 2024-present LDesign Team
