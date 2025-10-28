# CLI 命令

`@ldesign/testing` 提供了强大的命令行工具，简化测试工作流程。

## 安装

CLI 工具随包一起安装，提供了三个别名：

```bash
ldesign-testing
ltesting     # 简写
ldesign-test # 备用
```

## 全局命令

### `ltesting init`

初始化测试配置。

```bash
npx ltesting init [options]
```

**选项:**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-p, --preset <preset>` | 预设配置 (base\|vue\|react\|node\|library) | - |
| `-f, --force` | 强制覆盖已存在的配置 | false |
| `--skip-prompts` | 跳过交互式提示 | false |
| `--no-install` | 不安装依赖 | false |

**示例:**

```bash
# 交互式初始化
npx ltesting init

# 使用 Vue 预设
npx ltesting init --preset vue

# 强制覆盖并跳过提示
npx ltesting init --preset react --force --skip-prompts
```

---

### `ltesting run`

运行测试。

```bash
npx ltesting run [options]
```

**选项:**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-t, --type <type>` | 测试类型 (unit\|e2e\|all) | all |
| `-w, --watch` | 监听模式 | false |
| `-c, --coverage` | 生成覆盖率报告 | false |
| `-u, --update-snapshot` | 更新快照 | false |
| `-v, --verbose` | 详细输出 | false |
| `--bail` | 失败时立即退出 | false |
| `--max-concurrency <n>` | 最大并发数 | - |
| `--test-name-pattern <pattern>` | 测试名称过滤 | - |
| `--test-path-pattern <pattern>` | 测试路径过滤 | - |

**示例:**

```bash
# 运行所有测试
npx ltesting run

# 运行单元测试
npx ltesting run --type unit

# 监听模式
npx ltesting run --watch

# 生成覆盖率
npx ltesting run --coverage

# 过滤测试
npx ltesting run --test-name-pattern "should work"

# 并发控制
npx ltesting run --max-concurrency 4
```

---

### `ltesting run:unit`

运行单元测试（`run --type unit` 的快捷方式）。

```bash
npx ltesting run:unit [options]
```

**选项:**

| 选项 | 说明 |
|------|------|
| `-w, --watch` | 监听模式 |
| `-c, --coverage` | 生成覆盖率报告 |
| `-u, --update-snapshot` | 更新快照 |
| `-v, --verbose` | 详细输出 |

**示例:**

```bash
# 运行单元测试
npx ltesting run:unit

# 监听模式
npx ltesting run:unit --watch

# 带覆盖率
npx ltesting run:unit --coverage
```

---

### `ltesting run:e2e`

运行 E2E 测试（`run --type e2e` 的快捷方式）。

```bash
npx ltesting run:e2e [options]
```

**选项:**

| 选项 | 说明 |
|------|------|
| `--headed` | 有头模式（显示浏览器） |
| `--browser <browser>` | 指定浏览器 (chromium\|firefox\|webkit) |
| `-v, --verbose` | 详细输出 |

**示例:**

```bash
# 运行 E2E 测试
npx ltesting run:e2e

# 有头模式
npx ltesting run:e2e --headed

# 指定浏览器
npx ltesting run:e2e --browser firefox
```

---

### `ltesting coverage`

生成覆盖率报告。

```bash
npx ltesting coverage [options]
```

**选项:**

| 选项 | 说明 |
|------|------|
| `--open` | 打开 HTML 报告 |

**示例:**

```bash
# 生成覆盖率报告
npx ltesting coverage

# 生成并打开
npx ltesting coverage --open
```

**输出示例:**

```
✔ 配置加载完成
✔ 覆盖率报告生成完成

行覆盖率      : 85.32%
语句覆盖率    : 84.51%
函数覆盖率    : 78.23%
分支覆盖率    : 72.45%

总体评分: 80.13% (B)

改进建议:
  1. 分支覆盖率偏低 (72.45%)，建议测试所有条件分支（if/else、switch等）
  2. 函数覆盖率偏低 (78.23%)，建议为未测试的函数编写测试

✔ 覆盖率达到阈值要求
```

---

### `ltesting snapshot`

快照管理。

```bash
npx ltesting snapshot <action> [options]
```

**Action:**

- `update` - 更新所有快照
- `clean` - 清理未使用的快照
- `list` - 列出所有快照

**选项:**

| 选项 | 说明 |
|------|------|
| `-t, --test-name-pattern <pattern>` | 测试名称过滤 |

**示例:**

```bash
# 更新所有快照
npx ltesting snapshot update

# 清理未使用的快照
npx ltesting snapshot clean

# 列出所有快照
npx ltesting snapshot list

# 按名称过滤
npx ltesting snapshot update --test-name-pattern "Button"
```

