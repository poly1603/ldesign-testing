/**
 * @ldesign/testing - Testability Analyzer
 * 可测试性分析模块 - 代码复杂度和耦合度分析
 */

import type {
  TestabilityConfig,
  TestabilityReport,
  ComplexityMetrics,
  CouplingMetrics,
  CoverageGap,
  AntiPattern,
  TestabilitySuggestion,
} from '../types/extended.js'
import type { Priority } from '../types/index.js'
import * as fs from 'fs'
import * as path from 'path'
import fg from 'fast-glob'

/**
 * 默认可测试性分析配置
 */
export const DEFAULT_TESTABILITY_CONFIG: Required<TestabilityConfig> = {
  enabled: true,
  files: ['src/**/*.ts', 'src/**/*.js'],
  excludeFiles: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**', '**/node_modules/**'],
  complexityThreshold: 10,
  couplingThreshold: 10,
  checkAntiPatterns: true,
  analyzeCoverageGaps: true,
  coverageReportPath: './coverage/coverage-summary.json',
}

/**
 * 函数信息
 */
interface FunctionInfo {
  name: string
  filePath: string
  lineNumber: number
  complexity: number
  parameters: number
  linesOfCode: number
}

/**
 * 文件依赖信息
 */
interface FileDependency {
  filePath: string
  imports: string[]
  exports: string[]
  dependencies: number
  dependents: number
}

/**
 * 可测试性分析器
 */
export class TestabilityAnalyzer {
  private config: Required<TestabilityConfig>
  private projectRoot: string
  private dependencyGraph: Map<string, FileDependency> = new Map()

  constructor(config: TestabilityConfig = {}, projectRoot: string = process.cwd()) {
    this.config = { ...DEFAULT_TESTABILITY_CONFIG, ...config }
    this.projectRoot = projectRoot
  }

  /**
   * 运行可测试性分析
   */
  async analyze(): Promise<TestabilityReport> {
    // 获取要分析的文件
    const files = await this.getSourceFiles()

    // 分析复杂度
    const complexityMetrics = await this.analyzeComplexity(files)

    // 分析耦合度
    const couplingMetrics = await this.analyzeCoupling(files)

    // 检测反模式
    const antiPatterns = this.config.checkAntiPatterns
      ? await this.detectAntiPatterns(files)
      : []

    // 分析覆盖率缺口
    const coverageGaps = this.config.analyzeCoverageGaps
      ? await this.analyzeCoverageGaps()
      : []

    // 生成建议
    const suggestions = this.generateSuggestions(
      complexityMetrics,
      couplingMetrics,
      antiPatterns,
      coverageGaps
    )

    // 计算各文件评分
    const fileScores = this.calculateFileScores(files, complexityMetrics, couplingMetrics)

    // 计算综合评分
    const overallScore = this.calculateOverallScore(
      complexityMetrics,
      couplingMetrics,
      antiPatterns,
      coverageGaps
    )

    return {
      overallScore,
      complexityMetrics,
      couplingMetrics,
      coverageGaps,
      antiPatterns,
      suggestions,
      fileScores,
    }
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
   * 分析代码复杂度
   */
  private async analyzeComplexity(files: string[]): Promise<ComplexityMetrics> {
    const functions: FunctionInfo[] = []
    let totalComplexity = 0
    let maxComplexity = 0
    let totalLines = 0
    let totalFunctions = 0
    let cognitiveComplexity = 0

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      totalLines += lines.length

      // 提取函数并分析复杂度
      const fileFunctions = this.extractFunctions(content, filePath)
      functions.push(...fileFunctions)

      for (const func of fileFunctions) {
        totalComplexity += func.complexity
        totalFunctions++
        if (func.complexity > maxComplexity) {
          maxComplexity = func.complexity
        }
        // 认知复杂度考虑嵌套和控制流
        cognitiveComplexity += this.calculateCognitiveComplexity(func)
      }
    }

    const averageComplexity = totalFunctions > 0 ? totalComplexity / totalFunctions : 0

    // 找出高复杂度函数
    const highComplexityFunctions = functions
      .filter((f) => f.complexity > this.config.complexityThreshold)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)
      .map((f) => ({
        name: f.name,
        filePath: path.relative(this.projectRoot, f.filePath),
        lineNumber: f.lineNumber,
        complexity: f.complexity,
      }))

    return {
      averageCyclomaticComplexity: Math.round(averageComplexity * 100) / 100,
      maxCyclomaticComplexity: maxComplexity,
      highComplexityFunctions,
      cognitiveComplexity,
      linesOfCode: totalLines,
      functionCount: totalFunctions,
    }
  }

  /**
   * 提取函数信息
   */
  private extractFunctions(content: string, filePath: string): FunctionInfo[] {
    const functions: FunctionInfo[] = []
    const lines = content.split('\n')

    // 匹配函数定义的正则表达式
    const functionPatterns = [
      // 普通函数: function name(
      /function\s+(\w+)\s*\(/g,
      // 箭头函数: const name = (
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
      // 箭头函数: const name = async (
      /(?:const|let|var)\s+(\w+)\s*=\s*async\s+\(/g,
      // 方法: name(
      /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*{/gm,
      // 类方法
      /^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/gm,
    ]

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      for (const pattern of functionPatterns) {
        pattern.lastIndex = 0
        let match

        while ((match = pattern.exec(line)) !== null) {
          const funcName = match[1]
          if (!funcName || funcName === 'if' || funcName === 'for' || funcName === 'while') {
            continue
          }

          // 找到函数体的范围
          const funcBody = this.extractFunctionBody(lines, lineIndex)
          const complexity = this.calculateCyclomaticComplexity(funcBody)
          const params = this.countParameters(line)

          functions.push({
            name: funcName,
            filePath,
            lineNumber: lineIndex + 1,
            complexity,
            parameters: params,
            linesOfCode: funcBody.split('\n').length,
          })
        }
      }
    }

    return functions
  }

  /**
   * 提取函数体
   */
  private extractFunctionBody(lines: string[], startLine: number): string {
    let braceCount = 0
    let started = false
    const bodyLines: string[] = []

    for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
      const line = lines[i]
      bodyLines.push(line)

      for (const char of line) {
        if (char === '{') {
          braceCount++
          started = true
        } else if (char === '}') {
          braceCount--
          if (started && braceCount === 0) {
            return bodyLines.join('\n')
          }
        }
      }
    }

    return bodyLines.join('\n')
  }

  /**
   * 计算圈复杂度
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1 // 基础复杂度

    // 决策点
    const decisionPoints = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*[^:]+\s*:/g, // 三元运算符
      /\&\&/g,
      /\|\|/g,
      /\?\?/g, // 空值合并
    ]

    for (const pattern of decisionPoints) {
      const matches = code.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }

    return complexity
  }

  /**
   * 计算认知复杂度
   */
  private calculateCognitiveComplexity(func: FunctionInfo): number {
    // 简化的认知复杂度计算
    let cognitive = func.complexity

    // 参数过多增加复杂度
    if (func.parameters > 3) {
      cognitive += func.parameters - 3
    }

    // 代码行数过多
    if (func.linesOfCode > 30) {
      cognitive += Math.floor((func.linesOfCode - 30) / 10)
    }

    return cognitive
  }

  /**
   * 统计参数数量
   */
  private countParameters(line: string): number {
    const match = line.match(/\(([^)]*)\)/)
    if (!match || !match[1].trim()) {
      return 0
    }
    return match[1].split(',').length
  }

  /**
   * 分析耦合度
   */
  private async analyzeCoupling(files: string[]): Promise<CouplingMetrics> {
    // 构建依赖图
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = path.relative(this.projectRoot, filePath)

      const imports = this.extractImports(content)
      const exports = this.extractExports(content)

      this.dependencyGraph.set(relativePath, {
        filePath: relativePath,
        imports,
        exports,
        dependencies: imports.length,
        dependents: 0,
      })
    }

    // 计算被依赖数
    for (const [file, dep] of Array.from(this.dependencyGraph.entries())) {
      for (const importPath of dep.imports) {
        const resolvedPath = this.resolveImport(importPath, file)
        const imported = this.dependencyGraph.get(resolvedPath)
        if (imported) {
          imported.dependents++
        }
      }
    }

    // 计算指标
    let totalAfferent = 0
    let totalEfferent = 0
    const modules: Array<{
      name: string
      filePath: string
      dependencies: number
      dependents: number
    }> = []

    for (const [file, dep] of Array.from(this.dependencyGraph.entries())) {
      totalAfferent += dep.dependents
      totalEfferent += dep.dependencies

      if (dep.dependencies > this.config.couplingThreshold ||
          dep.dependents > this.config.couplingThreshold) {
        modules.push({
          name: path.basename(file),
          filePath: file,
          dependencies: dep.dependencies,
          dependents: dep.dependents,
        })
      }
    }

    const fileCount = this.dependencyGraph.size
    const afferentCoupling = fileCount > 0 ? totalAfferent / fileCount : 0
    const efferentCoupling = fileCount > 0 ? totalEfferent / fileCount : 0
    const instability =
      afferentCoupling + efferentCoupling > 0
        ? efferentCoupling / (afferentCoupling + efferentCoupling)
        : 0

    return {
      afferentCoupling: Math.round(afferentCoupling * 100) / 100,
      efferentCoupling: Math.round(efferentCoupling * 100) / 100,
      instability: Math.round(instability * 100) / 100,
      highCouplingModules: modules.sort((a, b) => 
        (b.dependencies + b.dependents) - (a.dependencies + a.dependents)
      ).slice(0, 10),
    }
  }

  /**
   * 提取导入
   */
  private extractImports(content: string): string[] {
    const imports: string[] = []
    const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    let match

    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1])
    }

    // 动态导入
    const dynamicPattern = /import\s*\(['"]([^'"]+)['"]\)/g
    while ((match = dynamicPattern.exec(content)) !== null) {
      imports.push(match[1])
    }

    // require
    const requirePattern = /require\s*\(['"]([^'"]+)['"]\)/g
    while ((match = requirePattern.exec(content)) !== null) {
      imports.push(match[1])
    }

    return imports
  }

  /**
   * 提取导出
   */
  private extractExports(content: string): string[] {
    const exports: string[] = []
    const patterns = [
      /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g,
      /export\s+default\s+(?:function|class)?\s*(\w+)?/g,
      /export\s+\{([^}]+)\}/g,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          exports.push(...match[1].split(',').map((s) => s.trim()))
        }
      }
    }

    return exports.filter(Boolean)
  }

  /**
   * 解析导入路径
   */
  private resolveImport(importPath: string, fromFile: string): string {
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile)
      let resolved = path.join(dir, importPath)
      
      // 添加扩展名
      if (!path.extname(resolved)) {
        for (const ext of ['.ts', '.js', '/index.ts', '/index.js']) {
          if (this.dependencyGraph.has(resolved + ext)) {
            return resolved + ext
          }
        }
      }
      return resolved
    }
    return importPath
  }

  /**
   * 检测反模式
   */
  private async detectAntiPatterns(files: string[]): Promise<AntiPattern[]> {
    const antiPatterns: AntiPattern[] = []

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = path.relative(this.projectRoot, filePath)

      // 检测上帝类 (God Class)
      const classMatch = content.match(/class\s+(\w+)/g)
      if (classMatch) {
        const methodCount = (content.match(/^\s*(?:async\s+)?(\w+)\s*\(/gm) || []).length
        const lines = content.split('\n').length

        if (methodCount > 20 || lines > 500) {
          antiPatterns.push({
            name: 'God Class',
            type: 'god-class',
            filePath: relativePath,
            description: `类包含 ${methodCount} 个方法和 ${lines} 行代码，过于庞大`,
            impact: '难以理解、维护和测试',
            refactoringSuggestion: '拆分为多个职责单一的小类',
          })
        }
      }

      // 检测长方法 (Long Method)
      const functions = this.extractFunctions(content, filePath)
      for (const func of functions) {
        if (func.linesOfCode > 50) {
          antiPatterns.push({
            name: 'Long Method',
            type: 'long-method',
            filePath: relativePath,
            lineNumber: func.lineNumber,
            description: `方法 ${func.name} 有 ${func.linesOfCode} 行代码`,
            impact: '难以理解和测试',
            refactoringSuggestion: '提取子方法，每个方法保持单一职责',
          })
        }
      }

      // 检测全局状态
      const globalStatePatterns = [
        /(?:var|let)\s+\w+\s*=\s*\{[\s\S]*\}/g,
        /window\.\w+\s*=/g,
        /global\.\w+\s*=/g,
      ]

      for (const pattern of globalStatePatterns) {
        if (pattern.test(content)) {
          antiPatterns.push({
            name: 'Global State',
            type: 'global-state',
            filePath: relativePath,
            description: '文件中存在全局状态',
            impact: '导致隐式依赖，难以测试和并行执行',
            refactoringSuggestion: '使用依赖注入或模块化状态管理',
          })
          break
        }
      }

      // 检测硬编码依赖
      const hardcodedDeps = content.match(/new\s+\w+\s*\(/g) || []
      if (hardcodedDeps.length > 5) {
        antiPatterns.push({
          name: 'Hard-coded Dependencies',
          type: 'hard-coded-dependency',
          filePath: relativePath,
          description: `文件中有 ${hardcodedDeps.length} 个硬编码的依赖实例化`,
          impact: '难以进行单元测试和模拟',
          refactoringSuggestion: '使用依赖注入模式',
        })
      }
    }

    return antiPatterns
  }

  /**
   * 分析覆盖率缺口
   */
  private async analyzeCoverageGaps(): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = []
    const coveragePath = path.join(this.projectRoot, this.config.coverageReportPath)

    if (!fs.existsSync(coveragePath)) {
      return gaps
    }

    try {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'))

      for (const [filePath, coverage] of Object.entries(coverageData)) {
        if (filePath === 'total') continue

        const fileCoverage = coverage as {
          lines?: { pct: number }
          branches?: { pct: number }
          functions?: { pct: number }
        }

        const lineCoverage = fileCoverage.lines?.pct || 0
        const branchCoverage = fileCoverage.branches?.pct || 0

        if (lineCoverage < 80 || branchCoverage < 80) {
          const priority: Priority =
            lineCoverage < 50 ? 'high' : lineCoverage < 70 ? 'medium' : 'low'

          gaps.push({
            filePath,
            uncoveredLines: [], // 详细的行号需要更详细的覆盖率报告
            uncoveredBranches: [],
            uncoveredFunctions: [],
            priority,
            suggestion: `提高测试覆盖率：行覆盖 ${lineCoverage.toFixed(1)}%, 分支覆盖 ${branchCoverage.toFixed(1)}%`,
          })
        }
      }
    } catch {
      // 忽略解析错误
    }

    return gaps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  /**
   * 生成可测试性建议
   */
  private generateSuggestions(
    complexity: ComplexityMetrics,
    coupling: CouplingMetrics,
    antiPatterns: AntiPattern[],
    coverageGaps: CoverageGap[]
  ): TestabilitySuggestion[] {
    const suggestions: TestabilitySuggestion[] = []
    let suggestionId = 0

    // 复杂度建议
    for (const func of complexity.highComplexityFunctions) {
      suggestions.push({
        id: `suggestion-${++suggestionId}`,
        type: 'reduce-complexity',
        priority: func.complexity > 20 ? 'high' : 'medium',
        title: `降低 ${func.name} 的复杂度`,
        description: `函数 ${func.name} 的圈复杂度为 ${func.complexity}，超过阈值 ${this.config.complexityThreshold}`,
        filePath: func.filePath,
        expectedBenefit: '提高代码可读性和可测试性',
        codeExample: `// 考虑拆分为多个小函数\n// 使用早返回减少嵌套\n// 使用策略模式替代复杂条件`,
      })
    }

    // 耦合度建议
    for (const module of coupling.highCouplingModules) {
      suggestions.push({
        id: `suggestion-${++suggestionId}`,
        type: 'inject-dependency',
        priority: module.dependencies > 15 ? 'high' : 'medium',
        title: `降低 ${module.name} 的耦合度`,
        description: `模块有 ${module.dependencies} 个依赖，${module.dependents} 个被依赖`,
        filePath: module.filePath,
        expectedBenefit: '提高模块独立性，便于单元测试',
        codeExample: `// 使用依赖注入\n// 提取公共接口\n// 使用事件或消息解耦`,
      })
    }

    // 反模式建议
    for (const pattern of antiPatterns) {
      suggestions.push({
        id: `suggestion-${++suggestionId}`,
        type: pattern.type === 'god-class' ? 'extract-method' : 'remove-global',
        priority: 'high',
        title: `修复反模式: ${pattern.name}`,
        description: pattern.description,
        filePath: pattern.filePath,
        expectedBenefit: pattern.impact,
        codeExample: pattern.refactoringSuggestion,
      })
    }

    // 覆盖率建议
    for (const gap of coverageGaps.slice(0, 5)) {
      suggestions.push({
        id: `suggestion-${++suggestionId}`,
        type: 'add-interface',
        priority: gap.priority,
        title: `提高 ${path.basename(gap.filePath)} 的测试覆盖率`,
        description: gap.suggestion,
        filePath: gap.filePath,
        expectedBenefit: '提高代码质量和可靠性',
      })
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  /**
   * 计算各文件评分
   */
  private calculateFileScores(
    files: string[],
    complexity: ComplexityMetrics,
    _coupling: CouplingMetrics
  ): Record<string, number> {
    const scores: Record<string, number> = {}

    for (const filePath of files) {
      const relativePath = path.relative(this.projectRoot, filePath)
      let score = 100

      // 根据复杂度扣分
      const highComplexityFunc = complexity.highComplexityFunctions.find(
        (f) => f.filePath === relativePath
      )
      if (highComplexityFunc) {
        score -= Math.min(30, (highComplexityFunc.complexity - this.config.complexityThreshold) * 3)
      }

      // 根据耦合度扣分
      const dep = this.dependencyGraph.get(relativePath)
      if (dep) {
        if (dep.dependencies > this.config.couplingThreshold) {
          score -= Math.min(20, (dep.dependencies - this.config.couplingThreshold) * 2)
        }
      }

      scores[relativePath] = Math.max(0, Math.min(100, score))
    }

    return scores
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(
    complexity: ComplexityMetrics,
    coupling: CouplingMetrics,
    antiPatterns: AntiPattern[],
    coverageGaps: CoverageGap[]
  ): number {
    let score = 100

    // 复杂度扣分 (最多扣 30 分)
    const avgComplexityPenalty = Math.min(
      15,
      Math.max(0, complexity.averageCyclomaticComplexity - 5) * 3
    )
    const maxComplexityPenalty = Math.min(
      15,
      Math.max(0, complexity.maxCyclomaticComplexity - this.config.complexityThreshold) * 1.5
    )
    score -= avgComplexityPenalty + maxComplexityPenalty

    // 耦合度扣分 (最多扣 20 分)
    const instabilityPenalty = coupling.instability > 0.7 ? 10 : coupling.instability > 0.5 ? 5 : 0
    const couplingPenalty = coupling.highCouplingModules.length * 2
    score -= Math.min(20, instabilityPenalty + couplingPenalty)

    // 反模式扣分 (最多扣 25 分)
    score -= Math.min(25, antiPatterns.length * 5)

    // 覆盖率缺口扣分 (最多扣 25 分)
    const highPriorityGaps = coverageGaps.filter((g) => g.priority === 'high').length
    score -= Math.min(25, highPriorityGaps * 5 + coverageGaps.length * 2)

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 获取分数
   */
  getScore(result: TestabilityReport): number {
    return result.overallScore
  }
}

/**
 * 创建可测试性分析器实例
 */
export function createTestabilityAnalyzer(
  config?: TestabilityConfig,
  projectRoot?: string
): TestabilityAnalyzer {
  return new TestabilityAnalyzer(config, projectRoot)
}

/**
 * 默认可测试性分析器实例
 */
export const testabilityAnalyzer = new TestabilityAnalyzer()
