/**
 * @ldesign/testing - Auto Test Suite
 * 自动化测试套件，支持内存、性能、UI、API、页面、安全、合约等全方位测试
 */

// 导出类型
export * from './types/index.js'
export * from './types/extended.js'

// 导出核心模块
export * from './core/index.js'

// 导出测试模块
export * from './testers/index.js'

// 导出输出模块
export * from './output/index.js'

// 导出分析器模块
export * from './analyzers/index.js'

// 导出管理器模块
export * from './managers/index.js'

// 导出适配器 (将在后续任务中实现)
// export * from './adapters/index.js'

// 导出 CLI (将在后续任务中实现)
// export * from './cli/index.js'

/**
 * 定义自动测试配置
 */
export function defineAutoTestConfig(
  config: import('./types/index.js').AutoTestConfig
) {
  return config
}
