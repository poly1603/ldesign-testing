/**
 * @ldesign/testing - Project Detector
 * 项目检测器，自动识别项目类型、框架和构建工具
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import type {
  ProjectInfo,
  FrameworkInfo,
  BuildTool,
} from '../types/index.js'

/**
 * package.json 类型定义
 */
interface PackageJson {
  name?: string
  version?: string
  main?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  workspaces?: string[] | { packages?: string[] }
}

/**
 * Monorepo 子项目信息
 */
export interface SubProject {
  /** 子项目路径 */
  path: string
  /** 子项目名称 */
  name: string
  /** 子项目框架 */
  frameworks: FrameworkInfo[]
}

/**
 * 项目检测器类
 */
export class ProjectDetector {
  /**
   * 检测项目信息
   * @param cwd 项目根目录，默认为当前工作目录
   * @returns 项目信息
   */
  async detect(cwd: string = process.cwd()): Promise<ProjectInfo> {
    const root = resolve(cwd)

    // 检查 package.json 是否存在
    const packageJsonPath = join(root, 'package.json')
    if (!existsSync(packageJsonPath)) {
      throw this.createError(
        'PROJECT_NOT_DETECTED',
        `No package.json found in ${root}`
      )
    }

    // 读取 package.json
    const packageJson = await this.readPackageJson(packageJsonPath)

    // 检测框架
    const frameworks = this.detectFramework(packageJson)

    // 检测构建工具
    const buildTool = this.detectBuildTool(packageJson, root)

    // 检测包管理器
    const packageManager = await this.detectPackageManager(root)

    // 检测是否为 monorepo
    const isMonorepo = await this.detectMonorepo(root)

    // 检测入口文件
    const entryPoints = this.detectEntryPoints(packageJson, root)

    return {
      root,
      frameworks,
      buildTool,
      packageManager,
      isMonorepo,
      entryPoints,
    }
  }

  /**
   * 检测框架
   * @param packageJson package.json 内容
   * @returns 框架信息列表
   */
  detectFramework(packageJson: PackageJson): FrameworkInfo[] {
    const frameworks: FrameworkInfo[] = []
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    // 检测 Vue 3
    if (allDeps['vue'] && this.isVue3Version(allDeps['vue'])) {
      frameworks.push({
        name: 'vue3',
        version: allDeps['vue'],
        configFile: this.findConfigFile(['vite.config.ts', 'vite.config.js']),
      })
    }
    // 检测 Vue 2
    else if (allDeps['vue'] && this.isVue2Version(allDeps['vue'])) {
      frameworks.push({
        name: 'vue2',
        version: allDeps['vue'],
        configFile: this.findConfigFile([
          'vue.config.js',
          'webpack.config.js',
        ]),
      })
    }

    // 检测 React
    if (allDeps['react']) {
      frameworks.push({
        name: 'react',
        version: allDeps['react'],
        configFile: this.findConfigFile([
          'vite.config.ts',
          'webpack.config.js',
          'next.config.js',
        ]),
      })
    }

    // 检测 Preact
    if (allDeps['preact']) {
      frameworks.push({
        name: 'preact',
        version: allDeps['preact'],
      })
    }

    // 检测 Angular
    if (allDeps['@angular/core']) {
      frameworks.push({
        name: 'angular',
        version: allDeps['@angular/core'],
        configFile: 'angular.json',
      })
    }

    // 检测 Svelte
    if (allDeps['svelte']) {
      frameworks.push({
        name: 'svelte',
        version: allDeps['svelte'],
        configFile: this.findConfigFile([
          'svelte.config.js',
          'vite.config.js',
        ]),
      })
    }

    // 检测 Solid
    if (allDeps['solid-js']) {
      frameworks.push({
        name: 'solid',
        version: allDeps['solid-js'],
        configFile: this.findConfigFile(['vite.config.ts', 'vite.config.js']),
      })
    }

    // 如果没有检测到任何框架，标记为 vanilla
    if (frameworks.length === 0) {
      frameworks.push({
        name: 'vanilla',
        version: '0.0.0',
      })
    }

    return frameworks
  }

