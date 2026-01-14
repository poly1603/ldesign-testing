/**
 * @ldesign/testing - Security Tester
 * 安全测试模块 - XSS、CSRF、注入检测、安全头检测、依赖漏洞扫描
 */

import type { Page, Response, Request } from '@playwright/test'
import type {
  SecurityTestConfig,
  SecurityTestResult,
  SensitiveDataLeak,
  SecurityHeaderIssue,
  BaseTester,
} from '../types/extended.js'
import type { Severity } from '../types/index.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import fg from 'fast-glob'

const execAsync = promisify(exec)

/**
 * 默认安全测试配置
 */
export const DEFAULT_SECURITY_CONFIG: Required<SecurityTestConfig> = {
  enabled: true,
  xss: {
    enabled: true,
    payloads: [
      '<script>alert(1)</script>',
      '"><script>alert(1)</script>',
      "'-alert(1)-'",
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '{{constructor.constructor("alert(1)")()}}',
      '${alert(1)}',
    ],
    checkDomBased: true,
  },
  csrf: {
    enabled: true,
    checkSameSite: true,
  },
  injection: {
    enabled: true,
    types: ['sql', 'nosql', 'command'],
  },
  sensitiveData: {
    enabled: true,
    patterns: [
      // API Keys
      'api[_-]?key[\\s]*[:=][\\s]*["\']?[a-zA-Z0-9_-]{20,}',
      'apikey[\\s]*[:=][\\s]*["\']?[a-zA-Z0-9_-]{20,}',
      // AWS
      'AKIA[0-9A-Z]{16}',
      'aws[_-]?secret[_-]?access[_-]?key',
      // Private keys
      '-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----',
      // Tokens
      'token[\\s]*[:=][\\s]*["\']?[a-zA-Z0-9_-]{20,}',
      'bearer[\\s]+[a-zA-Z0-9_-]+',
      // Passwords
      'password[\\s]*[:=][\\s]*["\'][^"\']+["\']',
      // JWT
      'eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*',
      // GitHub
      'gh[pousr]_[A-Za-z0-9_]{36,}',
      // Slack
      'xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*',
    ],
    scanFiles: true,
  },
  headers: {
    enabled: true,
    required: [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
    ],
  },
  dependencies: {
    enabled: true,
    auditLevel: 'moderate',
  },
  cookies: {
    enabled: true,
  },
  ignorePaths: ['node_modules', 'dist', '.git', 'coverage'],
}

/**
 * SQL 注入 payload
 */
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "'; DROP TABLE users; --",
  "1' AND '1'='1",
  "1 UNION SELECT * FROM users",
  "admin'--",
  "' OR 1=1#",
  "') OR ('1'='1",
]

/**
 * NoSQL 注入 payload
 */
const NOSQL_INJECTION_PAYLOADS = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$where": "sleep(1000)"}',
  '{"$regex": ".*"}',
  "'; return true; var dummy='",
]

/**
 * 命令注入 payload
 * @internal Reserved for future command injection detection
 */
export const COMMAND_INJECTION_PAYLOADS = [
  '; ls -la',
  '| cat /etc/passwd',
  '`whoami`',
  '$(whoami)',
  '& dir',
  '|| dir',
]

/**
 * 安全测试器
 */
