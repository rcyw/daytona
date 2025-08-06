/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { DatabaseManager } from './config/database'
import { OrganizationService } from './services/organization.service'
import chalk from 'chalk'

async function main() {
  console.log(chalk.blue('🚀 TypeORM Repository 测试项目'))
  console.log(chalk.blue('基于 Daytona API 实体结构的 Repository 测试环境'))
  console.log('='.repeat(60))

  const dbManager = DatabaseManager.getInstance()

  try {
    // 连接数据库
    console.log(chalk.yellow('📦 连接数据库...'))
    await dbManager.connect()
    console.log(chalk.green('✅ 数据库连接成功'))

    // 创建服务实例
    const organizationService = new OrganizationService()

    // 显示可用的操作
    console.log(chalk.cyan('\n📋 可用的测试操作:'))
    console.log('1. 运行测试: npm test')
    console.log('2. 基础查询示例: npm run example:basic')
    console.log('3. 复杂查询示例: npm run example:complex')
    console.log('4. 事务示例: npm run example:transactions')
    console.log('5. 关系查询示例: npm run example:relationships')
    console.log('6. 交互式演示: npm run demo')

    console.log(chalk.cyan('\n🔧 数据库管理:'))
    console.log('• 初始化数据库: npm run setup-db')
    console.log('• 清理数据库: npm run clean-db')

    console.log(chalk.green('\n✨ 测试环境已就绪!'))
    console.log(chalk.yellow('💡 提示: 这个项目让您可以安全地测试 TypeORM Repository 功能'))
  } catch (error) {
    console.error(chalk.red('❌ 初始化失败:'), error)
    process.exit(1)
  } finally {
    await dbManager.disconnect()
  }
}

// 导出主要模块
export { DatabaseManager, OrganizationService }

export * from './entities'
export * from './config/database'
export * from './services/organization.service'

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error)
}
