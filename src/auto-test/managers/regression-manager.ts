/**
 * @ldesign/testing - Regression Manager
 * 回归测试管理模块 - 智能测试选择
 */

import type {
  RegressionConfig,
  RegressionTestResult,
  RegressionTestPlan,
  TestImpactAnalysis,
  HistoricalTestResult,
} from '../types/extended.js'
import type { Priority } from '../types/index.js'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fg from 'fast-glob'

const execAsync = promisify(exec)

/**
 * 默认回归测试配置
 */
export const DEFAULT_REGRESSION_CONFIG: Required<RegressionConfig> = {
  enabled: true,
  strategy: 'smart',
  baseBranch: 'main',
  includeFlaky: false,
  maxDuration: 300000, // 5 分钟
  priorityRules: [
    { name: 'critical-paths', pattern: '**/critical/**', priority: 'high', weight: 3 },
    { name: 'api-tests', pattern: '**/api/**', priority: 'high', weight: 2.5 },
    { name: 'unit-tests', pattern: '**/*.unit.test.*', priority: 'medium', weight: 2 },
    { name: 'integration', pattern: '**/*.integration.*', priority: 'medium', weight: 1.5 },
    { name: 'e2e-tests', pattern: '**/e2e/**', priority: 'low', weight: 1 },
  ],
  minConfidence: 0.8,
  useHistory: true,
  historyPath: './.test-history.json',
}

/**
 * 测试文件信息
 */
interface TestFile {
  path: string
  name: string
  testCount: number
  avgDuration: number
  lastRun?: number
  lastResult?: 'pass' | 'fail'
  failureRate: number
  isFlaky: boolean
}

/**
 * 历史数据
 */
interface TestHistory {
  tests: Record<string, HistoricalTestResult>
  lastUpdated: number
}

/**
 * 回归测试管理器
 */
export class RegressionManager {
  private config: Required<RegressionConfig>
  private projectRoot: string
  private history: TestHistory | null = null
  private testFiles: Map<string, TestFile> = new Map()

  constructor(config: RegressionConfig = {}, projectRoot: string = process.cwd()) {
    this.config = { ...DEFAULT_REGRESSION_CONFIG, ...config }
    this.projectRoot = projectRoot
  }

  /**
   * 创建回归测试计划
   */
  async createTestPlan(): Promise<RegressionTestPlan> {
    // 加载测试历史
    await this.loadHistory()

    // 扫描测试文件
    await this.scanTestFiles()

    // 分析变更影响
    const impactAnalysis = await this.analyzeImpact()

    // 根据策略选择测试
    const { selected, skipped } = await this.selectTests(impactAnalysis)

    // 计算预计执行时间
    const estimatedDuration = this.calculateEstimatedDuration(selected)

    // 计算置信度
    const confidence = this.calculateConfidence(selected, impactAnalysis)

    return {
      strategy: this.config.strategy,
      selectedTests: selected,
      skippedTests: skipped,
      estimatedDuration,
      confidence,
    }
  }

  /**
   * 运行回归测试
   */
  async run(): Promise<RegressionTestResult> {
    const startTime = Date.now()
    const plan = await this.createTestPlan()
    const impactAnalysis = await this.analyzeImpact()

    // 计算实际执行结果
    const result: RegressionTestResult = {
      plan,
      impactAnalysis,
      executedTests: plan.selectedTests.length,
      skippedTests: plan.skippedTests.length,
      timeSaved: this.calculateTimeSaved(plan),
      changesCovered: this.calculateChangesCovered(plan, impactAnalysis),
      actualDuration: Date.now() - startTime,
    }

    // 更新历史数据
    await this.updateHistory(result)

    return result
  }

  /**
   * 加载测试历史
   */
  private async loadHistory(): Promise<void> {
    if (!this.config.useHistory) {
      this.history = { tests: {}, lastUpdated: 0 }
      return
    }

    const historyPath = path.join(this.projectRoot, this.config.historyPath)

    if (fs.existsSync(historyPath)) {
      try {
        this.history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
      } catch {
        this.history = { tests: {}, lastUpdated: 0 }
      }
    } else {
      this.history = { tests: {}, lastUpdated: 0 }
    }
  }

  /**
   * 扫描测试文件
   */
  private async scanTestFiles(): Promise<void> {
    const testPatterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.js',
    ]

    const files = await fg(testPatterns, {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: true,
    })