export class SecurityTester
  implements BaseTester<SecurityTestConfig, SecurityTestResult>
{
  readonly config: Required<SecurityTestConfig>
  private projectRoot: string
  private interceptedRequests: Request[] = []
  private interceptedResponses: Response[] = []

  constructor(config: SecurityTestConfig = {}, projectRoot: string = process.cwd()) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config }
    this.projectRoot = projectRoot
  }

  /**
   * 运行安全测试
   */
  async run(page?: Page): Promise<SecurityTestResult> {
    const results: SecurityTestResult = {
      xssVulnerabilities: [],
      csrfIssues: [],
      injectionRisks: [],
      sensitiveDataLeaks: [],
      headerIssues: [],
      dependencyVulnerabilities: [],
      cookieIssues: [],
      totalIssues: 0,
      score: 100,
    }

    // 设置请求拦截
    if (page) {
      await this.setupInterception(page)
    }

    // 并行执行各项安全检测
    const tasks: Promise<void>[] = []

    if (this.config.xss.enabled && page) {
      tasks.push(this.checkXSS(page, results))
    }

    if (this.config.csrf.enabled && page) {
      tasks.push(this.checkCSRF(page, results))
    }

    if (this.config.injection.enabled && page) {
      tasks.push(this.checkInjection(page, results))
    }

    if (this.config.sensitiveData.enabled) {
      tasks.push(this.checkSensitiveData(results))
    }

    if (this.config.headers.enabled && page) {
      tasks.push(this.checkSecurityHeaders(page, results))
    }

    if (this.config.dependencies.enabled) {
      tasks.push(this.checkDependencyVulnerabilities(results))
    }

    if (this.config.cookies.enabled && page) {
      tasks.push(this.checkCookieSecurity(page, results))
    }

    await Promise.all(tasks)

    // 计算总问题数和评分
    results.totalIssues =
      results.xssVulnerabilities.length +
      results.csrfIssues.length +
      results.injectionRisks.length +
      results.sensitiveDataLeaks.length +
      results.headerIssues.length +
      results.dependencyVulnerabilities.length +
      results.cookieIssues.length

    results.score = this.calculateScore(results)

    return results
  }

  /**
   * 设置请求拦截
   */
  private async setupInterception(page: Page): Promise<void> {
    page.on('request', (request) => {
      this.interceptedRequests.push(request)
    })

    page.on('response', (response) => {
      this.interceptedResponses.push(response)
    })
  }

  /**
   * XSS 检测
   */
  private async checkXSS(page: Page, results: SecurityTestResult): Promise<void> {
    const payloads = this.config.xss.payloads || DEFAULT_SECURITY_CONFIG.xss.payloads

    // 获取所有输入元素
    const inputs = await page.$$('input, textarea, [contenteditable="true"]')

    for (const input of inputs) {
      const inputType = await input.getAttribute('type')
      const inputName = await input.getAttribute('name')
      const inputId = await input.getAttribute('id')
      const identifier = inputName || inputId || inputType || 'unknown'

      // 跳过某些输入类型
      if (['file', 'hidden', 'submit', 'button', 'image'].includes(inputType || '')) {
        continue
      }

      for (const payload of payloads ?? []) {
        try {
          // 清空并输入 payload
          await input.fill('')
          await input.fill(payload)

          // 检查页面是否有 XSS 执行的迹象
          const hasAlert = await page.evaluate(() => {
            return (window as { __xssTriggered?: boolean }).__xssTriggered === true
          })

          // 检查 DOM 中是否直接包含未转义的 payload
          const pageContent = await page.content()
          const isReflected = pageContent.includes(payload)

          if (hasAlert || isReflected) {
            results.xssVulnerabilities.push({
              type: 'reflected',
              location: page.url(),
              inputPoint: identifier,
              payload,
              severity: 'error',
              description: `检测到潜在的 XSS 漏洞：输入点 "${identifier}" 反射了恶意 payload`,
              remediation:
                '对用户输入进行适当的转义和过滤，使用 Content-Security-Policy 头',
            })
          }
        } catch {
          // 忽略填充错误
        }
      }
    }

    // 检测 DOM-based XSS
    if (this.config.xss.checkDomBased) {
      await this.checkDomBasedXSS(page, results)
    }
  }

  /**
   * DOM-based XSS 检测
   */
  private async checkDomBasedXSS(
    page: Page,
    results: SecurityTestResult
  ): Promise<void> {
    const dangerousSinks = await page.evaluate(() => {
      const sinks: Array<{
        type: string
        location: string
        code: string
      }> = []

      // 检查危险的 innerHTML 使用
      const scripts = document.getElementsByTagName('script')
      for (const script of scripts) {
        const content = script.textContent || ''
        if (
          content.includes('innerHTML') ||
          content.includes('outerHTML') ||
          content.includes('document.write') ||
          content.includes('eval(')
        ) {
          const match = content.match(
            /(innerHTML|outerHTML|document\.write|eval)\s*[=(]/
          )
          if (match) {
            sinks.push({
              type: match[1],
              location: script.src || 'inline',
              code: content.slice(0, 200),
            })
          }
        }
      }

      return sinks
    })

    for (const sink of dangerousSinks) {
      // 检查是否使用了来自 URL 的数据
      const usesUrlData = await page.evaluate((code) => {
        return (
          code.includes('location.hash') ||
          code.includes('location.search') ||
          code.includes('location.href') ||
          code.includes('document.URL') ||
          code.includes('document.referrer')
        )
      }, sink.code)

      if (usesUrlData) {
        results.xssVulnerabilities.push({
          type: 'dom-based',
          location: sink.location,
          inputPoint: 'URL parameter',
          payload: 'N/A',
          severity: 'warning',
          description: `检测到潜在的 DOM-based XSS：使用了危险的 sink "${sink.type}" 并从 URL 读取数据`,
          remediation: `避免使用 ${sink.type}，改用安全的 DOM API 如 textContent`,
        })
      }
    }
  }

  /**
   * CSRF 检测
   */
  private async checkCSRF(page: Page, results: SecurityTestResult): Promise<void> {
    // 检查表单是否有 CSRF token
    const forms = await page.$$('form')

    for (const form of forms) {
      const method = await form.getAttribute('method')
      const action = await form.getAttribute('action')

      // 只检查会修改数据的方法
      if (method?.toLowerCase() === 'post') {
        // 检查是否有 CSRF token
        const hasCSRFToken = await form.evaluate((el) => {
          const inputs = el.querySelectorAll('input[type="hidden"]')
          for (const input of inputs) {
            const name = input.getAttribute('name')?.toLowerCase() || ''
            if (
              name.includes('csrf') ||
              name.includes('token') ||
              name.includes('_token')
            ) {
              return true
            }
          }
          return false
        })

        if (!hasCSRFToken) {
          results.csrfIssues.push({
            endpoint: action || page.url(),
            method: 'POST',
            type: 'missing-token',
            severity: 'error',
            description: '表单缺少 CSRF token',
            remediation: '为所有状态变更的表单添加 CSRF token',
          })
        }
      }
    }

    // 检查 Cookie 的 SameSite 属性
    if (this.config.csrf.checkSameSite) {
      const cookies = await page.context().cookies()
      for (const cookie of cookies) {
        if (!cookie.sameSite || cookie.sameSite === 'None') {
          // 检查是否是会话相关的 cookie
          const isSessionCookie =
            cookie.name.toLowerCase().includes('session') ||
            cookie.name.toLowerCase().includes('auth') ||
            cookie.name.toLowerCase().includes('token')

          if (isSessionCookie) {
            results.csrfIssues.push({
              endpoint: page.url(),
              method: 'N/A',
              type: 'same-site-missing',
              severity: 'warning',
              description: `Cookie "${cookie.name}" 缺少 SameSite 属性或设置为 None`,
              remediation: '为敏感 Cookie 设置 SameSite=Strict 或 SameSite=Lax',
            })
          }
        }
      }
    }
  }

  /**
   * 注入检测
   */
  private async checkInjection(
    page: Page,
    results: SecurityTestResult
  ): Promise<void> {
    const types = this.config.injection.types || ['sql', 'nosql', 'command']

    // 获取所有输入元素
    const inputs = await page.$$('input[type="text"], input[type="search"], textarea')

    for (const input of inputs) {
      const inputName =
        (await input.getAttribute('name')) || (await input.getAttribute('id')) || 'unknown'

      // SQL 注入检测
      if (types.includes('sql')) {
        for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 3)) {
          // 只测试前几个
          try {
            await input.fill(payload)

            // 检查是否触发了数据库错误
            const pageContent = await page.content()
            const hasSQLError =
              pageContent.includes('SQL syntax') ||
              pageContent.includes('mysql_') ||
              pageContent.includes('ORA-') ||
              pageContent.includes('PostgreSQL') ||
              pageContent.includes('sqlite')

            if (hasSQLError) {
              results.injectionRisks.push({
                type: 'sql',
                location: page.url(),
                parameter: inputName,
                severity: 'error',
                description: `检测到潜在的 SQL 注入漏洞：输入 "${inputName}" 触发了数据库错误`,
                remediation: '使用参数化查询或 ORM，避免直接拼接 SQL',
              })
            }
          } catch {
            // 忽略错误
          }
        }
      }

      // NoSQL 注入检测
      if (types.includes('nosql')) {
        for (const payload of NOSQL_INJECTION_PAYLOADS.slice(0, 2)) {
          try {
            await input.fill(payload)

            const pageContent = await page.content()
            const hasNoSQLError =
              pageContent.includes('MongoError') ||
              pageContent.includes('$where') ||
              pageContent.includes('MongoDB')

            if (hasNoSQLError) {
              results.injectionRisks.push({
                type: 'nosql',
                location: page.url(),
                parameter: inputName,
                severity: 'error',
                description: `检测到潜在的 NoSQL 注入漏洞：输入 "${inputName}"`,
                remediation: '使用安全的查询构建器，验证和过滤用户输入',
              })
            }
          } catch {
            // 忽略错误
          }
        }
      }
    }
  }

  /**
   * 敏感数据泄露检测
   */
  private async checkSensitiveData(results: SecurityTestResult): Promise<void> {
    const patterns =
      this.config.sensitiveData.patterns || DEFAULT_SECURITY_CONFIG.sensitiveData.patterns

    if (!this.config.sensitiveData.scanFiles) {
      return
    }

    // 获取要扫描的文件
    const ignorePatterns = this.config.ignorePaths.map((p) => `**/${p}/**`)
    const files = await fg(['**/*.{js,ts,jsx,tsx,json,env,yml,yaml,config}'], {
      cwd: this.projectRoot,
      ignore: ignorePatterns,
      absolute: true,
    })

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')

        for (const pattern of patterns ?? []) {
          const regex = new RegExp(pattern, 'gi')
          let match

          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum]
            while ((match = regex.exec(line)) !== null) {
              // 排除明显的示例或占位符
              if (
                match[0].includes('example') ||
                match[0].includes('placeholder') ||
                match[0].includes('your-') ||
                match[0].includes('xxx')
              ) {
                continue
              }

              const leakType = this.detectSensitiveDataType(match[0])
              results.sensitiveDataLeaks.push({
                type: leakType,
                location: `${filePath}:${lineNum + 1}`,
                pattern: pattern.slice(0, 50),
                filePath: path.relative(this.projectRoot, filePath),
                lineNumber: lineNum + 1,
                severity: this.getSensitiveDataSeverity(leakType),
                description: `检测到可能的 ${leakType} 泄露`,
                remediation: '将敏感数据移至环境变量，使用 .gitignore 排除敏感文件',
              })
            }
          }
        }
      } catch {
        // 忽略读取错误
      }
    }
  }

  /**
   * 检测敏感数据类型
   */
  private detectSensitiveDataType(
    match: string
  ): SensitiveDataLeak['type'] {
    const lowerMatch = match.toLowerCase()
    if (lowerMatch.includes('password')) return 'password'
    if (lowerMatch.includes('api') && lowerMatch.includes('key')) return 'api-key'
    if (
      lowerMatch.includes('token') ||
      lowerMatch.includes('bearer') ||
      match.startsWith('eyJ')
    )
      return 'token'
    if (lowerMatch.includes('secret')) return 'secret'
    if (lowerMatch.includes('credential')) return 'credentials'
    return 'secret'
  }

  /**
   * 获取敏感数据严重程度
   */
  private getSensitiveDataSeverity(type: SensitiveDataLeak['type']): Severity {
    switch (type) {
      case 'password':
      case 'credentials':
      case 'secret':
        return 'error'
      case 'api-key':
      case 'token':
        return 'warning'
      default:
        return 'info'
    }
  }

  /**
   * 安全头检测
   */
  private async checkSecurityHeaders(
    page: Page,
    results: SecurityTestResult
  ): Promise<void> {
    // 获取页面响应头
    const response = await page.goto(page.url())
    if (!response) return

    const headers = response.headers()
    const requiredHeaders =
      this.config.headers.required || DEFAULT_SECURITY_CONFIG.headers.required

    for (const headerName of requiredHeaders ?? []) {
      const headerValue = headers[headerName.toLowerCase()]

      if (!headerValue) {
        results.headerIssues.push({
          header: headerName,
          type: 'missing',
          recommendedValue: this.getRecommendedHeaderValue(headerName),
          severity: this.getHeaderSeverity(headerName),
          description: `缺少安全头: ${headerName}`,
        })
      } else {
        // 检查配置是否合理
        const issue = this.validateHeaderValue(headerName, headerValue)
        if (issue) {
          results.headerIssues.push(issue)
        }
      }
    }
  }

  /**
   * 获取推荐的 header 值
   */
  private getRecommendedHeaderValue(headerName: string): string {
    const recommendations: Record<string, string> = {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
    return recommendations[headerName] || 'See documentation'
  }

  /**
   * 获取 header 严重程度
   */
  private getHeaderSeverity(headerName: string): Severity {
    const criticalHeaders = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
    ]
    return criticalHeaders.includes(headerName) ? 'error' : 'warning'
  }

  /**
   * 验证 header 值
   */
  private validateHeaderValue(
    headerName: string,
    value: string
  ): SecurityHeaderIssue | null {
    const normalizedName = headerName.toLowerCase()

    // CSP 检查
    if (normalizedName === 'content-security-policy') {
      if (value.includes("'unsafe-eval'")) {
        return {
          header: headerName,
          type: 'weak',
          currentValue: value,
          recommendedValue: "移除 'unsafe-eval'",
          severity: 'warning',
          description: "CSP 包含 'unsafe-eval'，这会降低安全性",
        }
      }
      if (value.includes("'unsafe-inline'") && !value.includes('nonce-')) {
        return {
          header: headerName,
          type: 'weak',
          currentValue: value,
          recommendedValue: '使用 nonce 或 hash 替代 unsafe-inline',
          severity: 'warning',
          description: "CSP 包含 'unsafe-inline' 且没有使用 nonce",
        }
      }
    }

    // HSTS 检查
    if (normalizedName === 'strict-transport-security') {
      const maxAgeMatch = value.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1])
        if (maxAge < 31536000) {
          return {
            header: headerName,
            type: 'weak',
            currentValue: value,
            recommendedValue: 'max-age=31536000 (至少一年)',
            severity: 'warning',
            description: 'HSTS max-age 设置过短',
          }
        }
      }
    }

    // X-Frame-Options 检查
    if (normalizedName === 'x-frame-options') {
      if (!['DENY', 'SAMEORIGIN'].includes(value.toUpperCase())) {
        return {
          header: headerName,
          type: 'misconfigured',
          currentValue: value,
          recommendedValue: 'DENY 或 SAMEORIGIN',
          severity: 'warning',
          description: 'X-Frame-Options 值配置不正确',
        }
      }
    }

    return null
  }

  /**
   * 依赖漏洞检测
   */
  private async checkDependencyVulnerabilities(
    results: SecurityTestResult
  ): Promise<void> {
    try {
      // 检查 package.json 是否存在
      const packageJsonPath = path.join(this.projectRoot, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        return
      }

      // 运行 npm audit
      const { stdout } = await execAsync('npm audit --json', {
        cwd: this.projectRoot,
      }).catch((error) => ({
        stdout: error.stdout || '{}',
        stderr: error.stderr,
      }))

      try {
        const auditResult = JSON.parse(stdout)

        if (auditResult.vulnerabilities) {
          for (const [packageName, info] of Object.entries(
            auditResult.vulnerabilities as Record<string, {
              severity: string
              via: Array<{
                title?: string
                url?: string
                range?: string
                cwe?: string[]
              } | string>
              fixAvailable?: { name: string; version: string } | boolean
            }>
          )) {
            const vulnerability = info as {
              severity: string
              via: Array<{
                title?: string
                url?: string
                range?: string
                cwe?: string[]
              } | string>
              fixAvailable?: { name: string; version: string } | boolean
            }

            // 过滤低于配置级别的漏洞
            if (!this.shouldReportVulnerability(vulnerability.severity)) {
              continue
            }

            const viaInfo = vulnerability.via[0]
            const isDirectVia = typeof viaInfo !== 'string'

            results.dependencyVulnerabilities.push({
              packageName,
              currentVersion: 'unknown',
              vulnerableVersions: isDirectVia ? viaInfo.range || 'unknown' : 'unknown',
              patchedVersion:
                typeof vulnerability.fixAvailable === 'object'
                  ? vulnerability.fixAvailable.version
                  : undefined,
              severity: this.mapNpmSeverity(vulnerability.severity),
              title: isDirectVia ? viaInfo.title || packageName : packageName,
              description: `Package ${packageName} has a ${vulnerability.severity} severity vulnerability`,
              references: isDirectVia && viaInfo.url ? [viaInfo.url] : [],
            })
          }
        }
      } catch {
        // JSON 解析失败
      }
    } catch {
      // npm audit 执行失败
    }
  }

  /**
   * 判断是否应该报告漏洞
   */
  private shouldReportVulnerability(severity: string): boolean {
    const levels = ['low', 'moderate', 'high', 'critical']
    const configLevel = this.config.dependencies.auditLevel || 'moderate'
    const configIndex = levels.indexOf(configLevel)
    const vulnIndex = levels.indexOf(severity.toLowerCase())
    return vulnIndex >= configIndex
  }

  /**
   * 映射 npm 严重程度
   */
  private mapNpmSeverity(npmSeverity: string): Severity {
    switch (npmSeverity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error'
      case 'moderate':
        return 'warning'
      default:
        return 'info'
    }
  }

  /**
   * Cookie 安全检测
   */
  private async checkCookieSecurity(
    page: Page,
    results: SecurityTestResult
  ): Promise<void> {
    const cookies = await page.context().cookies()

    for (const cookie of cookies) {
      // 检查 HttpOnly
      if (!cookie.httpOnly) {
        const isSessionCookie =
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('auth') ||
          cookie.name.toLowerCase().includes('token')

        if (isSessionCookie) {
          results.cookieIssues.push({
            cookieName: cookie.name,
            type: 'no-httponly',
            severity: 'error',
            description: `敏感 Cookie "${cookie.name}" 未设置 HttpOnly 标志`,
            remediation: '为敏感 Cookie 设置 HttpOnly 标志以防止 XSS 攻击窃取',
          })
        }
      }

      // 检查 Secure
      if (!cookie.secure && page.url().startsWith('https://')) {
        results.cookieIssues.push({
          cookieName: cookie.name,
          type: 'no-secure',
          severity: 'warning',
          description: `Cookie "${cookie.name}" 未设置 Secure 标志`,
          remediation: '为 Cookie 设置 Secure 标志以确保只通过 HTTPS 传输',
        })
      }

      // 检查 SameSite
      if (!cookie.sameSite || cookie.sameSite === 'None') {
        results.cookieIssues.push({
          cookieName: cookie.name,
          type: 'no-samesite',
          severity: 'warning',
          description: `Cookie "${cookie.name}" 的 SameSite 属性未设置或为 None`,
          remediation: '设置 SameSite=Strict 或 SameSite=Lax 以防止 CSRF 攻击',
        })
      }

      // 检查敏感数据
      if (cookie.value.length > 100) {
        // 检查是否包含看起来像敏感数据的内容
        const sensitivePatterns = [/password/i, /secret/i, /apikey/i]
        for (const pattern of sensitivePatterns) {
          if (pattern.test(cookie.value)) {
            results.cookieIssues.push({
              cookieName: cookie.name,
              type: 'sensitive-data',
              severity: 'error',
              description: `Cookie "${cookie.name}" 可能包含敏感数据`,
              remediation: '避免在 Cookie 中存储敏感数据，使用服务端会话',
            })
            break
          }
        }
      }
    }
  }

  /**
   * 计算评分
   */
  private calculateScore(results: SecurityTestResult): number {
    let score = 100

    // 每个问题根据严重程度扣分
    for (const vuln of results.xssVulnerabilities) {
      score -= vuln.severity === 'error' ? 15 : vuln.severity === 'warning' ? 8 : 3
    }

    for (const issue of results.csrfIssues) {
      score -= issue.severity === 'error' ? 12 : issue.severity === 'warning' ? 6 : 2
    }

    for (const risk of results.injectionRisks) {
      score -= risk.severity === 'error' ? 15 : risk.severity === 'warning' ? 8 : 3
    }

    for (const leak of results.sensitiveDataLeaks) {
      score -= leak.severity === 'error' ? 10 : leak.severity === 'warning' ? 5 : 2
    }

    for (const issue of results.headerIssues) {
      score -= issue.severity === 'error' ? 5 : issue.severity === 'warning' ? 3 : 1
    }

    for (const vuln of results.dependencyVulnerabilities) {
      score -= vuln.severity === 'error' ? 8 : vuln.severity === 'warning' ? 4 : 1
    }

    for (const issue of results.cookieIssues) {
      score -= issue.severity === 'error' ? 6 : issue.severity === 'warning' ? 3 : 1
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 获取分数
   */
  getScore(result: SecurityTestResult): number {
    return result.score
  }

  /**
   * 生成建议
   */
  generateSuggestions(result: SecurityTestResult): string[] {
    const suggestions: string[] = []

    if (result.xssVulnerabilities.length > 0) {
      suggestions.push(
        `修复 ${result.xssVulnerabilities.length} 个 XSS 漏洞：使用内容安全策略(CSP)和输出编码`
      )
    }

    if (result.csrfIssues.length > 0) {
      suggestions.push(
        `修复 ${result.csrfIssues.length} 个 CSRF 问题：为所有状态变更请求添加 CSRF token`
      )
    }

    if (result.injectionRisks.length > 0) {
      suggestions.push(
        `修复 ${result.injectionRisks.length} 个注入风险：使用参数化查询和输入验证`
      )
    }

    if (result.sensitiveDataLeaks.length > 0) {
      suggestions.push(
        `处理 ${result.sensitiveDataLeaks.length} 个敏感数据泄露：将敏感数据移至环境变量`
      )
    }

    if (result.headerIssues.length > 0) {
      suggestions.push(
        `配置 ${result.headerIssues.length} 个缺失或错误的安全头：添加 CSP、HSTS 等安全头`
      )
    }

    if (result.dependencyVulnerabilities.length > 0) {
      suggestions.push(
        `更新 ${result.dependencyVulnerabilities.length} 个有漏洞的依赖：运行 npm audit fix`
      )
    }

    if (result.cookieIssues.length > 0) {
      suggestions.push(
        `修复 ${result.cookieIssues.length} 个 Cookie 安全问题：设置 HttpOnly、Secure、SameSite`
      )
    }

    return suggestions
  }
}

/**
 * 创建安全测试器实例
 */
export function createSecurityTester(
  config?: SecurityTestConfig,
  projectRoot?: string
): SecurityTester {
  return new SecurityTester(config, projectRoot)
}

/**
 * 默认安全测试器实例
 */
export const securityTester = new SecurityTester()
