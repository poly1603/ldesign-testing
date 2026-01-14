/**
 * @ldesign/testing - Mutation Tester
 * 变异测试模块 - 代码变异生成和测试质量评估
 */

import type {
  MutationTestConfig,
  MutationTestResult,
  Mutant,
  MutantStatus,
  MutationType,
} from '../types/extended.js'
import type { Priority } from '../types/index.js'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fg from 'fast-glob'

const execAsync = promisify(exec)

/**
 * 默认变异测试配置
 */
export const DEFAULT_MUTATION_CONFIG: Required<MutationTestConfig> = {
  enabled: true,
  files: ['src/**/*.ts', 'src/**/*.js'],
  excludeFiles: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**', '**/node_modules/**'],
  mutators: [
    'arithmetic',
    'comparison',
    'logical',
    'conditional',
    'unary',
    'assignment',
    'return',
  ],
  timeout: 5000,
  maxMutants: 100,
  sampleRate: 1.0,
  incremental: false,
}

/**
 * 变异操作符定义
 */
interface MutationOperator {
  type: MutationType
  pattern: RegExp
  replacements: string[] | ((match: string) => string[])
  description: string
}

/**
 * 变异操作符列表
 */
const MUTATION_OPERATORS: MutationOperator[] = [
  // 算术运算符变异
  {
    type: 'arithmetic',
    pattern: /(\s)(\+)(\s)(?!=)/g,
    replacements: ['-', '*', '/'],
    description: '将 + 替换为其他算术运算符',
  },
  {
    type: 'arithmetic',
    pattern: /(\s)(-)(\s)(?!=)/g,
    replacements: ['+', '*', '/'],
    description: '将 - 替换为其他算术运算符',
  },
  {
    type: 'arithmetic',
    pattern: /(\s)(\*)(\s)(?!=)/g,
    replacements: ['+', '-', '/'],
    description: '将 * 替换为其他算术运算符',
  },
  {
    type: 'arithmetic',
    pattern: /(\s)(\/)(\s)(?!=)/g,
    replacements: ['+', '-', '*'],
    description: '将 / 替换为其他算术运算符',
  },
  // 比较运算符变异
  {
    type: 'comparison',
    pattern: /===?/g,
    replacements: ['!==', '!='],
    description: '将相等变为不相等',
  },
  {
    type: 'comparison',
    pattern: /!==?/g,
    replacements: ['===', '=='],
    description: '将不相等变为相等',
  },
  {
    type: 'comparison',
    pattern: /(<)(?!=)/g,
    replacements: ['<=', '>', '>='],
    description: '修改小于运算符',
  },
  {
    type: 'comparison',
    pattern: /(>)(?!=)/g,
    replacements: ['>=', '<', '<='],
    description: '修改大于运算符',
  },
  {
    type: 'comparison',
    pattern: /<=/g,
    replacements: ['<', '>', '>='],
    description: '修改小于等于运算符',
  },
  {
    type: 'comparison',
    pattern: />=/g,
    replacements: ['>', '<', '<='],
    description: '修改大于等于运算符',
  },
  // 逻辑运算符变异
  {
    type: 'logical',
    pattern: /&&/g,
    replacements: ['||'],
    description: '将 && 替换为 ||',
  },
  {
    type: 'logical',
    pattern: /\|\|/g,
    replacements: ['&&'],
    description: '将 || 替换为 &&',
  },
  // 一元运算符变异
  {
    type: 'unary',
    pattern: /(!)[^=]/g,
    replacements: (match) => [match.slice(1)],
    description: '移除逻辑非',
  },
  {
    type: 'unary',
    pattern: /\+\+/g,
    replacements: ['--'],
    description: '将 ++ 替换为 --',
  },
  {
    type: 'unary',
    pattern: /--/g,
    replacements: ['++'],
    description: '将 -- 替换为 ++',
  },
  // 条件变异
  {
    type: 'conditional',
    pattern: /if\s*\(([^)]+)\)/g,
    replacements: () => ['if (true)', 'if (false)'],
    description: '将条件替换为 true/false',
  },
  {
    type: 'conditional',
    pattern: /\?\s*([^:]+)\s*:/g,
    replacements: () => ['? false :', '? true :'],
    description: '修改三元表达式条件',
  },
  // 赋值变异
  {
    type: 'assignment',
    pattern: /\+=/g,
    replacements: ['-=', '*=', '/='],
    description: '修改复合赋值运算符',
  },
  {
    type: 'assignment',
    pattern: /-=/g,
    replacements: ['+=', '*=', '/='],
    description: '修改复合赋值运算符',
  },
  // 返回值变异
  {
    type: 'return',
    pattern: /return\s+true/g,
    replacements: ['return false'],
    description: '将 return true 替换为 return false',
  },
  {
    type: 'return',
    pattern: /return\s+false/g,
    replacements: ['return true'],
    description: '将 return false 替换为 return true',
  },
  {
    type: 'return',
    pattern: /return\s+(\d+)/g,
    replacements: (match) => {
      const num = parseInt(match.replace('return ', ''))
      return [`return ${num + 1}`, `return ${num - 1}`, 'return 0']
    },
    description: '修改返回的数字值',
  },
  {
    type: 'return',
    pattern: /return\s+null/g,
    replacements: ['return undefined', "return ''"],
    description: '修改返回的 null 值',
  },
]

