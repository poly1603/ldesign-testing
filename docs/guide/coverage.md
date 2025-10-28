# 覆盖率

测试覆盖率分析和报告。

## 生成覆盖率报告

```bash
npx ltesting coverage
```

## 配置阈值

```typescript
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
```

查看 [覆盖率 API](/api/coverage)。
