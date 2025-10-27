/**
 * 视觉快照测试
 */
import fs from 'fs-extra'
import path from 'path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import type { Page } from '@playwright/test'
import { logger } from '../utils/logger.js'

export interface VisualSnapshotOptions {
  /** 快照名称 */
  name: string
  /** 快照目录 */
  snapshotDir?: string
  /** 差异阈值（0-1） */
  threshold?: number
  /** 是否全屏截图 */
  fullPage?: boolean
  /** 截图选项 */
  clip?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export class VisualSnapshot {
  private snapshotDir: string
  private threshold: number

  constructor(snapshotDir = '__snapshots__', threshold = 0.01) {
    this.snapshotDir = snapshotDir
    this.threshold = threshold
  }

  /**
   * 创建视觉快照
   */
  async create(
    page: Page,
    options: VisualSnapshotOptions
  ): Promise<Buffer> {
    const screenshot = await page.screenshot({
      fullPage: options.fullPage ?? false,
      clip: options.clip,
    })

    const snapshotPath = this.getSnapshotPath(options.name)
    await fs.ensureDir(path.dirname(snapshotPath))
    await fs.writeFile(snapshotPath, screenshot)

    logger.debug(`视觉快照已创建: ${options.name}`)
    return screenshot
  }

  /**
   * 比较视觉快照
   */
  async compare(
    page: Page,
    options: VisualSnapshotOptions
  ): Promise<{
    matches: boolean
    diff?: number
    diffImage?: Buffer
  }> {
    const snapshotPath = this.getSnapshotPath(options.name)

    // 检查快照是否存在
    if (!(await fs.pathExists(snapshotPath))) {
      logger.warn(`快照不存在: ${options.name}，创建新快照`)
      await this.create(page, options)
      return { matches: true }
    }

    // 获取当前截图
    const currentScreenshot = await page.screenshot({
      fullPage: options.fullPage ?? false,
      clip: options.clip,
    })

    // 读取保存的快照
    const savedScreenshot = await fs.readFile(snapshotPath)

    // 比较图片
    const result = await this.compareImages(
      savedScreenshot,
      currentScreenshot,
      options.threshold ?? this.threshold
    )

    // 如果有差异，保存差异图片
    if (!result.matches && result.diffImage) {
      const diffPath = this.getDiffPath(options.name)
      await fs.ensureDir(path.dirname(diffPath))
      await fs.writeFile(diffPath, result.diffImage)
      logger.debug(`差异图片已保存: ${diffPath}`)
    }

    return result
  }

  /**
   * 比较两张图片
   */
  private async compareImages(
    img1: Buffer,
    img2: Buffer,
    threshold: number
  ): Promise<{
    matches: boolean
    diff?: number
    diffImage?: Buffer
  }> {
    try {
      const png1 = PNG.sync.read(img1)
      const png2 = PNG.sync.read(img2)

      // 检查尺寸是否一致
      if (png1.width !== png2.width || png1.height !== png2.height) {
        return {
          matches: false,
          diff: 1,
        }
      }

      // 创建差异图片
      const { width, height } = png1
      const diffPNG = new PNG({ width, height })

      // 比较像素
      const numDiffPixels = pixelmatch(
        png1.data,
        png2.data,
        diffPNG.data,
        width,
        height,
        { threshold: threshold * 255 }
      )

      const totalPixels = width * height
      const diffRatio = numDiffPixels / totalPixels

      return {
        matches: diffRatio <= threshold,
        diff: diffRatio,
        diffImage: diffRatio > threshold ? PNG.sync.write(diffPNG) : undefined,
      }
    } catch (error) {
      logger.error('图片比较失败:', error)
      return {
        matches: false,
        diff: 1,
      }
    }
  }

  /**
   * 更新快照
   */
  async update(page: Page, options: VisualSnapshotOptions): Promise<void> {
    await this.create(page, options)
    logger.info(`视觉快照已更新: ${options.name}`)
  }

  /**
   * 获取快照路径
   */
  private getSnapshotPath(name: string): string {
    return path.resolve(this.snapshotDir, `${name}.png`)
  }

  /**
   * 获取差异图片路径
   */
  private getDiffPath(name: string): string {
    return path.resolve(this.snapshotDir, `${name}.diff.png`)
  }

  /**
   * 清理差异图片
   */
  async cleanDiffs(): Promise<void> {
    const diffFiles = await fs.readdir(this.snapshotDir)
    const diffPattern = /\.diff\.png$/

    for (const file of diffFiles) {
      if (diffPattern.test(file)) {
        await fs.remove(path.resolve(this.snapshotDir, file))
      }
    }

    logger.info('差异图片已清理')
  }
}

