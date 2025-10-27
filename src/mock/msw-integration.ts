/**
 * MSW (Mock Service Worker) 集成
 */
import type { MSWConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'

export class MSWIntegration {
  private config: MSWConfig

  constructor(config: MSWConfig = {}) {
    this.config = {
      quiet: false,
      ...config,
    }
  }

  /**
   * 创建 REST 处理器
   */
  createRestHandlers(handlers: Record<string, any>): any[] {
    logger.debug('创建 REST 处理器')
    // 这里返回一个示例结构
    // 实际使用时需要从 msw 导入 rest 和 http
    return Object.entries(handlers).map(([path, handler]) => ({
      path,
      handler,
    }))
  }

  /**
   * 创建 GraphQL 处理器
   */
  createGraphQLHandlers(handlers: Record<string, any>): any[] {
    logger.debug('创建 GraphQL 处理器')
    return Object.entries(handlers).map(([operation, handler]) => ({
      operation,
      handler,
    }))
  }

  /**
   * 获取服务器实例（用于 Node.js 环境）
   */
  async setupServer(handlers: any[]): Promise<any> {
    logger.debug('设置 MSW 服务器')
    // 实际使用时需要从 msw/node 导入 setupServer
    return {
      listen: () => logger.debug('MSW 服务器已启动'),
      close: () => logger.debug('MSW 服务器已关闭'),
      resetHandlers: () => logger.debug('重置处理器'),
      use: (...newHandlers: any[]) =>
        logger.debug(`添加 ${newHandlers.length} 个新处理器`),
    }
  }

  /**
   * 获取浏览器实例（用于浏览器环境）
   */
  async setupWorker(handlers: any[]): Promise<any> {
    logger.debug('设置 MSW Worker')
    // 实际使用时需要从 msw/browser 导入 setupWorker
    return {
      start: () => logger.debug('MSW Worker 已启动'),
      stop: () => logger.debug('MSW Worker 已停止'),
      resetHandlers: () => logger.debug('重置处理器'),
      use: (...newHandlers: any[]) =>
        logger.debug(`添加 ${newHandlers.length} 个新处理器`),
    }
  }
}

// 默认导出实例
export const mswIntegration = new MSWIntegration()

