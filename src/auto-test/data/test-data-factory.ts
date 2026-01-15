/**
 * @ldesign/testing - Test Data Factory
 * 测试数据工厂 - 智能数据生成、边界值、数据组合
 */

/**
 * 数据类型
 */
export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'phone'
  | 'url'
  | 'uuid'
  | 'ip'
  | 'color'
  | 'name'
  | 'address'
  | 'company'
  | 'text'
  | 'json'
  | 'array'
  | 'object'

/**
 * 字段定义
 */
export interface FieldDefinition {
  type: DataType
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  items?: FieldDefinition
  properties?: Record<string, FieldDefinition>
  locale?: string
}

/**
 * 生成选项
 */
export interface GenerateOptions {
  count?: number
  locale?: string
  seed?: number
  nullProbability?: number
  includeEdgeCases?: boolean
}

/**
 * 数据工厂边界值类型
 */
export type DataEdgeCaseType = 'min' | 'max' | 'empty' | 'null' | 'special' | 'overflow' | 'underflow'

/**
 * 测试数据工厂
 */
export class TestDataFactory {
  private seed: number
  private locale: string

  constructor(options: { seed?: number; locale?: string } = {}) {
    this.seed = options.seed || Date.now()
    this.locale = options.locale || 'zh-CN'
  }

  /**
   * 生成单个数据
   */
  generate<T = any>(schema: Record<string, FieldDefinition>, options?: GenerateOptions): T {
    const result: Record<string, any> = {}

    for (const [key, field] of Object.entries(schema)) {
      if (!field.required && options?.nullProbability && this.random() < options.nullProbability) {
        result[key] = null
        continue
      }
      result[key] = this.generateField(field, options)
    }

    return result as T
  }

  /**
   * 批量生成数据
   */
  generateMany<T = any>(schema: Record<string, FieldDefinition>, count: number, options?: GenerateOptions): T[] {
    return Array.from({ length: count }, () => this.generate<T>(schema, options))
  }

  /**
   * 生成边界值测试数据
   */
  generateEdgeCases<T = any>(schema: Record<string, FieldDefinition>): Array<{ case: string; data: T }> {
    const cases: Array<{ case: string; data: T }> = []

    // 正常值
    cases.push({ case: 'normal', data: this.generate<T>(schema) })

    // 为每个字段生成边界值
    for (const [key, field] of Object.entries(schema)) {
      const edgeCases = this.getEdgeCases(field)

      for (const [caseName, value] of Object.entries(edgeCases)) {
        const data = this.generate<T>(schema)
        ;(data as any)[key] = value
        cases.push({ case: `${key}_${caseName}`, data })
      }
    }

    return cases
  }

