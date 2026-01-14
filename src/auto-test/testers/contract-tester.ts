/**
 * @ldesign/testing - Contract Tester
 * 合约测试模块 - OpenAPI/Swagger/GraphQL/JSON Schema 验证
 */

import type { Page, Response, Request } from '@playwright/test'
import type {
  ContractTestConfig,
  ContractTestResult,
  SchemaValidationResult,
  BaseTester,
} from '../types/extended.js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 默认合约测试配置
 */
export const DEFAULT_CONTRACT_CONFIG: Required<ContractTestConfig> = {
  enabled: true,
  specType: 'openapi',
  specFile: '',
  graphqlSchema: '',
  baseUrl: '',
  validateRequests: true,
  validateResponses: true,
  strictMode: false,
  checkBackwardCompatibility: false,
  previousSpecFile: '',
  ignoreEndpoints: [],
}

/**
 * JSON Schema 类型定义
 */
interface JSONSchema {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  enum?: unknown[]
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  additionalProperties?: boolean | JSONSchema
  $ref?: string
  allOf?: JSONSchema[]
  anyOf?: JSONSchema[]
  oneOf?: JSONSchema[]
}

/**
 * OpenAPI 规范类型
 */
interface OpenAPISpec {
  openapi?: string
  swagger?: string
  info: {
    title: string
    version: string
  }
  paths: Record<
    string,
    Record<
      string,
      {
        operationId?: string
        parameters?: Array<{
          name: string
          in: string
          required?: boolean
          schema?: JSONSchema
        }>
        requestBody?: {
          required?: boolean
          content?: Record<
            string,
            {
              schema?: JSONSchema
            }
          >
        }
        responses: Record<
          string,
          {
            description?: string
            content?: Record<
              string,
              {
                schema?: JSONSchema
              }
            >
          }
        >
      }
    >
  >
  components?: {
    schemas?: Record<string, JSONSchema>
  }
}

/**
 * 合约测试器
 */
