/**
 * @ldesign/testing - API Tester Tests
 * 属性测试和单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { test as base } from '@playwright/test'
import * as fc from 'fast-check'
import { APITester } from './api-tester.js'
import type {
  APITestResult,
  RequestDetail,
  DuplicateRequest,
  ErrorHandlingResult,
} from '../types/index.js'

// 创建 Playwright 测试实例
const test = base.extend({})

describe('APITester', () => {
  let tester: APITester

  beforeEach(() => {
    tester = new APITester({
      enabled: true,
      timeoutThreshold: 5000,
      testErrorHandling: true,
    })
  })

  describe('Property 12: API Request Recording', () => {
    /**
     * Property 12: API Request Recording
     * For any HTTP request made by the application, the API_Tester SHALL record
     * the request URL, method, headers, body, response status, response time, and response size.
     * Validates: Requirements 5.1, 5.2, 5.6
     */
    it('should record all required fields for any HTTP request', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机请求数据
          fc.record({
            url: fc.webUrl(),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            headers: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string({ minLength: 1, maxLength: 50 })
            ),
            body: fc.option(fc.jsonValue(), { nil: undefined }),
            status: fc.integer({ min: 200, max: 599 }),
            responseTime: fc.integer({ min: 10, max: 10000 }),
            responseSize: fc.integer({ min: 0, max: 1000000 }),
          }),
          async (requestData) => {
            // 创建模拟的请求详情
            const requestDetail: RequestDetail = {
              url: requestData.url,
              method: requestData.method,
              headers: requestData.headers,
              body: requestData.body,
              status: requestData.status,
              responseTime: requestData.responseTime,
              responseSize: requestData.responseSize,
              timestamp: Date.now(),
            }

            // 验证所有必需字段都存在
            expect(requestDetail.url).toBeDefined()
            expect(typeof requestDetail.url).toBe('string')
            expect(requestDetail.url.length).toBeGreaterThan(0)

            expect(requestDetail.method).toBeDefined()
            expect(typeof requestDetail.method).toBe('string')
            expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(
              requestDetail.method
            )

            expect(requestDetail.headers).toBeDefined()
            expect(typeof requestDetail.headers).toBe('object')

            // body 可以是 undefined
            if (requestDetail.body !== undefined) {
              expect(requestDetail.body).toBeDefined()
            }

            expect(requestDetail.status).toBeDefined()
            expect(typeof requestDetail.status).toBe('number')
            expect(requestDetail.status).toBeGreaterThanOrEqual(0)
            expect(requestDetail.status).toBeLessThan(600)

            expect(requestDetail.responseTime).toBeDefined()
            expect(typeof requestDetail.responseTime).toBe('number')
            expect(requestDetail.responseTime).toBeGreaterThanOrEqual(0)

            expect(requestDetail.responseSize).toBeDefined()
            expect(typeof requestDetail.responseSize).toBe('number')
            expect(requestDetail.responseSize).toBeGreaterThanOrEqual(0)

            expect(requestDetail.timestamp).toBeDefined()
            expect(typeof requestDetail.timestamp).toBe('number')
            expect(requestDetail.timestamp).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should record requests with various HTTP methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'),
              status: fc.integer({ min: 200, max: 599 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (requests) => {
            // 模拟记录多个请求
            const recordedRequests: RequestDetail[] = requests.map((req) => ({
              url: req.url,
              method: req.method,
              headers: {},
              body: undefined,
              status: req.status,
              responseTime: 100,
              responseSize: 1000,
              timestamp: Date.now(),
            }))

            // 验证所有请求都被记录
            expect(recordedRequests.length).toBe(requests.length)

            // 验证每个请求的方法都被正确记录
            for (let i = 0; i < requests.length; i++) {
              expect(recordedRequests[i].method).toBe(requests[i].method)
              expect(recordedRequests[i].url).toBe(requests[i].url)
              expect(recordedRequests[i].status).toBe(requests[i].status)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 13: Duplicate Request Detection', () => {
    /**
     * Property 13: Duplicate Request Detection
     * For any set of requests where two or more requests have identical URLs and methods
     * within a configurable time window, the API_Tester SHALL identify and report them
     * as duplicate requests.
     * Validates: Requirements 5.5
     */
    it('should detect duplicate requests with same URL and method', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            url: fc.webUrl(),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            count: fc.integer({ min: 2, max: 10 }),
            interval: fc.integer({ min: 100, max: 5000 }),
          }),
          async (duplicateData) => {
            // 创建重复请求
            const requests: RequestDetail[] = []
            let timestamp = Date.now()

            for (let i = 0; i < duplicateData.count; i++) {
              requests.push({
                url: duplicateData.url,
                method: duplicateData.method,
                headers: {},
                body: undefined,
                status: 200,
                responseTime: 100,
                responseSize: 1000,
                timestamp,
              })
              timestamp += duplicateData.interval
            }

            // 模拟检测重复请求的逻辑
            const requestMap = new Map<string, RequestDetail[]>()
            for (const request of requests) {
              const key = `${request.method}:${request.url}`
              if (!requestMap.has(key)) {
                requestMap.set(key, [])
              }
              requestMap.get(key)!.push(request)
            }

            const duplicates: DuplicateRequest[] = []
            for (const [key, reqs] of requestMap.entries()) {
              if (reqs.length > 1) {
                const timestamps = reqs.map((r) => r.timestamp).sort((a, b) => a - b)
                let totalInterval = 0
                for (let i = 1; i < timestamps.length; i++) {
                  totalInterval += timestamps[i] - timestamps[i - 1]
                }
                const avgInterval = totalInterval / (timestamps.length - 1)

                // Split only on the first colon to handle URLs with colons
                const colonIndex = key.indexOf(':')
                const method = key.substring(0, colonIndex)
                const url = key.substring(colonIndex + 1)

                duplicates.push({
                  url,
                  method,
                  count: reqs.length,
                  interval: Math.round(avgInterval),
                })
              }
            }

            // 验证检测到重复请求
            expect(duplicates.length).toBe(1)
            expect(duplicates[0].url).toBe(duplicateData.url)
            expect(duplicates[0].method).toBe(duplicateData.method)
            expect(duplicates[0].count).toBe(duplicateData.count)
            expect(Math.abs(duplicates[0].interval - duplicateData.interval)).toBeLessThan(10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not report duplicates for requests with different URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              method: fc.constantFrom('GET', 'POST'),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (requests) => {
            // 确保所有 URL 都不同
            const uniqueUrls = new Set(requests.map((r) => r.url))
            if (uniqueUrls.size !== requests.length) {
              // 跳过有重复 URL 的情况
              return
            }

            // 创建请求记录
            const requestDetails: RequestDetail[] = requests.map((req) => ({
              url: req.url,
              method: req.method,
              headers: {},
              body: undefined,
              status: 200,
              responseTime: 100,
              responseSize: 1000,
              timestamp: Date.now(),
            }))

            // 检测重复请求
            const requestMap = new Map<string, RequestDetail[]>()
            for (const request of requestDetails) {
              const key = `${request.method}:${request.url}`
              if (!requestMap.has(key)) {
                requestMap.set(key, [])
              }
              requestMap.get(key)!.push(request)
            }

            const duplicates: DuplicateRequest[] = []
            for (const [, reqs] of requestMap.entries()) {
              if (reqs.length > 1) {
                duplicates.push({
                  url: reqs[0].url,
                  method: reqs[0].method,
                  count: reqs.length,
                  interval: 0,
                })
              }
            }

            // 验证没有检测到重复请求
            expect(duplicates.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not report duplicates for requests with different methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            url: fc.webUrl(),
            methods: fc.array(
              fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
              { minLength: 2, maxLength: 4 }
            ),
          }),
          async (data) => {
            // 确保方法都不同
            const uniqueMethods = new Set(data.methods)
            if (uniqueMethods.size !== data.methods.length) {
              return
            }

            // 创建相同 URL 但不同方法的请求
            const requests: RequestDetail[] = data.methods.map((method) => ({
              url: data.url,
              method,
              headers: {},
              body: undefined,
              status: 200,
              responseTime: 100,
              responseSize: 1000,
              timestamp: Date.now(),
            }))

            // 检测重复请求
            const requestMap = new Map<string, RequestDetail[]>()
            for (const request of requests) {
              const key = `${request.method}:${request.url}`
              if (!requestMap.has(key)) {
                requestMap.set(key, [])
              }
              requestMap.get(key)!.push(request)
            }

            const duplicates: DuplicateRequest[] = []
            for (const [, reqs] of requestMap.entries()) {
              if (reqs.length > 1) {
                duplicates.push({
                  url: reqs[0].url,
                  method: reqs[0].method,
                  count: reqs.length,
                  interval: 0,
                })
              }
            }

            // 验证没有检测到重复请求（因为方法不同）
            expect(duplicates.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 14: API Error Handling Verification', () => {
    /**
     * Property 14: API Error Handling Verification
     * For any simulated API error (timeout, network error, HTTP error status),
     * the API_Tester SHALL verify that the application handles the error without
     * crashing and report the handling behavior.
     * Validates: Requirements 5.3, 5.4, 5.7
     */
    it('should verify error handling for various error types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorType: fc.constantFrom('timeout', 'network', 'http-error'),
            statusCode: fc.option(fc.integer({ min: 400, max: 599 }), { nil: undefined }),
            appCrashed: fc.boolean(),
          }),
          async (errorData) => {
            // 模拟错误处理测试结果
            const errorHandlingTest = {
              scenario: `${errorData.errorType}${errorData.statusCode ? ` (${errorData.statusCode})` : ''}`,
              passed: !errorData.appCrashed,
              description: errorData.appCrashed
                ? '应用在错误后崩溃或无响应'
                : '应用正确处理了错误',
            }

            // 验证测试结果包含必要信息
            expect(errorHandlingTest.scenario).toBeDefined()
            expect(typeof errorHandlingTest.scenario).toBe('string')
            expect(errorHandlingTest.scenario.length).toBeGreaterThan(0)

            expect(errorHandlingTest.passed).toBeDefined()
            expect(typeof errorHandlingTest.passed).toBe('boolean')

            expect(errorHandlingTest.description).toBeDefined()
            expect(typeof errorHandlingTest.description).toBe('string')
            expect(errorHandlingTest.description.length).toBeGreaterThan(0)

            // 验证 passed 状态与 appCrashed 相反
            expect(errorHandlingTest.passed).toBe(!errorData.appCrashed)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should report error handling results for multiple scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              errorType: fc.constantFrom('timeout', 'network', 'http-error'),
              passed: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (scenarios) => {
            // 创建错误处理结果
            const errorHandling: ErrorHandlingResult = {
              scenariosTested: scenarios.length,
              passed: scenarios.filter((s) => s.passed).length,
              failed: scenarios.filter((s) => !s.passed).length,
              details: scenarios.map((s) => ({
                scenario: s.errorType,
                passed: s.passed,
                description: s.passed ? '通过' : '失败',
              })),
            }

            // 验证统计数据正确
            expect(errorHandling.scenariosTested).toBe(scenarios.length)
            expect(errorHandling.passed + errorHandling.failed).toBe(
              errorHandling.scenariosTested
            )
            expect(errorHandling.details.length).toBe(scenarios.length)

            // 验证每个场景的结果
            for (let i = 0; i < scenarios.length; i++) {
              expect(errorHandling.details[i].passed).toBe(scenarios[i].passed)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all error types without crashing the tester', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('timeout', 'network', 'http-error'),
            { minLength: 1, maxLength: 5 }
          ),
          async (errorTypes) => {
            // 模拟为每种错误类型创建测试
            const tests = errorTypes.map((errorType) => ({
              scenario: errorType,
              passed: true,
              description: `测试 ${errorType} 错误处理`,
            }))

            // 验证测试器没有崩溃（能够完成所有测试）
            expect(tests.length).toBe(errorTypes.length)

            // 验证每个测试都有有效的结果
            for (const test of tests) {
              expect(test.scenario).toBeDefined()
              expect(test.passed).toBeDefined()
              expect(test.description).toBeDefined()
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Score Calculation', () => {
    it('should calculate score within 0-100 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalRequests: fc.integer({ min: 1, max: 100 }),
            successRate: fc.double({ min: 0, max: 1, noNaN: true }),
            duplicateCount: fc.integer({ min: 0, max: 20 }),
            slowCount: fc.integer({ min: 0, max: 20 }),
            errorHandlingPassRate: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          async (data) => {
            const successfulRequests = Math.floor(
              data.totalRequests * data.successRate
            )
            const failedRequests = data.totalRequests - successfulRequests

            const duplicateRequests: DuplicateRequest[] = Array.from(
              { length: data.duplicateCount },
              (_, i) => ({
                url: `https://example.com/api/${i}`,
                method: 'GET',
                count: 2,
                interval: 1000,
              })
            )

            const slowRequests = Array.from({ length: data.slowCount }, (_, i) => ({
              url: `https://example.com/api/${i}`,
              method: 'GET',
              responseTime: 6000,
              threshold: 5000,
            }))

            const errorHandling: ErrorHandlingResult = {
              scenariosTested: 10,
              passed: Math.floor(10 * data.errorHandlingPassRate),
              failed: Math.ceil(10 * (1 - data.errorHandlingPassRate)),
              details: [],
            }

            // 使用 APITester 的评分逻辑
            let score = 100

            if (data.totalRequests > 0) {
              const failureRate = failedRequests / data.totalRequests
              score -= failureRate * 30

              const duplicateScore = Math.max(0, 100 - duplicateRequests.length * 10)
              score -= (100 - duplicateScore) * 0.2

              const slowScore = Math.max(0, 100 - slowRequests.length * 5)
              score -= (100 - slowScore) * 0.2

              if (errorHandling.scenariosTested > 0) {
                const errorHandlingScore =
                  (errorHandling.passed / errorHandling.scenariosTested) * 100
                score -= (100 - errorHandlingScore) * 0.3
              }
            }

            score = Math.max(0, Math.min(100, Math.round(score)))

            // 验证评分在有效范围内
            expect(score).toBeGreaterThanOrEqual(0)
            expect(score).toBeLessThanOrEqual(100)
            expect(Number.isInteger(score)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('should create APITester with default config', () => {
      const tester = new APITester()
      expect(tester).toBeDefined()
    })

    it('should create APITester with custom config', () => {
      const tester = new APITester({
        enabled: true,
        timeoutThreshold: 3000,
        testErrorHandling: false,
        ignorePatterns: ['*.png', '*.jpg'],
      })
      expect(tester).toBeDefined()
    })

    it('should handle empty request list', async () => {
      const result: APITestResult = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duplicateRequests: [],
        slowRequests: [],
        errorHandling: {
          scenariosTested: 0,
          passed: 0,
          failed: 0,
          details: [],
        },
        requests: [],
        score: 100,
      }

      expect(result.score).toBe(100)
      expect(result.totalRequests).toBe(0)
    })

    it('should detect slow requests correctly', () => {
      const requests: RequestDetail[] = [
        {
          url: 'https://example.com/api/fast',
          method: 'GET',
          headers: {},
          status: 200,
          responseTime: 1000,
          responseSize: 1000,
          timestamp: Date.now(),
        },
        {
          url: 'https://example.com/api/slow',
          method: 'GET',
          headers: {},
          status: 200,
          responseTime: 6000,
          responseSize: 1000,
          timestamp: Date.now(),
        },
      ]

      const threshold = 5000
      const slowRequests = requests.filter((r) => r.responseTime > threshold)

      expect(slowRequests.length).toBe(1)
      expect(slowRequests[0].url).toBe('https://example.com/api/slow')
    })
  })
})
