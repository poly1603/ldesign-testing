/**
 * Faker.js 集成
 */
import { faker } from '@faker-js/faker'
import type { FakerConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class FakerIntegration {
  private config: FakerConfig

  constructor(config: FakerConfig = {}) {
    this.config = {
      locale: 'zh_CN',
      ...config,
    }
    this.setup()
  }

  /**
   * 设置 Faker
   */
  private setup(): void {
    if (this.config.seed !== undefined) {
      faker.seed(this.config.seed)
      logger.debug(`Faker seed 设置为: ${this.config.seed}`)
    }
  }

  /**
   * 生成数据
   */
  generate<T>(schema: () => T, count = 1): T[] {
    return Array.from({ length: count }, schema)
  }

  /**
   * 重置种子
   */
  resetSeed(): void {
    faker.seed()
  }

  /**
   * 设置种子
   */
  setSeed(seed: number): void {
    faker.seed(seed)
    this.config.seed = seed
  }

  /**
   * 获取 Faker 实例
   */
  getFaker(): typeof faker {
    return faker
  }
}

// 默认导出实例
export const fakerIntegration = new FakerIntegration()

