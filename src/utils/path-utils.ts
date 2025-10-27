/**
 * 路径处理工具
 */
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * 获取当前文件的目录路径（用于 ESM）
 */
export function getDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl))
}

/**
 * 规范化路径（转为 POSIX 风格）
 */
export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

/**
 * 解析测试文件路径
 */
export function resolveTestPath(testPath: string, cwd: string): string {
  if (path.isAbsolute(testPath)) {
    return testPath
  }
  return path.resolve(cwd, testPath)
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(cwd: string, configName = 'testing.config'): string[] {
  return [
    path.resolve(cwd, `${configName}.ts`),
    path.resolve(cwd, `${configName}.js`),
    path.resolve(cwd, `${configName}.mjs`),
    path.resolve(cwd, `${configName}.cjs`),
  ]
}

/**
 * 获取包根目录
 */
export function getPackageRoot(startPath: string): string | null {
  let currentPath = startPath
  const root = path.parse(currentPath).root

  while (currentPath !== root) {
    const packageJsonPath = path.join(currentPath, 'package.json')
    try {
      if (require('fs').existsSync(packageJsonPath)) {
        return currentPath
      }
    } catch {
      // 继续向上查找
    }
    currentPath = path.dirname(currentPath)
  }

  return null
}

/**
 * 转换为相对路径（用于显示）
 */
export function toDisplayPath(filePath: string, cwd: string): string {
  const relativePath = path.relative(cwd, filePath)
  return relativePath.startsWith('..') ? filePath : relativePath
}

/**
 * 获取测试目录
 */
export function getTestDir(cwd: string, testDir?: string): string {
  return testDir ? path.resolve(cwd, testDir) : path.resolve(cwd, 'tests')
}

/**
 * 获取覆盖率输出目录
 */
export function getCoverageDir(cwd: string, coverageDir?: string): string {
  return coverageDir ? path.resolve(cwd, coverageDir) : path.resolve(cwd, 'coverage')
}

/**
 * 获取快照目录
 */
export function getSnapshotDir(cwd: string, snapshotDir?: string): string {
  return snapshotDir
    ? path.resolve(cwd, snapshotDir)
    : path.resolve(cwd, '__snapshots__')
}

/**
 * 判断路径是否在目录内
 */
export function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

