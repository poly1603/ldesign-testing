import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@ldesign/testing',
  description: '完整的企业级测试工具集',
  lang: 'zh-CN',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API 参考', link: '/api/overview' },
      { text: '示例', link: '/examples/basic' },
      { 
        text: '相关链接',
        items: [
          { text: 'Vitest', link: 'https://vitest.dev/' },
          { text: 'Playwright', link: 'https://playwright.dev/' },
          { text: 'GitHub', link: 'https://github.com/ldesign/testing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '配置', link: '/guide/configuration' },
          ]
        },
        {
          text: '核心功能',
          items: [
            { text: '单元测试', link: '/guide/unit-testing' },
            { text: 'E2E 测试', link: '/guide/e2e-testing' },
            { text: '组件测试', link: '/guide/component-testing' },
            { text: 'API 测试', link: '/guide/api-testing' },
          ]
        },
        {
          text: '高级功能',
          items: [
            { text: 'Mock 工具', link: '/guide/mocking' },
            { text: '覆盖率', link: '/guide/coverage' },
            { text: '快照测试', link: '/guide/snapshot' },
            { text: '性能测试', link: '/guide/performance' },
            { text: '测试生成', link: '/guide/test-generation' },
            { text: '并行测试', link: '/guide/parallel' },
          ]
        },
        {
          text: 'CLI',
          items: [
            { text: 'CLI 命令', link: '/guide/cli' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概览', link: '/api/overview' },
            { text: '配置 API', link: '/api/config' },
            { text: '测试工具', link: '/api/test-utils' },
            { text: '断言', link: '/api/assertions' },
            { text: 'Mock API', link: '/api/mock' },
            { text: '覆盖率 API', link: '/api/coverage' },
            { text: '性能测试 API', link: '/api/benchmark' },
            { text: '生成器 API', link: '/api/generator' },
          ]
        }
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础示例', link: '/examples/basic' },
            { text: 'Vue 组件', link: '/examples/vue' },
            { text: 'React 组件', link: '/examples/react' },
            { text: 'E2E 测试', link: '/examples/e2e' },
            { text: 'Mock 数据', link: '/examples/mock' },
            { text: '性能测试', link: '/examples/performance' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ldesign/testing' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present LDesign Team'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/ldesign/testing/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  }
})
