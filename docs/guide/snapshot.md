# 快照测试

组件快照和视觉回归测试。

## 组件快照

```typescript
import { ComponentSnapshot } from '@ldesign/testing'

const snapshot = await ComponentSnapshot.create(component, {
  name: 'Button',
  props: { type: 'primary' }
})
```

## 更新快照

```bash
npx ltesting snapshot update
```
