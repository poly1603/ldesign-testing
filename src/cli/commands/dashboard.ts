/**
 * CLI 命令 - Dashboard
 * 启动可视化 UI Dashboard
 */

import { DashboardServer, type DashboardConfig } from '../../dashboard/index.js'

export interface DashboardCommandOptions {
  port?: number
  host?: string
  open?: boolean
  theme?: 'light' | 'dark' | 'auto'
}

/**
 * 启动 Dashboard
 */
export async function dashboardCommand(options: DashboardCommandOptions): Promise<void> {
  console.log('\n🧪 LDesign Testing Dashboard\n')

  const config: Partial<DashboardConfig> = {
    port: options.port || 4173,
    host: options.host || 'localhost',
    open: options.open !== false,
    theme: options.theme || 'auto',
  }

  const server = new DashboardServer(config)

  try {
    const url = await server.start()
    console.log(`✨ Dashboard 运行在: ${url}`)
    console.log('\n按 Ctrl+C 停止服务\n')

    // 处理退出信号
    const cleanup = async () => {
      console.log('\n正在关闭 Dashboard...')
      await server.stop()
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    // 保持进程运行
    await new Promise(() => {})
  } catch (error) {
    console.error('❌ Dashboard 启动失败:', error)
    process.exit(1)
  }
}
