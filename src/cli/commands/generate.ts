/**
 * 生成测试文件命令
 */
import ora from 'ora'
import { logger } from '../../utils/logger.js'
import { TestGenerator } from '../../generator/test-generator.js'

export interface GenerateOptions {
  file?: string
  type?: string
  output?: string
  overwrite?: boolean
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const spinner = ora('生成测试文件...').start()

  try {
    if (!options.file) {
      spinner.fail('请指定要生成测试的文件')
      logger.error('使用方式: ltesting generate --file <文件路径> --type <测试类型>')
      process.exit(1)
    }

    const type = (options.type || 'unit') as any
    const result = await TestGenerator.generate({
      targetFile: options.file,
      type,
      outputDir: options.output,
      overwrite: options.overwrite,
    })

    spinner.succeed(`测试文件已生成: ${result}`)
  } catch (error) {
    spinner.fail('生成测试文件失败')
    logger.error('错误:', error)
    process.exit(1)
  }
}