/**
 * 变异测试器
 */
export class MutationTester {
  private config: Required<MutationTestConfig>
  private projectRoot: string
  private testCommand: string

  constructor(
    config: MutationTestConfig = {},
    projectRoot: string = process.cwd(),
    testCommand: string = 'npm test'
  ) {
    this.config = { ...DEFAULT_MUTATION_CONFIG, ...config }
    this.projectRoot = projectRoot
    this.testCommand = testCommand
  }

  /**
   * 运行变异测试
   */
  async run(): Promise<MutationTestResult> {
    const result: MutationTestResult = {
      totalMutants: 0,
      killedMutants: 0,
      survivedMutants: 0,
      timedOutMutants: 0,
      errorMutants: 0,
      ignoredMutants: 0,
      mutationScore: 0,
      mutants: [],
      survivedMutations: [],
      byFile: {},
      score: 0,
    }

    // 获取要测试的文件
    const files = await this.getSourceFiles()

    // 生成变异体
    const mutants = await this.generateMutants(files)
    result.totalMutants = mutants.length

    // 采样
    const sampledMutants = this.sampleMutants(mutants)

    // 运行测试
    for (const mutant of sampledMutants) {
      const status = await this.testMutant(mutant)
      mutant.status = status

      switch (status) {
        case 'killed':
          result.killedMutants++
          break
        case 'survived':
          result.survivedMutants++
          result.survivedMutations.push({
            mutant,
            suggestedTests: this.suggestTests(mutant),
            priority: this.getMutantPriority(mutant),
          })
          break
        case 'timeout':
          result.timedOutMutants++
          break
        case 'error':
          result.errorMutants++
          break
        case 'ignored':
          result.ignoredMutants++
          break
      }

      result.mutants.push(mutant)

      // 更新按文件统计
      if (!result.byFile[mutant.filePath]) {
        result.byFile[mutant.filePath] = {
          total: 0,
          killed: 0,
          survived: 0,
          score: 0,
        }
      }
      result.byFile[mutant.filePath].total++
      if (status === 'killed') {
        result.byFile[mutant.filePath].killed++
      } else if (status === 'survived') {
        result.byFile[mutant.filePath].survived++
      }
    }

    // 计算分数
    const effectiveMutants = result.totalMutants - result.ignoredMutants
    if (effectiveMutants > 0) {
      result.mutationScore = (result.killedMutants / effectiveMutants) * 100
    }

    // 计算每个文件的分数
    for (const [, stats] of Object.entries(result.byFile)) {
      if (stats.total > 0) {
        stats.score = (stats.killed / stats.total) * 100
      }
    }

    result.score = result.mutationScore

    return result
  }

  /**
   * 获取源文件列表
   */
  private async getSourceFiles(): Promise<string[]> {
    const files = await fg(this.config.files, {
      cwd: this.projectRoot,
      ignore: this.config.excludeFiles,
      absolute: true,
    })
    return files
  }

  /**
   * 生成变异体
   */
  private async generateMutants(files: string[]): Promise<Mutant[]> {
    const mutants: Mutant[] = []
    let mutantId = 0

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex]

        // 跳过注释和空行
        if (this.isCommentOrEmpty(line)) {
          continue
        }

