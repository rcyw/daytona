/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { Repository } from 'typeorm'
import { Organization } from '../src/entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../src/entities/organization-user.entity'
import { User, SystemRole } from '../src/entities/user.entity'
import { OrganizationService } from '../src/services/organization.service'
import { DatabaseManager } from '../src/config/database'
import chalk from 'chalk'
import inquirer from 'inquirer'
import Table from 'cli-table3'

interface DemoContext {
  dbManager: DatabaseManager
  organizationRepo: Repository<Organization>
  userRepo: Repository<User>
  orgUserRepo: Repository<OrganizationUser>
  organizationService: OrganizationService
}

class InteractiveDemo {
  private context: DemoContext | null = null

  async initialize(): Promise<void> {
    console.log(chalk.blue('🚀 TypeORM Repository 交互式演示'))
    console.log('='.repeat(60))

    const dbManager = DatabaseManager.getInstance()

    try {
      console.log(chalk.yellow('📦 连接数据库...'))
      const dataSource = await dbManager.connect()

      this.context = {
        dbManager,
        organizationRepo: dataSource.getRepository(Organization),
        userRepo: dataSource.getRepository(User),
        orgUserRepo: dataSource.getRepository(OrganizationUser),
        organizationService: new OrganizationService(),
      }

      console.log(chalk.green('✅ 数据库连接成功'))
      await this.seedInitialData()
    } catch (error) {
      console.error(chalk.red('❌ 初始化失败:'), error)
      throw error
    }
  }

  async seedInitialData(): Promise<void> {
    if (!this.context) return

    const { organizationRepo, userRepo, orgUserRepo, dbManager } = this.context

    console.log(chalk.yellow('🌱 初始化示例数据...'))

    // 清理现有数据
    await dbManager.clearDatabase()

    // 创建示例用户
    const users = await userRepo.save([
      {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: 'admin@demo.com',
        emailVerified: true,
        role: SystemRole.ADMIN,
        publicKeys: [{ name: 'admin-key', key: 'ssh-rsa DEMO_ADMIN...' }],
      },
      {
        id: 'demo-user1',
        name: 'Alice Smith',
        email: 'alice@demo.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'alice-key', key: 'ssh-rsa ALICE...' }],
      },
      {
        id: 'demo-user2',
        name: 'Bob Johnson',
        email: 'bob@demo.com',
        emailVerified: false,
        role: SystemRole.USER,
        publicKeys: [],
      },
      {
        id: 'demo-user3',
        name: 'Charlie Brown',
        email: 'charlie@demo.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'charlie-key', key: 'ssh-rsa CHARLIE...' }],
      },
    ])

    // 创建示例组织
    const organizationData: Partial<Organization>[] = [
      {
        name: 'Demo Corporation',
        createdBy: 'demo-admin',
        personal: false,
        totalCpuQuota: 100,
        totalMemoryQuota: 200,
        totalDiskQuota: 500,
        maxCpuPerSandbox: 16,
        maxMemoryPerSandbox: 32,
        suspended: false,
      },
      {
        name: 'Small Team',
        createdBy: 'demo-user1',
        personal: false,
        totalCpuQuota: 50,
        totalMemoryQuota: 100,
        totalDiskQuota: 250,
        maxCpuPerSandbox: 8,
        maxMemoryPerSandbox: 16,
        suspended: false,
      },
      {
        name: 'Alice Personal',
        createdBy: 'demo-user1',
        personal: true,
        totalCpuQuota: 20,
        totalMemoryQuota: 40,
        totalDiskQuota: 100,
        maxCpuPerSandbox: 4,
        maxMemoryPerSandbox: 8,
        suspended: false,
      },
    ]
    const organizations = await organizationRepo.save(organizationData)

    // 创建用户-组织关系
    await orgUserRepo.save([
      { organizationId: organizations[0].id, userId: 'demo-admin', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[0].id, userId: 'demo-user1', role: OrganizationMemberRole.ADMIN },
      { organizationId: organizations[0].id, userId: 'demo-user2', role: OrganizationMemberRole.MEMBER },
      { organizationId: organizations[1].id, userId: 'demo-user1', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[1].id, userId: 'demo-user3', role: OrganizationMemberRole.MEMBER },
      { organizationId: organizations[2].id, userId: 'demo-user1', role: OrganizationMemberRole.OWNER },
    ])

    console.log(chalk.green('✅ 示例数据初始化完成'))
  }