  /**
   * 生成组合测试数据 (Pairwise)
   */
  generatePairwise<T = any>(schema: Record<string, FieldDefinition>): T[] {
    const fields = Object.entries(schema)
    const valuesByField: Record<string, any[]> = {}

    // 收集每个字段的可能值
    for (const [key, field] of fields) {
      valuesByField[key] = this.getTestValues(field)
    }

    // 生成配对组合
    const combinations = this.generatePairwiseCombinations(valuesByField)

    return combinations.map(combo => {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(combo)) {
        result[key] = value
      }
      return result as T
    })
  }

  /**
   * 生成字段值
   */
  private generateField(field: FieldDefinition, options?: GenerateOptions): any {
    if (field.enum && field.enum.length > 0) {
      return field.enum[this.randomInt(0, field.enum.length - 1)]
    }

    switch (field.type) {
      case 'string':
        return this.generateString(field)
      case 'number':
        return this.generateNumber(field)
      case 'boolean':
        return this.random() > 0.5
      case 'date':
        return this.generateDate(field)
      case 'email':
        return this.generateEmail()
      case 'phone':
        return this.generatePhone(field.locale || this.locale)
      case 'url':
        return this.generateUrl()
      case 'uuid':
        return this.generateUuid()
      case 'ip':
        return this.generateIp()
      case 'color':
        return this.generateColor()
      case 'name':
        return this.generateName(field.locale || this.locale)
      case 'address':
        return this.generateAddress(field.locale || this.locale)
      case 'company':
        return this.generateCompany()
      case 'text':
        return this.generateText(field)
      case 'array':
        return this.generateArray(field, options)
      case 'object':
        return this.generateObject(field, options)
      case 'json':
        return this.generateJson()
      default:
        return null
    }
  }

  /**
   * 生成字符串
   */
  private generateString(field: FieldDefinition): string {
    const min = field.min || 1
    const max = field.max || 20
    const length = this.randomInt(min, max)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length }, () => chars[this.randomInt(0, chars.length - 1)]).join('')
  }

  /**
   * 生成数字
   */
  private generateNumber(field: FieldDefinition): number {
    const min = field.min ?? 0
    const max = field.max ?? 1000
    return this.randomInt(min, max)
  }

  /**
   * 生成日期
   */
  private generateDate(field: FieldDefinition): Date {
    const min = field.min || Date.now() - 365 * 24 * 60 * 60 * 1000
    const max = field.max || Date.now()
    return new Date(this.randomInt(min, max))
  }

  /**
   * 生成邮箱
   */
  private generateEmail(): string {
    const domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'example.com']
    const name = this.generateString({ type: 'string', min: 5, max: 10 }).toLowerCase()
    return `${name}@${domains[this.randomInt(0, domains.length - 1)]}`
  }

  /**
   * 生成电话号码
   */
  private generatePhone(locale: string): string {
    if (locale === 'zh-CN') {
      const prefixes = ['138', '139', '150', '151', '186', '187', '188']
      return prefixes[this.randomInt(0, prefixes.length - 1)] + this.randomDigits(8)
    }
    return '+1' + this.randomDigits(10)
  }

  /**
   * 生成URL
   */
  private generateUrl(): string {
    const protocols = ['http', 'https']
    const domains = ['example.com', 'test.org', 'demo.net']
    const paths = ['', '/page', '/api/v1', '/users/123']
    return `${protocols[this.randomInt(0, 1)]}://${domains[this.randomInt(0, domains.length - 1)]}${paths[this.randomInt(0, paths.length - 1)]}`
  }

  /**
   * 生成UUID
   */
  private generateUuid(): string {
    const hex = '0123456789abcdef'
    const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return pattern.replace(/[xy]/g, c => {
      const r = this.randomInt(0, 15)
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return hex[v]
    })
  }

  /**
   * 生成IP地址
   */
  private generateIp(): string {
    return Array.from({ length: 4 }, () => this.randomInt(0, 255)).join('.')
  }

  /**
   * 生成颜色
   */
  private generateColor(): string {
    const hex = '0123456789abcdef'
    return '#' + Array.from({ length: 6 }, () => hex[this.randomInt(0, 15)]).join('')
  }

  /**
   * 生成姓名
   */
  private generateName(locale: string): string {
    if (locale === 'zh-CN') {
      const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴']
      const names = ['伟', '芳', '娜', '敏', '静', '强', '磊', '洋', '勇', '艳']
      return surnames[this.randomInt(0, surnames.length - 1)] + names[this.randomInt(0, names.length - 1)]
    }
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Tom', 'Emma']
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson']
    return `${firstNames[this.randomInt(0, firstNames.length - 1)]} ${lastNames[this.randomInt(0, lastNames.length - 1)]}`
  }

  /**
   * 生成地址
   */
  private generateAddress(locale: string): string {
    if (locale === 'zh-CN') {
      const cities = ['北京市', '上海市', '广州市', '深圳市', '杭州市']
      const districts = ['朝阳区', '海淀区', '浦东新区', '天河区', '南山区']
      const streets = ['中关村大街', '南京路', '解放路', '人民路', '建设路']
      return `${cities[this.randomInt(0, cities.length - 1)]}${districts[this.randomInt(0, districts.length - 1)]}${streets[this.randomInt(0, streets.length - 1)]}${this.randomInt(1, 999)}号`
    }
    return `${this.randomInt(1, 9999)} ${['Main', 'Oak', 'Elm', 'Park'][this.randomInt(0, 3)]} Street`
  }

  /**
   * 生成公司名
   */
  private generateCompany(): string {
    const prefixes = ['华为', '腾讯', '阿里', '百度', '字节']
    const suffixes = ['科技', '网络', '信息', '软件', '互联网']
    return `${prefixes[this.randomInt(0, prefixes.length - 1)]}${suffixes[this.randomInt(0, suffixes.length - 1)]}有限公司`
  }

  /**
   * 生成文本
   */
  private generateText(field: FieldDefinition): string {
    const length = field.max || 100
    const words = ['测试', '数据', '生成', '工厂', '自动化', '软件', '开发', '质量']
    const result: string[] = []
    let currentLength = 0

    while (currentLength < length) {
      const word = words[this.randomInt(0, words.length - 1)]
      result.push(word)
      currentLength += word.length
    }

    return result.join('')
  }

  /**
   * 生成数组
   */
  private generateArray(field: FieldDefinition, options?: GenerateOptions): any[] {
    const length = this.randomInt(field.min || 1, field.max || 5)
    if (!field.items) return []
    return Array.from({ length }, () => this.generateField(field.items!, options))
  }

  /**
   * 生成对象
   */
  private generateObject(field: FieldDefinition, options?: GenerateOptions): Record<string, any> {
    if (!field.properties) return {}
    return this.generate(field.properties, options)
  }

  /**
   * 生成JSON
   */
  private generateJson(): object {
    return {
      id: this.generateUuid(),
      name: this.generateName(this.locale),
      value: this.randomInt(1, 100),
      active: this.random() > 0.5,
    }
  }

  /**
   * 获取边界值
   */
  private getEdgeCases(field: FieldDefinition): Record<string, any> {
    const cases: Record<string, any> = {}

    switch (field.type) {
      case 'string':
        cases['empty'] = ''
        cases['min'] = 'a'.repeat(field.min || 1)
        cases['max'] = 'a'.repeat(field.max || 255)
        cases['special'] = '<script>alert(1)</script>'
        cases['unicode'] = '你好🎉émoji'
        cases['whitespace'] = '   '
        break

      case 'number':
        cases['zero'] = 0
        cases['negative'] = -1
        cases['min'] = field.min ?? Number.MIN_SAFE_INTEGER
        cases['max'] = field.max ?? Number.MAX_SAFE_INTEGER
        cases['decimal'] = 0.1 + 0.2 // 浮点精度测试
        break

      case 'date':
        cases['epoch'] = new Date(0)
        cases['future'] = new Date('2099-12-31')
        cases['invalid'] = new Date('invalid')
        break

      case 'email':
        cases['invalid'] = 'not-an-email'
        cases['special'] = 'test+tag@example.com'
        break

      case 'array':
        cases['empty'] = []
        cases['single'] = [this.generateField(field.items!)]
        cases['large'] = Array.from({ length: 100 }, () => this.generateField(field.items!))
        break
    }

    if (!field.required) {
      cases['null'] = null
      cases['undefined'] = undefined
    }

    return cases
  }

  /**
   * 获取测试值
   */
  private getTestValues(field: FieldDefinition): any[] {
    if (field.enum) return field.enum

    const values: any[] = []

    switch (field.type) {
      case 'boolean':
        return [true, false]

      case 'string':
        values.push('')
        values.push(this.generateString(field))
        values.push('a'.repeat(field.max || 255))
        break

      case 'number':
        values.push(field.min ?? 0)
        values.push(field.max ?? 100)
        values.push(this.generateNumber(field))
        break

      default:
        values.push(this.generateField(field))
        values.push(null)
    }

    return values
  }

  /**
   * 生成配对组合
   */
  private generatePairwiseCombinations(valuesByField: Record<string, any[]>): Record<string, any>[] {
    const fields = Object.keys(valuesByField)
    if (fields.length === 0) return []
    if (fields.length === 1) {
      return valuesByField[fields[0]].map(v => ({ [fields[0]]: v }))
    }

    // 简化的配对生成
    const combinations: Record<string, any>[] = []
    const maxCombinations = 50

    for (let i = 0; i < maxCombinations; i++) {
      const combo: Record<string, any> = {}
      for (const field of fields) {
        const values = valuesByField[field]
        combo[field] = values[i % values.length]
      }
      combinations.push(combo)
    }

    // 去重
    return combinations.filter(
      (combo, index, self) => index === self.findIndex(c => JSON.stringify(c) === JSON.stringify(combo))
    )
  }

  // 随机数辅助方法
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  private randomDigits(length: number): string {
    return Array.from({ length }, () => this.randomInt(0, 9)).join('')
  }
}

// 便捷方法
export function createTestDataFactory(options?: { seed?: number; locale?: string }): TestDataFactory {
  return new TestDataFactory(options)
}

export function generateTestData<T>(schema: Record<string, FieldDefinition>, options?: GenerateOptions): T {
  return new TestDataFactory().generate<T>(schema, options)
}

export function generateEdgeCases<T>(schema: Record<string, FieldDefinition>): Array<{ case: string; data: T }> {
  return new TestDataFactory().generateEdgeCases<T>(schema)
}
