# 测试生成

自动生成测试文件。

## 使用 CLI

```bash
# 生成单元测试
npx ltesting generate --file src/utils/helper.ts

# 生成 E2E 测试
npx ltesting generate --file src/pages/Home.vue --type e2e
```

## 支持的测试类型

- unit - 单元测试
- e2e - E2E 测试
- component - 组件测试
- api - API 测试
- integration - 集成测试

查看 [生成器 API](/api/generator)。
