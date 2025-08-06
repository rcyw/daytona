/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { DatabaseManager } from '../src/config/database'
import { Organization } from '../src/entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../src/entities/organization-user.entity'
import { User, SystemRole } from '../src/entities/user.entity'
import chalk from 'chalk'
import ora from 'ora'

async function setupDatabase() {
  console.log(chalk.blue('🚀 TypeORM Repository 测试项目 - 数据库初始化'))
  console.log('='.repeat(60))

  const dbManager = DatabaseManager.getInstance()
  let spinner: any

  try {
    // 连接数据库
    spinner = ora('连接数据库...').start()
    const dataSource = await dbManager.connect()
    spinner.succeed('数据库连接成功')

    // 清理现有数据
    spinner = ora('清理现有数据...').start()
    await dbManager.clearDatabase()
    spinner.succeed('数据库清理完成')

    // 获取 Repository
    const organizationRepo = dataSource.getRepository(Organization)
    const userRepo = dataSource.getRepository(User)
    const orgUserRepo = dataSource.getRepository(OrganizationUser)

    // 创建示例用户
    spinner = ora('创建示例用户...').start()
    const users = await userRepo.save([
      {
        id: 'admin-user',
        name: 'Admin User',
        email: 'admin@daytona.com',
        emailVerified: true,
        role: SystemRole.ADMIN,
        publicKeys: [{ name: 'main', key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...' }],
      },
      {
        id: 'john-doe',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [
          { name: 'laptop', key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...' },
          { name: 'desktop', key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQ...' },
        ],
      },
      {
        id: 'jane-smith',
        name: 'Jane Smith',
        email: 'jane@example.com',
        emailVerified: false,
        role: SystemRole.USER,
        publicKeys: [],
      },
      {
        id: 'bob-wilson',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'work', key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...' }],
      },
    ])
    spinner.succeed(`创建了 ${users.length} 个示例用户`)

    // 创建示例组织
    spinner = ora('创建示例组织...').start()
    const organizationData: Partial<Organization>[] = [
      {
        name: 'Daytona Inc',
        createdBy: users[0].id, // admin-user
        personal: false,
        totalCpuQuota: 50,
        totalMemoryQuota: 100,
        totalDiskQuota: 500,
        maxCpuPerSandbox: 16,
        maxMemoryPerSandbox: 32,
        maxDiskPerSandbox: 100,
      },
      {
        name: 'Personal (John)',
        createdBy: users[1].id, // john-doe
        personal: true,
        totalCpuQuota: 8,
        totalMemoryQuota: 16,
        totalDiskQuota: 50,
      },
      {
        name: 'Personal (Jane)',
        createdBy: users[2].id, // jane-smith
        personal: true,
        suspended: true,
        suspensionReason: 'Please verify your email address',
        suspendedAt: new Date(),
      },
      {
        name: 'Development Team',
        createdBy: users[1].id, // john-doe
        personal: false,
        totalCpuQuota: 32,
        totalMemoryQuota: 64,
        totalDiskQuota: 200,
      },
      {
        name: 'Old Suspended Org',
        createdBy: users[3].id, // bob-wilson
        personal: false,
        suspended: true,
        suspensionReason: 'Billing issue',
        suspendedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ]
    const organizations = await organizationRepo.save(organizationData)
    spinner.succeed(`创建了 ${organizations.length} 个示例组织`)

    // 创建组织用户关系
    spinner = ora('创建组织用户关系...').start()
    const orgUsers = await orgUserRepo.save([
      // Daytona Inc - Admin as owner
      {
        organizationId: organizations[0].id,
        userId: users[0].id,
        role: OrganizationMemberRole.OWNER,
      },
      // Daytona Inc - John as admin
      {
        organizationId: organizations[0].id,
        userId: users[1].id,
        role: OrganizationMemberRole.ADMIN,
      },
      // Daytona Inc - Bob as member
      {
        organizationId: organizations[0].id,
        userId: users[3].id,
        role: OrganizationMemberRole.MEMBER,
      },
      // Personal orgs - owners
      {
        organizationId: organizations[1].id,
        userId: users[1].id,
        role: OrganizationMemberRole.OWNER,
      },
      {
        organizationId: organizations[2].id,
        userId: users[2].id,
        role: OrganizationMemberRole.OWNER,
      },
      // Development Team - John as owner, Bob as member
      {
        organizationId: organizations[3].id,
        userId: users[1].id,
        role: OrganizationMemberRole.OWNER,
      },
      {
        organizationId: organizations[3].id,
        userId: users[3].id,
        role: OrganizationMemberRole.MEMBER,
      },
      // Old Suspended Org - Bob as owner
      {
        organizationId: organizations[4].id,
        userId: users[3].id,
        role: OrganizationMemberRole.OWNER,
      },
    ])
    spinner.succeed(`创建了 ${orgUsers.length} 个组织用户关系`)

    console.log(chalk.green('\n✅ 数据库初始化完成!'))
    console.log(chalk.blue('\n📊 创建的测试数据:'))

    console.log(chalk.cyan('\n👥 用户:'))
    users.forEach((user) => {
      console.log(`   • ${user.name} (${user.id}) - ${user.role} ${user.emailVerified ? '✅' : '❌'}`)
    })

    console.log(chalk.cyan('\n🏢 组织:'))
    organizations.forEach((org) => {
      const status = org.suspended ? '🔒 暂停' : '✅ 活跃'
      const type = org.personal ? '👤 个人' : '🏢 企业'
      console.log(`   • ${org.name} - ${type} ${status}`)
    })

    console.log(chalk.yellow('\n🎯 现在你可以运行以下命令:'))
    console.log('   npm test                    # 运行所有测试')
    console.log('   npm run example:basic       # 运行基础查询示例')
    console.log('   npm run demo                # 运行交互式演示')
    console.log('   npm run test:organization   # 运行组织相关测试')
  } catch (error) {
    if (spinner) {
      spinner.fail('初始化失败')
    }
    console.error(chalk.red('❌ 错误:'), error)
    process.exit(1)
  } finally {
    await dbManager.disconnect()
  }
}

// 直接运行
if (require.main === module) {
  setupDatabase().catch(console.error)
}