  /**
   * 检测构建工具
   * @param packageJson package.json 内容
   * @param root 项目根目录
   * @returns 构建工具类型
   */
  detectBuildTool(packageJson: PackageJson, root: string): BuildTool {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    // 检测 Vite
    if (allDeps['vite'] || existsSync(join(root, 'vite.config.ts')) || existsSync(join(root, 'vite.config.js'))) {
      return 'vite'
    }

    // 检测 Webpack
    if (
      allDeps['webpack'] ||
      existsSync(join(root, 'webpack.config.js')) ||
      existsSync(join(root, 'webpack.config.ts'))
    ) {
      return 'webpack'
    }

    // 检测 Rollup
    if (
      allDeps['rollup'] ||
      existsSync(join(root, 'rollup.config.js')) ||
      existsSync(join(root, 'rollup.config.ts'))
    ) {
      return 'rollup'
    }

    // 检测 esbuild
    if (allDeps['esbuild']) {
      return 'esbuild'
    }

    // 检测 Parcel
    if (allDeps['parcel']) {
      return 'parcel'
    }

    return 'unknown'
  }

  /**
   * 检测包管理器
   * @param root 项目根目录
   * @returns 包管理器类型
   */
  private async detectPackageManager(
    root: string
  ): Promise<'npm' | 'yarn' | 'pnpm'> {
    // 检测 pnpm
    if (existsSync(join(root, 'pnpm-lock.yaml'))) {
      return 'pnpm'
    }

    // 检测 yarn
    if (existsSync(join(root, 'yarn.lock'))) {
      return 'yarn'
    }

    // 默认为 npm
    return 'npm'
  }

  /**
   * 检测是否为 monorepo
   * @param root 项目根目录
   * @returns 是否为 monorepo
   */
  private async detectMonorepo(root: string): Promise<boolean> {
    // 检测 pnpm workspace
    if (existsSync(join(root, 'pnpm-workspace.yaml'))) {
      return true
    }

    // 检测 lerna
    if (existsSync(join(root, 'lerna.json'))) {
      return true
    }

    // 检测 nx
    if (existsSync(join(root, 'nx.json'))) {
      return true
    }

    // 检测 yarn workspaces
    const packageJsonPath = join(root, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = await this.readPackageJson(packageJsonPath)
      if (packageJson.workspaces) {
        return true
      }
    }

    return false
  }

