/**
 * 运行测试命令
 */
import ora from 'ora'
import type { RunOptions } from '../../types/index.js'
import { logger } from '../../utils/logger.js'
import { configLoader } from '../../core/config-loader.js'
import { VitestRunner } from '../../unit/vitest-runner.js'
import { PlaywrightRunner } from '../../e2e/playwright-runner.js'
import { formatTestResult } from '../../utils/reporter.js'

export async function runCommand(options: RunOptions): Promise<void> {
  const cwd = process.cwd()

  // 加载配置
  const spinner = ora('加载配置...').start()
  const userConfig = await configLoader.load(cwd)
  const defaultConfig = configLoader.getDefaultConfig()
  const config = configLoader.mergeConfig(defaultConfig, userConfig)
  spinner.succeed('配置加载完成')

  try {
    const type = options.type || 'all'

    if (type === 'unit' || type === 'all') {
      logger.info('\n运行单元测试...')
      const runner = new VitestRunner(config, cwd)
      const result = await runner.run(options)

      console.log(formatTestResult(result))

      if (result.failed > 0) {
        process.exit(1)
      }
    }

    if (type === 'e2e' || type === 'all') {
      logger.info('\n运行 E2E 测试...')
      const runner = new PlaywrightRunner(config, cwd)
      const result = await runner.run(options)

      console.log(formatTestResult(result))

      if (result.failed > 0) {
        process.exit(1)
      }
    }

    logger.success('\n所有测试通过！')
  } catch (error) {
    logger.error('测试运行失败:', error)
    process.exit(1)
  }
}

