/**
 * React 预设配置
 */
import type { PresetConfig } from '../types/index.js'

export const reactPreset: PresetConfig = {
  name: 'react',
  config: {
    framework: 'vitest',
    testDir: 'tests',
    testMatch: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    unit: {
      setupFiles: ['tests/setup.ts'],
      timeout: 5000,
      clearMocks: true,
      resetMocks: true,
      globals: {
        IS_REACT_ACT_ENVIRONMENT: true,
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
        '**/*.stories.{ts,tsx,js,jsx}',
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
    ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.storybook/**'],
  },
}

