/**
 * 快照命令
 */
import ora from 'ora'
import type { SnapshotOptions } from '../../types/index.js'
import { logger } from '../../utils/logger.js'
import { configLoader } from '../../core/config-loader.js'
import { SnapshotManager } from '../../snapshot/snapshot-manager.js'

export async function snapshotCommand(options: SnapshotOptions): Promise<void> {
  const cwd = process.cwd()

  // 加载配置
  const spinner = ora('加载配置...').start()
  const userConfig = await configLoader.load(cwd)
  const defaultConfig = configLoader.getDefaultConfig()
  const config = configLoader.mergeConfig(defaultConfig, userConfig)
  spinner.succeed('配置加载完成')

  const snapshotConfig = config.snapshot || {}
  const manager = new SnapshotManager(snapshotConfig, cwd)

  try {
    switch (options.action) {
      case 'update':
        {
          spinner.start('更新快照...')
          const count = await manager.updateAll()
          spinner.succeed(`已更新 ${count} 个快照`)
        }
        break

      case 'clean':
        {
          spinner.start('清理未使用的快照...')
          const count = await manager.clean()
          spinner.succeed(`已清理 ${count} 个快照`)
        }
        break

      case 'list':
        {
          spinner.start('加载快照列表...')
          const snapshots = await manager.list()
          spinner.succeed(`找到 ${snapshots.length} 个快照`)

          if (snapshots.length > 0) {
            console.log('\n快照列表:')
            snapshots.forEach((snapshot, i) => {
              console.log(`  ${i + 1}. ${snapshot}`)
            })
          }

          // 显示统计信息
          const stats = await manager.getStats()
          console.log(`\n总计: ${stats.total} 个文件，${(stats.size / 1024).toFixed(2)} KB`)
        }
        break

      default:
        logger.error(`未知操作: ${options.action}`)
        process.exit(1)
    }
  } catch (error) {
    spinner.fail('操作失败')
    logger.error('错误:', error)
    process.exit(1)
  }
}

