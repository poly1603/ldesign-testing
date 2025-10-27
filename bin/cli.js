#!/usr/bin/env node

// 导入 CLI
import('../dist/cli/index.js').catch((error) => {
  console.error('Failed to load CLI:', error)
  process.exit(1)
})

