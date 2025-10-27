/**
 * 快照管理器
 */
import fs from 'fs-extra'
import path from 'path'
import type { SnapshotConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { findFiles, readFile, writeFile } from '../utils/file-utils.js'

export class SnapshotManager {
  private config: SnapshotConfig
  private cwd: string

  constructor(config: SnapshotConfig, cwd: string) {
    this.config = config
    this.cwd = cwd
  }

  /**
   * 更新所有快照
   */
  async updateAll(): Promise<number> {
    logger.info('更新所有快照...')

    const snapshotDir = this.getSnapshotDir()
    const files = await findFiles('**/*.snap', {
      cwd: snapshotDir,
      absolute: true,
    })

    logger.success(`找到 ${files.length} 个快照文件`)
    return files.length
  }

  /**
   * 清理未使用的快照
   */
  async clean(): Promise<number> {
    logger.info('清理未使用的快照...')

    const snapshotDir = this.getSnapshotDir()

    if (!(await fs.pathExists(snapshotDir))) {
      logger.info('快照目录不存在')
      return 0
    }

    const files = await findFiles('**/*.snap', {
      cwd: snapshotDir,
      absolute: true,
    })

    // 这里简化处理，实际应该分析测试文件来判断哪些快照未使用
    let cleaned = 0
    for (const file of files) {
      const content = await readFile(file)
      if (content.trim() === '') {
        await fs.remove(file)
        cleaned++
      }
    }

    logger.success(`清理了 ${cleaned} 个快照文件`)
    return cleaned
  }

  /**
   * 列出所有快照
   */
  async list(): Promise<string[]> {
    const snapshotDir = this.getSnapshotDir()

    if (!(await fs.pathExists(snapshotDir))) {
      return []
    }

    return findFiles('**/*.snap', {
      cwd: snapshotDir,
      absolute: false,
    })
  }

  /**
   * 获取快照内容
   */
  async getSnapshot(name: string): Promise<string | null> {
    const snapshotPath = path.resolve(this.getSnapshotDir(), name)

    if (!(await fs.pathExists(snapshotPath))) {
      return null
    }

    return readFile(snapshotPath)
  }

  /**
   * 保存快照
   */
  async saveSnapshot(name: string, content: string): Promise<void> {
    const snapshotPath = path.resolve(this.getSnapshotDir(), name)
    await writeFile(snapshotPath, content)
    logger.debug(`快照已保存: ${name}`)
  }

  /**
   * 获取快照目录
   */
  private getSnapshotDir(): string {
    return path.resolve(
      this.cwd,
      this.config.snapshotDir || '__snapshots__'
    )
  }

  /**
   * 获取快照统计
   */
  async getStats(): Promise<{
    total: number
    size: number
    files: Array<{ name: string; size: number }>
  }> {
    const files = await this.list()
    const snapshotDir = this.getSnapshotDir()

    const stats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.resolve(snapshotDir, file)
        const stat = await fs.stat(filePath)
        return {
          name: file,
          size: stat.size,
        }
      })
    )

    return {
      total: files.length,
      size: stats.reduce((sum, s) => sum + s.size, 0),
      files: stats,
    }
  }
}