    for (const filePath of files) {
      const relativePath = path.relative(this.projectRoot, filePath)
      const content = fs.readFileSync(filePath, 'utf-8')

      // 统计测试数量
      const testCount =
        (content.match(/(?:it|test)\s*\(/g) || []).length +
        (content.match(/(?:describe)\s*\(/g) || []).length

      // 获取历史数据
      const historyData = this.history?.tests[relativePath]

      this.testFiles.set(relativePath, {
        path: relativePath,
        name: path.basename(filePath, path.extname(filePath)),
        testCount,
        avgDuration: historyData?.avgDuration || 1000,
        lastRun: historyData?.lastFailure,
        failureRate: historyData?.failureRate || 0,
        isFlaky: historyData?.isFlaky || false,
      })
    }
  }

  /**
   * 分析变更影响
   */
  private async analyzeImpact(): Promise<TestImpactAnalysis> {
    const changedFiles = await this.getChangedFiles()
    const affectedTests: TestImpactAnalysis['affectedTests'] = []
    const unaffectedTests: string[] = []

    for (const [testPath, testFile] of Array.from(this.testFiles.entries())) {
      // 计算影响分数
      const impactScore = this.calculateImpactScore(testPath, changedFiles)

      if (impactScore > 0) {
        // 找出影响此测试的变更文件
        const affectedBy = changedFiles.filter((file) =>
          this.isTestAffectedByFile(testPath, file)
        )

        affectedTests.push({
          testFile: testPath,
          testName: testFile.name,
          impactScore,
          affectedBy,
        })
      } else {
        unaffectedTests.push(testPath)
      }
    }

    // 按影响分数排序
    affectedTests.sort((a, b) => b.impactScore - a.impactScore)

    return {
      changedFiles,
      affectedTests,
      unaffectedTests,
    }
  }

  /**
   * 获取变更的文件
   */
  private async getChangedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `git diff --name-only ${this.config.baseBranch}...HEAD`,
        { cwd: this.projectRoot }
      )
      return stdout.trim().split('\n').filter(Boolean)
    } catch {
      // 如果 git 命令失败，返回空数组
      return []
    }
  }

  /**
   * 计算影响分数
   */
  private calculateImpactScore(testPath: string, changedFiles: string[]): number {
    let score = 0

    for (const changedFile of changedFiles) {
      // 直接导入关系
      if (this.isTestAffectedByFile(testPath, changedFile)) {
        score += 10
      }

      // 同目录的文件变更
      if (path.dirname(testPath) === path.dirname(changedFile)) {
        score += 5
      }

      // 相似名称的文件变更
      const testBaseName = path.basename(testPath).replace(/\.(test|spec)\.[jt]s$/, '')
      const changedBaseName = path.basename(changedFile).replace(/\.[jt]sx?$/, '')
      if (testBaseName === changedBaseName) {
        score += 8
      }
    }

    return score
  }

  /**
   * 判断测试是否受文件影响
   */
  private isTestAffectedByFile(testPath: string, changedFile: string): boolean {
    // 简单的启发式判断
    const testDir = path.dirname(testPath)
    const changedDir = path.dirname(changedFile)

    // 同目录
    if (testDir === changedDir) {
      return true
    }

    // 测试文件名与源文件名匹配
    const testName = path.basename(testPath).replace(/\.(test|spec)\.[jt]sx?$/, '')
    const fileName = path.basename(changedFile).replace(/\.[jt]sx?$/, '')
    if (testName === fileName) {
      return true
    }

    // 源文件在 src 目录，测试文件测试对应模块
    if (changedFile.startsWith('src/') && testPath.includes(changedDir.replace('src/', ''))) {
      return true
    }

    return false
  }

  /**
   * 根据策略选择测试
   */
  private async selectTests(
    impactAnalysis: TestImpactAnalysis
  ): Promise<{
    selected: RegressionTestPlan['selectedTests']
    skipped: RegressionTestPlan['skippedTests']
  }> {
    const selected: RegressionTestPlan['selectedTests'] = []
    const skipped: RegressionTestPlan['skippedTests'] = []

    switch (this.config.strategy) {
      case 'full':
        // 运行所有测试
        for (const [testPath, testFile] of Array.from(this.testFiles.entries())) {
          if (!testFile.isFlaky || this.config.includeFlaky) {
            selected.push({
              testFile: testPath,
              testName: testFile.name,
              priority: this.getTestPriority(testPath),
              reason: '完整测试策略',
            })
          } else {
            skipped.push({
              testFile: testPath,
              testName: testFile.name,
              reason: 'Flaky 测试被排除',
            })
          }
        }
        break

      case 'affected':
        // 只运行受影响的测试
        for (const affected of impactAnalysis.affectedTests) {
          const testFile = this.testFiles.get(affected.testFile)
          if (testFile && (!testFile.isFlaky || this.config.includeFlaky)) {
            selected.push({
              testFile: affected.testFile,
              testName: affected.testName,
              priority: this.getTestPriority(affected.testFile),
              reason: `受 ${affected.affectedBy.length} 个文件变更影响`,
            })
          }
        }

        for (const testPath of impactAnalysis.unaffectedTests) {
          const testFile = this.testFiles.get(testPath)
          skipped.push({
            testFile: testPath,
            testName: testFile?.name || path.basename(testPath),
            reason: '未受变更影响',
          })
        }
        break

      case 'priority':
        // 按优先级选择测试
        const sortedTests = Array.from(this.testFiles.entries())
          .map(([testPath, testFile]) => ({
            testPath,
            testFile,
            priority: this.getTestPriority(testPath),
            weight: this.getTestWeight(testPath),
          }))
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 }
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.weight - a.weight
          })

        let totalDuration = 0
        for (const { testPath, testFile, priority } of sortedTests) {
          if (totalDuration + testFile.avgDuration <= this.config.maxDuration) {
            if (!testFile.isFlaky || this.config.includeFlaky) {
              selected.push({
                testFile: testPath,
                testName: testFile.name,
                priority,
                reason: `优先级: ${priority}`,
              })
              totalDuration += testFile.avgDuration
            }
          } else {
            skipped.push({
              testFile: testPath,
              testName: testFile.name,
              reason: '超出时间限制',
            })
          }
        }
        break

      case 'smart':
      case 'risk-based':
        // 智能选择：结合影响分析、历史数据和优先级
        const scoredTests = Array.from(this.testFiles.entries())
          .map(([testPath, testFile]) => {
            const affected = impactAnalysis.affectedTests.find(
              (a) => a.testFile === testPath
            )
            const impactScore = affected?.impactScore || 0
            const historyScore = this.calculateHistoryScore(testFile)
            const priorityScore = this.getPriorityScore(testPath)

            return {
              testPath,
              testFile,
              totalScore: impactScore * 0.4 + historyScore * 0.3 + priorityScore * 0.3,
              impactScore,
              reason: this.generateReason(impactScore, historyScore, priorityScore),
            }
          })
          .sort((a, b) => b.totalScore - a.totalScore)

        let smartDuration = 0
        for (const { testPath, testFile, totalScore, reason } of scoredTests) {
          // 高分测试或受影响测试优先
          if (
            totalScore > 5 ||
            impactAnalysis.affectedTests.some((a) => a.testFile === testPath)
          ) {
            if (!testFile.isFlaky || this.config.includeFlaky) {
              selected.push({
                testFile: testPath,
                testName: testFile.name,
                priority: this.getTestPriority(testPath),
                reason,
              })
              smartDuration += testFile.avgDuration
            }
          } else if (smartDuration + testFile.avgDuration <= this.config.maxDuration * 0.8) {
            // 在时间允许时，运行更多测试
            selected.push({
              testFile: testPath,
              testName: testFile.name,
              priority: this.getTestPriority(testPath),
              reason: '补充测试覆盖',
            })
            smartDuration += testFile.avgDuration
          } else {
            skipped.push({
              testFile: testPath,
              testName: testFile.name,
              reason: '低优先级且时间受限',
            })
          }
        }
        break
    }

    // 按优先级排序选中的测试
    selected.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return { selected, skipped }
  }

  /**
   * 获取测试优先级
   */
  private getTestPriority(testPath: string): Priority {
    for (const rule of this.config.priorityRules) {
      if (this.matchPattern(testPath, rule.pattern)) {
        return rule.priority
      }
    }
    return 'medium'
  }

  /**
   * 获取测试权重
   */
  private getTestWeight(testPath: string): number {
    for (const rule of this.config.priorityRules) {
      if (this.matchPattern(testPath, rule.pattern)) {
        return rule.weight
      }
    }
    return 1
  }

  /**
   * 匹配模式
   */
  private matchPattern(testPath: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
    )
    return regex.test(testPath)
  }

  /**
   * 计算历史分数
   */
  private calculateHistoryScore(testFile: TestFile): number {
    let score = 0

    // 失败率高的测试需要优先运行
    score += testFile.failureRate * 10

    // 最近失败的测试优先
    if (testFile.lastResult === 'fail') {
      score += 5
    }

    // 很久没运行的测试需要检查
    if (testFile.lastRun) {
      const daysSinceLastRun = (Date.now() - testFile.lastRun) / (1000 * 60 * 60 * 24)
      if (daysSinceLastRun > 7) {
        score += Math.min(5, daysSinceLastRun / 7)
      }
    }

    return score
  }

  /**
   * 获取优先级分数
   */
  private getPriorityScore(testPath: string): number {
    const priority = this.getTestPriority(testPath)
    switch (priority) {
      case 'high':
        return 10
      case 'medium':
        return 5
      case 'low':
        return 2
    }
  }

  /**
   * 生成选择原因
   */
  private generateReason(
    impactScore: number,
    historyScore: number,
    priorityScore: number
  ): string {
    const reasons: string[] = []

    if (impactScore > 5) {
      reasons.push('受变更影响')
    }
    if (historyScore > 5) {
      reasons.push('历史失败率高')
    }
    if (priorityScore >= 10) {
      reasons.push('高优先级')
    }

    return reasons.length > 0 ? reasons.join(', ') : '综合评估'
  }

  /**
   * 计算预计执行时间
   */
  private calculateEstimatedDuration(
    tests: RegressionTestPlan['selectedTests']
  ): number {
    let duration = 0

    for (const test of tests) {
      const testFile = this.testFiles.get(test.testFile)
      if (testFile) {
        duration += testFile.avgDuration
      } else {
        duration += 1000 // 默认 1 秒
      }
    }

    return duration
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    tests: RegressionTestPlan['selectedTests'],
    impactAnalysis: TestImpactAnalysis
  ): number {
    // 基础置信度
    let confidence = 0.5

    // 覆盖了所有受影响的测试
    const affectedCovered = impactAnalysis.affectedTests.filter((a) =>
      tests.some((t) => t.testFile === a.testFile)
    ).length

    if (impactAnalysis.affectedTests.length > 0) {
      confidence += 0.3 * (affectedCovered / impactAnalysis.affectedTests.length)
    } else {
      confidence += 0.3
    }

    // 高优先级测试覆盖率
    const highPriorityTests = tests.filter((t) => t.priority === 'high').length
    const totalHighPriority = Array.from(this.testFiles.keys()).filter(
      (p) => this.getTestPriority(p) === 'high'
    ).length

    if (totalHighPriority > 0) {
      confidence += 0.2 * (highPriorityTests / totalHighPriority)
    } else {
      confidence += 0.2
    }

    return Math.min(1, Math.round(confidence * 100) / 100)
  }

  /**
   * 计算节省的时间
   */
  private calculateTimeSaved(plan: RegressionTestPlan): number {
    // 计算跳过的测试的预计时间
    let savedDuration = 0

    for (const skipped of plan.skippedTests) {
      const testFile = this.testFiles.get(skipped.testFile)
      if (testFile) {
        savedDuration += testFile.avgDuration
      }
    }

    return savedDuration
  }

  /**
   * 计算变更覆盖率
   */
  private calculateChangesCovered(
    plan: RegressionTestPlan,
    impactAnalysis: TestImpactAnalysis
  ): number {
    if (impactAnalysis.affectedTests.length === 0) {
      return 100
    }

    const covered = impactAnalysis.affectedTests.filter((a) =>
      plan.selectedTests.some((t) => t.testFile === a.testFile)
    ).length

    return Math.round((covered / impactAnalysis.affectedTests.length) * 100)
  }

  /**
   * 更新历史数据
   */
  private async updateHistory(result: RegressionTestResult): Promise<void> {
    if (!this.config.useHistory || !this.history) {
      return
    }

    // 更新测试结果统计
    for (const test of result.plan.selectedTests) {
      if (!this.history.tests[test.testFile]) {
        this.history.tests[test.testFile] = {
          testName: test.testName,
          executionCount: 0,
          failureCount: 0,
          failureRate: 0,
          avgDuration: 1000,
          isFlaky: false,
        }
      }

      const history = this.history.tests[test.testFile]
      history.executionCount++
      // 实际的失败计数需要在测试运行后更新
    }

    this.history.lastUpdated = Date.now()

    // 保存历史数据
    const historyPath = path.join(this.projectRoot, this.config.historyPath)
    fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2), 'utf-8')
  }
}

/**
 * 创建回归测试管理器实例
 */
export function createRegressionManager(
  config?: RegressionConfig,
  projectRoot?: string
): RegressionManager {
  return new RegressionManager(config, projectRoot)
}

/**
 * 默认回归测试管理器实例
 */
export const regressionManager = new RegressionManager()
