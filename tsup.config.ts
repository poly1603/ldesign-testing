import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [
    'vitest',
    '@playwright/test',
    '@faker-js/faker',
    'msw',
    'tinybench',
    'commander',
    'inquirer',
    'chalk',
    'ora',
    'fast-glob',
    'fs-extra',
    'ejs',
    'execa',
    'cosmiconfig',
    'pixelmatch',
    'pngjs',
    '@vitest/ui',
    '@vitest/coverage-v8',
  ],
})

