/**
 * Node.js 预设配置
 */
import type { PresetConfig } from '../types/index.js'

export const nodePreset: PresetConfig = {
  name: 'node',
  config: {
    framework: 'vitest',
    testDir: 'tests',
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    unit: {
      timeout: 10000,
      clearMocks: true,
      resetMocks: true,
      restoreMocks: true,
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.config.{ts,js}',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
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
    parallel: {
      enabled: true,
    },
    ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.cache/**'],
  },
}

