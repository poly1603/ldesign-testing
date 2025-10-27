/**
 * 文件操作工具
 */
import fs from 'fs-extra'
import path from 'path'
import glob from 'fast-glob'

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 读取文件内容
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

/**
 * 写入文件内容
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, content, 'utf-8')
}

/**
 * 复制文件
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.ensureDir(path.dirname(dest))
  await fs.copy(src, dest)
}

/**
 * 删除文件
 */
export async function removeFile(filePath: string): Promise<void> {
  await fs.remove(filePath)
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath)
}

/**
 * 读取 JSON 文件
 */
export async function readJson<T = any>(filePath: string): Promise<T> {
  return fs.readJson(filePath)
}

/**
 * 写入 JSON 文件
 */
export async function writeJson(
  filePath: string,
  data: any,
  options?: { spaces?: number }
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeJson(filePath, data, { spaces: options?.spaces ?? 2 })
}

/**
 * 查找文件
 */
export async function findFiles(
  patterns: string | string[],
  options?: {
    cwd?: string
    ignore?: string[]
    absolute?: boolean
  }
): Promise<string[]> {
  return glob(patterns, {
    cwd: options?.cwd ?? process.cwd(),
    ignore: options?.ignore ?? ['**/node_modules/**', '**/dist/**'],
    absolute: options?.absolute ?? false,
  })
}

/**
 * 获取文件扩展名
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).slice(1)
}

/**
 * 判断是否为测试文件
 */
export function isTestFile(filePath: string): boolean {
  const testPatterns = ['.test.', '.spec.', '__tests__']
  return testPatterns.some((pattern) => filePath.includes(pattern))
}

/**
 * 解析路径
 */
export function resolvePath(...paths: string[]): string {
  return path.resolve(...paths)
}

/**
 * 相对路径
 */
export function relativePath(from: string, to: string): string {
  return path.relative(from, to)
}

