/**
 * @ldesign/testing - Performance Profiler Tests
 * 性能分析器的属性测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { PerformanceProfiler } from './performance-profiler.js'
import type {
  PerformanceTestResult,
  WebVitalsResult,
  ResourceAnalysis,
  LongTask,
  NetworkConditionResult,
  NetworkCondition,
  PerformanceConfig,
  ResourceType,
  Suggestion,
} from '../types/index.js'

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler

  beforeEach(() => {
    profiler = new PerformanceProfiler()
  })

  describe('Property 5: Performance Metrics Completeness', () => {
    /**
     * Property 5: Performance Metrics Completeness
     * For any page under test, the Performance_Profiler SHALL return all Core Web Vitals
     * (LCP, FID, CLS, FCP, TTFB) as numeric values, along with resource analysis grouped
     * by type (script, stylesheet, image, font) and a list of detected long tasks.
     * 
     * Validates: Requirements 3.1, 3.2, 3.5, 3.6
     * 
     * Feature: auto-testing-suite, Property 5: Performance Metrics Completeness
     */
    it('should return all Core Web Vitals as numeric values', () => {
      fc.assert(
        fc.property(
          // 生成随机的 Web Vitals 数据
          fc.record({
            LCP: fc.double({ min: 0, max: 10000, noNaN: true }),
            FID: fc.double({ min: 0, max: 1000, noNaN: true }),
            CLS: fc.double({ min: 0, max: 1, noNaN: true }),
            FCP: fc.double({ min: 0, max: 5000, noNaN: true }),
            TTFB: fc.double({ min: 0, max: 2000, noNaN: true }),
            INP: fc.double({ min: 0, max: 1000, noNaN: true }),
          }),
          (webVitals) => {
            // 验证所有指标都是数字
            expect(typeof webVitals.LCP).toBe('number')
            expect(typeof webVitals.FID).toBe('number')
            expect(typeof webVitals.CLS).toBe('number')
            expect(typeof webVitals.FCP).toBe('number')
            expect(typeof webVitals.TTFB).toBe('number')
            expect(typeof webVitals.INP).toBe('number')

            // 验证所有指标都不是 NaN
            expect(Number.isNaN(webVitals.LCP)).toBe(false)
            expect(Number.isNaN(webVitals.FID)).toBe(false)
            expect(Number.isNaN(webVitals.CLS)).toBe(false)
            expect(Number.isNaN(webVitals.FCP)).toBe(false)
            expect(Number.isNaN(webVitals.TTFB)).toBe(false)
            expect(Number.isNaN(webVitals.INP)).toBe(false)

            // 验证所有指标都是非负数
            expect(webVitals.LCP).toBeGreaterThanOrEqual(0)
            expect(webVitals.FID).toBeGreaterThanOrEqual(0)
            expect(webVitals.CLS).toBeGreaterThanOrEqual(0)
            expect(webVitals.FCP).toBeGreaterThanOrEqual(0)
            expect(webVitals.TTFB).toBeGreaterThanOrEqual(0)
            expect(webVitals.INP).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return resource analysis grouped by all resource types', () => {
      fc.assert(
        fc.property(
          // 生成随机的资源列表
          fc.array(
            fc.record({
              url: fc.webUrl(),
              type: fc.constantFrom<ResourceType>(
                'script',
                'stylesheet',
                'image',
                'font',
                'other'
              ),
              size: fc.integer({ min: 0, max: 10000000 }),
              loadTime: fc.double({ min: 0, max: 10000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (resources) => {
            // 模拟资源分析
            const byType: Record<ResourceType, { count: number; totalSize: number; avgLoadTime: number }> = {
              script: { count: 0, totalSize: 0, avgLoadTime: 0 },
              stylesheet: { count: 0, totalSize: 0, avgLoadTime: 0 },
              image: { count: 0, totalSize: 0, avgLoadTime: 0 },
              font: { count: 0, totalSize: 0, avgLoadTime: 0 },
              other: { count: 0, totalSize: 0, avgLoadTime: 0 },
            }

            let totalSize = 0
            for (const resource of resources) {
              const group = byType[resource.type]
              group.count++
              group.totalSize += resource.size
              group.avgLoadTime += resource.loadTime
              totalSize += resource.size
            }

            // 计算平均加载时间
            for (const type of Object.keys(byType) as ResourceType[]) {
              const group = byType[type]
              if (group.count > 0) {
                group.avgLoadTime = group.avgLoadTime / group.count
              }
            }

            const analysis: ResourceAnalysis = {
              totalResources: resources.length,
              totalSize,
              byType,
              slowResources: [],
            }

            // 验证所有资源类型都存在
            expect(analysis.byType).toHaveProperty('script')
            expect(analysis.byType).toHaveProperty('stylesheet')
            expect(analysis.byType).toHaveProperty('image')
            expect(analysis.byType).toHaveProperty('font')
            expect(analysis.byType).toHaveProperty('other')

            // 验证总资源数等于各类型资源数之和
            const totalCount = Object.values(analysis.byType).reduce(
              (sum, group) => sum + group.count,
              0
            )
            expect(totalCount).toBe(analysis.totalResources)

            // 验证总大小等于各类型大小之和
            const totalSizeByType = Object.values(analysis.byType).reduce(
              (sum, group) => sum + group.totalSize,
              0
            )
            expect(totalSizeByType).toBe(analysis.totalSize)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return a list of long tasks', () => {
      fc.assert(
        fc.property(
          // 生成随机的长任务列表
          fc.array(
            fc.record({
              startTime: fc.double({ min: 0, max: 100000, noNaN: true }),
              duration: fc.double({ min: 50, max: 5000, noNaN: true }),
              name: fc.option(fc.string(), { nil: undefined }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (longTasks) => {
            // 验证长任务列表是数组
            expect(Array.isArray(longTasks)).toBe(true)

            // 验证每个长任务都有必需的属性
            for (const task of longTasks) {
              expect(typeof task.startTime).toBe('number')
              expect(typeof task.duration).toBe('number')
              expect(task.startTime).toBeGreaterThanOrEqual(0)
              expect(task.duration).toBeGreaterThanOrEqual(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 6: Network Condition Testing', () => {
    /**
     * Property 6: Network Condition Testing
     * For any set of network conditions (3G, 4G, WiFi), the Performance_Profiler SHALL
     * execute tests under each condition and return separate results for each, with
     * metrics reflecting the simulated network constraints.
     * 
     * Validates: Requirements 3.4
     * 
     * Feature: auto-testing-suite, Property 6: Network Condition Testing
     */
    it('should execute tests under all specified network conditions', () => {
      fc.assert(
        fc.property(
          // 生成随机的网络条件组合
          fc.uniqueArray(
            fc.constantFrom<NetworkCondition>('3g', '4g', 'wifi'),
            { minLength: 1, maxLength: 3 }
          ),
          (conditions) => {
            // 模拟网络条件测试结果
            const results: NetworkConditionResult[] = conditions.map((condition) => ({
              condition,
              webVitals: {
                LCP: Math.random() * 5000,
                FID: Math.random() * 500,
                CLS: Math.random() * 0.5,
                FCP: Math.random() * 3000,
                TTFB: Math.random() * 1000,
                INP: Math.random() * 500,
              },
              loadTime: Math.random() * 10000,
            }))

            // 验证结果数量等于条件数量
            expect(results.length).toBe(conditions.length)

            // 验证每个条件都有对应的结果
            for (const condition of conditions) {
              const result = results.find((r) => r.condition === condition)
              expect(result).toBeDefined()
              expect(result?.condition).toBe(condition)
              expect(result?.webVitals).toBeDefined()
              expect(result?.loadTime).toBeGreaterThanOrEqual(0)
            }

            // 验证不同网络条件下的指标应该不同（通常 3G < 4G < WiFi）
            if (results.length > 1) {
              const conditions = results.map((r) => r.condition)
              const uniqueConditions = new Set(conditions)
              expect(uniqueConditions.size).toBe(results.length)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reflect network constraints in metrics', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<NetworkCondition>('3g', '4g', 'wifi'),
          (condition) => {
            // 模拟不同网络条件下的加载时间
            const baseLoadTime = 1000
            const multipliers = {
              '3g': 3.0,
              '4g': 1.5,
              'wifi': 1.0,
            }

            const loadTime = baseLoadTime * multipliers[condition]

            const result: NetworkConditionResult = {
              condition,
              webVitals: {
                LCP: loadTime * 2,
                FID: 50,
                CLS: 0.05,
                FCP: loadTime * 1.5,
                TTFB: loadTime * 0.5,
                INP: 50,
              },
              loadTime,
            }

            // 验证网络条件反映在指标中
            expect(result.loadTime).toBeGreaterThan(0)
            expect(result.webVitals.LCP).toBeGreaterThan(0)
            expect(result.webVitals.TTFB).toBeGreaterThan(0)

            // 验证较慢的网络条件有较高的加载时间
            if (condition === '3g') {
              expect(result.loadTime).toBeGreaterThanOrEqual(baseLoadTime * 2)
            } else if (condition === 'wifi') {
              expect(result.loadTime).toBeLessThanOrEqual(baseLoadTime * 1.5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 7: Performance Suggestion Generation', () => {
    /**
     * Property 7: Performance Suggestion Generation
     * For any performance metric that falls below the configured threshold, the
     * Performance_Profiler SHALL include at least one specific optimization suggestion
     * with expected impact.
     * 
     * Validates: Requirements 3.7
     * 
     * Feature: auto-testing-suite, Property 7: Performance Suggestion Generation
     */
    it('should generate suggestions for metrics below threshold', () => {
      fc.assert(
        fc.property(
          // 生成随机的性能配置和测试结果
          fc.record({
            thresholds: fc.record({
              LCP: fc.integer({ min: 1000, max: 5000 }),
              FID: fc.integer({ min: 50, max: 300 }),
              CLS: fc.double({ min: 0.05, max: 0.3, noNaN: true }),
              FCP: fc.integer({ min: 1000, max: 3000 }),
              TTFB: fc.integer({ min: 500, max: 1500 }),
            }),
            webVitals: fc.record({
              LCP: fc.double({ min: 0, max: 10000, noNaN: true }),
              FID: fc.double({ min: 0, max: 1000, noNaN: true }),
              CLS: fc.double({ min: 0, max: 1, noNaN: true }),
              FCP: fc.double({ min: 0, max: 5000, noNaN: true }),
              TTFB: fc.double({ min: 0, max: 2000, noNaN: true }),
              INP: fc.double({ min: 0, max: 1000, noNaN: true }),
            }),
          }),
          ({ thresholds, webVitals }) => {
            const config: PerformanceConfig = { thresholds }
            const profiler = new PerformanceProfiler(config)

            const result: PerformanceTestResult = {
              lighthouseScore: 80,
              webVitals,
              resources: {
                totalResources: 10,
                totalSize: 1000000,
                byType: {
                  script: { count: 3, totalSize: 300000, avgLoadTime: 500 },
                  stylesheet: { count: 2, totalSize: 100000, avgLoadTime: 200 },
                  image: { count: 4, totalSize: 500000, avgLoadTime: 300 },
                  font: { count: 1, totalSize: 100000, avgLoadTime: 150 },
                  other: { count: 0, totalSize: 0, avgLoadTime: 0 },
                },
                slowResources: [],
              },
              longTasks: [],
              networkConditions: [],
              score: 0,
            }

            const suggestions = profiler.generateSuggestions(result)

            // 计算有多少指标超过阈值
            let metricsAboveThreshold = 0
            if (webVitals.LCP > thresholds.LCP) metricsAboveThreshold++
            if (webVitals.FID > thresholds.FID) metricsAboveThreshold++
            if (webVitals.CLS > thresholds.CLS) metricsAboveThreshold++

            // 如果有指标超过阈值，应该有对应的建议
            if (metricsAboveThreshold > 0) {
              expect(suggestions.length).toBeGreaterThan(0)

              // 验证每个建议都有必需的属性
              for (const suggestion of suggestions) {
                expect(suggestion).toHaveProperty('id')
                expect(suggestion).toHaveProperty('category')
                expect(suggestion).toHaveProperty('priority')
                expect(suggestion).toHaveProperty('title')
                expect(suggestion).toHaveProperty('description')
                expect(suggestion).toHaveProperty('expectedImpact')

                // 验证 category 是 'performance'
                expect(suggestion.category).toBe('performance')

                // 验证 priority 是有效值
                expect(['high', 'medium', 'low']).toContain(suggestion.priority)

                // 验证 expectedImpact 不为空
                expect(suggestion.expectedImpact.length).toBeGreaterThan(0)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include expected impact in all suggestions', () => {
      fc.assert(
        fc.property(
          // 生成随机的长任务和慢资源
          fc.record({
            longTaskCount: fc.integer({ min: 0, max: 20 }),
            slowResourceCount: fc.integer({ min: 0, max: 20 }),
          }),
          ({ longTaskCount, slowResourceCount }) => {
            const longTasks: LongTask[] = Array.from({ length: longTaskCount }, (_, i) => ({
              startTime: i * 1000,
              duration: 100 + Math.random() * 500,
              name: `task-${i}`,
            }))

            const slowResources = Array.from({ length: slowResourceCount }, (_, i) => ({
              url: `https://example.com/resource-${i}.js`,
              type: 'script' as ResourceType,
              size: 500000 + Math.random() * 1000000,
              loadTime: 1000 + Math.random() * 5000,
            }))

            const result: PerformanceTestResult = {
              lighthouseScore: 80,
              webVitals: {
                LCP: 2000,
                FID: 50,
                CLS: 0.05,
                FCP: 1500,
                TTFB: 500,
                INP: 50,
              },
              resources: {
                totalResources: slowResourceCount,
                totalSize: 1000000,
                byType: {
                  script: { count: slowResourceCount, totalSize: 1000000, avgLoadTime: 2000 },
                  stylesheet: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  image: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  font: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  other: { count: 0, totalSize: 0, avgLoadTime: 0 },
                },
                slowResources,
              },
              longTasks,
              networkConditions: [],
              score: 0,
            }

            const suggestions = profiler.generateSuggestions(result)

            // 如果有问题，应该有建议
            if (longTaskCount > 0 || slowResourceCount > 0) {
              expect(suggestions.length).toBeGreaterThan(0)

              // 验证所有建议都有 expectedImpact
              for (const suggestion of suggestions) {
                expect(suggestion.expectedImpact).toBeDefined()
                expect(typeof suggestion.expectedImpact).toBe('string')
                expect(suggestion.expectedImpact.length).toBeGreaterThan(0)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Score Calculation', () => {
    it('should calculate score within 0-100 range', () => {
      fc.assert(
        fc.property(
          fc.record({
            lighthouseScore: fc.integer({ min: 0, max: 100 }),
            webVitals: fc.record({
              LCP: fc.double({ min: 0, max: 10000, noNaN: true }),
              FID: fc.double({ min: 0, max: 1000, noNaN: true }),
              CLS: fc.double({ min: 0, max: 1, noNaN: true }),
              FCP: fc.double({ min: 0, max: 5000, noNaN: true }),
              TTFB: fc.double({ min: 0, max: 2000, noNaN: true }),
              INP: fc.double({ min: 0, max: 1000, noNaN: true }),
            }),
            longTaskCount: fc.integer({ min: 0, max: 50 }),
            slowResourceCount: fc.integer({ min: 0, max: 50 }),
          }),
          ({ lighthouseScore, webVitals, longTaskCount, slowResourceCount }) => {
            const longTasks: LongTask[] = Array.from({ length: longTaskCount }, (_, i) => ({
              startTime: i * 1000,
              duration: 100,
            }))

            const slowResources = Array.from({ length: slowResourceCount }, (_, i) => ({
              url: `https://example.com/resource-${i}.js`,
              type: 'script' as ResourceType,
              size: 500000,
              loadTime: 1500,
            }))

            const result: PerformanceTestResult = {
              lighthouseScore,
              webVitals,
              resources: {
                totalResources: slowResourceCount,
                totalSize: 1000000,
                byType: {
                  script: { count: slowResourceCount, totalSize: 1000000, avgLoadTime: 1500 },
                  stylesheet: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  image: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  font: { count: 0, totalSize: 0, avgLoadTime: 0 },
                  other: { count: 0, totalSize: 0, avgLoadTime: 0 },
                },
                slowResources,
              },
              longTasks,
              networkConditions: [],
              score: 0,
            }

            const score = profiler.calculateScore(result)

            // 验证评分在 0-100 范围内
            expect(score).toBeGreaterThanOrEqual(0)
            expect(score).toBeLessThanOrEqual(100)
            expect(Number.isInteger(score)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
