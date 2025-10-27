/**
 * 组件快照测试
 */
import { logger } from '../utils/logger.js'

/**
 * 组件快照工具
 */
export class ComponentSnapshot {
  /**
   * 创建组件快照
   */
  static async create(
    component: any,
    options: {
      name?: string
      props?: Record<string, any>
      slots?: Record<string, any>
    } = {}
  ): Promise<string> {
    logger.debug(`创建组件快照: ${options.name || 'unnamed'}`)

    // 这里返回一个简化的快照表示
    // 实际实现需要根据具体的框架（Vue/React）来序列化组件
    return JSON.stringify(
      {
        name: options.name,
        props: options.props,
        slots: options.slots,
        component: String(component),
      },
      null,
      2
    )
  }

  /**
   * 比较快照
   */
  static compare(
    actual: string,
    expected: string,
    threshold = 0
  ): { matches: boolean; diff?: string } {
    if (actual === expected) {
      return { matches: true }
    }

    // 简单的字符串差异比较
    const diff = this.getDiff(actual, expected)
    const diffRatio = diff.length / Math.max(actual.length, expected.length)

    return {
      matches: diffRatio <= threshold,
      diff: diffRatio > threshold ? diff : undefined,
    }
  }

  /**
   * 获取差异
   */
  private static getDiff(str1: string, str2: string): string {
    const lines1 = str1.split('\n')
    const lines2 = str2.split('\n')
    const diff: string[] = []

    const maxLines = Math.max(lines1.length, lines2.length)

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i]
      const line2 = lines2[i]

      if (line1 !== line2) {
        if (line1) diff.push(`- ${line1}`)
        if (line2) diff.push(`+ ${line2}`)
      }
    }

    return diff.join('\n')
  }

  /**
   * 序列化组件
   */
  static serialize(component: any): string {
    try {
      return JSON.stringify(component, null, 2)
    } catch (error) {
      logger.warn('组件序列化失败，使用 toString')
      return String(component)
    }
  }
}

