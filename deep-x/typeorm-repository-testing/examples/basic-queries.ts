/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { Repository } from 'typeorm'
import { Organization } from '../src/entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../src/entities/organization-user.entity'
import { User } from '../src/entities/user.entity'
import { DatabaseManager } from '../src/config/database'
import chalk from 'chalk'

async function basicQueriesDemo() {
  console.log(chalk.blue('🚀 TypeORM Repository 基础查询示例'))
  console.log('='.repeat(50))

  const dbManager = DatabaseManager.getInstance()

  try {
    // 连接数据库
    console.log(chalk.yellow('📦 连接数据库...'))
    const dataSource = await dbManager.connect()

    // 获取 Repository
    const organizationRepo = dataSource.getRepository(Organization)
    const userRepo = dataSource.getRepository(User)
    const orgUserRepo = dataSource.getRepository(OrganizationUser)

    // 清理数据库
    console.log(chalk.yellow('🧹 清理现有数据...'))
    await dbManager.clearDatabase()

    console.log(chalk.green('\n✅ 1. 创建用户'))
    const user = await userRepo.save({
      id: 'demo-user-1',
      name: 'Demo User',
      email: 'demo@example.com',
      emailVerified: true,
      publicKeys: [
        { name: 'laptop', key: 'ssh-rsa AAAA...' },
        { name: 'desktop', key: 'ssh-ed25519 BBBB...' },
      ],
    })
    console.log('   创建用户:', user.name, '(ID:', user.id, ')')

    console.log(chalk.green('\n✅ 2. 创建组织'))
    const org = await organizationRepo.save({
      name: 'Daytona Demo Organization',
      createdBy: user.id,
      personal: false,
      totalCpuQuota: 16,
      totalMemoryQuota: 32,
      totalDiskQuota: 100,
    })
    console.log('   创建组织:', org.name, '(ID:', org.id, ')')

    console.log(chalk.green('\n✅ 3. 创建组织-用户关系'))
    const orgUser = await orgUserRepo.save({
      organizationId: org.id,
      userId: user.id,
      role: OrganizationMemberRole.OWNER,
    })
    console.log('   用户角色:', orgUser.role)

    console.log(chalk.blue('\n📊 4. 基础查询示例'))

    // 示例 1: 简单查找
    console.log(chalk.cyan('\n   4.1 根据ID查找组织:'))
    const foundOrg = await organizationRepo.findOne({
      where: { id: org.id },
    })
    console.log('   ✓ 找到组织:', foundOrg?.name)

    // 示例 2: 带条件查询
    console.log(chalk.cyan('\n   4.2 查找非个人组织:'))
    const nonPersonalOrgs = await organizationRepo.find({
      where: { personal: false },
    })
    console.log('   ✓ 非个人组织数量:', nonPersonalOrgs.length)

    // 示例 3: 关系查询
    console.log(chalk.cyan('\n   4.3 查找包含用户关系的组织:'))
    const orgWithUsers = await organizationRepo.findOne({
      where: { id: org.id },
      relations: ['users'],
    })
    console.log('   ✓ 组织用户数量:', orgWithUsers?.users.length)

    // 示例 4: 复杂条件查询
    console.log(chalk.cyan('\n   4.4 查找用户拥有的组织:'))
    const userOrgs = await organizationRepo.find({
      where: {
        users: {
          userId: user.id,
          role: OrganizationMemberRole.OWNER,
        },
      },
      relations: ['users'],
    })
    console.log('   ✓ 用户拥有的组织数量:', userOrgs.length)

    // 示例 5: QueryBuilder 复杂查询
    console.log(chalk.cyan('\n   4.5 使用 QueryBuilder 查询:'))
    const queryResult = await organizationRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.users', 'orgUser')
      .where('org.totalCpuQuota > :minCpu', { minCpu: 10 })
      .andWhere('orgUser.role = :role', { role: OrganizationMemberRole.OWNER })
      .getMany()

    console.log('   ✓ 查询结果数量:', queryResult.length)
    queryResult.forEach((o) => {
      console.log(`     - ${o.name} (CPU配额: ${o.totalCpuQuota})`)
    })

    // 示例 6: 更新操作
    console.log(chalk.cyan('\n   4.6 更新组织配额:'))
    await organizationRepo.update({ id: org.id }, { totalCpuQuota: 24 })

    const updatedOrg = await organizationRepo.findOne({
      where: { id: org.id },
    })
    console.log('   ✓ 更新后的CPU配额:', updatedOrg?.totalCpuQuota)

    // 示例 7: 统计查询
    console.log(chalk.cyan('\n   4.7 统计查询:'))
    const totalOrgs = await organizationRepo.count()
    const suspendedOrgs = await organizationRepo.count({
      where: { suspended: true },
    })
    console.log('   ✓ 总组织数量:', totalOrgs)
    console.log('   ✓ 被暂停的组织数量:', suspendedOrgs)

    // 示例 8: 原生SQL查询
    console.log(chalk.cyan('\n   4.8 原生SQL查询:'))
    const rawResult = await organizationRepo.query(
      `
      SELECT name, "total_cpu_quota", "total_memory_quota" 
      FROM organization 
      WHERE "total_cpu_quota" > $1
    `,
      [20],
    )

    console.log('   ✓ 原生查询结果:')
    rawResult.forEach((row: any) => {
      console.log(`     - ${row.name}: CPU=${row.total_cpu_quota}, Memory=${row.total_memory_quota}`)
    })

    console.log(chalk.green('\n🎉 基础查询示例完成!'))
  } catch (error) {
    console.error(chalk.red('❌ 错误:'), error)
  } finally {
    await dbManager.disconnect()
  }
}

// 直接运行
if (require.main === module) {
  basicQueriesDemo().catch(console.error)
}

export { basicQueriesDemo }
