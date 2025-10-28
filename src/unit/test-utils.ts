/**
 * 测试工具函数
 */
import type { TestingConfig } from '../types/index.js'

/**
 * 测试上下文
 */
export interface TestContext {
  config?: TestingConfig
  mocks?: Map<string, any>
  cleanup?: Array<() => void | Promise<void>>
}

/**
 * 创建测试上下文
 */
export function createTestContext(config?: TestingConfig): TestContext {
  return {
    config,
    mocks: new Map(),
    cleanup: [],
  }
}

/**
 * 清理测试上下文
 */
export async function cleanupTestContext(context: TestContext): Promise<void> {
  if (context.cleanup) {
    for (const fn of context.cleanup) {
      await fn()
    }
    context.cleanup = []
  }

  if (context.mocks) {
    context.mocks.clear()
  }
}

/**
 * 注册清理函数
 */
export function onCleanup(context: TestContext, fn: () => void | Promise<void>): void {
  if (!context.cleanup) {
    context.cleanup = []
  }
  context.cleanup.push(fn)
}

/**
 * 等待条件成立
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    message?: string
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = '等待超时' } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await sleep(interval)
  }

  throw new Error(message)
}

/**
 * 等待异步操作
 */
export async function waitForAsync<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: number
    message?: string
  } = {}
): Promise<T> {
  const { timeout = 5000, message = '异步操作超时' } = options

  return Promise.race([
    fn(),
    sleep(timeout).then(() => {
      throw new Error(message)
    }),
  ])
}

/**
 * 休眠
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 重试执行
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options
  let lastError: Error

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (onRetry) {
        onRetry(lastError, attempt)
      }
      if (attempt < retries) {
        await sleep(delay)
      }
    }
  }

  throw lastError!
}

/**
 * 模拟时间流逝
 */
export async function advanceTime(ms: number): Promise<void> {
  // 如果使用了 vi.useFakeTimers()，可以使用 vi.advanceTimersByTime()
  // 这里提供一个简单的实现
  await sleep(ms)
}

/**
 * 捕获控制台输出
 */
export class ConsoleCapture {
  private originalLog: typeof console.log
  private originalWarn: typeof console.warn
  private originalError: typeof console.error
  private logs: string[] = []
  private warns: string[] = []
  private errors: string[] = []

  start(): void {
    this.originalLog = console.log
    this.originalWarn = console.warn
    this.originalError = console.error

    console.log = (...args: any[]) => {
      this.logs.push(args.join(' '))
    }

    console.warn = (...args: any[]) => {
      this.warns.push(args.join(' '))
    }

    console.error = (...args: any[]) => {
      this.errors.push(args.join(' '))
    }
  }

  stop(): void {
    console.log = this.originalLog
    console.warn = this.originalWarn
    console.error = this.originalError
  }

  getLogs(): string[] {
    return this.logs
  }

  getWarns(): string[] {
    return this.warns
  }

  getErrors(): string[] {
    return this.errors
  }

  clear(): void {
    this.logs = []
    this.warns = []
    this.errors = []
  }
}

/**
 * 创建测试超时
 */
export function createTimeout(
  ms: number,
  message = '测试超时'
): { promise: Promise<never>; cancel: () => void } {
  let timeoutId: NodeJS.Timeout
  let reject: (reason: Error) => void

  const promise = new Promise<never>((_, rej) => {
    reject = rej
    timeoutId = setTimeout(() => {
      rej(new Error(message))
    }, ms)
  })

  const cancel = () => {
    clearTimeout(timeoutId)
  }

  return { promise, cancel }
}

/**
 * 节流执行
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn(...args)
    }
  }) as T
}

/**
 * 防抖执行
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | undefined

  const debounced = ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  return debounced
}

/**
 * 批量执行
 */
export async function batchExecute<T>(
  items: T[],
  batchSize: number,
  executor: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await executor(batch)
  }
}

/**
 * 并发执行
 */
export async function concurrentExecute<T, R>(
  items: T[],
  concurrency: number,
  executor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const promise = executor(item).then((result) => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * 模拟延迟
 */
export async function simulateDelay(
  min: number,
  max?: number
): Promise<void> {
  const delay = max ? Math.random() * (max - min) + min : min
  await sleep(delay)
}

/**
 * 模拟网络请求
 */
export class MockNetworkRequest<T = any> {
  constructor(
    private data: T,
    private options: {
      delay?: number
      failureRate?: number
      error?: Error
    } = {}
  ) {}

  async execute(): Promise<T> {
    if (this.options.delay) {
      await sleep(this.options.delay)
    }

    if (this.options.failureRate && Math.random() < this.options.failureRate) {
      throw this.options.error || new Error('Network request failed')
    }

    return this.data
  }
}

/**
 * 测试数据构建器
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {}

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value
    return this
  }

  withMultiple(values: Partial<T>): this {
    Object.assign(this.data, values)
    return this
  }

  build(): T {
    return this.data as T
  }

  buildMany(count: number): T[] {
    return Array.from({ length: count }, () => ({ ...this.data }) as T)
  }
}

/**
 * 事件监听器
 */
export class EventListener<T = any> {
  private events: T[] = []

  record(event: T): void {
    this.events.push(event)
  }

  getEvents(): T[] {
    return this.events
  }

  getLastEvent(): T | undefined {
    return this.events[this.events.length - 1]
  }

  getEventCount(): number {
    return this.events.length
  }

  clear(): void {
    this.events = []
  }

  async waitForEvent(
    predicate: (event: T) => boolean,
    timeout = 5000
  ): Promise<T> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const event = this.events.find(predicate)
      if (event) {
        return event
      }
      await sleep(100)
    }

    throw new Error('Event not found within timeout')
  }
}

