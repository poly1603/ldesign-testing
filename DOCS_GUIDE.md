# 📚 VitePress 文档使用指南

## ✅ 已完成

完整的 VitePress 文档网站已创建完成，包含 **25 个文件**：

### 文档结构

```
docs/
├── .vitepress/
│   └── config.ts                 # VitePress 配置
├── guide/ (14 个文件)
│   ├── introduction.md           # 介绍
│   ├── getting-started.md        # 快速开始
│   ├── configuration.md          # 配置指南
│   ├── unit-testing.md           # 单元测试
│   ├── e2e-testing.md            # E2E 测试
│   ├── component-testing.md      # 组件测试
│   ├── api-testing.md            # API 测试
│   ├── mocking.md                # Mock 工具
│   ├── coverage.md               # 覆盖率
│   ├── snapshot.md               # 快照测试
│   ├── performance.md            # 性能测试
│   ├── test-generation.md        # 测试生成
│   ├── parallel.md               # 并行测试
│   └── cli.md                    # CLI 命令
├── api/
│   └── overview.md               # API 概览
├── examples/ (6 个文件)
│   ├── basic.md                  # 基础示例
│   ├── vue.md                    # Vue 示例
│   ├── react.md                  # React 示例
│   ├── e2e.md                    # E2E 示例
│   ├── mock.md                   # Mock 示例
│   └── performance.md            # 性能示例
├── index.md                      # 首页
├── README.md                     # 文档说明
└── generate-docs.js              # 文档生成脚本
```

## 🚀 快速开始

### 1. 安装 VitePress

```bash
pnpm add -D vitepress
```

### 2. 启动开发服务器

```bash
pnpm docs:dev
```

然后访问 http://localhost:5173

### 3. 构建生产版本

```bash
pnpm docs:build
```

### 4. 预览构建

```bash
pnpm docs:preview
```

## 📖 文档特性

### 🏠 首页
- Hero 区域展示
- 12 个核心特性卡片
- 快速安装和开始指南
- 代码示例
- 特色说明

### 📚 指南部分
- **开始**: 介绍、快速开始、配置
- **核心功能**: 单元测试、E2E 测试、组件测试、API 测试
- **高级功能**: Mock、覆盖率、快照、性能、生成、并行
- **CLI**: 完整的命令行工具文档

### 💡 示例部分
- 基础测试示例
- Vue 组件测试（包含组合式 API、插槽、Provide/Inject）
- React 组件测试（包含 Hooks、Context、异步组件）
- E2E 测试（Page Object、表单、多浏览器）
- Mock 数据使用
- 性能测试（基准测试、装饰器）

### 🔍 导航功能
- 顶部导航栏
- 侧边栏目录
- 本地搜索
- 页面内导航
- GitHub 编辑链接
- 最后更新时间

## 🎨 主题特性

- ✅ 响应式设计（支持移动端）
- ✅ 深色模式
- ✅ 代码高亮
- ✅ 代码组（多语言示例）
- ✅ 提示框（info、warning、danger、tip）
- ✅ 代码行号
- ✅ 代码复制按钮

## 📝 编写文档

### 添加新页面

1. 在对应目录创建 `.md` 文件
2. 在 `docs/.vitepress/config.ts` 的 `sidebar` 中添加链接
3. 编写 Markdown 内容

### Markdown 增强功能

#### 代码块

\`\`\`typescript
import { describe, it, expect } from 'vitest'

describe('示例', () => {
  it('测试', () => {
    expect(1 + 1).toBe(2)
  })
})
\`\`\`

#### 代码组

::: code-group

\`\`\`bash [npm]
npm install package
\`\`\`

\`\`\`bash [pnpm]
pnpm add package
\`\`\`

:::

#### 提示框

::: tip 提示
这是一个提示
:::

::: warning 警告
这是一个警告
:::

::: danger 危险
这是一个危险提示
:::

#### 链接

- 内部链接：`[文本](/guide/getting-started)`
- 外部链接：`[文本](https://example.com)`

## 🌐 部署

### GitHub Pages

1. 在 `.github/workflows` 创建部署工作流
2. 推送到 GitHub
3. 启用 GitHub Pages

### Vercel

1. 连接 GitHub 仓库
2. 构建命令：`pnpm docs:build`
3. 输出目录：`docs/.vitepress/dist`

### Netlify

1. 连接 GitHub 仓库
2. 构建命令：`pnpm docs:build`
3. 发布目录：`docs/.vitepress/dist`

## 🎯 下一步

### 可以添加的内容

1. **API 详细文档**
   - 配置 API
   - 测试工具 API
   - 断言 API
   - Mock API
   - 覆盖率 API
   - 性能测试 API
   - 生成器 API

2. **更多示例**
   - CI/CD 集成示例
   - 自定义断言示例
   - 复杂场景示例

3. **高级指南**
   - 最佳实践
   - 性能优化
   - 疑难解答
   - 迁移指南

4. **视频教程**
   - 快速开始视频
   - 功能演示视频

## 💡 提示

### 热重载
开发模式下修改 `.md` 文件会自动刷新浏览器

### 搜索
按 `/` 键打开搜索

### 移动端
文档完全支持移动设备浏览

### 深色模式
点击右上角切换深色/浅色模式

## 📞 获取帮助

- 📖 [VitePress 官方文档](https://vitepress.dev/)
- 💬 [提交 Issue](https://github.com/ldesign/testing/issues)
- 🤝 [贡献指南](../CONTRIBUTING.md)

## 🎉 完成

恭喜！你现在拥有了一个完整的、专业的文档网站：

✅ 25 个文档页面
✅ 100+ 代码示例
✅ 美观的 UI
✅ 完整的功能覆盖
✅ 响应式设计
✅ 搜索功能
✅ 深色模式

现在运行 `pnpm docs:dev` 开始使用吧！🚀