        // 应用每个变异操作符
        for (const operator of MUTATION_OPERATORS) {
          if (!this.config.mutators.includes(operator.type)) {
            continue
          }

          let match
          const regex = new RegExp(operator.pattern.source, operator.pattern.flags)

          while ((match = regex.exec(line)) !== null) {
            const replacements =
              typeof operator.replacements === 'function'
                ? operator.replacements(match[0])
                : operator.replacements

            for (const replacement of replacements) {
              mutants.push({
                id: `mutant-${++mutantId}`,
                type: operator.type,
                filePath: path.relative(this.projectRoot, filePath),
                lineNumber: lineIndex + 1,
                columnNumber: match.index,
                originalCode: match[0],
                mutatedCode: replacement,
                status: 'survived',
                description: operator.description,
              })

              // 检查是否达到最大变异体数
              if (mutants.length >= this.config.maxMutants) {
                return mutants
              }
            }
          }
        }
      }
    }

    return mutants
  }

  /**
   * 检查是否为注释或空行
   */
  private isCommentOrEmpty(line: string): boolean {
    const trimmed = line.trim()
    return (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ')
    )
  }

  /**
   * 采样变异体
   */
  private sampleMutants(mutants: Mutant[]): Mutant[] {
    if (this.config.sampleRate >= 1.0) {
      return mutants
    }

    const sampleSize = Math.ceil(mutants.length * this.config.sampleRate)
    const shuffled = [...mutants].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, sampleSize)
  }

  /**
   * 测试单个变异体
   */
  private async testMutant(mutant: Mutant): Promise<MutantStatus> {
    const absolutePath = path.join(this.projectRoot, mutant.filePath)

    // 读取原始文件
    let originalContent: string
    try {
      originalContent = fs.readFileSync(absolutePath, 'utf-8')
    } catch {
      return 'error'
    }

    // 应用变异
    const lines = originalContent.split('\n')
    const lineIndex = mutant.lineNumber - 1

    if (lineIndex >= lines.length) {
      return 'error'
    }

    const mutatedLine = lines[lineIndex].replace(mutant.originalCode, mutant.mutatedCode)
    lines[lineIndex] = mutatedLine
    const mutatedContent = lines.join('\n')

    try {
      // 写入变异后的文件
      fs.writeFileSync(absolutePath, mutatedContent, 'utf-8')

      // 运行测试
      try {
        await execAsync(this.testCommand, {
          cwd: this.projectRoot,
          timeout: this.config.timeout,
        })

        // 测试通过 = 变异体存活
        return 'survived'
      } catch (error) {
        // 检查是否超时
        if ((error as { killed?: boolean }).killed) {
          return 'timeout'
        }

        // 测试失败 = 变异体被杀死
        return 'killed'
      }
    } finally {
      // 恢复原始文件
      fs.writeFileSync(absolutePath, originalContent, 'utf-8')
    }
  }

  /**
   * 建议测试用例
   */
  private suggestTests(mutant: Mutant): string[] {
    const suggestions: string[] = []

    switch (mutant.type) {
      case 'arithmetic':
        suggestions.push(`测试边界值和特殊情况 (如 0, 负数, 大数)`)
        suggestions.push(`添加测试验证算术运算的正确性`)
        break
      case 'comparison':
        suggestions.push(`测试边界条件 (等于、小于、大于边界值)`)
        suggestions.push(`添加测试验证比较逻辑的正确性`)
        break
      case 'logical':
        suggestions.push(`测试所有逻辑分支组合`)
        suggestions.push(`添加测试验证 AND/OR 逻辑的正确性`)
        break
      case 'conditional':
        suggestions.push(`测试条件为 true 和 false 的情况`)
        suggestions.push(`添加分支覆盖测试`)
        break
      case 'unary':
        suggestions.push(`测试取反操作的正确性`)
        suggestions.push(`添加测试验证布尔值处理`)
        break
      case 'assignment':
        suggestions.push(`测试赋值后的值是否正确`)
        suggestions.push(`添加测试验证状态变更`)
        break
      case 'return':
        suggestions.push(`测试返回值是否符合预期`)
        suggestions.push(`添加测试验证函数输出`)
        break
      default:
        suggestions.push(`添加更多测试覆盖此代码路径`)
    }

    suggestions.push(`文件: ${mutant.filePath}:${mutant.lineNumber}`)

    return suggestions
  }

  /**
   * 获取变异体优先级
   */
  private getMutantPriority(mutant: Mutant): Priority {
    // 根据变异类型和位置确定优先级
    if (['comparison', 'conditional', 'return'].includes(mutant.type)) {
      return 'high'
    }
    if (['logical', 'arithmetic'].includes(mutant.type)) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * 获取分数
   */
  getScore(result: MutationTestResult): number {
    return result.score
  }

  /**
   * 生成建议
   */
  generateSuggestions(result: MutationTestResult): string[] {
    const suggestions: string[] = []

    if (result.mutationScore < 80) {
      suggestions.push(
        `变异分数 ${result.mutationScore.toFixed(1)}% 低于推荐阈值 80%，需要加强测试覆盖`
      )
    }

    if (result.survivedMutants > 0) {
      suggestions.push(
        `${result.survivedMutants} 个变异体存活，表明测试可能不够充分`
      )

      // 按文件分组存活变异体
      const survivedByFile = new Map<string, number>()
      for (const mutation of result.survivedMutations) {
        const count = survivedByFile.get(mutation.mutant.filePath) || 0
        survivedByFile.set(mutation.mutant.filePath, count + 1)
      }

      // 找出存活变异体最多的文件
      const sorted = Array.from(survivedByFile.entries()).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) {
        suggestions.push(
          `重点关注 ${sorted[0][0]}，有 ${sorted[0][1]} 个存活变异体`
        )
      }
    }

    if (result.timedOutMutants > result.totalMutants * 0.1) {
      suggestions.push(
        `${result.timedOutMutants} 个变异体超时，考虑优化测试性能或增加超时时间`
      )
    }

    return suggestions
  }
}

/**
 * 创建变异测试器实例
 */
export function createMutationTester(
  config?: MutationTestConfig,
  projectRoot?: string,
  testCommand?: string
): MutationTester {
  return new MutationTester(config, projectRoot, testCommand)
}

/**
 * 默认变异测试器实例
 */
export const mutationTester = new MutationTester()
