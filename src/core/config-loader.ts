/**
 * 配置加载器
 */
import { cosmiconfig } from 'cosmiconfig'
import type { TestingConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { fileExists } from '../utils/file-utils.js'
import { getConfigPath } from '../utils/path-utils.js'

export class ConfigLoader {
  private moduleName: string

  constructor(moduleName = 'testing') {
    this.moduleName = moduleName
  }

  /**
   * 加载配置
   */
  async load(cwd: string): Promise<TestingConfig | null> {
    try {
      const explorer = cosmiconfig(this.moduleName, {
        searchPlaces: [
          'package.json',
          `.${this.moduleName}rc`,
          `.${this.moduleName}rc.json`,
          `.${this.moduleName}rc.js`,
          `.${this.moduleName}rc.cjs`,
          `.${this.moduleName}rc.mjs`,
          `.${this.moduleName}rc.ts`,
          `${this.moduleName}.config.js`,
          `${this.moduleName}.config.cjs`,
          `${this.moduleName}.config.mjs`,
          `${this.moduleName}.config.ts`,
        ],
      })

      const result = await explorer.search(cwd)

      if (result) {
        logger.debug(`配置文件已加载: ${result.filepath}`)
        return result.config as TestingConfig
      }

      logger.debug('未找到配置文件，使用默认配置')
      return null
    } catch (error) {
      logger.error('加载配置失败:', error)
      throw error
    }
  }

  /**
   * 查找配置文件
   */
  async find(cwd: string): Promise<string | null> {
    const configPaths = getConfigPath(cwd, this.moduleName)

    for (const configPath of configPaths) {
      if (await fileExists(configPath)) {
        return configPath
      }
    }

    return null
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): TestingConfig {
    return {
      framework: 'vitest',
      testDir: 'tests',
      testMatch: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
      unit: {
        timeout: 5000,
        clearMocks: true,
        resetMocks: true,
        restoreMocks: true,
      },
      e2e: {
        framework: 'playwright',
        baseUrl: 'http://localhost:3000',
        testDir: 'tests/e2e',
        browsers: ['chromium'],
        headless: true,
        timeout: 30000,
        retries: 0,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      coverage: {
        enabled: false,
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: 'coverage',
        threshold: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      mock: {
        clearMocks: true,
        resetMocks: true,
        restoreMocks: true,
        faker: {
          locale: 'zh_CN',
        },
      },
      snapshot: {
        snapshotDir: '__snapshots__',
        updateSnapshot: 'new',
        threshold: 0.01,
      },
      parallel: {
        enabled: true,
        workers: undefined, // 使用 CPU 核心数
      },
      ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
      watch: false,
    }
  }

  /**
   * 合并配置
   */
  mergeConfig(
    defaultConfig: TestingConfig,
    userConfig: TestingConfig | null
  ): TestingConfig {
    if (!userConfig) {
      return defaultConfig
    }

    return {
      ...defaultConfig,
      ...userConfig,
      unit: { ...defaultConfig.unit, ...userConfig.unit },
      e2e: { ...defaultConfig.e2e, ...userConfig.e2e },
      coverage: {
        ...defaultConfig.coverage,
        ...userConfig.coverage,
        threshold: {
          ...defaultConfig.coverage?.threshold,
          ...userConfig.coverage?.threshold,
        },
      },
      mock: {
        ...defaultConfig.mock,
        ...userConfig.mock,
        faker: {
          ...defaultConfig.mock?.faker,
          ...userConfig.mock?.faker,
        },
        msw: {
          ...defaultConfig.mock?.msw,
          ...userConfig.mock?.msw,
        },
      },
      snapshot: { ...defaultConfig.snapshot, ...userConfig.snapshot },
      parallel: { ...defaultConfig.parallel, ...userConfig.parallel },
    }
  }
}

// 默认导出实例
export const configLoader = new ConfigLoader()

