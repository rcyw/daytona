/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Organization } from '../src/entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../src/entities/organization-user.entity'
import { User, SystemRole } from '../src/entities/user.entity'
import { OrganizationService } from '../src/services/organization.service'
import { DatabaseManager } from '../src/config/database'
import chalk from 'chalk'

async function transactionsDemo() {
  console.log(chalk.blue('💳 TypeORM 事务处理示例'))
  console.log('='.repeat(50))

  const dbManager = DatabaseManager.getInstance()
  let dataSource: DataSource

  try {
    console.log(chalk.yellow('📦 连接数据库...'))
    dataSource = await dbManager.connect()

    const organizationRepo = dataSource.getRepository(Organization)
    const userRepo = dataSource.getRepository(User)
    const orgUserRepo = dataSource.getRepository(OrganizationUser)

    await dbManager.clearDatabase()
    console.log(chalk.green('🧹 数据库已清理'))

    // 1. 基础事务示例 - 使用 transaction 方法
    console.log(chalk.cyan('\n💾 1. 基础事务 - 创建组织和用户关系'))
    try {
      const result = await dataSource.transaction(async (manager) => {
        // 在事务中创建用户
        const user = await manager.save(User, {
          id: 'tx-user-1',
          name: 'Transaction User',
          email: 'tx@example.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [{ name: 'tx-key', key: 'ssh-rsa TX...' }],
        })

        // 在事务中创建组织
        const org = await manager.save(Organization, {
          name: 'Transaction Org',
          createdBy: user.id,
          personal: false,
          totalCpuQuota: 50,
          totalMemoryQuota: 100,
          totalDiskQuota: 200,
        })

        // 在事务中创建用户-组织关系
        await manager.save(OrganizationUser, {
          organizationId: org.id,
          userId: user.id,
          role: OrganizationMemberRole.OWNER,
        })

        return { user, org }
      })

      console.log(`   ✅ 成功创建: 用户 ${result.user.name} 和组织 ${result.org.name}`)
    } catch (error) {
      console.error(`   ❌ 事务失败:`, error)
    }

    // 2. 手动事务控制 - 使用 QueryRunner
    console.log(chalk.cyan('\n🎮 2. 手动事务控制 - QueryRunner示例'))
    const queryRunner = dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 创建多个用户
      const users = []
      for (let i = 1; i <= 3; i++) {
        const user = await queryRunner.manager.save(User, {
          id: `qr-user-${i}`,
          name: `QueryRunner User ${i}`,
          email: `qr${i}@example.com`,
          emailVerified: i % 2 === 1, // 奇数用户已验证邮箱
          role: SystemRole.USER,
          publicKeys: [{ name: `qr-key-${i}`, key: `ssh-rsa QR${i}...` }],
        })
        users.push(user)
      }

      // 创建组织
      const org = await queryRunner.manager.save(Organization, {
        name: 'QueryRunner Organization',
        createdBy: users[0].id,
        personal: false,
        totalCpuQuota: 80,
        totalMemoryQuota: 160,
        totalDiskQuota: 400,
      })

      // 批量创建用户-组织关系
      const orgUsers = users.map((user, index) => ({
        organizationId: org.id,
        userId: user.id,
        role: index === 0 ? OrganizationMemberRole.OWNER : OrganizationMemberRole.MEMBER,
      }))

      await queryRunner.manager.save(OrganizationUser, orgUsers)

      // 提交事务
      await queryRunner.commitTransaction()
      console.log(`   ✅ 手动事务成功: 创建了 ${users.length} 个用户和 1 个组织`)
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction()
      console.error(`   ❌ 手动事务失败，已回滚:`, error)
    } finally {
      await queryRunner.release()
    }

    // 3. 嵌套事务示例
    console.log(chalk.cyan('\n🔄 3. 嵌套事务 - 保存点(Savepoint)示例'))
    await dataSource.transaction(async (manager) => {
      // 外层事务：创建用户
      const user = await manager.save(User, {
        id: 'nested-user',
        name: 'Nested Transaction User',
        email: 'nested@example.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'nested-key', key: 'ssh-rsa NESTED...' }],
      })

      console.log(`   📝 外层事务: 创建用户 ${user.name}`)

      try {
        // 内层事务：尝试创建多个组织
        await manager.transaction(async (nestedManager) => {
          const org1 = await nestedManager.save(Organization, {
            name: 'Nested Org 1',
            createdBy: user.id,
            personal: false,
            totalCpuQuota: 30,
            totalMemoryQuota: 60,
          })

          console.log(`     📁 内层事务: 创建组织 ${org1.name}`)

          // 模拟一个可能失败的操作
          const shouldFail = false // 改为 true 来测试回滚
          if (shouldFail) {
            throw new Error('内层事务模拟失败')
          }

          const org2 = await nestedManager.save(Organization, {
            name: 'Nested Org 2',
            createdBy: user.id,
            personal: true,
            totalCpuQuota: 10,
            totalMemoryQuota: 20,
          })

          console.log(`     📁 内层事务: 创建组织 ${org2.name}`)
        })

        console.log(`   ✅ 嵌套事务全部成功`)
      } catch (error) {
        console.log(`   ⚠️  内层事务失败但外层事务继续: ${(error as Error).message}`)

        // 外层事务继续，创建一个备用组织
        const fallbackOrg = await manager.save(Organization, {
          name: 'Fallback Organization',
          createdBy: user.id,
          personal: false,
          totalCpuQuota: 20,
          totalMemoryQuota: 40,
        })

        console.log(`     🔄 创建备用组织: ${fallbackOrg.name}`)
      }
    })

    // 4. 事务中的错误处理
    console.log(chalk.cyan('\n🚨 4. 事务错误处理 - 回滚示例'))
    const initialOrgCount = await organizationRepo.count()
    console.log(`   📊 事务前组织数量: ${initialOrgCount}`)

    try {
      await dataSource.transaction(async (manager) => {
        // 创建一个组织
        const org = await manager.save(Organization, {
          name: 'Will Be Rolled Back',
          createdBy: 'nested-user',
          personal: false,
          totalCpuQuota: 100,
          totalMemoryQuota: 200,
        })

        console.log(`   📝 事务中创建组织: ${org.name}`)

        // 故意触发错误
        throw new Error('模拟事务错误 - 触发回滚')
      })
    } catch (error) {
      console.log(`   ❌ 事务失败: ${(error as Error).message}`)
    }

    const finalOrgCount = await organizationRepo.count()
    console.log(`   📊 事务后组织数量: ${finalOrgCount}`)
    console.log(
      `   ${initialOrgCount === finalOrgCount ? '✅' : '❌'} 回滚验证: 数量${initialOrgCount === finalOrgCount ? '未' : '已'}改变`,
    )

    // 5. 批量操作事务
    console.log(chalk.cyan('\n📦 5. 批量操作事务 - 大量数据处理'))
    const batchSize = 5
    const totalBatches = 3

    await dataSource.transaction(async (manager) => {
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchData = []

        for (let i = 0; i < batchSize; i++) {
          const id = batch * batchSize + i + 1
          batchData.push({
            name: `Batch Org ${id}`,
            createdBy: 'nested-user',
            personal: false,
            totalCpuQuota: 10 + id * 5,
            totalMemoryQuota: 20 + id * 10,
            totalDiskQuota: 50 + id * 25,
          })
        }

        const orgs = await manager.save(Organization, batchData)
        console.log(`   📦 批次 ${batch + 1}: 创建了 ${orgs.length} 个组织`)

        // 模拟处理延迟
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    })

    console.log(`   ✅ 批量操作完成: 总共创建 ${batchSize * totalBatches} 个组织`)

    // 6. 自定义事务装饰器模式
    console.log(chalk.cyan('\n🎭 6. 服务层事务 - 使用OrganizationService'))
    const orgService = new OrganizationService()

    try {
      // 使用服务层的事务方法
      await dataSource.transaction(async (manager) => {
        // 临时替换repository以使用事务管理器
        const originalRepo = (orgService as any).organizationRepository
        ;(orgService as any).organizationRepository = manager.getRepository(Organization)
        ;(orgService as any).organizationUserRepository = manager.getRepository(OrganizationUser)

        try {
          const org = await orgService.create({ name: 'Service Transaction Org' }, 'nested-user', false, true)

          console.log(`   ✅ 服务层事务创建组织: ${org.name}`)

          // 测试暂停操作
          await orgService.suspend(org.id, 'Transaction test suspension')
          console.log(`   ⏸️  组织已暂停`)

          // 恢复操作
          await orgService.unsuspend(org.id)
          console.log(`   ▶️  组织已恢复`)
        } finally {
          // 恢复原始repository
          ;(orgService as any).organizationRepository = originalRepo
        }
      })

      console.log(`   ✅ 服务层事务操作完成`)
    } catch (error) {
      console.error(`   ❌ 服务层事务失败:`, error)
    }

    // 显示最终统计
    const finalStats = {
      users: await userRepo.count(),
      organizations: await organizationRepo.count(),
      relationships: await orgUserRepo.count(),
    }

    console.log(chalk.green('\n📊 最终统计:'))
    console.log(`   👥 用户总数: ${finalStats.users}`)
    console.log(`   🏢 组织总数: ${finalStats.organizations}`)
    console.log(`   🔗 关系总数: ${finalStats.relationships}`)

    console.log(chalk.green('\n🎉 事务处理示例演示完成!'))
  } catch (error) {
    console.error(chalk.red('❌ 演示过程中出现错误:'), error)
  } finally {
    await dbManager.disconnect()
  }
}

if (require.main === module) {
  transactionsDemo().catch(console.error)
}

export { transactionsDemo }
