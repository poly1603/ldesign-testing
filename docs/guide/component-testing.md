# 组件测试

Vue 和 React 组件测试。

## Vue 组件

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from './MyComponent.vue'

it('渲染组件', () => {
  const wrapper = mount(MyComponent)
  expect(wrapper.text()).toContain('Hello')
})
```

## React 组件

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

it('渲染组件', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```
