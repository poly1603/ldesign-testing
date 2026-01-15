/**
 * @ldesign/testing - Notifier
 * 通知系统 - 支持 Slack、钉钉、企业微信、邮件通知
 */

import * as https from 'https'
import * as http from 'http'

/**
 * 通知渠道类型
 */
export type NotifyChannel = 'slack' | 'dingtalk' | 'wecom' | 'email' | 'webhook' | 'feishu'

/**
 * 通知级别
 */
export type NotifyLevel = 'info' | 'success' | 'warning' | 'error'

/**
 * 通知配置
 */
export interface NotifyConfig {
  channels: NotifyChannelConfig[]
  defaultLevel?: NotifyLevel
  projectName?: string
  environment?: string
}

/**
 * 渠道配置
 */
export interface NotifyChannelConfig {
  type: NotifyChannel
  enabled?: boolean
  webhook?: string
  dingtalkSecret?: string
  feishuSecret?: string
  email?: EmailConfig
  levels?: NotifyLevel[]
}

/**
 * 邮件配置
 */
export interface EmailConfig {
  host: string
  port: number
  secure?: boolean
  auth: { user: string; pass: string }
  from: string
  to: string[]
}

/**
 * 通知消息
 */
export interface NotifyMessage {
  title: string
  content: string
  level: NotifyLevel
  timestamp?: Date
  details?: Record<string, any>
  links?: Array<{ text: string; url: string }>
}

/**
 * 测试结果通知
 */
export interface TestResultNotification {
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: number
  }
  failures?: Array<{ name: string; message: string }>
  coverage?: { lines: number; branches: number; functions: number; statements: number }
  buildInfo?: { branch?: string; commit?: string; buildUrl?: string }
}

/**
 * 发送结果
 */
export interface NotifySendResult {
  channel: NotifyChannel
  success: boolean
  error?: string
}

/**
 * 通知器
 */
export class Notifier {
  private config: NotifyConfig

  constructor(config: NotifyConfig) {
    this.config = { defaultLevel: 'info', ...config }
  }

  /**
   * 发送通知
   */
  async send(message: NotifyMessage): Promise<NotifySendResult[]> {
    const results: NotifySendResult[] = []
    const enabledChannels = this.config.channels.filter(c => c.enabled !== false)

    for (const channel of enabledChannels) {
      if (channel.levels && !channel.levels.includes(message.level)) continue

      try {
        const result = await this.sendToChannel(channel, message)
        results.push(result)
      } catch (error) {
        results.push({
          channel: channel.type,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return results
  }

  /**
   * 发送测试结果通知
   */
  async sendTestResult(result: TestResultNotification): Promise<NotifySendResult[]> {
    const { summary, failures, coverage, buildInfo } = result
    const passed = summary.failed === 0
    const level: NotifyLevel = passed ? 'success' : 'error'
    const emoji = passed ? '✅' : '❌'
    const status = passed ? '测试通过' : '测试失败'

    let content = `${emoji} ${status}\n\n**测试统计**\n`
    content += `- 总计: ${summary.total} | 通过: ${summary.passed} | 失败: ${summary.failed} | 跳过: ${summary.skipped}\n`
    content += `- 耗时: ${(summary.duration / 1000).toFixed(2)}s\n`

    if (coverage) {
      content += `\n**覆盖率**: 行 ${coverage.lines.toFixed(1)}% | 分支 ${coverage.branches.toFixed(1)}% | 函数 ${coverage.functions.toFixed(1)}%\n`
    }

    if (failures?.length) {
      content += `\n**失败用例**\n`
      failures.slice(0, 5).forEach(f => (content += `- ${f.name}: ${f.message}\n`))
      if (failures.length > 5) content += `- ... 还有 ${failures.length - 5} 个\n`
    }

    const links = buildInfo?.buildUrl ? [{ text: '查看构建', url: buildInfo.buildUrl }] : undefined

    return this.send({
      title: `${this.config.projectName || '项目'} - ${status}`,
      content,
      level,
      timestamp: new Date(),
      links,
    })
  }

  private async sendToChannel(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    switch (channel.type) {
      case 'slack':
        return this.sendToSlack(channel, message)
      case 'dingtalk':
        return this.sendToDingtalk(channel, message)
      case 'wecom':
        return this.sendToWecom(channel, message)
      case 'feishu':
        return this.sendToFeishu(channel, message)
      case 'webhook':
        return this.sendToWebhook(channel, message)
      case 'email':
        return this.sendEmail(channel, message)
      default:
        throw new Error(`不支持的通知渠道: ${channel.type}`)
    }
  }

  private async sendToSlack(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.webhook) throw new Error('Slack webhook 未配置')

    const payload = {
      attachments: [
        {
          color: this.getLevelColor(message.level),
          title: message.title,
          text: message.content,
          footer: `${this.config.projectName || ''} | ${this.config.environment || ''}`,
          ts: Math.floor((message.timestamp || new Date()).getTime() / 1000),
        },
      ],
    }

    const response = await this.httpPost(channel.webhook, payload)
    return { channel: 'slack', success: response === 'ok' }
  }

  private async sendToDingtalk(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.webhook) throw new Error('钉钉 webhook 未配置')

    let url = channel.webhook
    if (channel.dingtalkSecret) {
      const timestamp = Date.now()
      const sign = await this.calcDingtalkSign(timestamp, channel.dingtalkSecret)
      url += `&timestamp=${timestamp}&sign=${sign}`
    }

    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: `### ${this.getEmoji(message.level)} ${message.title}\n\n${message.content}`,
      },
    }

    const response = await this.httpPost(url, payload)
    return { channel: 'dingtalk', success: response?.errcode === 0, error: response?.errmsg }
  }

