/**
 * 基础预设配置
 */
import type { PresetConfig } from '../types/index.js'

export const basePreset: PresetConfig = {
  name: 'base',
  config: {
    framework: 'vitest',
    testDir: 'tests',
    testMatch: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
    unit: {
      timeout: 5000,
      clearMocks: true,
      resetMocks: true,
      restoreMocks: true,
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
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
    },
    parallel: {
      enabled: true,
    },
    ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
}

