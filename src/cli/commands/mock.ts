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
    switch (options.type) {
      case 'user':
      case 'users':
        data = mockFactory.user(options.count || 10)
        break

      case 'product':
      case 'products':
        data = mockFactory.product(options.count || 10)
        break

      case 'article':
      case 'articles':
        data = mockFactory.article(options.count || 10)
        break

      case 'comment':
      case 'comments':
        data = mockFactory.comment(options.count || 10)
        break

      case 'order':
      case 'orders':
        data = mockFactory.order(options.count || 10)
        break

      default:
        throw new Error(`不支持的数据类型: ${options.type}`)
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

