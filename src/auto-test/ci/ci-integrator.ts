/**
 * @ldesign/testing - CI Integrator
 * CI/CD 集成�?- 自动生成 GitHub Actions、GitLab CI、Jenkins Pipeline 配置
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * CI 平台类型
 */
export type CIPlatform = 'github' | 'gitlab' | 'jenkins' | 'circleci' | 'azure'

/**
 * CI 集成配置选项
 */
export interface CIIntegratorConfig {
  platform: CIPlatform
  nodeVersion?: string
  packageManager?: 'npm' | 'yarn' | 'pnpm'
  testCommand?: string
  buildCommand?: string
  lintCommand?: string
  branches?: string[]
  cacheEnabled?: boolean
  coverage?: boolean
  artifacts?: boolean
  notifications?: {
    slack?: string
    email?: string
  }
  environment?: Record<string, string>
  services?: Array<'postgres' | 'mysql' | 'redis' | 'mongodb'>
  matrix?: {
    nodeVersions?: string[]
    os?: string[]
  }
}

/**
 * 生成结果
 */
export interface CIGenerationResult {
  platform: CIPlatform
  filePath: string
  content: string
  created: boolean
}

/**
 * 默认配置
 */
export const DEFAULT_CI_CONFIG: Partial<CIIntegratorConfig> = {
  nodeVersion: '20',
  packageManager: 'pnpm',
  testCommand: 'pnpm test',
  buildCommand: 'pnpm build',
  lintCommand: 'pnpm lint',
  branches: ['main', 'develop'],
  cacheEnabled: true,
  coverage: true,
  artifacts: true,
}

/**
 * CI 集成�?
 */
export class CIIntegrator {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * 生成 CI 配置
   */
  generate(config: CIIntegratorConfig): CIGenerationResult {
    const fullConfig = { ...DEFAULT_CI_CONFIG, ...config }

    switch (config.platform) {
      case 'github':
        return this.generateGitHubActions(fullConfig as Required<CIIntegratorConfig>)
      case 'gitlab':
        return this.generateGitLabCI(fullConfig as Required<CIIntegratorConfig>)
      case 'jenkins':
        return this.generateJenkinsfile(fullConfig as Required<CIIntegratorConfig>)
      case 'circleci':
        return this.generateCircleCI(fullConfig as Required<CIIntegratorConfig>)
      case 'azure':
        return this.generateAzurePipelines(fullConfig as Required<CIIntegratorConfig>)
      default:
        throw new Error(`不支持的 CI 平台: ${config.platform}`)
    }
  }

  /**
   * 生成所有平台配�?
   */
  generateAll(config: Omit<CIIntegratorConfig, 'platform'>): CIGenerationResult[] {
    const platforms: CIPlatform[] = ['github', 'gitlab', 'jenkins', 'circleci']
    return platforms.map(platform => this.generate({ ...config, platform }))
  }

  /**
   * 生成 GitHub Actions
   */
  private generateGitHubActions(config: Required<CIIntegratorConfig>): CIGenerationResult {
    const filePath = '.github/workflows/test.yml'
    const cacheKey = config.packageManager === 'pnpm' ? 'pnpm' : config.packageManager

    let content = `# �?@ldesign/testing 自动生成
name: Test

on:
  push:
    branches: [${config.branches.map(b => `'${b}'`).join(', ')}]
  pull_request:
    branches: [${config.branches.map(b => `'${b}'`).join(', ')}]

jobs:
  test:
    runs-on: \${{ matrix.os }}
    
    strategy:
      matrix:
        os: [${config.matrix?.os?.map(o => `'${o}'`).join(', ') || "'ubuntu-latest'"}]
        node-version: [${config.matrix?.nodeVersions?.map(v => `'${v}'`).join(', ') || `'${config.nodeVersion}'`}]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
`

    // pnpm 设置
    if (config.packageManager === 'pnpm') {
      content += `
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
`
    }

    // 缓存
    if (config.cacheEnabled) {
      content += `
      - name: Get ${cacheKey} cache directory
        id: ${cacheKey}-cache
        shell: bash
        run: |
          echo "STORE_PATH=\$(${config.packageManager === 'pnpm' ? 'pnpm store path' : config.packageManager === 'yarn' ? 'yarn cache dir' : 'npm config get cache'})" >> $GITHUB_OUTPUT

      - name: Setup ${cacheKey} cache
        uses: actions/cache@v4
        with:
          path: \${{ steps.${cacheKey}-cache.outputs.STORE_PATH }}
          key: \${{ runner.os }}-${cacheKey}-\${{ hashFiles('**/pnpm-lock.yaml', '**/package-lock.json', '**/yarn.lock') }}
          restore-keys: |
            \${{ runner.os }}-${cacheKey}-
`
    }

    content += `
      - name: Install dependencies
        run: ${config.packageManager} install
`

    // Lint
    if (config.lintCommand) {
      content += `
      - name: Lint
        run: ${config.lintCommand}
`
    }

    // Build
    if (config.buildCommand) {
      content += `
      - name: Build
        run: ${config.buildCommand}
`
    }

    // Test
    content += `
      - name: Test
        run: ${config.testCommand}${config.coverage ? ' --coverage' : ''}
`

    // 覆盖率上�?
    if (config.coverage) {
      content += `
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: false
`
    }

    // Artifacts
    if (config.artifacts) {
      content += `
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-\${{ matrix.os }}-\${{ matrix.node-version }}
          path: |
            coverage/
            test-reports/
          retention-days: 7
`
    }

    return this.writeConfig(filePath, content, 'github')
  }

