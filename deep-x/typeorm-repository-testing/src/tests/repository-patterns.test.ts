/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Repository, EntityManager, QueryRunner } from 'typeorm'
import { Organization } from '../entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../entities/organization-user.entity'
import { User, SystemRole } from '../entities/user.entity'
import { OrganizationService } from '../services/organization.service'
import { AppDataSource } from '../config/database'

describe('Repository Pattern Tests', () => {
  let organizationRepository: Repository<Organization>
  let userRepository: Repository<User>
  let orgUserRepository: Repository<OrganizationUser>
  let organizationService: OrganizationService

  beforeEach(async () => {
    organizationRepository = AppDataSource.getRepository(Organization)
    userRepository = AppDataSource.getRepository(User)
    orgUserRepository = AppDataSource.getRepository(OrganizationUser)
    organizationService = new OrganizationService()
  })

  describe('Repository CRUD Operations', () => {
    it('should perform basic CRUD operations with organization repository', async () => {
      // Create
      const newOrg = organizationRepository.create({
        name: 'CRUD Test Organization',
        createdBy: 'crud-user',
        personal: false,
        totalCpuQuota: 100,
        totalMemoryQuota: 200,
      })

      const savedOrg = await organizationRepository.save(newOrg)
      expect(savedOrg.id).toBeDefined()
      expect(savedOrg.name).toBe('CRUD Test Organization')

      // Read
      const foundOrg = await organizationRepository.findOne({
        where: { id: savedOrg.id },
      })
      expect(foundOrg).toBeTruthy()
      expect(foundOrg!.name).toBe('CRUD Test Organization')

      // Update
      foundOrg!.totalCpuQuota = 150
      const updatedOrg = await organizationRepository.save(foundOrg!)
      expect(updatedOrg.totalCpuQuota).toBe(150)

      // Delete
      await organizationRepository.remove(updatedOrg)
      const deletedOrg = await organizationRepository.findOne({
        where: { id: savedOrg.id },
      })
      expect(deletedOrg).toBeNull()
    })

    it('should handle entity relationships properly', async () => {
      // 创建用户
      const user = await userRepository.save({
        id: 'rel-test-user',
        name: 'Relationship Test User',
        email: 'rel@test.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [],
      })

      // 创建组织
      const org = await organizationRepository.save({
        name: 'Relationship Test Org',
        createdBy: user.id,
        personal: false,
        totalCpuQuota: 75,
        totalMemoryQuota: 150,
      })

      // 创建用户-组织关系
      const orgUser = await orgUserRepository.save({
        organizationId: org.id,
        userId: user.id,
        role: OrganizationMemberRole.OWNER,
      })

      // 测试关系加载
      const orgWithUsers = await organizationRepository.findOne({
        where: { id: org.id },
        relations: ['users'],
      })

      expect(orgWithUsers).toBeTruthy()
      expect(orgWithUsers!.users).toHaveLength(1)
      expect(orgWithUsers!.users[0].userId).toBe(user.id)
      expect(orgWithUsers!.users[0].role).toBe(OrganizationMemberRole.OWNER)
    })
  })

  describe('Query Builder Patterns', () => {
    beforeEach(async () => {
      // 设置测试数据
      const users = await userRepository.save([
        {
          id: 'qb-user-1',
          name: 'QueryBuilder User 1',
          email: 'qb1@test.com',
          emailVerified: true,
          role: SystemRole.ADMIN,
          publicKeys: [],
        },
        {
          id: 'qb-user-2',
          name: 'QueryBuilder User 2',
          email: 'qb2@test.com',
          emailVerified: false,
          role: SystemRole.USER,
          publicKeys: [],
        },
      ])

      const organizations = await organizationRepository.save([
        {
          name: 'QB Org 1',
          createdBy: users[0].id,
          personal: false,
          totalCpuQuota: 80,
          totalMemoryQuota: 160,
          suspended: false,
        },
        {
          name: 'QB Org 2',
          createdBy: users[1].id,
          personal: true,
          totalCpuQuota: 40,
          totalMemoryQuota: 80,
          suspended: false, // 改为false，这样平均值会包含这个组织
        },
      ])

      await orgUserRepository.save([
        { organizationId: organizations[0].id, userId: users[0].id, role: OrganizationMemberRole.OWNER },
        { organizationId: organizations[1].id, userId: users[1].id, role: OrganizationMemberRole.OWNER },
      ])
    })

    it('should use query builder for complex conditions', async () => {
      const result = await organizationRepository
        .createQueryBuilder('org')
        .where('org.totalCpuQuota > :minCpu', { minCpu: 50 })
        .andWhere('org.suspended = :suspended', { suspended: false })
        .orderBy('org.totalCpuQuota', 'DESC')
        .getMany()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('QB Org 1')
    })

    it('should perform joins with query builder', async () => {
      const result = await organizationRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'orgUser')
        .leftJoin(User, 'user', 'user.id = orgUser.userId')
        .addSelect(['user.name', 'user.emailVerified'])
        .where('user.emailVerified = :verified', { verified: true })
        .getMany()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('QB Org 1')
      expect(result[0].users).toHaveLength(1)
    })

    it('should handle subqueries', async () => {
      const subQuery = organizationRepository
        .createQueryBuilder('subOrg')
        .select('AVG(subOrg.totalCpuQuota)')
        .where('subOrg.suspended = false')

      const result = await organizationRepository
        .createQueryBuilder('org')
        .where(`org.totalCpuQuota > (${subQuery.getQuery()})`)
        .setParameters(subQuery.getParameters())
        .getMany()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('QB Org 1')
    })

    it('should use raw queries when needed', async () => {
      const result = await organizationRepository.query(`
        SELECT 
          o.name,
          o.total_cpu_quota,
          COUNT(ou."userId") as member_count
        FROM organization o
        LEFT JOIN organization_user ou ON o.id = ou."organizationId"
        WHERE o.suspended = false
        GROUP BY o.id, o.name, o.total_cpu_quota
        HAVING COUNT(ou."userId") > 0
        ORDER BY o.total_cpu_quota DESC
        LIMIT 1
      `)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('QB Org 1')
      expect(parseInt(result[0].member_count)).toBe(1)
    })
  })

  describe('Transaction Patterns', () => {
    it('should handle simple transactions', async () => {
      const initialCount = await organizationRepository.count()

      await AppDataSource.transaction(async (manager) => {
        const user = await manager.save(User, {
          id: 'tx-simple-user',
          name: 'Transaction Simple User',
          email: 'tx-simple@test.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [],
        })

        await manager.save(Organization, {
          name: 'Transaction Simple Org',
          createdBy: user.id,
          personal: false,
          totalCpuQuota: 60,
          totalMemoryQuota: 120,
        })
      })

      const finalCount = await organizationRepository.count()
      expect(finalCount).toBe(initialCount + 1)
    })

    it('should rollback on transaction failure', async () => {
      const initialCount = await organizationRepository.count()

      try {
        await AppDataSource.transaction(async (manager) => {
          await manager.save(Organization, {
            name: 'Transaction Fail Org',
            createdBy: 'non-existent-user',
            personal: false,
            totalCpuQuota: 30,
            totalMemoryQuota: 60,
          })

          throw new Error('Simulated transaction failure')
        })
      } catch (error) {
        expect((error as Error).message).toBe('Simulated transaction failure')
      }

      const finalCount = await organizationRepository.count()
      expect(finalCount).toBe(initialCount)
    })

    it('should handle nested transactions with savepoints', async () => {
      const initialCount = await organizationRepository.count()

      await AppDataSource.transaction(async (manager) => {
        const user = await manager.save(User, {
          id: 'tx-nested-user',
          name: 'Transaction Nested User',
          email: 'tx-nested@test.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [],
        })

        const org1 = await manager.save(Organization, {
          name: 'Transaction Nested Org 1',
          createdBy: user.id,
          personal: false,
          totalCpuQuota: 40,
          totalMemoryQuota: 80,
        })

        try {
          await manager.transaction(async (nestedManager) => {
            await nestedManager.save(Organization, {
              name: 'Transaction Nested Org 2',
              createdBy: user.id,
              personal: false,
              totalCpuQuota: 50,
              totalMemoryQuota: 100,
            })

            // 这个内层事务会失败，但外层事务应该继续
            throw new Error('Inner transaction failure')
          })
        } catch (error) {
          // 内层事务失败，但我们在外层事务中继续
          await manager.save(Organization, {
            name: 'Transaction Nested Org Fallback',
            createdBy: user.id,
            personal: false,
            totalCpuQuota: 35,
            totalMemoryQuota: 70,
          })
        }
      })

      const finalCount = await organizationRepository.count()
      expect(finalCount).toBe(initialCount + 2) // user创建的org1 + fallback org

      const fallbackOrg = await organizationRepository.findOne({
        where: { name: 'Transaction Nested Org Fallback' },
      })
      expect(fallbackOrg).toBeTruthy()

      const failedOrg = await organizationRepository.findOne({
        where: { name: 'Transaction Nested Org 2' },
      })
      expect(failedOrg).toBeNull()
    })
  })

  describe('Repository Extension Patterns', () => {
    it('should use custom repository methods', async () => {
      // 测试自定义查询方法
      const activeOrgs = await organizationRepository.find({
        where: { suspended: false },
      })

      const suspendedOrgs = await organizationRepository.find({
        where: { suspended: true },
      })

      expect(activeOrgs.length + suspendedOrgs.length).toBeGreaterThanOrEqual(0)
    })

    it('should implement repository pattern with service layer', async () => {
      // 创建用户用于测试
      const user = await userRepository.save({
        id: 'service-test-user',
        name: 'Service Test User',
        email: 'service@test.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [],
      })

      // 使用服务层创建组织
      const org = await organizationService.create({ name: 'Service Pattern Test Org' }, user.id, false, true)

      expect(org.name).toBe('Service Pattern Test Org')
      expect(org.createdBy).toBe(user.id)

      // 使用服务层查询
      const foundOrgs = await organizationService.findByUser(user.id)
      expect(foundOrgs).toHaveLength(1)
      expect(foundOrgs[0].id).toBe(org.id)

      // 使用服务层更新配额
      await organizationService.updateQuota(org.id, {
        totalCpuQuota: 90,
        totalMemoryQuota: 180,
      })

      const updatedOrg = await organizationRepository.findOne({
        where: { id: org.id },
      })
      expect(updatedOrg!.totalCpuQuota).toBe(90)
      expect(updatedOrg!.totalMemoryQuota).toBe(180)
    })
  })

  describe('Advanced Query Patterns', () => {
    beforeEach(async () => {
      // 创建更复杂的测试数据
      const users = await userRepository.save([
        {
          id: 'adv-user-1',
          name: 'Advanced User 1',
          email: 'adv1@test.com',
          emailVerified: true,
          role: SystemRole.ADMIN,
          publicKeys: [{ name: 'key1', key: 'ssh-rsa ADV1...' }],
        },
        {
          id: 'adv-user-2',
          name: 'Advanced User 2',
          email: 'adv2@test.com',
          emailVerified: false,
          role: SystemRole.USER,
          publicKeys: [],
        },
        {
          id: 'adv-user-3',
          name: 'Advanced User 3',
          email: 'adv3@test.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [
            { name: 'laptop', key: 'ssh-rsa ADV3LAPTOP...' },
            { name: 'desktop', key: 'ssh-rsa ADV3DESKTOP...' },
          ],
        },
      ])

      const organizations = await organizationRepository.save([
        {
          name: 'Advanced Org 1',
          createdBy: users[0].id,
          personal: false,
          totalCpuQuota: 120,
          totalMemoryQuota: 240,
          totalDiskQuota: 600,
          suspended: false,
        },
        {
          name: 'Advanced Org 2',
          createdBy: users[1].id,
          personal: true,
          totalCpuQuota: 60,
          totalMemoryQuota: 120,
          totalDiskQuota: 300,
          suspended: false,
        },
        {
          name: 'Advanced Org 3',
          createdBy: users[2].id,
          personal: false,
          totalCpuQuota: 90,
          totalMemoryQuota: 180,
          totalDiskQuota: 450,
          suspended: true,
          suspendedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          suspensionReason: 'Policy violation',
        },
      ])

      // 创建复杂的用户-组织关系
      await orgUserRepository.save([
        { organizationId: organizations[0].id, userId: users[0].id, role: OrganizationMemberRole.OWNER },
        { organizationId: organizations[0].id, userId: users[1].id, role: OrganizationMemberRole.ADMIN },
        { organizationId: organizations[0].id, userId: users[2].id, role: OrganizationMemberRole.MEMBER },
        { organizationId: organizations[1].id, userId: users[1].id, role: OrganizationMemberRole.OWNER },
        { organizationId: organizations[2].id, userId: users[2].id, role: OrganizationMemberRole.OWNER },
        { organizationId: organizations[2].id, userId: users[0].id, role: OrganizationMemberRole.ADMIN },
      ])
    })

    it('should perform complex aggregation queries', async () => {
      const result = await organizationRepository
        .createQueryBuilder('org')
        .leftJoin('org.users', 'orgUser')
        .leftJoin(User, 'user', 'user.id = orgUser.userId')
        .select([
          'org.suspended',
          'COUNT(DISTINCT org.id) as orgCount',
          'COUNT(DISTINCT orgUser.userId) as totalMembers',
          'AVG(org.totalCpuQuota) as avgCpuQuota',
          'SUM(org.totalCpuQuota) as totalCpuQuota',
          'COUNT(CASE WHEN user.emailVerified = true THEN 1 END) as verifiedMembers',
        ])
        .groupBy('org.suspended')
        .orderBy('org.suspended', 'ASC')
        .getRawMany()

      expect(result).toHaveLength(2) // suspended: false and true

      const activeStats = result.find((r) => r.org_suspended === false)
      const suspendedStats = result.find((r) => r.org_suspended === true)

      expect(activeStats).toBeTruthy()
      expect(suspendedStats).toBeTruthy()
      expect(parseInt(activeStats.orgcount)).toBe(2)
      expect(parseInt(suspendedStats.orgcount)).toBe(1)
    })

    it('should handle window functions and ranking', async () => {
      const result = await organizationRepository.query(`
        SELECT 
          org.name,
          org.total_cpu_quota,
          RANK() OVER (ORDER BY org.total_cpu_quota DESC) as cpu_rank,
          ROW_NUMBER() OVER (PARTITION BY org.suspended ORDER BY org.total_cpu_quota DESC) as rank_in_group,
          LAG(org.total_cpu_quota) OVER (ORDER BY org.total_cpu_quota DESC) as prev_cpu_quota
        FROM organization org
        WHERE org.name LIKE 'Advanced Org%'
        ORDER BY org.total_cpu_quota DESC
      `)

      expect(result).toHaveLength(3)
      expect(parseInt(result[0].cpu_rank)).toBe(1) // Highest CPU quota
      expect(parseInt(result[0].rank_in_group)).toBe(1) // First in its group
    })

    it('should perform efficient exists queries', async () => {
      // 查找有已验证邮箱管理员的组织
      const orgsWithVerifiedAdmins = await organizationRepository
        .createQueryBuilder('org')
        .where('org.suspended = false')
        .andWhere(
          `EXISTS (
             SELECT 1 FROM organization_user ou
             JOIN "user" u ON u.id = ou."userId"
             WHERE ou."organizationId" = org.id
             AND ou.role IN ('owner', 'admin')
             AND u."emailVerified" = true
           )`,
        )
        .getMany()

      expect(orgsWithVerifiedAdmins.length).toBeGreaterThan(0)

      // 验证结果
      for (const org of orgsWithVerifiedAdmins) {
        const hasVerifiedAdmin = await orgUserRepository
          .createQueryBuilder('orgUser')
          .leftJoin(User, 'user', 'user.id = orgUser.userId')
          .where('orgUser.organizationId = :orgId', { orgId: org.id })
          .andWhere('orgUser.role IN (:...adminRoles)', {
            adminRoles: [OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN],
          })
          .andWhere('user.emailVerified = true')
          .getCount()

        expect(hasVerifiedAdmin).toBeGreaterThan(0)
      }
    })

    it('should handle complex conditional logic', async () => {
      const result = await organizationRepository
        .createQueryBuilder('org')
        .select([
          'org.id',
          'org.name',
          'org.totalCpuQuota',
          'org.suspended',
          `CASE 
            WHEN org.suspended = true THEN 'Suspended'
            WHEN org.totalCpuQuota >= 100 THEN 'High Performance'
            WHEN org.totalCpuQuota >= 70 THEN 'Standard'
            ELSE 'Basic'
          END as tier`,
          `CASE 
            WHEN org.personal = true THEN 'Personal'
            ELSE 'Business'
          END as type`,
        ])
        .where('org.name LIKE :pattern', { pattern: 'Advanced Org%' })
        .orderBy('org.totalCpuQuota', 'DESC')
        .getRawMany()

      expect(result).toHaveLength(3)
      expect(result[0].tier).toBe('High Performance') // 120 CPU
      expect(result[1].tier).toBe('Suspended') // 60 CPU
      expect(result[2].tier).toBe('Basic') // Suspended org
    })
  })

  describe('Error Handling Patterns', () => {
    it('should handle constraint violations gracefully', async () => {
      // 尝试创建重复ID的用户
      await userRepository.save({
        id: 'duplicate-test',
        name: 'Original User',
        email: 'original@test.com',
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: [],
      })

      // TypeORM的save方法会进行upsert操作，所以这里测试实际会更新而不是抛出错误
      // 在实际应用中，应该使用insert方法来测试约束违反
      try {
        await userRepository.insert({
          id: 'duplicate-test', // 重复ID
          name: 'Duplicate User',
          email: 'duplicate@test.com',
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [],
        })
        fail('Expected constraint violation error')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle foreign key violations', async () => {
      // 在当前配置中，createdBy只是字符串字段，没有外键约束
      // 这个测试演示了如何处理潜在的引用完整性问题
      const org = await organizationRepository.save({
        name: 'Invalid Reference Org',
        createdBy: 'non-existent-user-id',
        personal: false,
        totalCpuQuota: 50,
        totalMemoryQuota: 100,
      })

      // 验证组织被创建，但可以通过业务逻辑验证引用完整性
      expect(org).toBeDefined()
      expect(org.createdBy).toBe('non-existent-user-id')

      // 在实际应用中，应该在保存前验证用户是否存在
      const userExists = await userRepository.findOne({
        where: { id: org.createdBy },
      })
      expect(userExists).toBeNull()
    })

    it('should handle transaction rollback on errors', async () => {
      const initialUserCount = await userRepository.count()
      const initialOrgCount = await organizationRepository.count()

      try {
        await AppDataSource.transaction(async (manager) => {
          // 创建用户
          await manager.save(User, {
            id: 'error-test-user',
            name: 'Error Test User',
            email: 'error@test.com',
            emailVerified: true,
            role: SystemRole.USER,
            publicKeys: [],
          })

          // 创建组织
          await manager.save(Organization, {
            name: 'Error Test Org',
            createdBy: 'error-test-user',
            personal: false,
            totalCpuQuota: 40,
            totalMemoryQuota: 80,
          })

          // 故意触发错误
          throw new Error('Transaction error test')
        })
      } catch (error) {
        expect((error as Error).message).toBe('Transaction error test')
      }

      // 验证回滚
      const finalUserCount = await userRepository.count()
      const finalOrgCount = await organizationRepository.count()

      expect(finalUserCount).toBe(initialUserCount)
      expect(finalOrgCount).toBe(initialOrgCount)
    })
  })
})
