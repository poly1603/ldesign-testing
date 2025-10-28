/**
 * 自定义断言扩展
 */

/**
 * 断言对象包含属性
 */
export function assertHasProperty<T extends object>(
  obj: T,
  property: string | symbol,
  message?: string
): void {
  if (!(property in obj)) {
    throw new Error(message || `对象不包含属性: ${String(property)}`)
  }
}

/**
 * 断言对象包含所有属性
 */
export function assertHasProperties<T extends object>(
  obj: T,
  properties: Array<string | symbol>,
  message?: string
): void {
  const missing = properties.filter((prop) => !(prop in obj))
  if (missing.length > 0) {
    throw new Error(
      message || `对象缺少以下属性: ${missing.map(String).join(', ')}`
    )
  }
}

/**
 * 断言是类型
 */
export function assertType(
  value: any,
  type: string,
  message?: string
): void {
  const actualType = typeof value
  if (actualType !== type) {
    throw new Error(
      message || `类型不匹配: 期望 ${type}，实际 ${actualType}`
    )
  }
}

/**
 * 断言是实例
 */
export function assertInstanceOf<T>(
  value: any,
  constructor: new (...args: any[]) => T,
  message?: string
): asserts value is T {
  if (!(value instanceof constructor)) {
    throw new Error(
      message ||
      `实例类型不匹配: 期望 ${constructor.name}，实际 ${value?.constructor?.name || typeof value}`
    )
  }
}

/**
 * 断言抛出错误
 */
export async function assertThrows(
  fn: () => any | Promise<any>,
  expectedError?: string | RegExp | (new (...args: any[]) => Error),
  message?: string
): Promise<Error> {
  let error: Error | undefined

  try {
    await fn()
  } catch (e) {
    error = e as Error
  }

  if (!error) {
    throw new Error(message || '预期抛出错误，但没有抛出')
  }

  if (expectedError) {
    if (typeof expectedError === 'string') {
      if (!error.message.includes(expectedError)) {
        throw new Error(
          `错误消息不匹配: 期望包含 "${expectedError}"，实际为 "${error.message}"`
        )
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(error.message)) {
        throw new Error(
          `错误消息不匹配: 期望匹配 ${expectedError}，实际为 "${error.message}"`
        )
      }
    } else {
      assertInstanceOf(error, expectedError, message)
    }
  }

  return error
}

/**
 * 断言不抛出错误
 */
export async function assertNotThrows(
  fn: () => any | Promise<any>,
  message?: string
): Promise<void> {
  try {
    await fn()
  } catch (error) {
    throw new Error(
      message || `预期不抛出错误，但抛出了: ${(error as Error).message}`
    )
  }
}

/**
 * 断言对象相等（深度比较）
 */
export function assertDeepEqual<T>(
  actual: T,
  expected: T,
  message?: string
): void {
  const actualStr = JSON.stringify(actual, null, 2)
  const expectedStr = JSON.stringify(expected, null, 2)

  if (actualStr !== expectedStr) {
    throw new Error(
      message ||
      `对象不相等:\n期望:\n${expectedStr}\n实际:\n${actualStr}`
    )
  }
}

/**
 * 断言数组包含
 */
export function assertArrayContains<T>(
  array: T[],
  value: T,
  message?: string
): void {
  if (!array.includes(value)) {
    throw new Error(
      message || `数组不包含值: ${JSON.stringify(value)}`
    )
  }
}

/**
 * 断言数组包含所有
 */
export function assertArrayContainsAll<T>(
  array: T[],
  values: T[],
  message?: string
): void {
  const missing = values.filter((v) => !array.includes(v))
  if (missing.length > 0) {
    throw new Error(
      message ||
      `数组缺少以下值: ${missing.map((v) => JSON.stringify(v)).join(', ')}`
    )
  }
}

/**
 * 断言字符串包含
 */
export function assertStringContains(
  string: string,
  substring: string,
  message?: string
): void {
  if (!string.includes(substring)) {
    throw new Error(
      message || `字符串不包含: "${substring}"`
    )
  }
}

/**
 * 断言字符串匹配正则
 */
export function assertStringMatches(
  string: string,
  pattern: RegExp,
  message?: string
): void {
  if (!pattern.test(string)) {
    throw new Error(
      message || `字符串不匹配正则: ${pattern}`
    )
  }
}

/**
 * 断言范围
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  if (value < min || value > max) {
    throw new Error(
      message || `值 ${value} 不在范围 [${min}, ${max}] 内`
    )
  }
}

/**
 * 断言近似相等（用于浮点数）
 */
export function assertAlmostEqual(
  actual: number,
  expected: number,
  delta = 1e-10,
  message?: string
): void {
  const diff = Math.abs(actual - expected)
  if (diff > delta) {
    throw new Error(
      message || `数值差异过大: |${actual} - ${expected}| = ${diff} > ${delta}`
    )
  }
}

/**
 * 断言是 null 或 undefined
 */
