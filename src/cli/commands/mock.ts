/**
 * Mock 数据生成命令
 */
import ora from 'ora'
import type { MockDataOptions } from '../../types/index.js'
import { logger } from '../../utils/logger.js'
import { mockFactory } from '../../mock/mock-factory.js'
import { writeFile } from '../../utils/file-utils.js'

export async function mockCommand(options: MockDataOptions): Promise<void> {
  const spinner = ora('生成 Mock 数据...').start()

  try {
    let data: any

    // 根据类型生成数据
    const type = options.type.replace(/s$/, '') // 移除复数形式
    const count = options.count || 10

    // 检查 mockFactory 是否有该方法
    if (typeof (mockFactory as any)[type] === 'function') {
      data = (mockFactory as any)[type](count)
    } else {
      // 支持的类型列表
      const supportedTypes = [
        'user', 'product', 'article', 'comment', 'order',
        'company', 'event', 'payment', 'blog', 'notification',
        'task', 'course'
      ]
      throw new Error(
        `不支持的数据类型: ${options.type}\n` +
        `支持的类型: ${supportedTypes.join(', ')}`
      )
    }

    // 格式化输出
    let output: string
    const format = options.format || 'json'

    switch (format) {
      case 'json':
        output = JSON.stringify(data, null, 2)
        break

      case 'ts':
        output = `export const ${options.type} = ${JSON.stringify(data, null, 2)}\n`
        break

      case 'js':
        output = `module.exports = ${JSON.stringify(data, null, 2)}\n`
        break

      default:
        output = JSON.stringify(data, null, 2)
    }

    // 输出或保存文件
    if (options.output) {
      await writeFile(options.output, output)
      spinner.succeed(`Mock 数据已保存到: ${options.output}`)
    } else {
      spinner.succeed('Mock 数据生成完成')
      console.log('\n' + output)
    }

    logger.success(`\n成功生成 ${Array.isArray(data) ? data.length : 1} 条数据`)
  } catch (error) {
    spinner.fail('生成失败')
    logger.error('错误:', error)
    process.exit(1)
  }
}

