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

async function complexQueriesDemo() {
  console.log(chalk.blue('🔍 TypeORM 复杂查询示例'))
  console.log('='.repeat(50))

  const dbManager = DatabaseManager.getInstance()

  try {
    console.log(chalk.yellow('📦 连接数据库...'))
    const dataSource = await dbManager.connect()

    const organizationRepo = dataSource.getRepository(Organization)
    const userRepo = dataSource.getRepository(User)
    const orgUserRepo = dataSource.getRepository(OrganizationUser)

    // 清理并设置测试数据
    await dbManager.clearDatabase()
    console.log(chalk.green('🧹 数据库已清理'))

    // 创建测试数据
    await userRepo.save([
      {
        id: 'admin-1',
        name: 'Super Admin',
        email: 'admin@company.com',
        emailVerified: true,
        role: SystemRole.ADMIN,
        publicKeys: [{ name: 'admin-key', key: 'ssh-rsa ADMIN...' }],
      },
      {
        id: 'user-1',
        name: 'Alice Smith',
        email: 'alice@company.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'alice-key', key: 'ssh-rsa ALICE...' }],
      },
      {
        id: 'user-2',
        name: 'Bob Johnson',
        email: 'bob@company.com',
        emailVerified: false,
        role: SystemRole.USER,
        publicKeys: [],
      },
      {
        id: 'user-3',
        name: 'Charlie Brown',
        email: 'charlie@company.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [{ name: 'charlie-key', key: 'ssh-rsa CHARLIE...' }],
      },
    ])

    const organizationData: Partial<Organization>[] = [
      {
        name: 'Tech Corp',
        createdBy: 'admin-1',
        personal: false,
        totalCpuQuota: 100,
        totalMemoryQuota: 200,
        totalDiskQuota: 500,
        maxCpuPerSandbox: 16,
        maxMemoryPerSandbox: 32,
        suspended: false,
      },
      {
        name: 'Startup Inc',
        createdBy: 'user-1',
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
        createdBy: 'user-1',
        personal: true,
        totalCpuQuota: 20,
        totalMemoryQuota: 40,
        totalDiskQuota: 100,
        maxCpuPerSandbox: 4,
        maxMemoryPerSandbox: 8,
        suspended: false,
      },
      {
        name: 'Suspended Org',
        createdBy: 'user-2',
        personal: false,
        totalCpuQuota: 30,
        totalMemoryQuota: 60,
        totalDiskQuota: 150,
        suspended: true,
        suspendedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        suspensionReason: 'Policy violation',
      },
    ]
    const organizations = await organizationRepo.save(organizationData)

    // 创建组织用户关系
    await orgUserRepo.save([
      { organizationId: organizations[0].id, userId: 'admin-1', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[0].id, userId: 'user-1', role: OrganizationMemberRole.ADMIN },
      { organizationId: organizations[0].id, userId: 'user-2', role: OrganizationMemberRole.MEMBER },
      { organizationId: organizations[1].id, userId: 'user-1', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[1].id, userId: 'user-3', role: OrganizationMemberRole.MEMBER },
      { organizationId: organizations[2].id, userId: 'user-1', role: OrganizationMemberRole.OWNER },
      { organizationId: organizations[3].id, userId: 'user-2', role: OrganizationMemberRole.OWNER },
    ])

    console.log(chalk.green('✅ 测试数据创建完成'))

    // 1. 复杂的JOIN查询
    console.log(chalk.cyan('\n🔗 1. 复杂JOIN查询 - 查找活跃组织及其管理员信息'))
    const activeOrgsWithAdmins = await organizationRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.users', 'orgUser', 'orgUser.role IN (:...adminRoles)', {
        adminRoles: [OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN],
      })
      .leftJoin(User, 'user', 'user.id = orgUser.userId')
      .addSelect(['user.id', 'user.name', 'user.email', 'user.emailVerified'])
      .where('org.suspended = :suspended', { suspended: false })
      .andWhere('org.personal = :personal', { personal: false })
      .orderBy('org.totalCpuQuota', 'DESC')
      .getMany()

    console.log(`   找到 ${activeOrgsWithAdmins.length} 个活跃的非个人组织:`)
    activeOrgsWithAdmins.forEach((org) => {
      console.log(`   📊 ${org.name} (CPU: ${org.totalCpuQuota})`)
      org.users.forEach((orgUser) => {
        console.log(`      👤 ${orgUser.role}: ${orgUser.userId}`)
      })
    })

    // 2. 子查询示例
    console.log(chalk.cyan('\n🎯 2. 子查询 - 查找CPU配额高于平均值的组织'))
    const avgCpuSubquery = organizationRepo
      .createQueryBuilder('avgOrg')
      .select('AVG(avgOrg.totalCpuQuota)', 'avgCpu')
      .where('avgOrg.suspended = false')

    const aboveAverageOrgs = await organizationRepo
      .createQueryBuilder('org')
      .where(`org.totalCpuQuota > (${avgCpuSubquery.getQuery()})`)
      .setParameters(avgCpuSubquery.getParameters())
      .andWhere('org.suspended = false')
      .orderBy('org.totalCpuQuota', 'DESC')
      .getMany()

    console.log(`   找到 ${aboveAverageOrgs.length} 个CPU配额高于平均值的组织:`)
    aboveAverageOrgs.forEach((org) => {
      console.log(`   📈 ${org.name}: ${org.totalCpuQuota} CPU`)
    })

    // 3. 聚合查询
    console.log(chalk.cyan('\n📊 3. 聚合查询 - 按用户角色统计组织数量'))
    const orgCountByRole = await orgUserRepo
      .createQueryBuilder('orgUser')
      .select('orgUser.role', 'role')
      .addSelect('COUNT(DISTINCT orgUser.organizationId)', 'orgCount')
      .addSelect('COUNT(orgUser.userId)', 'memberCount')
      .leftJoin('orgUser.organization', 'org')
      .where('org.suspended = false')
      .groupBy('orgUser.role')
      .orderBy('"orgCount"', 'DESC')
      .getRawMany()

    console.log('   角色统计:')
    orgCountByRole.forEach((stat) => {
      console.log(
        `   🏷️  ${stat.role}: ${stat.orgCount || stat.orgcount} 个组织, ${stat.memberCount || stat.membercount} 个成员`,
      )
    })

    // 4. 窗口函数示例 (如果支持)
    console.log(chalk.cyan('\n🪟 4. 排名查询 - 组织CPU配额排名'))
    const rankedOrganizations = await organizationRepo
      .createQueryBuilder('org')
      .select(['org.id', 'org.name', 'org.totalCpuQuota', 'RANK() OVER (ORDER BY org.totalCpuQuota DESC) as rank'])
      .where('org.suspended = false')
      .orderBy('org.totalCpuQuota', 'DESC')
      .getRawMany()

    console.log('   CPU配额排名:')
    rankedOrganizations.forEach((org) => {
      console.log(`   🏆 #${org.rank}: ${org.org_name} (${org.org_total_cpu_quota || org.org_totalCpuQuota} CPU)`)
    })

    // 5. 条件聚合
    console.log(chalk.cyan('\n🔄 5. 条件聚合 - 用户组织参与统计'))
    const userOrgStats = await userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.role',
        'COUNT(orgUser.organizationId) as totalOrgs',
        'COUNT(CASE WHEN org.personal = true THEN 1 END) as personalOrgs',
        'COUNT(CASE WHEN org.personal = false THEN 1 END) as businessOrgs',
        'COUNT(CASE WHEN orgUser.role = :ownerRole THEN 1 END) as ownedOrgs',
      ])
      .leftJoin(OrganizationUser, 'orgUser', 'orgUser.userId = user.id')
      .leftJoin(Organization, 'org', 'org.id = orgUser.organizationId AND org.suspended = false')
      .setParameter('ownerRole', OrganizationMemberRole.OWNER)
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.role')
      .orderBy('totalOrgs', 'DESC')
      .getRawMany()

    console.log('   用户参与统计:')
    userOrgStats.forEach((stat) => {
      console.log(
        `   👤 ${stat.user_name} (${stat.user_role}): ${stat.totalorgs || stat.totalOrgs} 总数, ${stat.personalorgs || stat.personalOrgs} 个人, ${stat.businessorgs || stat.businessOrgs} 企业, ${stat.ownedorgs || stat.ownedOrgs} 拥有`,
      )
    })

    // 6. 复杂的EXISTS查询
    console.log(chalk.cyan('\n✨ 6. EXISTS查询 - 查找有已验证邮箱管理员的组织'))
    const orgsWithVerifiedAdmins = await organizationRepo
      .createQueryBuilder('org')
      .where('org.suspended = false')
      .andWhere(
        'EXISTS (' +
          'SELECT 1 FROM organization_user ou ' +
          'JOIN "user" u ON u.id = ou."userId" ' +
          'WHERE ou."organizationId" = org.id ' +
          'AND ou.role IN (:...adminRoles) ' +
          'AND u."emailVerified" = true' +
          ')',
      )
      .setParameter('adminRoles', [OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN])
      .getMany()

    console.log(`   找到 ${orgsWithVerifiedAdmins.length} 个有已验证邮箱管理员的组织:`)
    orgsWithVerifiedAdmins.forEach((org) => {
      console.log(`   ✅ ${org.name}`)
    })

    // 7. CASE WHEN 条件查询
    console.log(chalk.cyan('\n🔀 7. 条件分类查询 - 组织规模分类'))
    const orgSizeCategories = await organizationRepo
      .createQueryBuilder('org')
      .select([
        'org.name',
        'org.totalCpuQuota',
        `CASE 
          WHEN org.totalCpuQuota >= 80 THEN 'Large'
          WHEN org.totalCpuQuota >= 40 THEN 'Medium'
          ELSE 'Small'
        END as sizeCategory`,
      ])
      .where('org.suspended = false')
      .orderBy('org.totalCpuQuota', 'DESC')
      .getRawMany()

    console.log('   组织规模分类:')
    orgSizeCategories.forEach((org) => {
      console.log(
        `   📏 ${org.org_name}: ${org.sizecategory} (${org.org_total_cpu_quota || org.org_totalCpuQuota} CPU)`,
      )
    })

    console.log(chalk.green('\n🎉 复杂查询示例演示完成!'))
  } catch (error) {
    console.error(chalk.red('❌ 错误:'), error)
  } finally {
    await dbManager.disconnect()
  }
}

if (require.main === module) {
  complexQueriesDemo().catch(console.error)
}

export { complexQueriesDemo }