export function assertNullish(
  value: any,
  message?: string
): asserts value is null | undefined {
  if (value !== null && value !== undefined) {
    throw new Error(
      message || `预期为 null 或 undefined，实际为 ${typeof value}`
    )
  }
}

/**
 * 断言不是 null 或 undefined
 */
export function assertNotNullish<T>(
  value: T,
  message?: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(
      message || `预期不为 null 或 undefined`
    )
  }
}

/**
 * 断言是空数组
 */
export function assertEmpty<T>(
  array: T[] | string,
  message?: string
): void {
  if (array.length !== 0) {
    throw new Error(
      message || `预期为空，实际长度为 ${array.length}`
    )
  }
}

/**
 * 断言不是空数组
 */
export function assertNotEmpty<T>(
  array: T[] | string,
  message?: string
): void {
  if (array.length === 0) {
    throw new Error(
      message || `预期不为空`
    )
  }
}

/**
 * 断言数组长度
 */
export function assertArrayLength<T>(
  array: T[],
  length: number,
  message?: string
): void {
  if (array.length !== length) {
    throw new Error(
      message || `数组长度不匹配: 期望 ${length}，实际 ${array.length}`
    )
  }
}

/**
 * 断言对象键值
 */
export function assertObjectHasKeyValue<T extends object>(
  obj: T,
  key: string,
  value: any,
  message?: string
): void {
  if (!(key in obj)) {
    throw new Error(
      message || `对象不包含键: ${key}`
    )
  }
  if ((obj as any)[key] !== value) {
    throw new Error(
      message || `对象键值不匹配: 期望 ${key} = ${JSON.stringify(value)}，实际为 ${JSON.stringify((obj as any)[key])}`
    )
  }
}

/**
 * 断言Promise resolve
 */
export async function assertResolves<T>(
  promise: Promise<T>,
  expected?: T,
  message?: string
): Promise<T> {
  try {
    const result = await promise
    if (expected !== undefined && result !== expected) {
      throw new Error(
        message || `Promise 结果不匹配: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(result)}`
      )
    }
    return result
  } catch (error) {
    throw new Error(
      message || `预期 Promise resolve，但它 reject 了: ${(error as Error).message}`
    )
  }
}

/**
 * 断言Promise reject
 */
export async function assertRejects(
  promise: Promise<any>,
  expectedError?: string | RegExp,
  message?: string
): Promise<Error> {
  try {
    await promise
    throw new Error(
      message || `预期 Promise reject，但它 resolve 了`
    )
  } catch (error) {
    const err = error as Error
    
    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!err.message.includes(expectedError)) {
          throw new Error(
            message || `错误消息不匹配: 期望包含 "${expectedError}"，实际为 "${err.message}"`
          )
        }
      } else if (!expectedError.test(err.message)) {
        throw new Error(
          message || `错误消息不匹配: 期望匹配 ${expectedError}，实际为 "${err.message}"`
        )
      }
    }
    
    return err
  }
}

/**
 * 断言函数被调用
 */
export function assertCalled(
  fn: { called?: boolean; callCount?: number },
  message?: string
): void {
  if (!fn.called && (!fn.callCount || fn.callCount === 0)) {
    throw new Error(
      message || `预期函数被调用，但它没有被调用`
    )
  }
}

/**
 * 断言函数调用次数
 */
export function assertCalledTimes(
  fn: { callCount?: number },
  times: number,
  message?: string
): void {
  if (fn.callCount !== times) {
    throw new Error(
      message || `预期函数被调用 ${times} 次，实际为 ${fn.callCount || 0} 次`
    )
  }
}

/**
 * 断言函数被调用时使用指定参数
 */
export function assertCalledWith(
  fn: { lastCall?: any[] },
  ...args: any[]
): void {
  if (!fn.lastCall) {
    throw new Error(`函数还没有被调用`)
  }
  
  const actualArgs = JSON.stringify(fn.lastCall)
  const expectedArgs = JSON.stringify(args)
  
  if (actualArgs !== expectedArgs) {
    throw new Error(
      `函数调用参数不匹配:\n期望: ${expectedArgs}\n实际: ${actualArgs}`
    )
  }
}

/**
 * 断言是函数
 */
export function assertFunction(
  value: any,
  message?: string
): asserts value is Function {
  if (typeof value !== 'function') {
    throw new Error(
      message || `预期为函数，实际为 ${typeof value}`
    )
  }
}

/**
 * 断言是对象
 */
export function assertObject(
  value: any,
  message?: string
): asserts value is object {
  if (typeof value !== 'object' || value === null) {
    throw new Error(
      message || `预期为对象，实际为 ${typeof value}`
    )
  }
}

/**
 * 断言是数组
 */
export function assertArray(
  value: any,
  message?: string
): asserts value is any[] {
  if (!Array.isArray(value)) {
    throw new Error(
      message || `预期为数组，实际为 ${typeof value}`
    )
  }
}