  private async sendToWecom(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.webhook) throw new Error('企业微信 webhook 未配置')

    const payload = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${this.getEmoji(message.level)} ${message.title}\n\n${message.content}`,
      },
    }

    const response = await this.httpPost(channel.webhook, payload)
    return { channel: 'wecom', success: response?.errcode === 0, error: response?.errmsg }
  }

  private async sendToFeishu(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.webhook) throw new Error('飞书 webhook 未配置')

    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: `${this.getEmoji(message.level)} ${message.title}` },
          template: this.getFeishuColor(message.level),
        },
        elements: [{ tag: 'markdown', content: message.content }],
      },
    }

    const response = await this.httpPost(channel.webhook, payload)
    return { channel: 'feishu', success: response?.code === 0, error: response?.msg }
  }

  private async sendToWebhook(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.webhook) throw new Error('Webhook URL 未配置')

    const payload = {
      title: message.title,
      content: message.content,
      level: message.level,
      timestamp: message.timestamp || new Date(),
      project: this.config.projectName,
      environment: this.config.environment,
      details: message.details,
      links: message.links,
    }

    await this.httpPost(channel.webhook, payload)
    return { channel: 'webhook', success: true }
  }

  private async sendEmail(channel: NotifyChannelConfig, message: NotifyMessage): Promise<NotifySendResult> {
    if (!channel.email) throw new Error('邮件配置未设置')

    try {
      // 动态导入 nodemailer，如果未安装则返回错误
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require('nodemailer') as {
        createTransport: (options: unknown) => { sendMail: (options: unknown) => Promise<unknown> }
      }

      const transporter = nodemailer.createTransport({
        host: channel.email.host,
        port: channel.email.port,
        secure: channel.email.secure,
        auth: channel.email.auth,
      })

      await transporter.sendMail({
        from: channel.email.from,
        to: channel.email.to.join(', '),
        subject: `[${message.level.toUpperCase()}] ${message.title}`,
        html: this.generateEmailHTML(message),
      })

      return { channel: 'email', success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('Cannot find module')) {
        return { channel: 'email', success: false, error: 'nodemailer 未安装，请运行: pnpm add nodemailer' }
      }
      return { channel: 'email', success: false, error: msg }
    }
  }

  private httpPost(url: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)
      const isHttps = urlObj.protocol === 'https:'
      const client = isHttps ? https : http
      const postData = JSON.stringify(data)

      const req = client.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        },
        res => {
          let body = ''
          res.on('data', chunk => (body += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(body))
            } catch {
              resolve(body)
            }
          })
        }
      )

      req.on('error', reject)
      req.write(postData)
      req.end()
    })
  }

  private async calcDingtalkSign(timestamp: number, secret: string): Promise<string> {
    const crypto = await import('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${timestamp}\n${secret}`)
    return encodeURIComponent(hmac.digest('base64'))
  }

  private generateEmailHTML(message: NotifyMessage): string {
    const color = this.getLevelColor(message.level)
    return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui;line-height:1.6;color:#333}.header{background:${color};color:#fff;padding:20px;border-radius:8px 8px 0 0}
.content{background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;white-space:pre-wrap}.footer{padding:15px;text-align:center;font-size:12px;color:#888}</style>
</head><body><div class="header"><h2>${this.getEmoji(message.level)} ${message.title}</h2></div>
<div class="content">${message.content}</div>
<div class="footer">${this.config.projectName || ''} | ${message.timestamp?.toLocaleString() || ''}</div></body></html>`
  }

  private getLevelColor(level: NotifyLevel): string {
    return { info: '#2196F3', success: '#4CAF50', warning: '#FF9800', error: '#F44336' }[level]
  }

  private getEmoji(level: NotifyLevel): string {
    return { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[level]
  }

  private getFeishuColor(level: NotifyLevel): string {
    return { info: 'blue', success: 'green', warning: 'orange', error: 'red' }[level]
  }
}

export function createNotifier(config: NotifyConfig): Notifier {
  return new Notifier(config)
}

export function createSlackNotifier(webhook: string, projectName?: string): Notifier {
  return new Notifier({ projectName, channels: [{ type: 'slack', webhook }] })
}

export function createDingtalkNotifier(webhook: string, secret?: string, projectName?: string): Notifier {
  return new Notifier({ projectName, channels: [{ type: 'dingtalk', webhook, dingtalkSecret: secret }] })
}

export function createWecomNotifier(webhook: string, projectName?: string): Notifier {
  return new Notifier({ projectName, channels: [{ type: 'wecom', webhook }] })
}

export function createFeishuNotifier(webhook: string, secret?: string, projectName?: string): Notifier {
  return new Notifier({ projectName, channels: [{ type: 'feishu', webhook, feishuSecret: secret }] })
}