  async showMainMenu(): Promise<void> {
    const choices = [
      { name: '👀 查看所有数据', value: 'view' },
      { name: '🔍 执行查询示例', value: 'query' },
      { name: '✏️  数据管理操作', value: 'manage' },
      { name: '🧪 事务操作演示', value: 'transaction' },
      { name: '📊 性能测试', value: 'performance' },
      { name: '🧹 清理数据', value: 'clean' },
      { name: '❌ 退出', value: 'exit' },
    ]

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择要执行的操作:',
        choices,
      },
    ])

    switch (action) {
      case 'view':
        await this.viewAllData()
        break
      case 'query':
        await this.queryExamples()
        break
      case 'manage':
        await this.dataManagement()
        break
      case 'transaction':
        await this.transactionDemo()
        break
      case 'performance':
        await this.performanceTest()
        break
      case 'clean':
        await this.cleanData()
        break
      case 'exit':
        console.log(chalk.blue('👋 再见！'))
        return
    }

    // 继续显示菜单
    await this.showMainMenu()
  }

  async viewAllData(): Promise<void> {
    if (!this.context) return

    const { organizationRepo, userRepo, orgUserRepo } = this.context

    console.log(chalk.cyan('\n📋 数据概览'))
    console.log('='.repeat(40))

    // 显示用户
    const users = await userRepo.find({ order: { name: 'ASC' } })
    const userTable = new Table({
      head: ['ID', '姓名', '邮箱', '已验证', '角色', '公钥数量'],
      colWidths: [15, 20, 25, 8, 8, 8],
    })

    users.forEach((user) => {
      userTable.push([
        user.id,
        user.name,
        user.email,
        user.emailVerified ? '✅' : '❌',
        user.role,
        user.publicKeys?.length || 0,
      ])
    })

    console.log(chalk.yellow('\n👥 用户列表:'))
    console.log(userTable.toString())

    // 显示组织
    const organizations = await organizationRepo.find({
      relations: ['users'],
      order: { totalCpuQuota: 'DESC' },
    })

    const orgTable = new Table({
      head: ['ID', '名称', '类型', 'CPU配额', '内存配额', '成员数', '状态'],
      colWidths: [20, 20, 8, 8, 8, 8, 8],
    })

    organizations.forEach((org) => {
      orgTable.push([
        org.id.substring(0, 8) + '...',
        org.name,
        org.personal ? '个人' : '企业',
        org.totalCpuQuota,
        org.totalMemoryQuota,
        org.users.length,
        org.suspended ? '🔒' : '✅',
      ])
    })

    console.log(chalk.yellow('\n🏢 组织列表:'))
    console.log(orgTable.toString())

    // 显示关系
    const relationships = await orgUserRepo.find({
      relations: ['organization'],
      order: { role: 'ASC' },
    })

    const relTable = new Table({
      head: ['用户ID', '组织名称', '角色'],
      colWidths: [15, 25, 10],
    })

    relationships.forEach((rel) => {
      relTable.push([rel.userId, rel.organization.name, rel.role])
    })

    console.log(chalk.yellow('\n🔗 用户-组织关系:'))
    console.log(relTable.toString())

    await this.waitForContinue()
  }

  async queryExamples(): Promise<void> {
    if (!this.context) return

    const queryChoices = [
      { name: '🔍 基础查询 - 查找特定组织', value: 'basic' },
      { name: '🔗 关系查询 - 用户的所有组织', value: 'relations' },
      { name: '📊 聚合查询 - 统计信息', value: 'aggregate' },
      { name: '🎯 复杂查询 - 多条件筛选', value: 'complex' },
      { name: '📈 原生SQL查询', value: 'raw' },
      { name: '🔙 返回主菜单', value: 'back' },
    ]

    const { queryType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'queryType',
        message: '选择查询类型:',
        choices: queryChoices,
      },
    ])

    if (queryType === 'back') return

    const { organizationRepo, userRepo, orgUserRepo } = this.context

    console.log(chalk.cyan('\n🔍 查询结果:'))

    switch (queryType) {
      case 'basic': {
        const { orgName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'orgName',
            message: '输入要查找的组织名称 (支持模糊匹配):',
            default: 'Demo',
          },
        ])

        const orgs = await organizationRepo
          .createQueryBuilder('org')
          .where('org.name ILIKE :name', { name: `%${orgName}%` })
          .getMany()

        console.log(`找到 ${orgs.length} 个匹配的组织:`)
        orgs.forEach((org) => {
          console.log(`  📊 ${org.name} - CPU: ${org.totalCpuQuota}, 状态: ${org.suspended ? '暂停' : '活跃'}`)
        })
        break
      }

      case 'relations': {
        const users = await userRepo.find()
        const { selectedUserId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedUserId',
            message: '选择用户:',
            choices: users.map((u) => ({ name: `${u.name} (${u.id})`, value: u.id })),
          },
        ])

        const userOrgs = await orgUserRepo
          .createQueryBuilder('orgUser')
          .leftJoinAndSelect('orgUser.organization', 'org')
          .where('orgUser.userId = :userId', { userId: selectedUserId })
          .getMany()

        console.log(`用户 ${selectedUserId} 的组织:`)
        userOrgs.forEach((rel) => {
          console.log(`  🏢 ${rel.organization.name} - 角色: ${rel.role}`)
        })
        break
      }

      case 'aggregate': {
        const stats = await organizationRepo
          .createQueryBuilder('org')
          .select([
            'COUNT(*) as totalOrgs',
            'COUNT(CASE WHEN org.suspended = false THEN 1 END) as activeOrgs',
            'COUNT(CASE WHEN org.personal = true THEN 1 END) as personalOrgs',
            'AVG(org.totalCpuQuota) as avgCpuQuota',
            'MAX(org.totalCpuQuota) as maxCpuQuota',
          ])
          .getRawOne()

        console.log('📊 组织统计信息:')
        console.log(`  总组织数: ${stats.totalorgs}`)
        console.log(`  活跃组织: ${stats.activeorgs}`)
        console.log(`  个人组织: ${stats.personalorgs}`)
        console.log(`  平均CPU配额: ${Math.round(stats.avgcpuquota)}`)
        console.log(`  最大CPU配额: ${stats.maxcpuquota}`)
        break
      }

      case 'complex': {
        const complexResults = await organizationRepo
          .createQueryBuilder('org')
          .leftJoinAndSelect('org.users', 'orgUser', 'orgUser.role = :ownerRole', {
            ownerRole: OrganizationMemberRole.OWNER,
          })
          .leftJoin(User, 'owner', 'owner.id = orgUser.userId')
          .addSelect(['owner.name', 'owner.emailVerified'])
          .where('org.totalCpuQuota > :minCpu', { minCpu: 40 })
          .andWhere('org.suspended = false')
          .orderBy('org.totalCpuQuota', 'DESC')
          .getMany()

        console.log('🎯 高配额活跃组织 (CPU > 40):')
        complexResults.forEach((org) => {
          const owner = org.users[0]
          console.log(`  🏆 ${org.name} (${org.totalCpuQuota} CPU) - Owner: ${owner?.userId}`)
        })
        break
      }

      case 'raw': {
        const rawResults = await organizationRepo.query(`
          SELECT 
            o.name, 
            o.total_cpu_quota,
            COUNT(ou.user_id) as member_count,
            STRING_AGG(ou.role, ', ') as roles
          FROM organization o
          LEFT JOIN organization_user ou ON o.id = ou.organization_id
          WHERE o.suspended = false
          GROUP BY o.id, o.name, o.total_cpu_quota
          ORDER BY o.total_cpu_quota DESC
        `)

        console.log('📈 原生SQL查询结果:')
        rawResults.forEach((row: any) => {
          console.log(`  📊 ${row.name}: ${row.total_cpu_quota} CPU, ${row.member_count} 成员`)
        })
        break
      }
    }

    await this.waitForContinue()
  }

  async dataManagement(): Promise<void> {
    if (!this.context) return

    const managementChoices = [
      { name: '➕ 创建新用户', value: 'createUser' },
      { name: '🏢 创建新组织', value: 'createOrg' },
      { name: '🔗 添加用户到组织', value: 'addUserToOrg' },
      { name: '✏️  更新组织配额', value: 'updateQuota' },
      { name: '⏸️  暂停/恢复组织', value: 'toggleSuspend' },
      { name: '🗑️  删除数据', value: 'delete' },
      { name: '🔙 返回主菜单', value: 'back' },
    ]

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '选择管理操作:',
        choices: managementChoices,
      },
    ])

    if (action === 'back') return

    const { organizationRepo, userRepo, orgUserRepo, organizationService } = this.context

    switch (action) {
      case 'createUser': {
        const userInput = await inquirer.prompt([
          { type: 'input', name: 'id', message: '用户ID:' },
          { type: 'input', name: 'name', message: '用户姓名:' },
          { type: 'input', name: 'email', message: '邮箱:' },
          {
            type: 'list',
            name: 'role',
            message: '角色:',
            choices: Object.values(SystemRole),
          },
          { type: 'confirm', name: 'emailVerified', message: '邮箱已验证?', default: true },
        ])

        const newUser = await userRepo.save({
          ...userInput,
          publicKeys: [],
        })

        console.log(chalk.green(`✅ 用户 ${newUser.name} 创建成功`))
        break
      }

      case 'createOrg': {
        const orgInput = await inquirer.prompt([
          { type: 'input', name: 'name', message: '组织名称:' },
          { type: 'input', name: 'createdBy', message: '创建者ID:' },
          { type: 'confirm', name: 'personal', message: '是否为个人组织?', default: false },
          { type: 'number', name: 'totalCpuQuota', message: 'CPU配额:', default: 50 },
          { type: 'number', name: 'totalMemoryQuota', message: '内存配额:', default: 100 },
        ])

        try {
          const newOrg = await organizationService.create(
            { name: orgInput.name },
            orgInput.createdBy,
            orgInput.personal,
            true,
          )
          console.log(chalk.green(`✅ 组织 ${newOrg.name} 创建成功`))
        } catch (error) {
          console.log(chalk.red(`❌ 创建失败: ${(error as Error).message}`))
        }
        break
      }

      case 'addUserToOrg': {
        const users = await userRepo.find()
        const orgs = await organizationRepo.find()

        const addUserInput = await inquirer.prompt([
          {
            type: 'list',
            name: 'userId',
            message: '选择用户:',
            choices: users.map((u) => ({ name: `${u.name} (${u.id})`, value: u.id })),
          },
          {
            type: 'list',
            name: 'orgId',
            message: '选择组织:',
            choices: orgs.map((o) => ({ name: o.name, value: o.id })),
          },
          {
            type: 'list',
            name: 'role',
            message: '角色:',
            choices: Object.values(OrganizationMemberRole),
          },
        ])

        await orgUserRepo.save({
          userId: addUserInput.userId,
          organizationId: addUserInput.orgId,
          role: addUserInput.role,
        })

        console.log(chalk.green(`✅ 用户已添加到组织`))
        break
      }

      case 'updateQuota': {
        const orgsForUpdate = await organizationRepo.find()
        const quotaInput = await inquirer.prompt([
          {
            type: 'list',
            name: 'orgId',
            message: '选择要更新的组织:',
            choices: orgsForUpdate.map((o) => ({ name: o.name, value: o.id })),
          },
          { type: 'number', name: 'totalCpuQuota', message: '新的CPU配额:' },
          { type: 'number', name: 'totalMemoryQuota', message: '新的内存配额:' },
        ])

        await organizationService.updateQuota(quotaInput.orgId, {
          totalCpuQuota: quotaInput.totalCpuQuota,
          totalMemoryQuota: quotaInput.totalMemoryQuota,
        })

        console.log(chalk.green(`✅ 组织配额已更新`))
        break
      }

      case 'toggleSuspend': {
        const orgsForSuspend = await organizationRepo.find()
        const suspendInput = await inquirer.prompt([
          {
            type: 'list',
            name: 'orgId',
            message: '选择组织:',
            choices: orgsForSuspend.map((o) => ({
              name: `${o.name} (${o.suspended ? '已暂停' : '活跃'})`,
              value: o.id,
            })),
          },
        ])

        const selectedOrg = orgsForSuspend.find((o) => o.id === suspendInput.orgId)!
        if (selectedOrg.suspended) {
          await organizationService.unsuspend(suspendInput.orgId)
          console.log(chalk.green(`✅ 组织已恢复`))
        } else {
          await organizationService.suspend(suspendInput.orgId, 'Manual suspension via demo')
          console.log(chalk.yellow(`⏸️  组织已暂停`))
        }
        break
      }
    }

    await this.waitForContinue()
  }

  async transactionDemo(): Promise<void> {
    if (!this.context) return

    console.log(chalk.cyan('\n💳 事务操作演示'))

    const { organizationRepo, userRepo, dbManager } = this.context

    // 显示事务前的状态
    const beforeCount = await organizationRepo.count()
    console.log(`事务前组织数量: ${beforeCount}`)

    const { shouldFail } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldFail',
        message: '是否模拟事务失败 (演示回滚)?',
        default: false,
      },
    ])

    try {
      await dbManager.getDataSource()!.transaction(async (manager) => {
        // 在事务中创建用户
        const user = await manager.save(User, {
          id: `tx-demo-${Date.now()}`,
          name: 'Transaction Demo User',
          email: 'tx-demo@example.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [],
        })

        console.log(`✅ 事务中创建用户: ${user.name}`)

        // 在事务中创建组织
        const org = await manager.save(Organization, {
          name: `Transaction Demo Org ${Date.now()}`,
          createdBy: user.id,
          personal: false,
          totalCpuQuota: 30,
          totalMemoryQuota: 60,
        })

        console.log(`✅ 事务中创建组织: ${org.name}`)

        if (shouldFail) {
          throw new Error('模拟事务失败')
        }
      })

      console.log(chalk.green('✅ 事务成功完成'))
    } catch (error) {
      console.log(chalk.red(`❌ 事务失败: ${(error as Error).message}`))
    }

    const afterCount = await organizationRepo.count()
    console.log(`事务后组织数量: ${afterCount}`)

    if (shouldFail && beforeCount === afterCount) {
      console.log(chalk.green('✅ 回滚成功，数据未发生变化'))
    } else if (!shouldFail && afterCount > beforeCount) {
      console.log(chalk.green('✅ 事务成功，数据已保存'))
    }

    await this.waitForContinue()
  }

  async performanceTest(): Promise<void> {
    if (!this.context) return

    console.log(chalk.cyan('\n📊 性能测试'))

    const { batchSize } = await inquirer.prompt([
      {
        type: 'number',
        name: 'batchSize',
        message: '批量创建组织数量:',
        default: 10,
        validate: (value) => value > 0 && value <= 100,
      },
    ])

    const { organizationRepo } = this.context

    console.log(chalk.yellow(`开始创建 ${batchSize} 个组织...`))
    const startTime = Date.now()

    const batchData = []
    for (let i = 1; i <= batchSize; i++) {
      batchData.push({
        name: `Performance Test Org ${i}`,
        createdBy: 'demo-admin',
        personal: false,
        totalCpuQuota: 10 + i,
        totalMemoryQuota: 20 + i * 2,
        totalDiskQuota: 50 + i * 5,
      })
    }

    await organizationRepo.save(batchData)

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(chalk.green(`✅ 批量操作完成`))
    console.log(`⏱️  耗时: ${duration}ms`)
    console.log(`📈 平均每个: ${Math.round(duration / batchSize)}ms`)

    await this.waitForContinue()
  }

  async cleanData(): Promise<void> {
    if (!this.context) return

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: '⚠️  确定要清理所有数据吗？这个操作不可撤销！',
        default: false,
      },
    ])

    if (confirmed) {
      await this.context.dbManager.clearDatabase()
      console.log(chalk.green('🧹 数据已清理'))
      await this.seedInitialData()
    } else {
      console.log(chalk.yellow('❌ 操作已取消'))
    }

    await this.waitForContinue()
  }

  async waitForContinue(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: '按回车键继续...',
      },
    ])
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.dbManager.disconnect()
      console.log(chalk.green('✅ 数据库连接已关闭'))
    }
  }
}

async function runInteractiveDemo() {
  const demo = new InteractiveDemo()

  try {
    await demo.initialize()
    await demo.showMainMenu()
  } catch (error) {
    console.error(chalk.red('❌ 演示运行失败:'), error)
  } finally {
    await demo.cleanup()
  }
}

if (require.main === module) {
  runInteractiveDemo().catch(console.error)
}

export { InteractiveDemo, runInteractiveDemo }
