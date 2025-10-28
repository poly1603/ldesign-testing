# Vue 组件测试示例

Vue 3 组件测试的完整示例。

## 基础组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '@/components/Button.vue'

describe('Button 组件', () => {
  it('应该渲染正确的文本', () => {
    const wrapper = mount(Button, {
      props: {
        label: '点击我'
      }
    })
    
    expect(wrapper.text()).toContain('点击我')
  })

  it('应该触发点击事件', async () => {
    const wrapper = mount(Button)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('应该支持不同的类型', () => {
    const wrapper = mount(Button, {
      props: {
        type: 'primary'
      }
    })
    
    expect(wrapper.classes()).toContain('btn-primary')
  })
})
```

## 组件快照

```typescript
import { ComponentSnapshot } from '@ldesign/testing'
import Button from '@/components/Button.vue'

describe('Button 快照', () => {
  it('应该匹配快照', async () => {
    const snapshot = await ComponentSnapshot.create(Button, {
      name: 'Button',
      props: {
        type: 'primary',
        label: '提交'
      }
    })
    
    expect(snapshot).toMatchSnapshot()
  })
})
```

## 使用组合式 API

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from '@/components/Counter.vue'

describe('Counter 组件', () => {
  it('应该初始化为 0', () => {
    const wrapper = mount(Counter)
    expect(wrapper.text()).toContain('0')
  })

  it('应该增加计数', async () => {
    const wrapper = mount(Counter)
    
    await wrapper.find('.increment').trigger('click')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.text()).toContain('1')
  })

  it('应该接受初始值', () => {
    const wrapper = mount(Counter, {
      props: {
        initialValue: 10
      }
    })
    
    expect(wrapper.text()).toContain('10')
  })
})
```

## 测试插槽

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '@/components/Card.vue'

describe('Card 插槽', () => {
  it('应该渲染默认插槽', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>卡片内容</p>'
      }
    })
    
    expect(wrapper.html()).toContain('卡片内容')
  })

  it('应该渲染具名插槽', () => {
    const wrapper = mount(Card, {
      slots: {
        header: '<h2>标题</h2>',
        footer: '<button>确定</button>'
      }
    })
    
    expect(wrapper.html()).toContain('标题')
    expect(wrapper.html()).toContain('确定')
  })
})
```

## 测试 Provide/Inject

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChildComponent from '@/components/ChildComponent.vue'

describe('Provide/Inject', () => {
  it('应该接收注入的值', () => {
    const wrapper = mount(ChildComponent, {
      global: {
        provide: {
          theme: 'dark'
        }
      }
    })
    
    expect(wrapper.vm.theme).toBe('dark')
  })
})
```

## 使用 Mock 数据

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockFactory } from '@ldesign/testing'
import UserList from '@/components/UserList.vue'

describe('UserList 组件', () => {
  it('应该渲染用户列表', () => {
    const users = mockFactory.user(5)
    
    const wrapper = mount(UserList, {
      props: {
        users
      }
    })
    
    expect(wrapper.findAll('.user-item')).toHaveLength(5)
  })
})
```

## 相关链接

- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [组件测试指南](/guide/component-testing)
- [Mock 工具](/guide/mocking)
