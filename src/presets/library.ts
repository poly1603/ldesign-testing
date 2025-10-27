/**
 * 库项目预设配置
 */
import type { PresetConfig } from '../types/index.js'

export const libraryPreset: PresetConfig = {
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
      exclude: [
        '**/*.config.{ts,js}',
        '**/node_modules/**',
        '**/dist/**',
        '**/lib/**',
        '**/es/**',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
      threshold: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
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
      updateSnapshot: 'new',
    },
    parallel: {
      enabled: true,
    },
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/es/**',
      '**/coverage/**',
    ],
  },
}

