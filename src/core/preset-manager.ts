/**
 * 预设配置管理器
 */
import type { PresetName, PresetConfig, TestingConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class PresetManager {
  private presets: Map<PresetName, PresetConfig> = new Map()

  constructor() {
    this.registerDefaultPresets()
  }

  /**
   * 注册默认预设
   */
  private registerDefaultPresets(): void {
    // 基础预设
    this.register({
      name: 'base',
      config: {
        framework: 'vitest',
        testDir: 'tests',
        testMatch: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'html'],
          threshold: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    })

    // Vue 预设
    this.register({
      name: 'vue',
      config: {
        framework: 'vitest',
        testDir: 'tests',
        testMatch: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        unit: {
          setupFiles: ['tests/setup.ts'],
          globals: {
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
          },
        },
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          exclude: ['**/*.config.ts', '**/node_modules/**'],
          threshold: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
    })

    // React 预设
    this.register({
      name: 'react',
      config: {
        framework: 'vitest',
        testDir: 'tests',
        testMatch: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
        unit: {
          setupFiles: ['tests/setup.ts'],
          globals: {
            IS_REACT_ACT_ENVIRONMENT: true,
          },
        },
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          exclude: ['**/*.config.ts', '**/node_modules/**', '**/*.stories.tsx'],
          threshold: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
    })

    // Node.js 预设
    this.register({
      name: 'node',
      config: {
        framework: 'vitest',
        testDir: 'tests',
        testMatch: ['**/*.test.ts', '**/*.spec.ts'],
        unit: {
          timeout: 10000,
        },
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: ['**/*.config.ts', '**/node_modules/**', '**/dist/**'],
          threshold: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    })

    // 库项目预设
    this.register({
      name: 'library',
      config: {
        framework: 'vitest',
        testDir: 'tests',
        testMatch: ['**/*.test.ts', '**/*.spec.ts'],
        unit: {
          timeout: 5000,
          clearMocks: true,
          resetMocks: true,
          restoreMocks: true,
        },
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'json', 'html', 'lcov'],
          exclude: ['**/*.config.ts', '**/node_modules/**', '**/dist/**', '**/__tests__/**'],
          threshold: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
          },
        },
        parallel: {
          enabled: true,
        },
      },
    })
  }

  /**
   * 注册预设
   */
  register(preset: PresetConfig): void {
    this.presets.set(preset.name, preset)
    logger.debug(`预设已注册: ${preset.name}`)
  }

  /**
   * 获取预设
   */
  get(name: PresetName): PresetConfig | undefined {
    return this.presets.get(name)
  }

  /**
   * 获取预设配置
   */
  getConfig(name: PresetName): TestingConfig | undefined {
    const preset = this.get(name)
    return preset?.config
  }

  /**
   * 列出所有预设
   */
  list(): PresetName[] {
    return Array.from(this.presets.keys())
  }

  /**
   * 检查预设是否存在
   */
  has(name: PresetName): boolean {
    return this.presets.has(name)
  }

  /**
   * 应用预设
   */
  apply(name: PresetName, baseConfig: TestingConfig = {}): TestingConfig {
    const preset = this.get(name)

    if (!preset) {
      logger.warn(`预设不存在: ${name}，使用基础配置`)
      return baseConfig
    }

    logger.debug(`应用预设: ${name}`)

    // 合并配置
    return {
      ...preset.config,
      ...baseConfig,
      unit: {
        ...preset.config.unit,
        ...baseConfig.unit,
      },
      e2e: {
        ...preset.config.e2e,
        ...baseConfig.e2e,
      },
      coverage: {
        ...preset.config.coverage,
        ...baseConfig.coverage,
        threshold: {
          ...preset.config.coverage?.threshold,
          ...baseConfig.coverage?.threshold,
        },
      },
      mock: {
        ...preset.config.mock,
        ...baseConfig.mock,
      },
      snapshot: {
        ...preset.config.snapshot,
        ...baseConfig.snapshot,
      },
      parallel: {
        ...preset.config.parallel,
        ...baseConfig.parallel,
      },
    }
  }
}

// 默认导出实例
export const presetManager = new PresetManager()

