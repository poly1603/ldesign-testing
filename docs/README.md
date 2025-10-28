# @ldesign/testing 文档

这是 `@ldesign/testing` 的完整文档。

## 本地开发

安装 VitePress:

```bash
pnpm add -D vitepress
```

启动开发服务器:

```bash
pnpm docs:dev
```

构建文档:

```bash
pnpm docs:build
```

预览构建:

```bash
pnpm docs:preview
```

## 文档结构

```
docs/
├── .vitepress/          # VitePress 配置
│   └── config.ts        # 配置文件
├── guide/               # 指南
│   ├── introduction.md  # 介绍
│   ├── getting-started.md # 快速开始
│   ├── configuration.md # 配置
│   ├── unit-testing.md  # 单元测试
│   ├── e2e-testing.md   # E2E 测试
│   ├── mocking.md       # Mock 工具
│   └── ...
├── api/                 # API 文档
│   ├── overview.md      # 概览
│   └── ...
├── examples/            # 示例
│   ├── basic.md         # 基础示例
│   ├── vue.md           # Vue 示例
│   ├── react.md         # React 示例
│   └── ...
└── index.md             # 首页
```

## 贡献

欢迎贡献文档！请参阅 [贡献指南](../CONTRIBUTING.md)。