  /**
   * 生成 GitLab CI
   */
  private generateGitLabCI(config: Required<CIIntegratorConfig>): CIGenerationResult {
    const filePath = '.gitlab-ci.yml'

    let content = `# �?@ldesign/testing 自动生成
image: node:${config.nodeVersion}

stages:
  - install
  - lint
  - build
  - test

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"
`

    // pnpm 设置
    if (config.packageManager === 'pnpm') {
      content += `  PNPM_HOME: "$CI_PROJECT_DIR/.pnpm"
`
    }

    // 缓存
    if (config.cacheEnabled) {
      content += `
cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/
`
      if (config.packageManager === 'pnpm') {
        content += `    - .pnpm-store/
`
      }
    }

    // Before script
    if (config.packageManager === 'pnpm') {
      content += `
before_script:
  - corepack enable
  - corepack prepare pnpm@latest --activate
  - pnpm config set store-dir .pnpm-store
`
    }

    content += `
install:
  stage: install
  script:
    - ${config.packageManager} install
  only:
    - ${config.branches.join('\n    - ')}
    - merge_requests
`

    // Lint
    if (config.lintCommand) {
      content += `
lint:
  stage: lint
  script:
    - ${config.lintCommand}
  only:
    - ${config.branches.join('\n    - ')}
    - merge_requests
`
    }

    // Build
    if (config.buildCommand) {
      content += `
build:
  stage: build
  script:
    - ${config.buildCommand}
  only:
    - ${config.branches.join('\n    - ')}
    - merge_requests
`
    }

    // Test
    content += `
test:
  stage: test
  script:
    - ${config.testCommand}${config.coverage ? ' --coverage' : ''}
`

    if (config.coverage) {
      content += `  coverage: '/All files[^|]*\\|[^|]*\\s+([\\d\\.]+)/'
`
    }

    if (config.artifacts) {
      content += `  artifacts:
    when: always
    paths:
      - coverage/
      - test-reports/
    reports:
      junit: test-reports/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    expire_in: 7 days
`
    }

    content += `  only:
    - ${config.branches.join('\n    - ')}
    - merge_requests
`

    return this.writeConfig(filePath, content, 'gitlab')
  }

  /**
   * 生成 Jenkinsfile
   */
  private generateJenkinsfile(config: Required<CIIntegratorConfig>): CIGenerationResult {
    const filePath = 'Jenkinsfile'

    let content = `// �?@ldesign/testing 自动生成
pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS ${config.nodeVersion}'
    }
    
    environment {
        CI = 'true'
        HOME = '.'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install') {
            steps {
`

    if (config.packageManager === 'pnpm') {
      content += `                sh 'corepack enable'
                sh 'corepack prepare pnpm@latest --activate'
                sh 'pnpm install'
`
    } else {
      content += `                sh '${config.packageManager} install'
`
    }

    content += `            }
        }
`

    // Lint
    if (config.lintCommand) {
      content += `
        stage('Lint') {
            steps {
                sh '${config.lintCommand}'
            }
        }
`
    }

    // Build
    if (config.buildCommand) {
      content += `
        stage('Build') {
            steps {
                sh '${config.buildCommand}'
            }
        }
`
    }

    // Test
    content += `
        stage('Test') {
            steps {
                sh '${config.testCommand}${config.coverage ? ' --coverage' : ''}'
            }
            post {
                always {
`

    if (config.artifacts) {
      content += `                    junit testResults: 'test-reports/junit.xml', allowEmptyResults: true
`
    }

    if (config.coverage) {
      content += `                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
`
    }

    content += `                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
`

    // 通知
    if (config.notifications?.slack) {
      content += `        success {
            slackSend(color: 'good', message: "Build Succeeded: \${env.JOB_NAME} #\${env.BUILD_NUMBER}")
        }
        failure {
            slackSend(color: 'danger', message: "Build Failed: \${env.JOB_NAME} #\${env.BUILD_NUMBER}")
        }
`
    }

    content += `    }
}
`

    return this.writeConfig(filePath, content, 'jenkins')
  }