  /**
   * 扫描 monorepo 子项目
   * @param root 项目根目录
   * @returns 子项目列表
   */
  async scanMonorepoSubProjects(root: string): Promise<SubProject[]> {
    const subProjects: SubProject[] = []

    // 获取工作区配置
    const workspacePatterns = await this.getWorkspacePatterns(root)
    if (workspacePatterns.length === 0) {
      return subProjects
    }

    // 扫描每个工作区模式
    for (const pattern of workspacePatterns) {
      const matches = await this.findMatchingDirectories(root, pattern)
      for (const match of matches) {
        const subProjectPath = join(root, match)
        const packageJsonPath = join(subProjectPath, 'package.json')

        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = await this.readPackageJson(packageJsonPath)
            const frameworks = this.detectFramework(packageJson)

            subProjects.push({
              path: match,
              name: packageJson.name || match,
              frameworks,
            })
          } catch (error) {
            // 忽略无法读取的子项目
            console.warn(`Failed to read subproject at ${match}:`, error)
          }
        }
      }
    }

    return subProjects
  }

  /**
   * 获取工作区模式
   * @param root 项目根目录
   * @returns 工作区模式列表
   */
  private async getWorkspacePatterns(root: string): Promise<string[]> {
    const patterns: string[] = []

    // 检测 pnpm-workspace.yaml
    const pnpmWorkspacePath = join(root, 'pnpm-workspace.yaml')
    if (existsSync(pnpmWorkspacePath)) {
      try {
        const content = await readFile(pnpmWorkspacePath, 'utf-8')
        const config = this.parseYaml(content)
        if (config.packages && Array.isArray(config.packages)) {
          patterns.push(...config.packages)
        }
      } catch (error) {
        console.warn('Failed to parse pnpm-workspace.yaml:', error)
      }
    }

    // 检测 lerna.json
    const lernaPath = join(root, 'lerna.json')
    if (existsSync(lernaPath)) {
      try {
        const content = await readFile(lernaPath, 'utf-8')
        const config = JSON.parse(content)
        if (config.packages && Array.isArray(config.packages)) {
          patterns.push(...config.packages)
        }
      } catch (error) {
        console.warn('Failed to parse lerna.json:', error)
      }
    }

    // 检测 package.json workspaces
    const packageJsonPath = join(root, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = await this.readPackageJson(packageJsonPath)
        if (packageJson.workspaces) {
          if (Array.isArray(packageJson.workspaces)) {
            patterns.push(...packageJson.workspaces)
          } else if (
            packageJson.workspaces.packages &&
            Array.isArray(packageJson.workspaces.packages)
          ) {
            patterns.push(...packageJson.workspaces.packages)
          }
        }
      } catch (error) {
        console.warn('Failed to read package.json workspaces:', error)
      }
    }

    return patterns
  }

  /**
   * 查找匹配的目录
   * @param root 项目根目录
   * @param pattern glob 模式
   * @returns 匹配的目录列表
   */
  private async findMatchingDirectories(
    root: string,
    pattern: string
  ): Promise<string[]> {
    const matches: string[] = []

    // 简单的 glob 模式匹配实现
    // 支持 packages/*, apps/*, 等模式
    if (pattern.endsWith('/*')) {
      const baseDir = pattern.slice(0, -2)
      const basePath = join(root, baseDir)

      if (existsSync(basePath)) {
        try {
          const entries = await readdir(basePath, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory()) {
              matches.push(join(baseDir, entry.name))
            }
          }
        } catch (error) {
          console.warn(`Failed to read directory ${basePath}:`, error)
        }
      }
    } else {
      // 直接路径
      const fullPath = join(root, pattern)
      if (existsSync(fullPath)) {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          matches.push(pattern)
        }
      }
    }

    return matches
  }

  /**
   * 简单的 YAML 解析器
   * @param content YAML 内容
   * @returns 解析后的对象
   */
  private parseYaml(content: string): any {
    // 简单的 YAML 解析实现，仅支持基本的 packages 数组
    const lines = content.split('\n')
    const result: any = {}
    let currentKey: string | null = null
    let currentArray: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      // 跳过注释和空行
      if (trimmed.startsWith('#') || trimmed === '') {
        continue
      }

      // 检测键
      if (trimmed.endsWith(':')) {
        if (currentKey && currentArray.length > 0) {
          result[currentKey] = currentArray
        }
        currentKey = trimmed.slice(0, -1)
        currentArray = []
      }
      // 检测数组项
      else if (trimmed.startsWith('- ')) {
        const value = trimmed.slice(2).replace(/['"]/g, '')
        currentArray.push(value)
      }
    }

    // 保存最后一个键的数组
    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray
    }

    return result
  }

  /**
   * 检测入口文件
   * @param packageJson package.json 内容
   * @param root 项目根目录
   * @returns 入口文件列表
   */
  private detectEntryPoints(
    packageJson: PackageJson,
    root: string
  ): string[] {
    const entryPoints: string[] = []

    // 常见的入口文件路径
    const commonEntries = [
      'src/main.ts',
      'src/main.js',
      'src/index.ts',
      'src/index.js',
      'index.ts',
      'index.js',
      'src/app.ts',
      'src/app.js',
      'app.ts',
      'app.js',
    ]

    for (const entry of commonEntries) {
      if (existsSync(join(root, entry))) {
        entryPoints.push(entry)
      }
    }

    // 如果没有找到入口文件，尝试从 package.json 的 main 字段获取
    if (entryPoints.length === 0 && packageJson.main) {
      entryPoints.push(packageJson.main)
    }

    return entryPoints
  }

  /**
   * 读取 package.json
   * @param path package.json 路径
   * @returns package.json 内容
   */
  private async readPackageJson(path: string): Promise<PackageJson> {
    try {
      const content = await readFile(path, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      throw this.createError(
        'PROJECT_NOT_DETECTED',
        `Failed to read package.json: ${error}`
      )
    }
  }

  /**
   * 判断是否为 Vue 3 版本
   * @param version 版本号
   * @returns 是否为 Vue 3
   */
  private isVue3Version(version: string): boolean {
    // 移除版本号前缀（^, ~, >=, 等）
    const cleanVersion = version.replace(/^[\^~>=<]+/, '')
    const majorVersion = parseInt(cleanVersion.split('.')[0], 10)
    return majorVersion >= 3
  }

  /**
   * 判断是否为 Vue 2 版本
   * @param version 版本号
   * @returns 是否为 Vue 2
   */
  private isVue2Version(version: string): boolean {
    const cleanVersion = version.replace(/^[\^~>=<]+/, '')
    const majorVersion = parseInt(cleanVersion.split('.')[0], 10)
    return majorVersion === 2
  }

  /**
   * 查找配置文件
   * @param candidates 候选配置文件列表
   * @returns 找到的配置文件路径，如果没有找到则返回 undefined
   */
  private findConfigFile(candidates: string[]): string | undefined {
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
    return undefined
  }

  /**
   * 创建错误对象
   * @param code 错误码
   * @param message 错误消息
   * @returns 错误对象
   */
  private createError(code: string, message: string): Error {
    const error = new Error(message) as Error & { code: string }
    error.code = code
    return error
  }
}

/**
 * 创建项目检测器实例
 */
export function createProjectDetector(): ProjectDetector {
  return new ProjectDetector()
}

