/**
 * 测试生成器
 */
import fs from 'fs-extra'
import path from 'path'
import { logger } from '../utils/logger.js'

export interface GeneratorOptions {
  /** 目标文件路径 */
  targetFile: string
  /** 测试类型 */
  type: 'unit' | 'e2e' | 'component' | 'api' | 'integration'
  /** 输出目录 */
  outputDir?: string
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
}

export class TestGenerator {
  /**
   * 生成测试文件
   */
  static async generate(options: GeneratorOptions): Promise<string> {
    const { targetFile, type, outputDir, overwrite = false } = options

    // 生成测试文件路径
    const testFileName = this.generateTestFileName(targetFile, type)
    const testFilePath = outputDir
      ? path.resolve(outputDir, testFileName)
      : path.resolve(path.dirname(targetFile), '__tests__', testFileName)

    // 检查文件是否已存在
    if (!overwrite && (await fs.pathExists(testFilePath))) {
      logger.warn(`测试文件已存在: ${testFilePath}`)
      return testFilePath
    }

    // 生成测试内容
    const content = await this.generateTestContent(targetFile, type)

    // 确保目录存在
    await fs.ensureDir(path.dirname(testFilePath))

    // 写入文件
    await fs.writeFile(testFilePath, content, 'utf-8')

    logger.success(`测试文件已生成: ${testFilePath}`)
    return testFilePath
  }

  /**
   * 生成测试文件名
   */
  private static generateTestFileName(
    targetFile: string,
    type: string
  ): string {
    const ext = path.extname(targetFile)
    const baseName = path.basename(targetFile, ext)

    switch (type) {
      case 'unit':
        return `${baseName}.test${ext}`
      case 'e2e':
        return `${baseName}.e2e${ext}`
      case 'component':
        return `${baseName}.spec${ext}`
      case 'api':
        return `${baseName}.api.test${ext}`
      case 'integration':
        return `${baseName}.integration.test${ext}`
      default:
        return `${baseName}.test${ext}`
    }
  }

  /**
   * 生成测试内容
   */
  private static async generateTestContent(
    targetFile: string,
    type: string
  ): Promise<string> {
    const fileName = path.basename(targetFile)
    const baseName = path.basename(targetFile, path.extname(targetFile))

    switch (type) {
      case 'unit':
        return this.generateUnitTest(fileName, baseName)
      case 'e2e':
        return this.generateE2ETest(fileName, baseName)
      case 'component':
        return this.generateComponentTest(fileName, baseName)
      case 'api':
        return this.generateAPITest(fileName, baseName)
      case 'integration':
        return this.generateIntegrationTest(fileName, baseName)
      default:
        return this.generateUnitTest(fileName, baseName)
    }
  }

  /**
   * 生成单元测试
   */
  private static generateUnitTest(fileName: string, baseName: string): string {
    return `import { describe, it, expect, vi } from 'vitest'
import { ${baseName} } from '../${fileName.replace(/\.(ts|js)$/, '')}'

describe('${baseName}', () => {
  it('应该正确初始化', () => {
    // TODO: 添加测试逻辑
    expect(true).toBe(true)
  })

  it('应该处理正常情况', () => {
    // TODO: 添加测试逻辑
    expect(true).toBe(true)
  })

  it('应该处理边界情况', () => {
    // TODO: 添加测试逻辑
    expect(true).toBe(true)
  })

  it('应该处理错误情况', () => {
    // TODO: 添加测试逻辑
    expect(() => {
      // 触发错误的代码
    }).toThrow()
  })
})
`
  }

  /**
   * 生成 E2E 测试
   */
  private static generateE2ETest(fileName: string, baseName: string): string {
    return `import { test, expect } from '@playwright/test'

test.describe('${baseName} E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该正确渲染页面', async ({ page }) => {
    // TODO: 添加测试逻辑
    await expect(page).toHaveTitle(/.*/)
  })

  test('应该正确处理用户交互', async ({ page }) => {
    // TODO: 添加测试逻辑
    await page.click('button')
    await expect(page.locator('div')).toBeVisible()
  })

  test('应该正确处理表单提交', async ({ page }) => {
    // TODO: 添加测试逻辑
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    await expect(page.locator('.success-message')).toBeVisible()
  })
})
`
  }

  /**
   * 生成组件测试
   */
  private static generateComponentTest(
    fileName: string,
    baseName: string
  ): string {
    return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ${baseName} from '../${fileName.replace(/\.(vue|tsx|jsx)$/, '')}'

describe('${baseName} 组件', () => {
  it('应该正确挂载', () => {
    const wrapper = mount(${baseName})
    expect(wrapper.exists()).toBe(true)
  })

  it('应该正确渲染内容', () => {
    const wrapper = mount(${baseName}, {
      props: {
        // TODO: 添加 props
      }
    })
    expect(wrapper.text()).toContain('')
  })

  it('应该正确处理事件', async () => {
    const wrapper = mount(${baseName})
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('应该正确更新状态', async () => {
    const wrapper = mount(${baseName})
    // TODO: 添加状态更新测试
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('')
  })
})
`
  }

  /**
   * 生成 API 测试
   */
  private static generateAPITest(fileName: string, baseName: string): string {
    return `import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'

describe('${baseName} API', () => {
  let server: any

  beforeAll(async () => {
    // TODO: 启动测试服务器
  })

  afterAll(async () => {
    // TODO: 关闭测试服务器
    if (server) {
      await server.close()
    }
  })

  it('GET / 应该返回 200', async () => {
    const response = await request(server).get('/')
    expect(response.status).toBe(200)
  })

  it('POST / 应该创建资源', async () => {
    const response = await request(server)
      .post('/')
      .send({ /* TODO: 添加数据 */ })
    expect(response.status).toBe(201)
  })

  it('GET /:id 应该返回资源', async () => {
    const response = await request(server).get('/1')
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('id')
  })

  it('PUT /:id 应该更新资源', async () => {
    const response = await request(server)
      .put('/1')
      .send({ /* TODO: 添加数据 */ })
    expect(response.status).toBe(200)
  })

  it('DELETE /:id 应该删除资源', async () => {
    const response = await request(server).delete('/1')
    expect(response.status).toBe(204)
  })
})
`
  }

  /**
   * 生成集成测试
   */
  private static generateIntegrationTest(
    fileName: string,
    baseName: string
  ): string {
    return `import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('${baseName} 集成测试', () => {
  beforeAll(async () => {
    // TODO: 设置测试环境
  })

  afterAll(async () => {
    // TODO: 清理测试环境
  })

  it('应该完成完整的业务流程', async () => {
    // TODO: 添加集成测试逻辑
    expect(true).toBe(true)
  })

  it('应该正确处理多个模块的交互', async () => {
    // TODO: 添加模块交互测试
    expect(true).toBe(true)
  })

  it('应该正确处理数据持久化', async () => {
    // TODO: 添加数据持久化测试
    expect(true).toBe(true)
  })
})
`
  }

  /**
   * 批量生成测试文件
   */
  static async generateBatch(
    files: string[],
    type: string,
    outputDir?: string
  ): Promise<string[]> {
    const results: string[] = []

    for (const file of files) {
      try {
        const testFile = await this.generate({
          targetFile: file,
          type: type as any,
          outputDir,
        })
        results.push(testFile)
      } catch (error) {
        logger.error(`生成测试文件失败: ${file}`, error)
      }
    }

    return results
  }
}
