/**
 * 性能基准测试
 */
import { Bench } from 'tinybench'

export interface BenchmarkOptions {
  /** 测试名称 */
  name?: string
  /** 预热次数 */
  warmup?: number
  /** 迭代次数 */
  iterations?: number
  /** 超时时间 */
  timeout?: number
}

export interface BenchmarkResult {
  name: string
  ops: number
  margin: number
  samples: number
  mean: number
  variance: number
  sd: number
  min: number
  max: number
  p75: number
  p99: number
  p995: number
  p999: number
}

export class BenchmarkRunner {
  private bench: Bench

  constructor(options: BenchmarkOptions = {}) {
    this.bench = new Bench({
      warmupIterations: options.warmup,
      iterations: options.iterations,
      time: options.timeout,
    })
  }

  /**
   * 添加测试用例
   */
  add(name: string, fn: () => void | Promise<void>): this {
    this.bench.add(name, fn)
    return this
  }

  /**
   * 运行基准测试
   */
  async run(): Promise<BenchmarkResult[]> {
    await this.bench.run()

    return this.bench.tasks.map((task) => ({
      name: task.name,
      ops: task.result?.hz || 0,
      margin: task.result?.rme || 0,
      samples: task.result?.samples.length || 0,
      mean: task.result?.mean || 0,
      variance: task.result?.variance || 0,
      sd: task.result?.sd || 0,
      min: task.result?.min || 0,
      max: task.result?.max || 0,
      p75: task.result?.p75 || 0,
      p99: task.result?.p99 || 0,
      p995: task.result?.p995 || 0,
      p999: task.result?.p999 || 0,
    }))
  }

  /**
   * 比较两个函数的性能
   */
  static async compare(
    fn1: () => void | Promise<void>,
    fn2: () => void | Promise<void>,
    options: BenchmarkOptions = {}
  ): Promise<{
    fn1: BenchmarkResult
    fn2: BenchmarkResult
    faster: 'fn1' | 'fn2'
    ratio: number
  }> {
    const runner = new BenchmarkRunner(options)
    runner.add('fn1', fn1)
    runner.add('fn2', fn2)

    const results = await runner.run()
    const fn1Result = results[0]
    const fn2Result = results[1]

    const faster = fn1Result.ops > fn2Result.ops ? 'fn1' : 'fn2'
    const ratio =
      faster === 'fn1'
        ? fn1Result.ops / fn2Result.ops
        : fn2Result.ops / fn1Result.ops

    return {
      fn1: fn1Result,
      fn2: fn2Result,
      faster,
      ratio,
    }
  }

  /**
   * 测量单个函数的执行时间
   */
  static async measure(
    fn: () => void | Promise<void>,
    iterations = 1000
  ): Promise<{
    mean: number
    min: number
    max: number
    total: number
  }> {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      const end = performance.now()
      times.push(end - start)
    }

    const total = times.reduce((sum, t) => sum + t, 0)
    const mean = total / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)

    return { mean, min, max, total }
  }
}

/**
 * 性能分析装饰器
 */
export function benchmark(options: BenchmarkOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const start = performance.now()
      const result = await originalMethod.apply(this, args)
      const end = performance.now()

      console.log(
        `[Benchmark] ${options.name || propertyKey}: ${(end - start).toFixed(2)}ms`
      )

      return result
    }

    return descriptor
  }
}
