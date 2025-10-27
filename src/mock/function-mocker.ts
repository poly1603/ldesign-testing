/**
 * 函数 Mock 工具
 */

/**
 * Mock 函数
 */
export interface MockFunction<T extends (...args: any[]) => any = any> {
  (...args: Parameters<T>): ReturnType<T>
  mockReturnValue(value: ReturnType<T>): this
  mockResolvedValue(value: Awaited<ReturnType<T>>): this
  mockRejectedValue(error: any): this
  mockImplementation(fn: T): this
  mockReturnValueOnce(value: ReturnType<T>): this
  mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this
  mockRejectedValueOnce(error: any): this
  mockClear(): this
  mockReset(): this
  mockRestore(): this
  getMockCalls(): Parameters<T>[]
  getMockResults(): Array<{ type: 'return' | 'throw'; value: any }>
  mock: {
    calls: Parameters<T>[]
    results: Array<{ type: 'return' | 'throw'; value: any }>
    instances: any[]
    contexts: any[]
    lastCall?: Parameters<T>
  }
}

/**
 * 创建 Mock 函数
 */
export function createMockFunction<T extends (...args: any[]) => any>(
  implementation?: T
): MockFunction<T> {
  const calls: Parameters<T>[] = []
  const results: Array<{ type: 'return' | 'throw'; value: any }> = []
  const instances: any[] = []
  const contexts: any[] = []

  let currentImplementation = implementation
  const returnValues: ReturnType<T>[] = []
  const resolvedValues: Awaited<ReturnType<T>>[] = []
  const rejectedValues: any[] = []

  const mockFn = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    calls.push(args)
    instances.push(this)
    contexts.push(this)

    // 一次性返回值
    if (returnValues.length > 0) {
      const value = returnValues.shift()!
      results.push({ type: 'return', value })
      return value
    }

    if (resolvedValues.length > 0) {
      const value = resolvedValues.shift()!
      const promise = Promise.resolve(value) as ReturnType<T>
      results.push({ type: 'return', value: promise })
      return promise
    }

    if (rejectedValues.length > 0) {
      const error = rejectedValues.shift()!
      const promise = Promise.reject(error) as ReturnType<T>
      results.push({ type: 'throw', value: error })
      return promise
    }

    // 执行实现
    if (currentImplementation) {
      try {
        const result = currentImplementation.apply(this, args)
        results.push({ type: 'return', value: result })
        return result
      } catch (error) {
        results.push({ type: 'throw', value: error })
        throw error
      }
    }

    // 默认返回 undefined
    const result = undefined as ReturnType<T>
    results.push({ type: 'return', value: result })
    return result
  } as MockFunction<T>

  // 添加 Mock 方法
  mockFn.mockReturnValue = (value: ReturnType<T>) => {
    currentImplementation = (() => value) as T
    return mockFn
  }

  mockFn.mockResolvedValue = (value: Awaited<ReturnType<T>>) => {
    currentImplementation = (() => Promise.resolve(value)) as T
    return mockFn
  }

  mockFn.mockRejectedValue = (error: any) => {
    currentImplementation = (() => Promise.reject(error)) as T
    return mockFn
  }

  mockFn.mockImplementation = (fn: T) => {
    currentImplementation = fn
    return mockFn
  }

  mockFn.mockReturnValueOnce = (value: ReturnType<T>) => {
    returnValues.push(value)
    return mockFn
  }

  mockFn.mockResolvedValueOnce = (value: Awaited<ReturnType<T>>) => {
    resolvedValues.push(value)
    return mockFn
  }

  mockFn.mockRejectedValueOnce = (error: any) => {
    rejectedValues.push(error)
    return mockFn
  }

  mockFn.mockClear = () => {
    calls.length = 0
    results.length = 0
    instances.length = 0
    contexts.length = 0
    return mockFn
  }

  mockFn.mockReset = () => {
    mockFn.mockClear()
    currentImplementation = undefined
    returnValues.length = 0
    resolvedValues.length = 0
    rejectedValues.length = 0
    return mockFn
  }

  mockFn.mockRestore = () => {
    mockFn.mockReset()
    currentImplementation = implementation
    return mockFn
  }

  mockFn.getMockCalls = () => calls
  mockFn.getMockResults = () => results

  mockFn.mock = {
    calls,
    results,
    instances,
    contexts,
    get lastCall() {
      return calls[calls.length - 1]
    },
  }

  return mockFn
}

/**
 * Mock 对象属性
 */
export function mockProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): () => void {
  const original = obj[key]
  obj[key] = value

  return () => {
    obj[key] = original
  }
}

/**
 * Mock 模块
 */
export function mockModule<T extends Record<string, any>>(
  module: T,
  mocks: Partial<Record<keyof T, any>>
): () => void {
  const originals = new Map<keyof T, any>()

  Object.entries(mocks).forEach(([key, value]) => {
    originals.set(key as keyof T, module[key])
    module[key] = value
  })

  return () => {
    originals.forEach((value, key) => {
      module[key] = value
    })
  }
}

/**
 * Spy 函数（保留原始实现但记录调用）
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K
): MockFunction<T[K] extends (...args: any[]) => any ? T[K] : never> {
  const original = obj[method] as any
  const mockFn = createMockFunction(original)

  obj[method] = mockFn as any

  mockFn.mockRestore = () => {
    obj[method] = original
    return mockFn
  }

  return mockFn
}

