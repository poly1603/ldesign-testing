/**
 * 初始化命令
 */
import inquirer from 'inquirer'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import ejs from 'ejs'
import type { InitOptions, PresetName } from '../../types/index.js'
import { logger } from '../../utils/logger.js'
import { fileExists, writeFile } from '../../utils/file-utils.js'
import { presetManager } from '../../core/preset-manager.js'

export async function initCommand(options: InitOptions): Promise<void> {
  logger.info('初始化测试配置...')

  const cwd = process.cwd()

  // 检查配置文件是否已存在
  const configPath = path.resolve(cwd, 'testing.config.ts')
  if ((await fileExists(configPath)) && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: '配置文件已存在，是否覆盖？',
        default: false,
      },
    ])

    if (!overwrite) {
      logger.info('已取消')
      return
    }
  }

  // 选择预设
  let preset: PresetName = options.preset || 'base'

  if (!options.skipPrompts && !options.preset) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: '选择预设配置:',
        choices: [
          { name: '基础配置 (Base)', value: 'base' },
          { name: 'Vue 项目', value: 'vue' },
          { name: 'React 项目', value: 'react' },
          { name: 'Node.js 项目', value: 'node' },
          { name: '库项目', value: 'library' },
        ],
        default: 'base',
      },
    ])
    preset = answers.preset
  }

  const spinner = ora('生成配置文件...').start()

  try {
    // 获取预设配置
    const presetConfig = presetManager.getConfig(preset)

    if (!presetConfig) {
      throw new Error(`预设不存在: ${preset}`)
    }

    // 读取模板
    const templatePath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../templates/testing.config.ejs'
    )

    let configContent: string

    if (await fileExists(templatePath)) {
      configContent = await ejs.renderFile(templatePath, {
        preset,
        config: presetConfig,
      })
    } else {
      // 如果模板不存在，生成简单配置
      configContent = generateConfigContent(preset, presetConfig)
    }

    // 写入配置文件
    await writeFile(configPath, configContent)

    // 生成 Vitest 配置
    const vitestConfigPath = path.resolve(cwd, 'vitest.config.ts')
    if (!(await fileExists(vitestConfigPath))) {
      await writeFile(
        vitestConfigPath,
        generateVitestConfig()
      )
    }

    // 生成测试目录
    const testDir = path.resolve(cwd, presetConfig.testDir || 'tests')
    await fs.ensureDir(testDir)

    // 生成示例测试文件
    const examplePath = path.resolve(testDir, 'example.test.ts')
    if (!(await fileExists(examplePath))) {
      await writeFile(examplePath, generateExampleTest())
    }

    spinner.succeed('配置文件生成成功')

    logger.success('\n初始化完成！')
    logger.info('\n下一步:')
    logger.info('  1. 查看配置文件: testing.config.ts')
    logger.info('  2. 运行测试: npx ltesting run')
    logger.info('  3. 查看覆盖率: npx ltesting coverage')
  } catch (error) {
    spinner.fail('生成配置文件失败')
    logger.error('错误:', error)
    throw error
  }
}

/**
 * 生成配置文件内容
 */
function generateConfigContent(preset: string, config: any): string {
  return `import { defineConfig } from '@ldesign/testing'

export default defineConfig({
  // 使用 ${preset} 预设
  framework: '${config.framework || 'vitest'}',
  testDir: '${config.testDir || 'tests'}',
  
  // 单元测试配置
  unit: {
    timeout: ${config.unit?.timeout || 5000},
    clearMocks: ${config.unit?.clearMocks ?? true},
  },
  
  // 覆盖率配置
  coverage: {
    enabled: ${config.coverage?.enabled ?? true},
    provider: '${config.coverage?.provider || 'v8'}',
    threshold: {
      branches: ${config.coverage?.threshold?.branches || 80},
      functions: ${config.coverage?.threshold?.functions || 80},
      lines: ${config.coverage?.threshold?.lines || 80},
      statements: ${config.coverage?.threshold?.statements || 80},
    },
  },
})
`
}

/**
 * 生成 Vitest 配置
 */
function generateVitestConfig(): string {
  return `import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
`
}

/**
 * 生成示例测试
 */
function generateExampleTest(): string {
  return `import { describe, it, expect } from 'vitest'

describe('示例测试', () => {
  it('应该通过', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该支持异步测试', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })
})
`
}

