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
   * 生成自定义数据
   */
  custom<T>(schema: () => T, count = 1): T | T[] {
    return count === 1 ? schema() : Array.from({ length: count }, schema)
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

