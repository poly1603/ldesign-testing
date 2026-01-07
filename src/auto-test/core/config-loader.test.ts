/**
 * @ldesign/testing - Config Loader Tests
 * 配置加载器的单元测试和属性测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as fc from 'fast-check'
import { AutoTestConfigLoader } from './config-loader.js'
import type { TestType } from '../types/index.js'
import { DEFAULT_AUTO_TEST_CONFIG } from '../types/index.js'

describe('AutoTestConfigLoader', () => {
  let loader: AutoTestConfigLoader
  let testDir: string

  beforeEach(() => {
    loader = new AutoTestConfigLoader()
    // 创建临时测试目录
    testDir = join(tmpdir(), `auto-test-config-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // 清理临时目录
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    // 清理环境变量
    delete process.env.AUTO_TEST_TARGET_URL
    delete process.env.AUTO_TEST_CI
    delete process.env.AUTO_TEST_PARALLEL
    delete process.env.AUTO_TEST_OUTPUT_DIR
    delete process.env.AUTO_TEST_TESTS
    delete process.env.AUTO_TEST_MEMORY_THRESHOLD
    delete process.env.AUTO_TEST_PERFORMANCE_LCP
  })

  describe('基本功能测试', () => {
    it('should load default config when no config file exists', async () => {
      const config = await loader.load(testDir)

      expect(config).toBeDefined()
      expect(config.tests).toEqual(DEFAULT_AUTO_TEST_CONFIG.tests)
      expect(config.memory).toEqual(DEFAULT_AUTO_TEST_CONFIG.memory)
      expect(config.performance).toEqual(DEFAULT_AUTO_TEST_CONFIG.performance)
    })

    it('should load config from auto-test.config.js', async () => {
      const configContent = `
        export default {
          targetUrl: 'http://localhost:3000',
          tests: ['memory', 'performance'],
          ci: true
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      const config = await loader.load(testDir)

      expect(config.targetUrl).toBe('http://localhost:3000')
      expect(config.tests).toEqual(['memory', 'performance'])
      expect(config.ci).toBe(true)
    })

    it('should merge user config with defaults', async () => {
      const configContent = `
        export default {
          memory: {
            threshold: 200
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      const config = await loader.load(testDir)

      // 用户配置应该覆盖默认值
      expect(config.memory?.threshold).toBe(200)
      // 其他默认值应该保留
      expect(config.memory?.enabled).toBe(DEFAULT_AUTO_TEST_CONFIG.memory?.enabled)
      expect(config.memory?.leakSensitivity).toBe(
        DEFAULT_AUTO_TEST_CONFIG.memory?.leakSensitivity
      )
    })

    it('should apply environment variable overrides', async () => {
      process.env.AUTO_TEST_TARGET_URL = 'http://env-url:4000'
      process.env.AUTO_TEST_CI = 'true'
      process.env.AUTO_TEST_PARALLEL = '4'

      const config = await loader.load(testDir)

      expect(config.targetUrl).toBe('http://env-url:4000')
      expect(config.ci).toBe(true)
      expect(config.parallel).toBe(4)
    })

    it('should prioritize env vars over config file', async () => {
      const configContent = `
        export default {
          targetUrl: 'http://localhost:3000',
          ci: false
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      process.env.AUTO_TEST_TARGET_URL = 'http://env-url:4000'
      process.env.AUTO_TEST_CI = 'true'

      const config = await loader.load(testDir)

      // 环境变量应该覆盖配置文件
      expect(config.targetUrl).toBe('http://env-url:4000')
      expect(config.ci).toBe(true)
    })
  })

  describe('配置验证测试', () => {
    it('should reject invalid test types', async () => {
      const configContent = `
        export default {
          tests: ['memory', 'invalid-type']
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(/Invalid test type/)
    })

    it('should reject invalid parallel value', async () => {
      const configContent = `
        export default {
          parallel: -1
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(
        /parallel must be a positive number/
      )
    })

    it('should reject invalid memory threshold', async () => {
      const configContent = `
        export default {
          memory: {
            threshold: -100
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(
        /memory.threshold must be a positive number/
      )
    })

    it('should reject invalid scoreWeights sum', async () => {
      const configContent = `
        export default {
          scoreWeights: {
            memory: 0.5,
            performance: 0.5,
            ui: 0.5,
            api: 0.5,
            page: 0.5
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(
        /scoreWeights must sum to 1.0/
      )
    })

    it('should reject negative scoreWeights', async () => {
      const configContent = `
        export default {
          scoreWeights: {
            memory: -0.1,
            performance: 0.3,
            ui: 0.3,
            api: 0.3,
            page: 0.2
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(
        /scoreWeights.memory must be non-negative/
      )
    })

    it('should reject invalid viewport configuration', async () => {
      const configContent = `
        export default {
          ui: {
            viewports: [
              { name: 'mobile', width: -100, height: 667 }
            ]
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(
        /viewports\[0\].width must be a positive number/
      )
    })

    it('should reject invalid report formats', async () => {
      const configContent = `
        export default {
          report: {
            formats: ['html', 'invalid-format']
          }
        }
      `
      writeFileSync(join(testDir, 'auto-test.config.js'), configContent)

      await expect(loader.load(testDir)).rejects.toThrow(/Invalid report format/)
    })
  })

  describe('环境变量测试', () => {
    it('should parse AUTO_TEST_TESTS from comma-separated string', async () => {
      process.env.AUTO_TEST_TESTS = 'memory,performance,ui'

      const config = await loader.load(testDir)

      expect(config.tests).toEqual(['memory', 'performance', 'ui'])
    })

    it('should parse AUTO_TEST_MEMORY_THRESHOLD', async () => {
      process.env.AUTO_TEST_MEMORY_THRESHOLD = '150'

      const config = await loader.load(testDir)

      expect(config.memory?.threshold).toBe(150)
    })

    it('should parse AUTO_TEST_PERFORMANCE_LCP', async () => {
      process.env.AUTO_TEST_PERFORMANCE_LCP = '3000'

      const config = await loader.load(testDir)

      expect(config.performance?.thresholds?.LCP).toBe(3000)
    })

    it('should ignore invalid numeric env vars', async () => {
      process.env.AUTO_TEST_PARALLEL = 'not-a-number'

      const config = await loader.load(testDir)

      // 应该使用默认值
      expect(config.parallel).toBe(DEFAULT_AUTO_TEST_CONFIG.parallel)
    })
  })

  describe('Property 23: Configuration Loading', () => {
    /**
     * Feature: auto-testing-suite, Property 23: Configuration Loading
     * Validates: Requirements 9.1, 9.3, 9.5
     *
     * For any valid configuration file, the Config_Loader SHALL parse and apply
     * all specified settings, with environment variables taking precedence over file values.
     */
    it('should correctly load and merge any valid configuration', async () => {
      // 定义所有可能的 AUTO_TEST_* 环境变量
      const AUTO_TEST_ENV_VARS = [
        'AUTO_TEST_TARGET_URL',
        'AUTO_TEST_CI',
        'AUTO_TEST_PARALLEL',
        'AUTO_TEST_OUTPUT_DIR',
        'AUTO_TEST_TESTS',
        'AUTO_TEST_MEMORY_THRESHOLD',
        'AUTO_TEST_PERFORMANCE_LCP',
      ]

      await fc.assert(
        fc.asyncProperty(
          // 生成有效的配置对象
          fc.record({
            targetUrl: fc.option(fc.webUrl(), { nil: undefined }),
            tests: fc.option(
              fc.subarray(['memory', 'performance', 'ui', 'api', 'page'] as TestType[], {
                minLength: 1,
              }),
              { nil: undefined }
            ),
            ci: fc.option(fc.boolean(), { nil: undefined }),
            parallel: fc.option(fc.integer({ min: 1, max: 16 }), { nil: undefined }),
            memory: fc.option(
              fc.record({
                enabled: fc.option(fc.boolean(), { nil: undefined }),
                threshold: fc.option(fc.integer({ min: 1, max: 1000 }), {
                  nil: undefined,
                }),
                leakSensitivity: fc.option(
                  fc.constantFrom('low', 'medium', 'high'),
                  { nil: undefined }
                ),
              }),
              { nil: undefined }
            ),
            scoreWeights: fc.option(
              fc
                .tuple(
                  fc.double({ min: 0, max: 1, noNaN: true }),
                  fc.double({ min: 0, max: 1, noNaN: true }),
                  fc.double({ min: 0, max: 1, noNaN: true }),
                  fc.double({ min: 0, max: 1, noNaN: true }),
                  fc.double({ min: 0, max: 1, noNaN: true })
                )
                .map(([w1, w2, w3, w4, w5]) => {
                  // 归一化权重使其总和为 1
                  const sum = w1 + w2 + w3 + w4 + w5
                  if (sum === 0) {
                    return {
                      memory: 0.2,
                      performance: 0.2,
                      ui: 0.2,
                      api: 0.2,
                      page: 0.2,
                    }
                  }
                  return {
                    memory: w1 / sum,
                    performance: w2 / sum,
                    ui: w3 / sum,
                    api: w4 / sum,
                    page: w5 / sum,
                  }
                }),
              { nil: undefined }
            ),
          }),
          // 生成环境变量覆盖
          fc.record({
            AUTO_TEST_TARGET_URL: fc.option(fc.webUrl(), { nil: undefined }),
            AUTO_TEST_CI: fc.option(fc.constantFrom('true', 'false'), {
              nil: undefined,
            }),
            AUTO_TEST_PARALLEL: fc.option(
              fc.integer({ min: 1, max: 16 }).map(String),
              { nil: undefined }
            ),
          }),
          async (userConfig, envVars) => {
            // 在每次迭代开始时，保存并清理所有 AUTO_TEST_* 环境变量
            const savedEnv: Record<string, string | undefined> = {}
            for (const key of AUTO_TEST_ENV_VARS) {
              savedEnv[key] = process.env[key]
              delete process.env[key]
            }

            // 创建临时测试目录
            const tempDir = join(tmpdir(), `pbt-config-${Date.now()}-${Math.random()}`)
            mkdirSync(tempDir, { recursive: true })

            try {
              // 写入配置文件
              const configContent = `export default ${JSON.stringify(userConfig, null, 2)}`
              writeFileSync(join(tempDir, 'auto-test.config.js'), configContent)

              // 设置当前测试需要的环境变量
              for (const [key, value] of Object.entries(envVars)) {
                if (value !== undefined) {
                  process.env[key] = value
                }
              }

              // 加载配置
              const testLoader = new AutoTestConfigLoader()
              const config = await testLoader.load(tempDir)

              // 验证配置已加载
              expect(config).toBeDefined()
              expect(config.root).toBe(tempDir)

              // 验证用户配置已应用
              if (userConfig.targetUrl !== undefined) {
                // 如果环境变量设置了，应该使用环境变量的值
                if (envVars.AUTO_TEST_TARGET_URL !== undefined) {
                  expect(config.targetUrl).toBe(envVars.AUTO_TEST_TARGET_URL)
                } else {
                  expect(config.targetUrl).toBe(userConfig.targetUrl)
                }
              }

              if (userConfig.tests !== undefined) {
                expect(config.tests).toEqual(userConfig.tests)
              }

              if (userConfig.ci !== undefined) {
                // 如果环境变量设置了，应该使用环境变量的值
                if (envVars.AUTO_TEST_CI !== undefined) {
                  expect(config.ci).toBe(envVars.AUTO_TEST_CI === 'true')
                } else {
                  expect(config.ci).toBe(userConfig.ci)
                }
              }

              if (userConfig.parallel !== undefined) {
                // 如果环境变量设置了，应该使用环境变量的值
                if (envVars.AUTO_TEST_PARALLEL !== undefined) {
                  expect(config.parallel).toBe(parseInt(envVars.AUTO_TEST_PARALLEL, 10))
                } else {
                  expect(config.parallel).toBe(userConfig.parallel)
                }
              }

              if (userConfig.memory !== undefined) {
                if (userConfig.memory.threshold !== undefined) {
                  expect(config.memory?.threshold).toBe(userConfig.memory.threshold)
                }
                if (userConfig.memory.leakSensitivity !== undefined) {
                  expect(config.memory?.leakSensitivity).toBe(
                    userConfig.memory.leakSensitivity
                  )
                }
              }

              if (userConfig.scoreWeights !== undefined) {
                expect(config.scoreWeights).toEqual(userConfig.scoreWeights)
                // 验证权重总和为 1
                const sum =
                  config.scoreWeights!.memory +
                  config.scoreWeights!.performance +
                  config.scoreWeights!.ui +
                  config.scoreWeights!.api +
                  config.scoreWeights!.page
                expect(Math.abs(sum - 1.0)).toBeLessThan(0.001)
              }
            } finally {
              // 清理临时目录
              if (existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true, force: true })
              }

              // 恢复所有环境变量到测试前的状态
              for (const key of AUTO_TEST_ENV_VARS) {
                if (savedEnv[key] === undefined) {
                  delete process.env[key]
                } else {
                  process.env[key] = savedEnv[key]
                }
              }
            }
          }
        ),
        {
          numRuns: 20,
          verbose: true,
        }
      )
    })
  })
})
