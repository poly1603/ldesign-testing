/**
 * 测试报告格式化工具
 */
import chalk from 'chalk'
import type { TestResult, TestFileResult, CoverageSummary } from '../types/index.js'

/**
 * 格式化测试结果
 */
export function formatTestResult(result: TestResult): string {
  const lines: string[] = []

  // 标题
  lines.push(chalk.bold('\n测试结果:'))
  lines.push('─'.repeat(50))

  // 统计信息
  lines.push(`总测试数: ${result.total}`)
  lines.push(chalk.green(`通过: ${result.passed}`))
  if (result.failed > 0) {
    lines.push(chalk.red(`失败: ${result.failed}`))
  }
  if (result.skipped > 0) {
    lines.push(chalk.yellow(`跳过: ${result.skipped}`))
  }
  lines.push(`执行时间: ${formatDuration(result.duration)}`)

  // 文件结果
  if (result.testFiles && result.testFiles.length > 0) {
    lines.push('\n' + chalk.bold('测试文件:'))
    result.testFiles.forEach((file) => {
      lines.push(formatTestFileResult(file))
    })
  }

  // 覆盖率
  if (result.coverage) {
    lines.push('\n' + formatCoverage(result.coverage))
  }

  lines.push('─'.repeat(50))

  // 总结
  if (result.failed === 0) {
    lines.push(chalk.green.bold('✓ 所有测试通过'))
  } else {
    lines.push(chalk.red.bold('✗ 部分测试失败'))
  }

  return lines.join('\n')
}

/**
 * 格式化测试文件结果
 */
export function formatTestFileResult(file: TestFileResult): string {
  const status =
    file.failed > 0 ? chalk.red('✗') : file.skipped === file.tests ? chalk.yellow('○') : chalk.green('✓')

  const stats = `${file.passed}/${file.tests} passed`
  const duration = formatDuration(file.duration)

  return `  ${status} ${file.file} ${chalk.gray(`(${stats}, ${duration})`)}`
}

/**
 * 格式化覆盖率
 */
export function formatCoverage(coverage: CoverageSummary): string {
  const lines: string[] = []

  lines.push(chalk.bold('测试覆盖率:'))
  lines.push(formatCoverageDetail('语句', coverage.statements))
  lines.push(formatCoverageDetail('分支', coverage.branches))
  lines.push(formatCoverageDetail('函数', coverage.functions))
  lines.push(formatCoverageDetail('行数', coverage.lines))

  return lines.join('\n')
}

/**
 * 格式化覆盖率详情
 */
function formatCoverageDetail(
  label: string,
  detail: { total: number; covered: number; pct: number }
): string {
  const pct = detail.pct.toFixed(2)
  const color = getCoverageColor(detail.pct)
  const bar = getCoverageBar(detail.pct)

  return `  ${label.padEnd(6)} ${color(pct.padStart(6) + '%')} ${bar} ${color(
    `${detail.covered}/${detail.total}`
  )}`
}

/**
 * 获取覆盖率颜色
 */
function getCoverageColor(pct: number): typeof chalk.green {
  if (pct >= 80) return chalk.green
  if (pct >= 60) return chalk.yellow
  return chalk.red
}

/**
 * 获取覆盖率进度条
 */
function getCoverageBar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  const color = getCoverageColor(pct)
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}m ${seconds}s`
}

/**
 * 格式化错误信息
 */
export function formatError(error: { message: string; stack?: string }): string {
  const lines: string[] = []

  lines.push(chalk.red.bold('错误:'))
  lines.push(chalk.red(error.message))

  if (error.stack) {
    lines.push(chalk.gray('\n堆栈跟踪:'))
    lines.push(chalk.gray(error.stack))
  }

  return lines.join('\n')
}

/**
 * 格式化进度
 */
export function formatProgress(current: number, total: number): string {
  const pct = ((current / total) * 100).toFixed(0)
  return `[${current}/${total}] ${pct}%`
}

/**
 * 创建表格
 */
export function createTable(
  headers: string[],
  rows: string[][]
): string {
  const colWidths = headers.map((header, i) => {
    const maxWidth = Math.max(
      header.length,
      ...rows.map((row) => (row[i] || '').length)
    )
    return maxWidth + 2
  })

  const separator = '─'.repeat(colWidths.reduce((a, b) => a + b, 0) + colWidths.length + 1)

  const formatRow = (cells: string[]) => {
    return (
      '│' +
      cells
        .map((cell, i) => ` ${cell.padEnd(colWidths[i] - 1)}`)
        .join('│') +
      '│'
    )
  }

  const lines: string[] = []
  lines.push(separator)
  lines.push(formatRow(headers))
  lines.push(separator)
  rows.forEach((row) => {
    lines.push(formatRow(row))
  })
  lines.push(separator)

  return lines.join('\n')
}