---

### `ltesting mock`

生成 Mock 数据。

```bash
npx ltesting mock <type> [options]
```

**支持的类型:**

- `user` / `users` - 用户数据
- `product` / `products` - 产品数据
- `article` / `articles` - 文章数据
- `comment` / `comments` - 评论数据
- `order` / `orders` - 订单数据
- `company` / `companies` - 公司数据
- `event` / `events` - 事件数据
- `payment` / `payments` - 支付数据
- `blog` / `blogs` - 博客数据
- `notification` / `notifications` - 通知数据
- `task` / `tasks` - 任务数据
- `course` / `courses` - 课程数据

**选项:**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-c, --count <n>` | 生成数量 | 10 |
| `-l, --locale <locale>` | 语言设置 | zh_CN |
| `-f, --format <format>` | 输出格式 (json\|ts\|js) | json |
| `-o, --output <file>` | 输出文件 | - |

**示例:**

```bash
# 生成 10 个用户
npx ltesting mock user

# 生成 20 个产品到文件
npx ltesting mock product --count 20 --output ./mocks/products.json

# 生成 TypeScript 格式
npx ltesting mock company --count 5 --format ts --output ./mocks/companies.ts

# 生成订单数据
npx ltesting mock order --count 30 --output ./mocks/orders.json
```

---

### `ltesting generate`

自动生成测试文件。

```bash
npx ltesting generate [options]
```

**选项:**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <file>` | 目标文件路径（必需） | - |
| `-t, --type <type>` | 测试类型 (unit\|e2e\|component\|api\|integration) | unit |
| `-o, --output <dir>` | 输出目录 | - |
| `--overwrite` | 覆盖已存在的文件 | false |

**示例:**

```bash
# 生成单元测试
npx ltesting generate --file src/utils/format.ts

# 生成 E2E 测试
npx ltesting generate --file src/pages/Home.vue --type e2e

# 生成组件测试
npx ltesting generate --file src/components/Button.tsx --type component

# 生成 API 测试
npx ltesting generate --file src/api/user.ts --type api

# 指定输出目录
npx ltesting generate --file src/lib/helper.ts --output tests/unit

# 覆盖现有文件
npx ltesting generate --file src/utils/date.ts --overwrite
```

---

## 配置文件

CLI 命令会自动查找以下配置文件（按优先级）：

1. `testing.config.ts`
2. `testing.config.js`
3. `.testingrc`
4. `.testingrc.json`
5. `package.json` 中的 `testing` 字段

## 环境变量

可以通过环境变量控制 CLI 行为：

```bash
# 调试模式
DEBUG=ltesting npx ltesting run

# 设置并发数
LTESTING_WORKERS=8 npx ltesting run

# 禁用颜色输出
NO_COLOR=1 npx ltesting run
```

## 在 CI/CD 中使用

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm ltesting run --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### GitLab CI

```yaml
test:
  image: node:18
  script:
    - pnpm install
    - pnpm ltesting run --coverage
  coverage: '/Lines\s+:\s+(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 退出代码

CLI 使用标准退出代码：

| 代码 | 说明 |
|------|------|
| 0 | 成功 |
| 1 | 测试失败或错误 |
| 2 | 配置错误 |

## 调试

启用详细输出获取更多信息：

```bash
# 详细模式
npx ltesting run --verbose

# 调试模式
DEBUG=ltesting:* npx ltesting run
```

## 最佳实践

### 1. 使用 package.json 脚本

```json
{
  "scripts": {
    "test": "ltesting run",
    "test:unit": "ltesting run:unit",
    "test:e2e": "ltesting run:e2e",
    "test:watch": "ltesting run --watch",
    "test:coverage": "ltesting coverage --open"
  }
}
```

### 2. 配置 Git Hooks

使用 `husky` 和 `lint-staged`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "ltesting run --type unit --bail"
    ]
  }
}
```

### 3. 并行执行

```bash
# 利用多核 CPU
npx ltesting run --max-concurrency 8
```

### 4. 持续集成

```bash
# CI 环境中不要使用监听模式
npx ltesting run --bail --coverage
```

## 故障排除

### 配置文件未找到

确保配置文件在项目根目录且命名正确。

### 测试执行缓慢

尝试增加并发数或使用 `--bail` 选项。

### 覆盖率报告未生成

确保 `coverage.enabled` 设置为 `true`。

### E2E 测试失败

检查 `baseUrl` 配置和测试服务器是否运行。

## 相关文档

- [配置指南](/guide/configuration)
- [API 参考](/api/overview)
- [示例](/examples/basic)