  /**
   * 生成 CircleCI
   */
  private generateCircleCI(config: Required<CIIntegratorConfig>): CIGenerationResult {
    const filePath = '.circleci/config.yml'

    let content = `# �?@ldesign/testing 自动生成
version: 2.1

orbs:
  node: circleci/node@5.1

executors:
  node-executor:
    docker:
      - image: cimg/node:${config.nodeVersion}
    working_directory: ~/project

jobs:
  install-and-test:
    executor: node-executor
    steps:
      - checkout
`

    // pnpm
    if (config.packageManager === 'pnpm') {
      content += `
      - run:
          name: Install pnpm
          command: |
            corepack enable
            corepack prepare pnpm@latest --activate
`
    }

    // 缓存
    if (config.cacheEnabled) {
      content += `
      - restore_cache:
          keys:
            - deps-v1-{{ checksum "pnpm-lock.yaml" }}
            - deps-v1-
`
    }

    content += `
      - run:
          name: Install dependencies
          command: ${config.packageManager} install
`

    if (config.cacheEnabled) {
      content += `
      - save_cache:
          key: deps-v1-{{ checksum "pnpm-lock.yaml" }}
          paths:
            - node_modules
`
      if (config.packageManager === 'pnpm') {
        content += `            - ~/.local/share/pnpm/store
`
      }
    }

    // Lint
    if (config.lintCommand) {
      content += `
      - run:
          name: Lint
          command: ${config.lintCommand}
`
    }

    // Build
    if (config.buildCommand) {
      content += `
      - run:
          name: Build
          command: ${config.buildCommand}
`
    }

    // Test
    content += `
      - run:
          name: Test
          command: ${config.testCommand}${config.coverage ? ' --coverage' : ''}
`

    // Artifacts
    if (config.artifacts || config.coverage) {
      content += `
      - store_test_results:
          path: test-reports
      
      - store_artifacts:
          path: coverage
          destination: coverage
      
      - store_artifacts:
          path: test-reports
          destination: test-reports
`
    }

    content += `
workflows:
  version: 2
  test:
    jobs:
      - install-and-test:
          filters:
            branches:
              only:
${config.branches.map(b => `                - ${b}`).join('\n')}
`

    return this.writeConfig(filePath, content, 'circleci')
  }

  /**
   * 生成 Azure Pipelines
   */
  private generateAzurePipelines(config: Required<CIIntegratorConfig>): CIGenerationResult {
    const filePath = 'azure-pipelines.yml'

    let content = `# �?@ldesign/testing 自动生成
trigger:
  branches:
    include:
${config.branches.map(b => `      - ${b}`).join('\n')}

pr:
  branches:
    include:
${config.branches.map(b => `      - ${b}`).join('\n')}

pool:
  vmImage: 'ubuntu-latest'

strategy:
  matrix:
`

    const nodeVersions = config.matrix?.nodeVersions || [config.nodeVersion]
    for (const version of nodeVersions) {
      content += `    node_${version.replace('.', '_')}:
      NODE_VERSION: '${version}'
`
    }

    content += `
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '\$(NODE_VERSION)'
    displayName: 'Install Node.js'
`

    // pnpm
    if (config.packageManager === 'pnpm') {
      content += `
  - script: |
      corepack enable
      corepack prepare pnpm@latest --activate
    displayName: 'Install pnpm'
`
    }

    // 缓存
    if (config.cacheEnabled) {
      content += `
  - task: Cache@2
    inputs:
      key: 'deps | "$(Agent.OS)" | pnpm-lock.yaml'
      restoreKeys: |
        deps | "$(Agent.OS)"
      path: node_modules
    displayName: 'Cache dependencies'
`
    }

    content += `
  - script: ${config.packageManager} install
    displayName: 'Install dependencies'
`

    // Lint
    if (config.lintCommand) {
      content += `
  - script: ${config.lintCommand}
    displayName: 'Lint'
`
    }

    // Build
    if (config.buildCommand) {
      content += `
  - script: ${config.buildCommand}
    displayName: 'Build'
`
    }

    // Test
    content += `
  - script: ${config.testCommand}${config.coverage ? ' --coverage' : ''}
    displayName: 'Test'
`

    // Artifacts
    if (config.artifacts) {
      content += `
  - task: PublishTestResults@2
    condition: succeededOrFailed()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-reports/junit.xml'
      failTaskOnFailedTests: true

  - task: PublishCodeCoverageResults@1
    condition: succeededOrFailed()
    inputs:
      codeCoverageTool: 'Cobertura'
      summaryFileLocation: '\$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
`
    }

    return this.writeConfig(filePath, content, 'azure')
  }

  /**
   * 写入配置文件
   */
  private writeConfig(filePath: string, content: string, platform: CIPlatform): CIGenerationResult {
    const fullPath = path.join(this.projectRoot, filePath)
    const dir = path.dirname(fullPath)

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 写入文件
    fs.writeFileSync(fullPath, content, 'utf-8')

    return {
      platform,
      filePath: fullPath,
      content,
      created: true,
    }
  }

  /**
   * 检测项�?CI 配置
   */
  detectExisting(): { platform: CIPlatform; path: string }[] {
    const configs: { platform: CIPlatform; path: string }[] = []

    const checks: [CIPlatform, string][] = [
      ['github', '.github/workflows'],
      ['gitlab', '.gitlab-ci.yml'],
      ['jenkins', 'Jenkinsfile'],
      ['circleci', '.circleci/config.yml'],
      ['azure', 'azure-pipelines.yml'],
    ]

    for (const [platform, configPath] of checks) {
      const fullPath = path.join(this.projectRoot, configPath)
      if (fs.existsSync(fullPath)) {
        configs.push({ platform, path: fullPath })
      }
    }

    return configs
  }
}
