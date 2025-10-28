/**
 * Mock 数据工厂
 */
import { faker } from '@faker-js/faker'
import type { FakerConfig } from '../types/index.js'

export class MockFactory {
  private faker: typeof faker

  constructor(config?: FakerConfig) {
    this.faker = faker

    if (config?.locale) {
      this.faker.setDefaultRefDate(new Date())
    }

    if (config?.seed !== undefined) {
      this.faker.seed(config.seed)
    }
  }

  /**
   * 生成用户数据
   */
  user(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      name: this.faker.person.fullName(),
      email: this.faker.internet.email(),
      avatar: this.faker.image.avatar(),
      phone: this.faker.phone.number(),
      address: {
        street: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        zipCode: this.faker.location.zipCode(),
        country: this.faker.location.country(),
      },
      createdAt: this.faker.date.past(),
      updatedAt: this.faker.date.recent(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成产品数据
   */
  product(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      name: this.faker.commerce.productName(),
      description: this.faker.commerce.productDescription(),
      price: parseFloat(this.faker.commerce.price()),
      category: this.faker.commerce.department(),
      image: this.faker.image.url(),
      inStock: this.faker.datatype.boolean(),
      quantity: this.faker.number.int({ min: 0, max: 1000 }),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成文章数据
   */
  article(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      title: this.faker.lorem.sentence(),
      content: this.faker.lorem.paragraphs(3),
      author: this.faker.person.fullName(),
      tags: Array.from({ length: 3 }, () => this.faker.lorem.word()),
      views: this.faker.number.int({ min: 0, max: 10000 }),
      likes: this.faker.number.int({ min: 0, max: 1000 }),
      published: this.faker.datatype.boolean(),
      publishedAt: this.faker.date.past(),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成评论数据
   */
  comment(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      content: this.faker.lorem.paragraph(),
      author: this.faker.person.fullName(),
      authorAvatar: this.faker.image.avatar(),
      rating: this.faker.number.int({ min: 1, max: 5 }),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成订单数据
   */
  order(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      orderNumber: this.faker.string.alphanumeric(10).toUpperCase(),
      customer: this.faker.person.fullName(),
      items: Array.from({ length: this.faker.number.int({ min: 1, max: 5 }) }, () => ({
        productId: this.faker.string.uuid(),
        productName: this.faker.commerce.productName(),
        quantity: this.faker.number.int({ min: 1, max: 10 }),
        price: parseFloat(this.faker.commerce.price()),
      })),
      total: parseFloat(this.faker.commerce.price({ min: 100, max: 1000 })),
      status: this.faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成公司数据
   */
  company(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      name: this.faker.company.name(),
      catchPhrase: this.faker.company.catchPhrase(),
      description: this.faker.company.buzzPhrase(),
      industry: this.faker.commerce.department(),
      website: this.faker.internet.url(),
      email: this.faker.internet.email(),
      phone: this.faker.phone.number(),
      address: {
        street: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        zipCode: this.faker.location.zipCode(),
        country: this.faker.location.country(),
      },
      employees: this.faker.number.int({ min: 10, max: 10000 }),
      founded: this.faker.date.past({ years: 50 }),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成事件数据
   */
  event(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      title: this.faker.lorem.sentence(),
      description: this.faker.lorem.paragraph(),
      location: {
        name: this.faker.company.name(),
        address: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        coordinates: {
          lat: parseFloat(this.faker.location.latitude()),
          lng: parseFloat(this.faker.location.longitude()),
        },
      },
      startDate: this.faker.date.future(),
      endDate: this.faker.date.future(),
      organizer: this.faker.person.fullName(),
      attendees: this.faker.number.int({ min: 10, max: 1000 }),
      price: parseFloat(this.faker.commerce.price({ min: 0, max: 500 })),
      tags: Array.from({ length: 3 }, () => this.faker.lorem.word()),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成支付数据
   */
  payment(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      transactionId: this.faker.string.alphanumeric(16).toUpperCase(),
      amount: parseFloat(this.faker.finance.amount()),
      currency: this.faker.finance.currencyCode(),
      method: this.faker.helpers.arrayElement(['credit_card', 'debit_card', 'paypal', 'stripe', 'alipay', 'wechat']),
      status: this.faker.helpers.arrayElement(['pending', 'completed', 'failed', 'refunded']),
      cardInfo: {
        number: this.faker.finance.creditCardNumber(),
        cvv: this.faker.finance.creditCardCVV(),
        issuer: this.faker.finance.creditCardIssuer(),
      },
      payer: {
        name: this.faker.person.fullName(),
        email: this.faker.internet.email(),
      },
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成博客文章数据
   */
  blog(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      title: this.faker.lorem.sentence(),
      slug: this.faker.lorem.slug(),
      excerpt: this.faker.lorem.paragraph(),
      content: this.faker.lorem.paragraphs(5),
      author: {
        id: this.faker.string.uuid(),
        name: this.faker.person.fullName(),
        email: this.faker.internet.email(),
        avatar: this.faker.image.avatar(),
      },
      categories: Array.from({ length: 2 }, () => this.faker.lorem.word()),
      tags: Array.from({ length: 5 }, () => this.faker.lorem.word()),
      coverImage: this.faker.image.url(),
      views: this.faker.number.int({ min: 0, max: 100000 }),
      likes: this.faker.number.int({ min: 0, max: 5000 }),
      comments: this.faker.number.int({ min: 0, max: 500 }),
      published: this.faker.datatype.boolean(),
      publishedAt: this.faker.date.past(),
      updatedAt: this.faker.date.recent(),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成通知数据
   */
  notification(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      type: this.faker.helpers.arrayElement(['info', 'success', 'warning', 'error']),
      title: this.faker.lorem.sentence(),
      message: this.faker.lorem.paragraph(),
      read: this.faker.datatype.boolean(),
      link: this.faker.internet.url(),
      sender: {
        id: this.faker.string.uuid(),
        name: this.faker.person.fullName(),
        avatar: this.faker.image.avatar(),
      },
      createdAt: this.faker.date.recent(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成任务数据
   */
  task(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      title: this.faker.lorem.sentence(),
      description: this.faker.lorem.paragraph(),
      status: this.faker.helpers.arrayElement(['todo', 'in_progress', 'review', 'done']),
      priority: this.faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      assignee: {
        id: this.faker.string.uuid(),
        name: this.faker.person.fullName(),
        email: this.faker.internet.email(),
        avatar: this.faker.image.avatar(),
      },
      tags: Array.from({ length: 3 }, () => this.faker.lorem.word()),
      dueDate: this.faker.date.future(),
      completedAt: this.faker.datatype.boolean() ? this.faker.date.recent() : null,
      createdAt: this.faker.date.past(),
      updatedAt: this.faker.date.recent(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成课程数据
   */
  course(count = 1): any | any[] {
    const generate = () => ({
      id: this.faker.string.uuid(),
      title: this.faker.lorem.sentence(),
      description: this.faker.lorem.paragraph(),
      instructor: {
        id: this.faker.string.uuid(),
        name: this.faker.person.fullName(),
        avatar: this.faker.image.avatar(),
        bio: this.faker.lorem.paragraph(),
      },
      category: this.faker.commerce.department(),
      level: this.faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
      duration: this.faker.number.int({ min: 30, max: 300 }), // minutes
      price: parseFloat(this.faker.commerce.price({ min: 0, max: 500 })),
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
      students: this.faker.number.int({ min: 0, max: 10000 }),
      lessons: this.faker.number.int({ min: 5, max: 50 }),
      published: this.faker.datatype.boolean(),
      createdAt: this.faker.date.past(),
    })

    return count === 1 ? generate() : Array.from({ length: count }, generate)
  }

  /**
   * 生成自定义数据
   */
  custom<T>(schema: () => T, count = 1): T | T[] {
    return count === 1 ? schema() : Array.from({ length: count }, schema)
  }

  /**
   * 批量生成多种类型数据
   */
  batch<T extends Record<string, any>>(
    config: { [K in keyof T]: { type: string; count: number } }
  ): T {
    const result: any = {}

    for (const [key, { type, count }] of Object.entries(config)) {
      if (typeof (this as any)[type] === 'function') {
        result[key] = (this as any)[type](count)
      }
    }

    return result as T
  }

  /**
   * 生成关联数据 (例如用户+订单)
   */
  relational(config: {
    users?: number
    orders?: number
    products?: number
  }): {
    users: any[]
    orders: any[]
    products: any[]
  } {
    const users = config.users ? this.user(config.users) as any[] : []
    const products = config.products ? this.product(config.products) as any[] : []
    const orders = config.orders
      ? (Array.from({ length: config.orders }, () => {
          const order = this.order(1) as any
          if (users.length > 0) {
            const user = this.faker.helpers.arrayElement(users)
            order.userId = user.id
            order.customer = user.name
          }
          if (products.length > 0) {
            order.items = order.items.map((item: any) => {
              const product = this.faker.helpers.arrayElement(products)
              return {
                ...item,
                productId: product.id,
                productName: product.name,
                price: product.price,
              }
            })
          }
          return order
        }))
      : []

    return {
      users: Array.isArray(users) ? users : [users],
      orders,
      products: Array.isArray(products) ? products : [products],
    }
  }

  /**
   * 获取 Faker 实例
   */
  getFaker(): typeof faker {
    return this.faker
  }
}

// 默认导出实例
export const mockFactory = new MockFactory()

