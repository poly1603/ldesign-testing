/**
 * Vue 预设配置
 */
import type { PresetConfig } from '../types/index.js'

export const vuePreset: PresetConfig = {
  name: 'vue',
  config: {
    framework: 'vitest',
    testDir: 'tests',
    testMatch: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    unit: {
      setupFiles: ['tests/setup.ts'],
      timeout: 5000,
      clearMocks: true,
      resetMocks: true,
      globals: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
      },
    },
    e2e: {
      framework: 'playwright',
      baseUrl: 'http://localhost:3000',
      testDir: 'tests/e2e',
      browsers: ['chromium'],
      headless: true,
      screenshot: 'only-on-failure',
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/*.config.{ts,js}',
        '**/node_modules/**',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
      threshold: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    mock: {
      clearMocks: true,
      resetMocks: true,
      faker: {
        locale: 'zh_CN',
      },
    },
    parallel: {
      enabled: true,
    },
    ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
}

