# 性能测试

基准测试和性能分析。

## 基准测试

```typescript
import { BenchmarkRunner } from '@ldesign/testing'

const result = await BenchmarkRunner.compare(
  () => method1(),
  () => method2()
)

console.log(`${result.faster} is ${result.ratio}x faster`)
```

## 性能装饰器

```typescript
import { benchmark } from '@ldesign/testing'

class MyClass {
  @benchmark()
  async heavyOperation() {
    // ...
  }
}
```

查看 [性能 API](/api/benchmark)。
