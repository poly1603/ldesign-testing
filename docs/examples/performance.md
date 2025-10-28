# 性能测试示例

使用 BenchmarkRunner 进行性能测试。

## 基础性能测试

```typescript
import { describe, it } from 'vitest'
import { BenchmarkRunner } from '@ldesign/testing'

describe('排序算法性能', () => {
  it('比较两种排序方法', async () => {
    const data = Array.from({ length: 10000 }, () => Math.random())
    
    const result = await BenchmarkRunner.compare(
      () => [...data].sort((a, b) => a - b),
      () => [...data].sort().map(Number),
      { iterations: 100 }
    )
    
    console.log(`${result.faster} 快 ${result.ratio.toFixed(2)}x`)
    console.log(`方法1: ${result.fn1.ops.toFixed(2)} ops/s`)
    console.log(`方法2: ${result.fn2.ops.toFixed(2)} ops/s`)
  })
})
```

## 测量执行时间

```typescript
import { BenchmarkRunner } from '@ldesign/testing'

const stats = await BenchmarkRunner.measure(
  () => {
    // 复杂计算
    let sum = 0
    for (let i = 0; i < 100000; i++) {
      sum += Math.sqrt(i)
    }
    return sum
  },
  1000 // 运行 1000 次
)

console.log(`平均时间: ${stats.mean.toFixed(2)}ms`)
console.log(`最小时间: ${stats.min.toFixed(2)}ms`)
console.log(`最大时间: ${stats.max.toFixed(2)}ms`)
```

## 性能装饰器

```typescript
import { benchmark } from '@ldesign/testing'

class DataProcessor {
  @benchmark({ name: '数据处理' })
  async processData(data: any[]) {
    // 处理数据
    return data.map(item => ({
      ...item,
      processed: true
    }))
  }

  @benchmark()
  async heavyComputation() {
    // 复杂计算
    let result = 0
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i)
    }
    return result
  }
}

// 使用时会自动打印性能信息
const processor = new DataProcessor()
await processor.processData(data)
// 输出: [Benchmark] 数据处理: 15.32ms
```

## 批量性能测试

```typescript
import { BenchmarkRunner } from '@ldesign/testing'

const runner = new BenchmarkRunner({
  warmup: 10,
  iterations: 100
})

// 添加多个测试
runner
  .add('方法A', () => methodA())
  .add('方法B', () => methodB())
  .add('方法C', () => methodC())

const results = await runner.run()

// 按性能排序
results.sort((a, b) => b.ops - a.ops)

console.log('性能排名:')
results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.name}: ${result.ops.toFixed(2)} ops/s`)
})
```

## 内存使用测试

```typescript
import { describe, it, expect } from 'vitest'

describe('内存使用', () => {
  it('应该不超过内存限制', () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // 执行操作
    const largeArray = new Array(1000000).fill(0)
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024
    
    console.log(`内存增加: ${memoryIncrease.toFixed(2)}MB`)
    expect(memoryIncrease).toBeLessThan(100) // 不超过 100MB
  })
})
```

## 异步性能测试

```typescript
import { BenchmarkRunner } from '@ldesign/testing'

const result = await BenchmarkRunner.compare(
  async () => {
    // Promise.all
    await Promise.all([
      fetchData1(),
      fetchData2(),
      fetchData3()
    ])
  },
  async () => {
    // 串行执行
    await fetchData1()
    await fetchData2()
    await fetchData3()
  }
)

console.log(`Promise.all ${result.faster === 'fn1' ? '更快' : '更慢'}`)
```

## 性能回归测试

```typescript
import { describe, it, expect } from 'vitest'
import { BenchmarkRunner } from '@ldesign/testing'

describe('性能回归', () => {
  it('新版本不应该变慢', async () => {
    const oldVersion = () => oldImplementation()
    const newVersion = () => newImplementation()
    
    const result = await BenchmarkRunner.compare(
      oldVersion,
      newVersion
    )
    
    // 新版本应该至少和旧版本一样快
    if (result.faster === 'fn1') {
      const slowdown = result.ratio
      expect(slowdown).toBeLessThan(1.1) // 允许最多慢 10%
    }
  })
})
```

## 渲染性能测试

```typescript
import { describe, it } from 'vitest'
import { BenchmarkRunner } from '@ldesign/testing'
import { render } from '@testing-library/react'
import Component from './Component'

describe('组件渲染性能', () => {
  it('应该快速渲染', async () => {
    const stats = await BenchmarkRunner.measure(
      () => {
        const { unmount } = render(<Component data={largeDataset} />)
        unmount()
      },
      100
    )
    
    console.log(`平均渲染时间: ${stats.mean.toFixed(2)}ms`)
    expect(stats.mean).toBeLessThan(50) // 平均不超过 50ms
  })
})
```

## 相关链接

- [性能测试指南](/guide/performance)
- [Benchmark API](/api/benchmark)
- [测试工具 API](/api/test-utils)
