# React 组件测试示例

React 组件测试的完整示例。

## 基础组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button 组件', () => {
  it('应该渲染正确的文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  it('应该触发点击事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击</Button>)
    
    fireEvent.click(screen.getByText('点击'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('应该支持禁用状态', () => {
    render(<Button disabled>禁用按钮</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## 使用 Hooks 测试

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useCounter from './useCounter'

describe('useCounter Hook', () => {
  it('应该初始化为 0', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('应该增加计数', () => {
    const { result } = renderHook(() => useCounter())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })

  it('应该接受初始值', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })
})
```

## 异步组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { mockFactory } from '@ldesign/testing'
import UserProfile from './UserProfile'

describe('UserProfile 组件', () => {
  it('应该加载用户数据', async () => {
    const mockUser = mockFactory.user(1)
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockUser)
      })
    )
    
    render(<UserProfile userId="123" />)
    
    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    })
  })

  it('应该显示加载状态', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    
    render(<UserProfile userId="123" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

## Context 测试

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from './ThemeContext'
import ThemedButton from './ThemedButton'

describe('ThemeContext', () => {
  it('应该使用 theme context', () => {
    render(
      <ThemeProvider value="dark">
        <ThemedButton />
      </ThemeProvider>
    )
    
    expect(screen.getByRole('button')).toHaveClass('btn-dark')
  })
})
```

## 使用 Mock 数据

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockFactory } from '@ldesign/testing'
import UserList from './UserList'

describe('UserList 组件', () => {
  it('应该渲染用户列表', () => {
    const users = mockFactory.user(5)
    
    render(<UserList users={users} />)
    
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })
})
```

## 快照测试

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Button from './Button'

describe('Button 快照', () => {
  it('应该匹配快照', () => {
    const { container } = render(<Button type="primary">提交</Button>)
    expect(container.firstChild).toMatchSnapshot()
  })
})
```

## 相关链接

- [React Testing Library 文档](https://testing-library.com/react)
- [组件测试指南](/guide/component-testing)
- [Mock 工具](/guide/mocking)
