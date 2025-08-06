/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { Organization } from '../src/entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../src/entities/organization-user.entity'
import { User, SystemRole } from '../src/entities/user.entity'
import { DatabaseManager } from '../src/config/database'
import chalk from 'chalk'

async function relationshipsDemo() {
  console.log(chalk.blue('🔗 TypeORM 关系查询示例'))
  console.log('='.repeat(50))

  const dbManager = DatabaseManager.getInstance()

  try {
    console.log(chalk.yellow('📦 连接数据库...'))
    const dataSource = await dbManager.connect()

    const organizationRepo = dataSource.getRepository(Organization)
    const userRepo = dataSource.getRepository(User)
    const orgUserRepo = dataSource.getRepository(OrganizationUser)

    await dbManager.clearDatabase()
    console.log(chalk.green('🧹 数据库已清理'))

    // 创建测试数据
    await userRepo.save([
      {
        id: 'ceo-user',
        name: 'Alice CEO',
        email: 'alice@company.com',
        emailVerified: true,
        role: SystemRole.ADMIN,
        publicKeys: [{ name: 'ceo-key', key: 'ssh-rsa CEO...' }],
      },
      {
        id: 'dev-user',
        name: 'Bob Developer',
        email: 'bob@company.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'dev-key', key: 'ssh-rsa DEV...' }],
      },
      {
        id: 'designer-user',
        name: 'Charlie Designer',
        email: 'charlie@company.com',
        emailVerified: false,
        role: SystemRole.USER,
        publicKeys: [],
      },
      {
        id: 'manager-user',
        name: 'Dana Manager',
        email: 'dana@company.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'manager-key', key: 'ssh-rsa MANAGER...' }],
      },
      {
        id: 'freelancer-user',
        name: 'Eve Freelancer',
        email: 'eve@freelance.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'freelancer-key', key: 'ssh-rsa FREELANCER...' }],
      },
    ])

    const organizationData: Partial<Organization>[] = [
      {
        name: 'Tech Solutions Inc',
        createdBy: 'ceo-user',
        personal: false,
        totalCpuQuota: 200,
        totalMemoryQuota: 400,
        totalDiskQuota: 1000,
        maxCpuPerSandbox: 32,
        maxMemoryPerSandbox: 64,
        suspended: false,
      },
      {
        name: 'Design Studio',
        createdBy: 'designer-user',
        personal: false,
        totalCpuQuota: 100,
        totalMemoryQuota: 200,
        totalDiskQuota: 500,
        maxCpuPerSandbox: 16,
        maxMemoryPerSandbox: 32,
        suspended: false,
      },
      {
        name: 'Alice Personal',
        createdBy: 'ceo-user',
        personal: true,
        totalCpuQuota: 50,
        totalMemoryQuota: 100,
        totalDiskQuota: 250,
        maxCpuPerSandbox: 8,
        maxMemoryPerSandbox: 16,
        suspended: false,
      },
      {
        name: 'Startup Project',
        createdBy: 'dev-user',
        personal: false,
        totalCpuQuota: 80,
        totalMemoryQuota: 160,
        totalDiskQuota: 400,
        suspended: true,
        suspendedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        suspensionReason: 'Payment overdue',
      },
    ]
    const organizations = await organizationRepo.save(organizationData)

    // 创建复杂的用户-组织关系
    await orgUserRepo.save([
      // Tech Solutions Inc - 大型团队
      { organizationId: organizations[0].id, userId: 'ceo-user', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[0].id, userId: 'dev-user', role: OrganizationMemberRole.ADMIN },
      { organizationId: organizations[0].id, userId: 'manager-user', role: OrganizationMemberRole.ADMIN },
      { organizationId: organizations[0].id, userId: 'designer-user', role: OrganizationMemberRole.MEMBER },
      { organizationId: organizations[0].id, userId: 'freelancer-user', role: OrganizationMemberRole.MEMBER },

      // Design Studio - 小型团队
      { organizationId: organizations[1].id, userId: 'designer-user', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[1].id, userId: 'freelancer-user', role: OrganizationMemberRole.ADMIN },

      // Alice Personal - 个人组织
      { organizationId: organizations[2].id, userId: 'ceo-user', role: OrganizationMemberRole.OWNER },

      // Startup Project - 被暂停的组织
      { organizationId: organizations[3].id, userId: 'dev-user', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[3].id, userId: 'manager-user', role: OrganizationMemberRole.MEMBER },
    ])

    console.log(chalk.green('✅ 测试数据创建完成'))

    // 1. 基础关系查询 - Eager Loading
    console.log(chalk.cyan('\n🔄 1. Eager Loading - 组织及其用户'))
    const orgsWithUsers = await organizationRepo.find({
      relations: ['users'],
      where: { suspended: false },
      order: { totalCpuQuota: 'DESC' },
    })

    console.log(`   找到 ${orgsWithUsers.length} 个活跃组织:`)
    orgsWithUsers.forEach((org) => {
      console.log(`   🏢 ${org.name} (${org.users.length} 个成员)`)
      org.users.forEach((orgUser) => {
        console.log(`      👤 ${orgUser.userId} - ${orgUser.role}`)
      })
    })

    // 2. 选择性加载特定字段
    console.log(chalk.cyan('\n🎯 2. 选择性加载 - 只获取必要字段'))
    const orgsWithSelectedFields = await organizationRepo.find({
      select: ['id', 'name', 'totalCpuQuota', 'suspended'],
      relations: {
        users: {
          organization: false, // 避免循环引用
        },
      },
      where: { personal: false },
    })

    console.log(`   非个人组织信息:`)
    orgsWithSelectedFields.forEach((org) => {
      console.log(`   📊 ${org.name}: ${org.totalCpuQuota} CPU, ${org.users.length} 成员`)
    })

    // 3. 深度关系查询 - 多层嵌套
    console.log(chalk.cyan('\n🌊 3. 深度关系查询 - 通过中间表查询用户所属组织'))
    const usersWithOrganizations = await userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organizationUsers', 'orgUser')
      .leftJoinAndSelect('orgUser.organization', 'org')
      .where('user.emailVerified = :verified', { verified: true })
      .orderBy('user.name', 'ASC')
      .getMany()

    console.log(`   已验证邮箱的用户及其组织:`)
    usersWithOrganizations.forEach((user) => {
      console.log(`   👤 ${user.name} (${user.email})`)
      if (user.organizationUsers) {
        user.organizationUsers.forEach((orgUser: any) => {
          const status = orgUser.organization.suspended ? '🔒暂停' : '✅活跃'
          console.log(`      🏢 ${orgUser.organization.name} - ${orgUser.role} ${status}`)
        })
      }
    })

    // 4. 反向关系查询
    console.log(chalk.cyan('\n🔄 4. 反向关系查询 - 从关系表查询'))
    const relationshipsWithDetails = await orgUserRepo
      .createQueryBuilder('orgUser')
      .leftJoinAndSelect('orgUser.organization', 'org')
      .leftJoinAndSelect('orgUser.user', 'user')
      .where('orgUser.role IN (:...roles)', { roles: [OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN] })
      .andWhere('org.suspended = :suspended', { suspended: false })
      .orderBy('org.totalCpuQuota', 'DESC')
      .addOrderBy('orgUser.role', 'ASC')
      .getMany()

    console.log(`   活跃组织的管理员关系:`)
    relationshipsWithDetails.forEach((rel) => {
      const userInfo = rel.user ? `${rel.user.name} (${rel.user.email})` : `用户ID: ${rel.userId}`
      console.log(`   🔗 ${rel.organization.name} - ${rel.role}: ${userInfo}`)
    })

    // 5. 聚合关系数据
    console.log(chalk.cyan('\n📊 5. 聚合关系数据 - 统计每个用户的组织参与情况'))
    const userOrgStatistics = await orgUserRepo
      .createQueryBuilder('orgUser')
      .select('orgUser.userId', 'userId')
      .addSelect('COUNT(orgUser.organizationId)', 'totalOrgs')
      .addSelect('COUNT(CASE WHEN orgUser.role = :ownerRole THEN 1 END)', 'ownedOrgs')
      .addSelect('COUNT(CASE WHEN orgUser.role = :adminRole THEN 1 END)', 'adminOrgs')
      .addSelect('COUNT(CASE WHEN org.personal = true THEN 1 END)', 'personalOrgs')
      .addSelect('COUNT(CASE WHEN org.suspended = false THEN 1 END)', 'activeOrgs')
      .leftJoin('orgUser.organization', 'org')
      .setParameters({
        ownerRole: OrganizationMemberRole.OWNER,
        adminRole: OrganizationMemberRole.ADMIN,
      })
      .groupBy('orgUser.userId')
      .orderBy('"totalOrgs"', 'DESC')
      .getRawMany()

    console.log(`   用户组织参与统计:`)
    for (const stat of userOrgStatistics) {
      const user = await userRepo.findOne({ where: { id: stat.userId } })
      console.log(
        `   👤 ${user?.name}: 总计${stat.totalOrgs}, 拥有${stat.ownedOrgs}, 管理${stat.adminOrgs}, 个人${stat.personalOrgs}, 活跃${stat.activeOrgs}`,
      )
    }

    // 6. 条件关系查询
    console.log(chalk.cyan('\n🔍 6. 条件关系查询 - 查找特定条件下的组织'))
    const complexConditionQuery = await organizationRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.users', 'orgUser', 'orgUser.role = :ownerRole', {
        ownerRole: OrganizationMemberRole.OWNER,
      })
      .leftJoin(User, 'owner', 'owner.id = orgUser.userId')
      .addSelect(['owner.id', 'owner.name', 'owner.emailVerified', 'owner.role'])
      .where('org.totalCpuQuota > :minCpu', { minCpu: 75 })
      .andWhere('org.suspended = :suspended', { suspended: false })
      .andWhere('owner.emailVerified = :verified', { verified: true })
      .orderBy('org.totalCpuQuota', 'DESC')
      .getMany()

    console.log(`   高配额且Owner已验证邮箱的组织:`)
    complexConditionQuery.forEach((org) => {
      const owner = org.users[0]
      console.log(`   🏆 ${org.name} (${org.totalCpuQuota} CPU) - Owner: ${owner.userId}`)
    })

    // 7. 关系数据的批量操作
    console.log(chalk.cyan('\n⚡ 7. 关系数据批量操作 - 批量更新用户角色'))
    const membersToPromote = await orgUserRepo.find({
      where: {
        role: OrganizationMemberRole.MEMBER,
        organizationId: organizations[0].id, // Tech Solutions Inc
      },
      take: 2, // 只提升前两个成员
    })

    if (membersToPromote.length > 0) {
      await orgUserRepo.update(
        {
          organizationId: organizations[0].id,
          userId: membersToPromote[0].userId,
        },
        { role: OrganizationMemberRole.ADMIN },
      )

      console.log(`   🎉 将用户 ${membersToPromote[0].userId} 提升为管理员`)
    }

    // 8. 自定义关系查询方法
    console.log(chalk.cyan('\n🎨 8. 自定义关系查询 - 查找用户可访问的所有组织'))
    const getUserAccessibleOrganizations = async (userId: string) => {
      return await organizationRepo
        .createQueryBuilder('org')
        .innerJoin('org.users', 'orgUser', 'orgUser.userId = :userId', { userId })
        .leftJoinAndSelect('org.users', 'allOrgUsers')
        .where('org.suspended = :suspended', { suspended: false })
        .orderBy('org.name', 'ASC')
        .getMany()
    }

    const aliceOrgs = await getUserAccessibleOrganizations('ceo-user')
    console.log(`   Alice (CEO) 可访问的组织:`)
    aliceOrgs.forEach((org) => {
      const aliceRole = org.users.find((u) => u.userId === 'ceo-user')?.role
      console.log(`   🔑 ${org.name} - 身份: ${aliceRole} (${org.users.length} 总成员)`)
    })

    // 9. 关系数据完整性检查
    console.log(chalk.cyan('\n🔒 9. 数据完整性检查 - 孤立记录检测'))

    // 检查没有用户的组织
    const orgsWithoutUsers = await organizationRepo
      .createQueryBuilder('org')
      .leftJoin('org.users', 'orgUser')
      .where('orgUser.organizationId IS NULL')
      .getMany()

    // 检查引用不存在用户的关系记录
    const orphanedRelations = await orgUserRepo
      .createQueryBuilder('orgUser')
      .leftJoin(User, 'user', 'user.id = orgUser.userId')
      .where('user.id IS NULL')
      .getMany()

    console.log(`   数据完整性检查结果:`)
    console.log(`   📋 没有成员的组织: ${orgsWithoutUsers.length} 个`)
    console.log(`   ⚠️  孤立的关系记录: ${orphanedRelations.length} 个`)

    if (orgsWithoutUsers.length > 0) {
      console.log(`   无成员组织列表:`)
      orgsWithoutUsers.forEach((org) => {
        console.log(`      🏢 ${org.name}`)
      })
    }

    // 10. 关系数据的级联操作示例
    console.log(chalk.cyan('\n🌊 10. 级联操作示例 - 演示删除操作'))

    // 创建临时组织用于删除演示
    const tempOrg = await organizationRepo.save({
      name: 'Temporary Organization',
      createdBy: 'ceo-user',
      personal: false,
      totalCpuQuota: 10,
      totalMemoryQuota: 20,
    })

    const tempRelation = await orgUserRepo.save({
      organizationId: tempOrg.id,
      userId: 'ceo-user',
      role: OrganizationMemberRole.OWNER,
    })

    console.log(`   ✅ 创建临时组织: ${tempOrg.name}`)

    // 删除关系（模拟用户离开组织）
    await orgUserRepo.remove(tempRelation)
    console.log(`   🗑️  删除用户关系`)

    // 删除组织
    await organizationRepo.remove(tempOrg)
    console.log(`   🗑️  删除临时组织`)

    // 最终统计
    const finalStats = {
      users: await userRepo.count(),
      organizations: await organizationRepo.count(),
      activeOrganizations: await organizationRepo.count({ where: { suspended: false } }),
      relationships: await orgUserRepo.count(),
      ownerRelationships: await orgUserRepo.count({ where: { role: OrganizationMemberRole.OWNER } }),
    }

    console.log(chalk.green('\n📊 最终关系统计:'))
    console.log(`   👥 用户总数: ${finalStats.users}`)
    console.log(`   🏢 组织总数: ${finalStats.organizations}`)
    console.log(`   ✅ 活跃组织: ${finalStats.activeOrganizations}`)
    console.log(`   🔗 关系总数: ${finalStats.relationships}`)
    console.log(`   👑 拥有者关系: ${finalStats.ownerRelationships}`)

    console.log(chalk.green('\n🎉 关系查询示例演示完成!'))
  } catch (error) {
    console.error(chalk.red('❌ 错误:'), error)
  } finally {
    await dbManager.disconnect()
  }
}

if (require.main === module) {
  relationshipsDemo().catch(console.error)
}

export { relationshipsDemo }
