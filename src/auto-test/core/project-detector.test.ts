/**
 * @ldesign/testing - Project Detector Tests
 * Property-based tests for project detection
 * 
 * Feature: auto-testing-suite, Property 1: Project Detection Completeness
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { ProjectDetector, type SubProject } from './project-detector.js'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { FrameworkInfo, FrameworkName } from '../types/index.js'

/**
 * 测试辅助函数：创建临时测试目录
 */
function createTempDir(prefix: string = 'auto-test-'): string {
  const tempPath = join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tempPath, { recursive: true })
  return tempPath
}

/**
 * 测试辅助函数：清理临时目录
 */
function cleanupTempDir(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true })
  }
}

/**
 * 测试辅助函数：创建 package.json
 */
function createPackageJson(
  dir: string,
  content: {
    name?: string
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    workspaces?: string[] | { packages?: string[] }
  }
): void {
  const packageJson = {
    name: content.name || 'test-project',
    version: '1.0.0',
    ...content,
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson, null, 2))
}

/**
 * 测试辅助函数：创建配置文件
 */
function createConfigFile(dir: string, filename: string, content: string = ''): void {
  writeFileSync(join(dir, filename), content)
}

describe('ProjectDetector', () => {
  let detector: ProjectDetector
  let tempDirs: string[] = []

  beforeEach(() => {
    detector = new ProjectDetector()
    tempDirs = []
  })

  afterEach(() => {
    // 清理所有临时目录
    tempDirs.forEach(dir => cleanupTempDir(dir))
    tempDirs = []
  })

  /**
   * Property 1: Project Detection Completeness
   * For any valid project structure containing one or more supported frameworks,
   * the Project_Detector SHALL correctly identify all frameworks present
   */
  describe('Property 1: Project Detection Completeness', () => {
    it('should detect all Vue 3 projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vueVersion: fc.constantFrom('^3.0.0', '^3.2.0', '^3.3.0', '^3.4.0', '~3.5.0'),
            hasVite: fc.boolean(),
          }),
          async ({ vueVersion, hasVite }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            const deps: Record<string, string> = { vue: vueVersion }
            if (hasVite) {
              deps.vite = '^5.0.0'
            }

            createPackageJson(tempDir, { dependencies: deps })
            if (hasVite) {
              createConfigFile(tempDir, 'vite.config.ts')
            }

            const result = await detector.detect(tempDir)

            // 验证检测到 Vue 3
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('vue3')
            expect(result.frameworks[0].version).toBe(vueVersion)

            // 如果有 Vite，应该检测到
            if (hasVite) {
              expect(result.buildTool).toBe('vite')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect all Vue 2 projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vueVersion: fc.constantFrom('^2.6.0', '^2.7.0', '~2.7.14'),
            hasWebpack: fc.boolean(),
          }),
          async ({ vueVersion, hasWebpack }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            const deps: Record<string, string> = { vue: vueVersion }
            if (hasWebpack) {
              deps.webpack = '^5.0.0'
            }

            createPackageJson(tempDir, { dependencies: deps })
            if (hasWebpack) {
              createConfigFile(tempDir, 'webpack.config.js')
            }

            const result = await detector.detect(tempDir)

            // 验证检测到 Vue 2
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('vue2')
            expect(result.frameworks[0].version).toBe(vueVersion)

            // 如果有 Webpack，应该检测到
            if (hasWebpack) {
              expect(result.buildTool).toBe('webpack')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect all React projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            reactVersion: fc.constantFrom('^17.0.0', '^18.0.0', '^18.2.0'),
            buildTool: fc.constantFrom('vite', 'webpack', 'none'),
          }),
          async ({ reactVersion, buildTool }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            const deps: Record<string, string> = { react: reactVersion }
            if (buildTool === 'vite') {
              deps.vite = '^5.0.0'
              createConfigFile(tempDir, 'vite.config.ts')
            } else if (buildTool === 'webpack') {
              deps.webpack = '^5.0.0'
              createConfigFile(tempDir, 'webpack.config.js')
            }

            createPackageJson(tempDir, { dependencies: deps })

            const result = await detector.detect(tempDir)

            // 验证检测到 React
            const reactFramework = result.frameworks.find(f => f.name === 'react')
            expect(reactFramework).toBeDefined()
            expect(reactFramework?.version).toBe(reactVersion)

            // 验证构建工具
            if (buildTool !== 'none') {
              expect(result.buildTool).toBe(buildTool)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect multiple frameworks in the same project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasVue: fc.boolean(),
            hasReact: fc.boolean(),
            hasSvelte: fc.boolean(),
          }).filter(({ hasVue, hasReact, hasSvelte }) => hasVue || hasReact || hasSvelte),
          async ({ hasVue, hasReact, hasSvelte }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            const deps: Record<string, string> = {}
            let expectedCount = 0

            if (hasVue) {
              deps.vue = '^3.0.0'
              expectedCount++
            }
            if (hasReact) {
              deps.react = '^18.0.0'
              expectedCount++
            }
            if (hasSvelte) {
              deps.svelte = '^4.0.0'
              expectedCount++
            }

            createPackageJson(tempDir, { dependencies: deps })

            const result = await detector.detect(tempDir)

            // 验证检测到所有框架
            expect(result.frameworks).toHaveLength(expectedCount)

            if (hasVue) {
              expect(result.frameworks.some(f => f.name === 'vue3')).toBe(true)
            }
            if (hasReact) {
              expect(result.frameworks.some(f => f.name === 'react')).toBe(true)
            }
            if (hasSvelte) {
              expect(result.frameworks.some(f => f.name === 'svelte')).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect Angular projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('^15.0.0', '^16.0.0', '^17.0.0'),
          async (angularVersion) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, {
              dependencies: { '@angular/core': angularVersion },
            })
            createConfigFile(tempDir, 'angular.json', '{}')

            const result = await detector.detect(tempDir)

            // 验证检测到 Angular
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('angular')
            expect(result.frameworks[0].version).toBe(angularVersion)
            expect(result.frameworks[0].configFile).toBe('angular.json')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect Svelte projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('^3.0.0', '^4.0.0'),
          async (svelteVersion) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, {
              dependencies: { svelte: svelteVersion },
            })

            const result = await detector.detect(tempDir)

            // 验证检测到 Svelte
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('svelte')
            expect(result.frameworks[0].version).toBe(svelteVersion)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect Solid projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('^1.7.0', '^1.8.0'),
          async (solidVersion) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, {
              dependencies: { 'solid-js': solidVersion },
            })

            const result = await detector.detect(tempDir)

            // 验证检测到 Solid
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('solid')
            expect(result.frameworks[0].version).toBe(solidVersion)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect Preact projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('^10.0.0', '^10.19.0'),
          async (preactVersion) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, {
              dependencies: { preact: preactVersion },
            })

            const result = await detector.detect(tempDir)

            // 验证检测到 Preact
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('preact')
            expect(result.frameworks[0].version).toBe(preactVersion)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect vanilla JS projects when no framework is present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, {
              dependencies: {},
            })

            const result = await detector.detect(tempDir)

            // 验证检测到 vanilla
            expect(result.frameworks).toHaveLength(1)
            expect(result.frameworks[0].name).toBe('vanilla')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1 (continued): Monorepo Detection
   * For any monorepo structure, the detector SHALL correctly identify it as monorepo
   * and scan all subprojects
   */
  describe('Property 1: Monorepo Detection', () => {
    it('should detect pnpm workspace monorepos', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('packages/*', 'apps/*', 'tools/*'), { minLength: 1, maxLength: 3 }),
          async (workspacePatterns) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            // 创建 pnpm-workspace.yaml
            const yamlContent = `packages:\n${workspacePatterns.map(p => `  - '${p}'`).join('\n')}`
            createConfigFile(tempDir, 'pnpm-workspace.yaml', yamlContent)
            // 创建 pnpm-lock.yaml 以正确标识 pnpm 项目
            createConfigFile(tempDir, 'pnpm-lock.yaml', 'lockfileVersion: \'6.0\'')
            createPackageJson(tempDir, {})

            const result = await detector.detect(tempDir)

            // 验证检测到 monorepo
            expect(result.isMonorepo).toBe(true)
            expect(result.packageManager).toBe('pnpm')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect lerna monorepos', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('packages/*', 'apps/*'), { minLength: 1, maxLength: 2 }),
          async (packages) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            // 创建 lerna.json
            const lernaConfig = { packages, version: '1.0.0' }
            createConfigFile(tempDir, 'lerna.json', JSON.stringify(lernaConfig))
            createPackageJson(tempDir, {})

            const result = await detector.detect(tempDir)

            // 验证检测到 monorepo
            expect(result.isMonorepo).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect yarn workspace monorepos', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('packages/*', 'apps/*'), { minLength: 1, maxLength: 2 }),
          async (workspaces) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            createPackageJson(tempDir, { workspaces })

            const result = await detector.detect(tempDir)

            // 验证检测到 monorepo
            expect(result.isMonorepo).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should scan and detect frameworks in monorepo subprojects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            subProjects: fc.array(
              fc.record({
                name: fc.constantFrom('app1', 'app2', 'lib1', 'lib2'),
                framework: fc.constantFrom<FrameworkName>('vue3', 'react', 'svelte'),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async ({ subProjects }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            // 创建 monorepo 根配置
            createPackageJson(tempDir, { workspaces: ['packages/*'] })

            // 创建 packages 目录
            const packagesDir = join(tempDir, 'packages')
            mkdirSync(packagesDir, { recursive: true })

            // 去重子项目名称，避免文件系统覆盖
            const uniqueSubProjects = Array.from(
              new Map(subProjects.map(sp => [sp.name, sp])).values()
            )

            // 创建子项目
            for (const subProject of uniqueSubProjects) {
              const subDir = join(packagesDir, subProject.name)
              mkdirSync(subDir, { recursive: true })

              const deps: Record<string, string> = {}
              if (subProject.framework === 'vue3') {
                deps.vue = '^3.0.0'
              } else if (subProject.framework === 'react') {
                deps.react = '^18.0.0'
              } else if (subProject.framework === 'svelte') {
                deps.svelte = '^4.0.0'
              }

              createPackageJson(subDir, {
                name: `@test/${subProject.name}`,
                dependencies: deps,
              })
            }

            // 扫描子项目
            const scannedSubProjects = await detector.scanMonorepoSubProjects(tempDir)

            // 验证扫描到所有唯一子项目
            expect(scannedSubProjects.length).toBeGreaterThanOrEqual(uniqueSubProjects.length)

            // 验证每个子项目的框架检测
            for (const subProject of uniqueSubProjects) {
              const found = scannedSubProjects.find(sp => sp.name === `@test/${subProject.name}`)
              expect(found).toBeDefined()
              expect(found?.frameworks.length).toBeGreaterThan(0)
              expect(found?.frameworks[0].name).toBe(subProject.framework)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 1 (continued): Build Tool Detection
   * For any project with a build tool, the detector SHALL correctly identify it
   */
  describe('Property 1: Build Tool Detection', () => {
    it('should detect all supported build tools', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<{ tool: string; dep?: string; config?: string }>
            (
              { tool: 'vite', dep: 'vite', config: 'vite.config.ts' },
              { tool: 'webpack', dep: 'webpack', config: 'webpack.config.js' },
              { tool: 'rollup', dep: 'rollup', config: 'rollup.config.js' },
              { tool: 'esbuild', dep: 'esbuild' },
              { tool: 'parcel', dep: 'parcel' }
            ),
          async ({ tool, dep, config }) => {
            const tempDir = createTempDir()
            tempDirs.push(tempDir)

            const deps: Record<string, string> = {}
            if (dep) {
              deps[dep] = '^5.0.0'
            }

            createPackageJson(tempDir, { devDependencies: deps })

            if (config) {
              createConfigFile(tempDir, config)
            }

            const result = await detector.detect(tempDir)

            // 验证检测到正确的构建工具
            expect(result.buildTool).toBe(tool)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

