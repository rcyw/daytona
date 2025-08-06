/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { DatabaseManager } from '../src/config/database'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'

async function cleanDatabase() {
  console.log(chalk.blue('🧹 TypeORM Repository 测试项目 - 数据库清理'))
  console.log('='.repeat(60))

  // 确认清理操作
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: '⚠️  确定要清理所有测试数据吗？这个操作不可撤销！',
      default: false,
    },
  ])

  if (!confirmed) {
    console.log(chalk.yellow('❌ 操作已取消'))
    return
  }

  const dbManager = DatabaseManager.getInstance()
  let spinner: any

  try {
    // 连接数据库
    spinner = ora('连接数据库...').start()
    await dbManager.connect()
    spinner.succeed('数据库连接成功')

    // 清理数据库
    spinner = ora('清理数据库中所有数据...').start()
    await dbManager.clearDatabase()
    spinner.succeed('数据库清理完成')

    console.log(chalk.green('\n✅ 数据库已清理干净!'))
    console.log(chalk.yellow('\n💡 下次使用前请运行: npm run setup-db'))
  } catch (error) {
    if (spinner) {
      spinner.fail('清理失败')
    }
    console.error(chalk.red('❌ 错误:'), error)
    process.exit(1)
  } finally {
    await dbManager.disconnect()
  }
}

// 直接运行
if (require.main === module) {
  cleanDatabase().catch(console.error)
}
