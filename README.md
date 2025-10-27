# @ldesign/testing

> 🧪 完整的测试工具集，让测试变得简单高效

## ✨ 特性

- 🧪 **单元测试** - Jest/Vitest 配置和工具函数
- 🎭 **E2E 测试** - Playwright/Cypress 集成
- 📸 **快照测试** - 组件快照测试管理
- 📊 **覆盖率报告** - 测试覆盖率统计和报告
- 🤖 **测试生成** - 基于 AI 的测试用例生成
- 🔄 **Mock 工具** - 强大的 Mock 工具函数
- ⚡ **并行执行** - 多进程并行测试

## 📦 安装

```bash
npm install @ldesign/testing --save-dev
```

## 🚀 快速开始

### 初始化测试配置

```bash
npx ldesign-testing init
```

### 运行测试

```bash
# 运行所有测试
npx ldesign-testing run

# 运行单元测试
npx ldesign-testing run:unit

# 运行 E2E 测试
npx ldesign-testing run:e2e

# 生成覆盖率报告
npx ldesign-testing coverage
```

## ⚙️ 配置

创建 `testing.config.js`：

```javascript
module.exports = {
  // 测试框架
  framework: 'jest', // 'jest', 'vitest'
  
  // 测试目录
  testDir: 'tests',
  
  // 覆盖率配置
  coverage: {
    threshold: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // E2E 配置
  e2e: {
    framework: 'playwright', // 'playwright', 'cypress'
    baseUrl: 'http://localhost:3000',
  },
  
  // Mock 配置
  mocks: {
    clearMocks: true,
    resetMocks: true,
  },
};
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 许可证

MIT © LDesign Team
@ldesign/testing - Testing utilities and helpers
