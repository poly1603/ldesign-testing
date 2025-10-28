# 并行测试

多进程并行执行测试。

## 配置

```typescript
export default defineConfig({
  parallel: {
    enabled: true,
    workers: 4
  }
})
```

## CLI 选项

```bash
npx ltesting run --max-concurrency 8
```
