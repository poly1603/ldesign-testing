/**
 * CLI 主入口
 */
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { runCommand } from './commands/run.js'
import { coverageCommand } from './commands/coverage.js'
import { snapshotCommand } from './commands/snapshot.js'
import { mockCommand } from './commands/mock.js'

const program = new Command()

program
  .name('ldesign-testing')
  .description('完整的测试工具集')
  .version('1.0.0')

// 初始化命令
program
  .command('init')
  .description('初始化测试配置')
  .option('-p, --preset <preset>', '预设配置 (base|vue|react|node|library)')
  .option('-f, --force', '强制覆盖已存在的配置')
  .option('--skip-prompts', '跳过交互式提示')
  .option('--no-install', '不安装依赖')
  .action(async (options) => {
    await initCommand(options)
  })

// 运行测试命令
program
  .command('run')
  .description('运行所有测试')
  .option('-t, --type <type>', '测试类型 (unit|e2e|all)', 'all')
  .option('-w, --watch', '监听模式')
  .option('-c, --coverage', '生成覆盖率报告')
  .option('-u, --update-snapshot', '更新快照')
  .option('-v, --verbose', '详细输出')
  .option('--bail', '失败时立即退出')
  .option('--max-concurrency <n>', '最大并发数', parseInt)
  .option('--test-name-pattern <pattern>', '测试名称过滤')
  .option('--test-path-pattern <pattern>', '测试路径过滤')
  .action(async (options) => {
    await runCommand(options)
  })

// 单元测试命令
program
  .command('run:unit')
  .description('运行单元测试')
  .option('-w, --watch', '监听模式')
  .option('-c, --coverage', '生成覆盖率报告')
  .option('-u, --update-snapshot', '更新快照')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    await runCommand({ ...options, type: 'unit' })
  })

// E2E 测试命令
program
  .command('run:e2e')
  .description('运行 E2E 测试')
  .option('--headed', '有头模式')
  .option('--browser <browser>', '指定浏览器 (chromium|firefox|webkit)')
  .option('-v, --verbose', '详细输出')
  .action(async (options) => {
    await runCommand({ ...options, type: 'e2e' })
  })

// 覆盖率命令
program
  .command('coverage')
  .description('生成覆盖率报告')
  .option('--open', '打开 HTML 报告')
  .action(async (options) => {
    await coverageCommand(options)
  })

// 快照命令
program
  .command('snapshot <action>')
  .description('快照管理 (update|clean|list)')
  .option('-t, --test-name-pattern <pattern>', '测试名称过滤')
  .action(async (action, options) => {
    await snapshotCommand({ action, ...options })
  })

// Mock 数据生成命令
program
  .command('mock <type>')
  .description('生成 Mock 数据 (user|product|article|comment|order)')
  .option('-c, --count <n>', '生成数量', parseInt, 10)
  .option('-l, --locale <locale>', '语言设置', 'zh_CN')
  .option('-f, --format <format>', '输出格式 (json|ts|js)', 'json')
  .option('-o, --output <file>', '输出文件')
  .action(async (type, options) => {
    await mockCommand({ type, ...options })
  })

// 错误处理
program.exitOverride()

program.parse()