export class ContractTester
  implements BaseTester<ContractTestConfig, ContractTestResult>
{
  readonly config: Required<ContractTestConfig>
  private spec: OpenAPISpec | null = null
  private previousSpec: OpenAPISpec | null = null
  private interceptedRequests: Map<string, { request: Request; response?: Response }> =
    new Map()

  constructor(config: ContractTestConfig = {}) {
    this.config = { ...DEFAULT_CONTRACT_CONFIG, ...config }
  }

  /**
   * 运行合约测试
   */
  async run(page?: Page): Promise<ContractTestResult> {
    const result: ContractTestResult = {
      specType: this.config.specType,
      endpointsTested: 0,
      violations: [],
      breakingChanges: [],
      schemaValidation: { valid: true, errors: [] },
      score: 100,
    }

    // 加载规范文件
    try {
      await this.loadSpec()
    } catch (error) {
      result.schemaValidation = {
        valid: false,
        errors: [
          {
            path: 'spec',
            message: `Failed to load spec: ${error instanceof Error ? error.message : 'Unknown error'}`,
            keyword: 'load',
          },
        ],
      }
      result.score = 0
      return result
    }

    // 验证规范本身
    result.schemaValidation = this.validateSpec()

    // 设置请求拦截
    if (page) {
      await this.setupInterception(page)

      // 等待一段时间收集请求
      await page.waitForTimeout(2000)

      // 验证拦截到的请求和响应
      await this.validateInterceptedTraffic(result)
    }

    // 检查向后兼容性
    if (this.config.checkBackwardCompatibility && this.config.previousSpecFile) {
      await this.checkBackwardCompatibility(result)
    }

    // 计算评分
    result.score = this.calculateScore(result)

    return result
  }

  /**
   * 加载规范文件
   */
  private async loadSpec(): Promise<void> {
    if (!this.config.specFile) {
      throw new Error('Spec file path is required')
    }

    const specPath = path.resolve(this.config.specFile)
    if (!fs.existsSync(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`)
    }

    const content = fs.readFileSync(specPath, 'utf-8')

    if (specPath.endsWith('.json')) {
      this.spec = JSON.parse(content) as OpenAPISpec
    } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      // 简单的 YAML 解析（实际项目中应使用 js-yaml）
      this.spec = this.parseSimpleYaml(content) as unknown as OpenAPISpec
    } else {
      throw new Error('Unsupported spec file format')
    }

    // 确定规范类型
    if (this.spec.openapi) {
      this.config.specType = 'openapi'
    } else if (this.spec.swagger) {
      this.config.specType = 'swagger'
    }

    // 加载之前的规范（用于兼容性检查）
    if (this.config.previousSpecFile) {
      const prevPath = path.resolve(this.config.previousSpecFile)
      if (fs.existsSync(prevPath)) {
        const prevContent = fs.readFileSync(prevPath, 'utf-8')
        if (prevPath.endsWith('.json')) {
          this.previousSpec = JSON.parse(prevContent) as OpenAPISpec
        } else {
          this.previousSpec = this.parseSimpleYaml(prevContent) as unknown as OpenAPISpec
        }
      }
    }
  }

  /**
   * 简单的 YAML 解析器（仅用于基本场景）
   */
  private parseSimpleYaml(content: string): Record<string, unknown> {
    // 这是一个非常简化的 YAML 解析器
    // 实际项目中应该使用 js-yaml 或类似库
    try {
      // 尝试作为 JSON 解析（YAML 是 JSON 的超集）
      return JSON.parse(content)
    } catch {
      // 返回空对象，实际项目中应该使用真正的 YAML 解析器
      console.warn('YAML parsing requires js-yaml library')
      return {}
    }
  }

  /**
   * 验证规范文件本身
   */
  private validateSpec(): SchemaValidationResult {
    const errors: SchemaValidationResult['errors'] = []

    if (!this.spec) {
      return {
        valid: false,
        errors: [{ path: 'spec', message: 'Spec is not loaded', keyword: 'required' }],
      }
    }

    // 检查必需字段
    if (!this.spec.info) {
      errors.push({ path: 'info', message: 'Missing info section', keyword: 'required' })
    }

    if (!this.spec.info?.title) {
      errors.push({
        path: 'info.title',
        message: 'Missing API title',
        keyword: 'required',
      })
    }

    if (!this.spec.info?.version) {
      errors.push({
        path: 'info.version',
        message: 'Missing API version',
        keyword: 'required',
      })
    }

    if (!this.spec.paths || Object.keys(this.spec.paths).length === 0) {
      errors.push({
        path: 'paths',
        message: 'No paths defined in spec',
        keyword: 'required',
      })
    }

    // 验证每个路径
    for (const [pathName, pathItem] of Object.entries(this.spec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          // 检查响应定义
          if (!operation.responses || Object.keys(operation.responses).length === 0) {
            errors.push({
              path: `paths.${pathName}.${method}.responses`,
              message: `No responses defined for ${method.toUpperCase()} ${pathName}`,
              keyword: 'required',
            })
          }

          // 检查成功响应
          const hasSuccessResponse = Object.keys(operation.responses).some(
            (code) => code.startsWith('2') || code === 'default'
          )
          if (!hasSuccessResponse) {
            errors.push({
              path: `paths.${pathName}.${method}.responses`,
              message: `No success response defined for ${method.toUpperCase()} ${pathName}`,
              keyword: 'type',
            })
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 设置请求拦截
   */
  private async setupInterception(page: Page): Promise<void> {
    page.on('request', (request) => {
      const url = new URL(request.url())
      const key = `${request.method()} ${url.pathname}`
      this.interceptedRequests.set(key, { request })
    })

    page.on('response', (response) => {
      const url = new URL(response.url())
      const key = `${response.request().method()} ${url.pathname}`
      const existing = this.interceptedRequests.get(key)
      if (existing) {
        existing.response = response
      }
    })
  }

  /**
   * 验证拦截到的请求和响应
   */
  private async validateInterceptedTraffic(result: ContractTestResult): Promise<void> {
    if (!this.spec) return

    for (const [key, { request, response }] of this.interceptedRequests) {
      const [method, pathname] = key.split(' ')

      // 查找匹配的规范定义
      const { pathSpec } = this.findMatchingPath(pathname)
      if (!pathSpec) continue

      const operationSpec = pathSpec[method.toLowerCase()]
      if (!operationSpec) continue

      result.endpointsTested++

      // 验证请求
      if (this.config.validateRequests) {
        await this.validateRequest(request, operationSpec, pathname, method, result)
      }

      // 验证响应
      if (this.config.validateResponses && response) {
        await this.validateResponse(response, operationSpec, pathname, method, result)
      }
    }
  }

  /**
   * 查找匹配的路径规范
   */
  private findMatchingPath(pathname: string): {
    pathSpec: Record<string, OpenAPISpec['paths'][string][string]> | null
    pathPattern: string | null
  } {
    if (!this.spec) return { pathSpec: null, pathPattern: null }

    // 首先尝试精确匹配
    if (this.spec.paths[pathname]) {
      return { pathSpec: this.spec.paths[pathname], pathPattern: pathname }
    }

    // 尝试模式匹配（处理路径参数）
    for (const [pattern, spec] of Object.entries(this.spec.paths)) {
      const regex = this.pathToRegex(pattern)
      if (regex.test(pathname)) {
        return { pathSpec: spec, pathPattern: pattern }
      }
    }

    return { pathSpec: null, pathPattern: null }
  }

  /**
   * 将路径模式转换为正则表达式
   */
  private pathToRegex(pattern: string): RegExp {
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '[^/]+') // 替换路径参数
      .replace(/\//g, '\\/') // 转义斜杠
    return new RegExp(`^${regexPattern}$`)
  }

  /**
   * 验证请求
   */
  private async validateRequest(
    request: Request,
    operationSpec: OpenAPISpec['paths'][string][string],
    pathname: string,
    method: string,
    result: ContractTestResult
  ): Promise<void> {
    // 验证查询参数
    const url = new URL(request.url())
    const queryParams = Object.fromEntries(url.searchParams)

    for (const param of operationSpec.parameters || []) {
      if (param.in === 'query' && param.required) {
        if (!queryParams[param.name]) {
          result.violations.push({
            type: 'request',
            endpoint: pathname,
            method,
            path: `parameters.${param.name}`,
            expected: 'required parameter',
            actual: 'missing',
            severity: 'error',
            description: `Required query parameter "${param.name}" is missing`,
          })
        }
      }
    }

    // 验证请求体
    if (operationSpec.requestBody?.required && method !== 'GET') {
      try {
        const body = request.postData()
        if (!body) {
          result.violations.push({
            type: 'request',
            endpoint: pathname,
            method,
            path: 'requestBody',
            expected: 'request body',
            actual: 'missing',
            severity: 'error',
            description: 'Required request body is missing',
          })
        } else {
          // 验证请求体格式
          const contentType = request.headers()['content-type'] || ''
          const schemaKey = contentType.includes('json')
            ? 'application/json'
            : Object.keys(operationSpec.requestBody.content || {})[0]

          const schema = operationSpec.requestBody.content?.[schemaKey]?.schema
          if (schema) {
            try {
              const bodyData = JSON.parse(body)
              const schemaErrors = this.validateAgainstSchema(bodyData, schema, 'body')
              for (const error of schemaErrors) {
                result.violations.push({
                  type: 'request',
                  endpoint: pathname,
                  method,
                  path: error.path,
                  expected: error.expected,
                  actual: error.actual,
                  severity: 'warning',
                  description: error.message,
                })
              }
            } catch {
              // JSON 解析失败
            }
          }
        }
      } catch {
        // 无法获取请求体
      }
    }
  }

  /**
   * 验证响应
   */
  private async validateResponse(
    response: Response,
    operationSpec: OpenAPISpec['paths'][string][string],
    pathname: string,
    method: string,
    result: ContractTestResult
  ): Promise<void> {
    const status = response.status().toString()

    // 检查状态码是否在规范中定义
    const responseSpec =
      operationSpec.responses[status] ||
      operationSpec.responses[`${status[0]}XX`] ||
      operationSpec.responses['default']

    if (!responseSpec) {
      result.violations.push({
        type: 'response',
        endpoint: pathname,
        method,
        path: `responses.${status}`,
        expected: 'defined status code',
        actual: status,
        severity: 'warning',
        description: `Response status ${status} is not defined in the spec`,
      })
      return
    }

    // 验证响应体
    try {
      const contentType = response.headers()['content-type'] || ''
      if (contentType.includes('json')) {
        const body = await response.json()
        const schemaKey = 'application/json'
        const schema = responseSpec.content?.[schemaKey]?.schema

        if (schema) {
          const schemaErrors = this.validateAgainstSchema(body, schema, 'response')
          for (const error of schemaErrors) {
            result.violations.push({
              type: 'response',
              endpoint: pathname,
              method,
              path: error.path,
              expected: error.expected,
              actual: error.actual,
              severity: this.config.strictMode ? 'error' : 'warning',
              description: error.message,
            })
          }
        }
      }
    } catch {
      // 无法解析响应体
    }
  }

  /**
   * 根据 Schema 验证数据
   */
  private validateAgainstSchema(
    data: unknown,
    schema: JSONSchema,
    prefix: string
  ): Array<{ path: string; expected: string; actual: string; message: string }> {
    const errors: Array<{
      path: string
      expected: string
      actual: string
      message: string
    }> = []

    // 解析 $ref
    if (schema.$ref) {
      const resolvedSchema = this.resolveRef(schema.$ref)
      if (resolvedSchema) {
        return this.validateAgainstSchema(data, resolvedSchema, prefix)
      }
    }

    // 处理 allOf, anyOf, oneOf
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        errors.push(...this.validateAgainstSchema(data, subSchema, prefix))
      }
      return errors
    }

    // 验证类型
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type]
      const actualType = this.getType(data)

      if (!types.includes(actualType) && !types.includes('null' as string)) {
        errors.push({
          path: prefix,
          expected: types.join(' | '),
          actual: actualType,
          message: `Type mismatch at ${prefix}: expected ${types.join(' | ')}, got ${actualType}`,
        })
        return errors
      }
    }

    // 验证对象属性
    if (schema.type === 'object' && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>

      // 检查必需属性
      for (const required of schema.required || []) {
        if (!(required in obj)) {
          errors.push({
            path: `${prefix}.${required}`,
            expected: 'present',
            actual: 'missing',
            message: `Required property "${required}" is missing at ${prefix}`,
          })
        }
      }

      // 验证每个属性
      for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        if (key in obj) {
          errors.push(
            ...this.validateAgainstSchema(obj[key], propSchema, `${prefix}.${key}`)
          )
        }
      }

      // 严格模式：检查额外属性
      if (this.config.strictMode && schema.additionalProperties === false) {
        const definedProps = Object.keys(schema.properties || {})
        for (const key of Object.keys(obj)) {
          if (!definedProps.includes(key)) {
            errors.push({
              path: `${prefix}.${key}`,
              expected: 'not present',
              actual: 'present',
              message: `Additional property "${key}" is not allowed at ${prefix}`,
            })
          }
        }
      }
    }

    // 验证数组
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.items) {
        for (let i = 0; i < data.length; i++) {
          errors.push(
            ...this.validateAgainstSchema(data[i], schema.items, `${prefix}[${i}]`)
          )
        }
      }
    }

    // 验证枚举
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path: prefix,
        expected: schema.enum.join(' | '),
        actual: String(data),
        message: `Value at ${prefix} must be one of: ${schema.enum.join(', ')}`,
      })
    }

    // 验证字符串约束
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path: prefix,
          expected: `min length ${schema.minLength}`,
          actual: `length ${data.length}`,
          message: `String at ${prefix} is too short`,
        })
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path: prefix,
          expected: `max length ${schema.maxLength}`,
          actual: `length ${data.length}`,
          message: `String at ${prefix} is too long`,
        })
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern)
        if (!regex.test(data)) {
          errors.push({
            path: prefix,
            expected: `pattern ${schema.pattern}`,
            actual: data,
            message: `String at ${prefix} does not match pattern`,
          })
        }
      }
    }

    // 验证数字约束
    if (
      (schema.type === 'number' || schema.type === 'integer') &&
      typeof data === 'number'
    ) {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path: prefix,
          expected: `>= ${schema.minimum}`,
          actual: String(data),
          message: `Number at ${prefix} is below minimum`,
        })
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path: prefix,
          expected: `<= ${schema.maximum}`,
          actual: String(data),
          message: `Number at ${prefix} is above maximum`,
        })
      }
    }

    return errors
  }

  /**
   * 解析 $ref 引用
   */
  private resolveRef(ref: string): JSONSchema | null {
    if (!this.spec || !ref.startsWith('#/')) return null

    const parts = ref.slice(2).split('/')
    let current: unknown = this.spec

    for (const part of parts) {
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return null
      }
    }

    return current as JSONSchema
  }

  /**
   * 获取数据类型
   */
  private getType(data: unknown): string {
    if (data === null) return 'null'
    if (Array.isArray(data)) return 'array'
    if (typeof data === 'number') {
      return Number.isInteger(data) ? 'integer' : 'number'
    }
    return typeof data
  }

  /**
   * 检查向后兼容性
   */
  private async checkBackwardCompatibility(result: ContractTestResult): Promise<void> {
    if (!this.spec || !this.previousSpec) return

    // 检查删除的端点
    for (const [path, methods] of Object.entries(this.previousSpec.paths)) {
      if (!this.spec.paths[path]) {
        result.breakingChanges.push({
          type: 'endpoint-removed',
          location: path,
          oldSpec: 'present',
          newSpec: 'removed',
          severity: 'error',
          description: `Endpoint ${path} has been removed`,
        })
        continue
      }

      // 检查删除的方法
      for (const method of Object.keys(methods)) {
        if (!this.spec.paths[path][method]) {
          result.breakingChanges.push({
            type: 'endpoint-removed',
            location: `${path}.${method}`,
            oldSpec: 'present',
            newSpec: 'removed',
            severity: 'error',
            description: `Method ${method.toUpperCase()} for ${path} has been removed`,
          })
        }
      }
    }

    // 检查 schema 变更
    const oldSchemas = this.previousSpec.components?.schemas || {}
    const newSchemas = this.spec.components?.schemas || {}

    for (const [name, oldSchema] of Object.entries(oldSchemas)) {
      const newSchema = newSchemas[name]

      if (!newSchema) {
        result.breakingChanges.push({
          type: 'field-removed',
          location: `components.schemas.${name}`,
          oldSpec: 'present',
          newSpec: 'removed',
          severity: 'error',
          description: `Schema ${name} has been removed`,
        })
        continue
      }

      // 检查删除的必需字段
      for (const field of oldSchema.required || []) {
        if (!newSchema.required?.includes(field)) {
          // 这实际上不是破坏性变更，跳过
        }
      }

      // 检查新增的必需字段
      for (const field of newSchema.required || []) {
        if (!oldSchema.required?.includes(field)) {
          result.breakingChanges.push({
            type: 'required-added',
            location: `components.schemas.${name}.${field}`,
            oldSpec: 'optional',
            newSpec: 'required',
            severity: 'error',
            description: `Field ${field} in ${name} is now required`,
          })
        }
      }

      // 检查类型变更
      this.checkSchemaTypeChanges(
        oldSchema,
        newSchema,
        `components.schemas.${name}`,
        result
      )
    }
  }

  /**
   * 检查 Schema 类型变更
   */
  private checkSchemaTypeChanges(
    oldSchema: JSONSchema,
    newSchema: JSONSchema,
    location: string,
    result: ContractTestResult
  ): void {
    if (oldSchema.type && newSchema.type && oldSchema.type !== newSchema.type) {
      result.breakingChanges.push({
        type: 'type-changed',
        location,
        oldSpec: String(oldSchema.type),
        newSpec: String(newSchema.type),
        severity: 'error',
        description: `Type changed from ${oldSchema.type} to ${newSchema.type} at ${location}`,
      })
    }

    // 检查枚举值删除
    if (oldSchema.enum && newSchema.enum) {
      for (const value of oldSchema.enum) {
        if (!newSchema.enum.includes(value)) {
          result.breakingChanges.push({
            type: 'enum-removed',
            location,
            oldSpec: String(value),
            newSpec: 'removed',
            severity: 'error',
            description: `Enum value "${value}" has been removed at ${location}`,
          })
        }
      }
    }

    // 递归检查属性
    if (oldSchema.properties && newSchema.properties) {
      for (const [propName, propSchema] of Object.entries(oldSchema.properties)) {
        const newPropSchema = newSchema.properties[propName]
        if (!newPropSchema) {
          result.breakingChanges.push({
            type: 'field-removed',
            location: `${location}.${propName}`,
            oldSpec: 'present',
            newSpec: 'removed',
            severity: 'warning',
            description: `Property ${propName} has been removed at ${location}`,
          })
        } else {
          this.checkSchemaTypeChanges(
            propSchema,
            newPropSchema,
            `${location}.${propName}`,
            result
          )
        }
      }
    }
  }

  /**
   * 计算评分
   */
  private calculateScore(result: ContractTestResult): number {
    let score = 100

    // Schema 验证错误
    if (!result.schemaValidation.valid) {
      score -= result.schemaValidation.errors.length * 5
    }

    // 违规扣分
    for (const violation of result.violations) {
      switch (violation.severity) {
        case 'error':
          score -= 10
          break
        case 'warning':
          score -= 5
          break
        default:
          score -= 2
      }
    }

    // 破坏性变更扣分
    for (const change of result.breakingChanges) {
      score -= change.severity === 'error' ? 15 : 8
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 获取分数
   */
  getScore(result: ContractTestResult): number {
    return result.score
  }

  /**
   * 生成建议
   */
  generateSuggestions(result: ContractTestResult): string[] {
    const suggestions: string[] = []

    if (!result.schemaValidation.valid) {
      suggestions.push(
        `修复 ${result.schemaValidation.errors.length} 个规范验证错误：确保 OpenAPI 规范完整且格式正确`
      )
    }

    if (result.violations.length > 0) {
      const requestViolations = result.violations.filter((v) => v.type === 'request')
      const responseViolations = result.violations.filter((v) => v.type === 'response')

      if (requestViolations.length > 0) {
        suggestions.push(
          `修复 ${requestViolations.length} 个请求合约违规：确保 API 请求符合规范定义`
        )
      }

      if (responseViolations.length > 0) {
        suggestions.push(
          `修复 ${responseViolations.length} 个响应合约违规：确保 API 响应符合规范定义`
        )
      }
    }

    if (result.breakingChanges.length > 0) {
      suggestions.push(
        `处理 ${result.breakingChanges.length} 个破坏性变更：考虑版本控制或提供迁移路径`
      )
    }

    if (result.endpointsTested === 0) {
      suggestions.push('没有测试到任何端点：确保应用发起了 API 请求')
    }

    return suggestions
  }
}

/**
 * 创建合约测试器实例
 */
export function createContractTester(config?: ContractTestConfig): ContractTester {
  return new ContractTester(config)
}

/**
 * 默认合约测试器实例
 */
export const contractTester = new ContractTester()
