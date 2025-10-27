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

