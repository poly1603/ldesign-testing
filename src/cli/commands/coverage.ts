/**
 * 覆盖率命令
 */
import ora from 'ora'
import { logger } from '../../utils/logger.js'
import { configLoader } from '../../core/config-loader.js'
import { CoverageReporter } from '../../coverage/coverage-reporter.js'
import { coverageAnalyzer } from '../../coverage/coverage-analyzer.js'
import { thresholdValidator } from '../../coverage/threshold-validator.js'
import { formatCoverage } from '../../utils/reporter.js'

export async function coverageCommand(options: {
  open?: boolean
}): Promise<void> {
  const cwd = process.cwd()

  // 加载配置
  const spinner = ora('加载配置...').start()
  const userConfig = await configLoader.load(cwd)
  const defaultConfig = configLoader.getDefaultConfig()
  const config = configLoader.mergeConfig(defaultConfig, userConfig)
  spinner.succeed('配置加载完成')

  try {
    // 生成覆盖率报告
    const reporter = new CoverageReporter(config, cwd)
    const summary = await reporter.generate()

    if (!summary) {
      logger.error('无法生成覆盖率报告')
      process.exit(1)
    }

    // 显示覆盖率
    console.log('\n' + formatCoverage(summary))

    // 分析覆盖率
    const analysis = coverageAnalyzer.analyze(summary)
    console.log(`\n总体评分: ${analysis.score.toFixed(2)}% (${analysis.grade})`)

    console.log('\n改进建议:')
    analysis.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    // 验证阈值
    if (config.coverage?.threshold) {
      const result = thresholdValidator.validate(
        summary,
        config.coverage.threshold
      )

      if (!result.passed) {
        logger.error('\n覆盖率未达到阈值:')
        result.failures.forEach((failure) => {
          logger.error(
            `  - ${failure.metric}: ${failure.actual.toFixed(2)}% < ${failure.expected}%`
          )
        })
        process.exit(1)
      }

      logger.success('\n覆盖率达到阈值要求')
    }

    // 打开报告
    if (options.open) {
      await reporter.openReport()
    }
  } catch (error) {
    logger.error('覆盖率报告生成失败:', error)
    process.exit(1)
  }
}

