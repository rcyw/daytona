/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Repository } from 'typeorm'
import { Organization } from '../entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../entities/organization-user.entity'
import { User, SystemRole } from '../entities/user.entity'
import { AppDataSource } from '../config/database'
import { In, Like } from 'typeorm'

describe('Performance Tests', () => {
  let organizationRepository: Repository<Organization>
  let userRepository: Repository<User>
  let orgUserRepository: Repository<OrganizationUser>

  beforeEach(async () => {
    organizationRepository = AppDataSource.getRepository(Organization)
    userRepository = AppDataSource.getRepository(User)
    orgUserRepository = AppDataSource.getRepository(OrganizationUser)
  })

  describe('Batch Operations Performance', () => {
    it('should efficiently create multiple users in batch', async () => {
      const batchSize = parseInt(process.env.PERFORMANCE_TEST_BATCH_SIZE || '100')
      const startTime = Date.now()

      // 准备批量数据
      const userData = []
      for (let i = 1; i <= batchSize; i++) {
        userData.push({
          id: `perf-user-${i}`,
          name: `Performance User ${i}`,
          email: `perfuser${i}@test.com`,
          emailVerified: i % 2 === 0, // 偶数用户邮箱已验证
          role: i <= 5 ? SystemRole.ADMIN : SystemRole.USER, // 前5个是管理员
          publicKeys: [{ name: `key-${i}`, key: `ssh-rsa PERF${i}...` }],
        })
      }

      // 批量创建
      const users = await userRepository.save(userData)
      const duration = Date.now() - startTime

      expect(users).toHaveLength(batchSize)

      console.log(`📊 批量创建 ${batchSize} 个用户耗时: ${duration}ms (平均 ${Math.round(duration / batchSize)}ms/个)`)
    }, 10000)

    it('should efficiently create multiple organizations in batch', async () => {
      const batchSize = parseInt(process.env.PERFORMANCE_TEST_BATCH_SIZE || '100')

      // 先创建一个用户作为创建者
      const creator = await userRepository.save({
        id: 'batch-creator',
        name: 'Batch Creator',
        email: 'creator@batch.com',
        emailVerified: true,
        role: SystemRole.ADMIN,
        publicKeys: [],
      })

      const startTime = Date.now()

      // 准备批量数据
      const orgData = []
      for (let i = 1; i <= batchSize; i++) {
        orgData.push({
          name: `Performance Org ${i}`,
          createdBy: creator.id,
          personal: i % 10 === 0, // 每10个中有1个是个人组织
          totalCpuQuota: 10 + (i % 50), // 10-59 范围
          totalMemoryQuota: 20 + (i % 100), // 20-119 范围
          totalDiskQuota: 50 + (i % 200), // 50-249 范围
          maxCpuPerSandbox: Math.min(16, 2 + (i % 8)), // 2-16 范围
          maxMemoryPerSandbox: Math.min(32, 4 + (i % 16)), // 4-32 范围
        })
      }

      // 批量创建
      const organizations = await organizationRepository.save(orgData)
      const duration = Date.now() - startTime

      expect(organizations).toHaveLength(batchSize)

      console.log(`📊 批量创建 ${batchSize} 个组织耗时: ${duration}ms (平均 ${Math.round(duration / batchSize)}ms/个)`)
    }, 15000)

    it('should efficiently create multiple relationships in batch', async () => {
      const userCount = 20
      const orgCount = 10

      // 创建用户
      const userData = []
      for (let i = 1; i <= userCount; i++) {
        userData.push({
          id: `rel-user-${i}`,
          name: `Rel User ${i}`,
          email: `reluser${i}@test.com`,
          emailVerified: true,
          role: SystemRole.USER,
          publicKeys: [],
        })
      }
      const users = await userRepository.save(userData)

      // 创建组织
      const orgData = []
      for (let i = 1; i <= orgCount; i++) {
        orgData.push({
          name: `Rel Org ${i}`,
          createdBy: users[0].id,
          personal: false,
          totalCpuQuota: 50,
          totalMemoryQuota: 100,
        })
      }
      const organizations = await organizationRepository.save(orgData)

      const startTime = Date.now()

      // 创建关系 - 每个组织都有多个用户
      const relationshipData: Partial<OrganizationUser>[] = []
      organizations.forEach((org, orgIndex) => {
        users.forEach((user, userIndex) => {
          if (userIndex < 5 || userIndex % (orgIndex + 1) === 0) {
            // 每个组织至少5个用户，然后按规律分配
            let role = OrganizationMemberRole.MEMBER
            if (userIndex === 0) role = OrganizationMemberRole.OWNER
            else if (userIndex <= 2) role = OrganizationMemberRole.ADMIN

            relationshipData.push({
              organizationId: org.id,
              userId: user.id,
              role,
            })
          }
        })
      })

      const relationships = await orgUserRepository.save(relationshipData)
      const duration = Date.now() - startTime

      expect(relationships.length).toBeGreaterThan(50) // 应该有很多关系

      console.log(
        `📊 批量创建 ${relationships.length} 个关系耗时: ${duration}ms (平均 ${Math.round(duration / relationships.length)}ms/个)`,
      )
    }, 15000)
  })

  describe('Query Performance', () => {
    beforeEach(async () => {
      // 为查询性能测试准备数据
      const users = await userRepository.save(
        Array.from({ length: 50 }, (_, i) => ({
          id: `query-user-${i + 1}`,
          name: `Query User ${i + 1}`,
          email: `queryuser${i + 1}@test.com`,
          emailVerified: (i + 1) % 3 === 0,
          role: i + 1 <= 5 ? SystemRole.ADMIN : SystemRole.USER,
          publicKeys: [],
        })),
      )

      const organizations = await organizationRepository.save(
        Array.from({ length: 30 }, (_, i) => ({
          name: `Query Org ${i + 1}`,
          createdBy: users[i % users.length].id,
          personal: (i + 1) % 5 === 0,
          totalCpuQuota: 20 + i * 3,
          totalMemoryQuota: 40 + i * 6,
          totalDiskQuota: 100 + i * 15,
          suspended: (i + 1) % 7 === 0, // 每7个中有1个被暂停
        })),
      )

      // 创建关系
      const relationships: Partial<OrganizationUser>[] = []
      organizations.forEach((org, orgIndex) => {
        const userCount = Math.min(5 + (orgIndex % 3), users.length)
        for (let i = 0; i < userCount; i++) {
          const user = users[(orgIndex + i) % users.length]
          relationships.push({
            organizationId: org.id,
            userId: user.id,
            role:
              i === 0
                ? OrganizationMemberRole.OWNER
                : i === 1
                  ? OrganizationMemberRole.ADMIN
                  : OrganizationMemberRole.MEMBER,
          })
        }
      })
      await orgUserRepository.save(relationships)
    })

    it('should perform basic queries efficiently', async () => {
      const iterations = parseInt(process.env.PERFORMANCE_TEST_ITERATIONS || '100')
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        // 基础查询 - 查找活跃组织
        await organizationRepository.find({
          where: { suspended: false },
          take: 10,
        })
      }

      const duration = Date.now() - startTime

      console.log(
        `📊 执行 ${iterations} 次基础查询耗时: ${duration}ms (平均 ${Math.round(duration / iterations)}ms/次)`,
      )
    })

    it('should perform complex joins efficiently', async () => {
      const iterations = parseInt(process.env.PERFORMANCE_TEST_ITERATIONS || '50')
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        // 复杂连接查询
        await organizationRepository
          .createQueryBuilder('org')
          .leftJoinAndSelect('org.users', 'orgUser')
          .leftJoin(User, 'user', 'user.id = orgUser.userId')
          .addSelect(['user.name', 'user.email'])
          .where('org.suspended = :suspended', { suspended: false })
          .andWhere('org.totalCpuQuota > :minCpu', { minCpu: 50 })
          .orderBy('org.totalCpuQuota', 'DESC')
          .take(5)
          .getMany()
      }

      const duration = Date.now() - startTime

      console.log(
        `📊 执行 ${iterations} 次复杂连接查询耗时: ${duration}ms (平均 ${Math.round(duration / iterations)}ms/次)`,
      )
    })

    it('should perform aggregation queries efficiently', async () => {
      const iterations = parseInt(process.env.PERFORMANCE_TEST_ITERATIONS || '100')
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        // 聚合查询
        await organizationRepository
          .createQueryBuilder('org')
          .select([
            'COUNT(*) as totalOrgs',
            'COUNT(CASE WHEN org.suspended = false THEN 1 END) as activeOrgs',
            'AVG(org.totalCpuQuota) as avgCpuQuota',
            'MAX(org.totalCpuQuota) as maxCpuQuota',
            'MIN(org.totalCpuQuota) as minCpuQuota',
          ])
          .getRawOne()
      }

      const duration = Date.now() - startTime

      console.log(
        `📊 执行 ${iterations} 次聚合查询耗时: ${duration}ms (平均 ${Math.round(duration / iterations)}ms/次)`,
      )
    })

    it('should perform pagination efficiently', async () => {
      const pageSize = 10
      const totalPages = 5
      const startTime = Date.now()

      for (let page = 0; page < totalPages; page++) {
        await organizationRepository.find({
          order: { createdAt: 'DESC' },
          skip: page * pageSize,
          take: pageSize,
        })
      }

      const duration = Date.now() - startTime

      console.log(`📊 分页查询 ${totalPages} 页 (每页${pageSize}条) 耗时: ${duration}ms`)
    })
  })

  describe('Bulk Operations Performance', () => {
    it('should efficiently update multiple records', async () => {
      // 创建测试数据
      const organizations = await organizationRepository.save(
        Array.from({ length: 100 }, (_, i) => ({
          name: `Bulk Update Org ${i + 1}`,
          createdBy: 'bulk-user',
          personal: false,
          totalCpuQuota: 50,
          totalMemoryQuota: 100,
        })),
      )

      const startTime = Date.now()

      // 批量更新
      const orgIds = organizations.map((org) => org.id)
      await organizationRepository.update(
        { id: In(orgIds) },
        {
          totalCpuQuota: 75,
          totalMemoryQuota: 150,
        },
      )

      const duration = Date.now() - startTime

      // 验证更新
      const updatedOrgs = await organizationRepository.find({
        where: { id: In(orgIds) },
      })

      updatedOrgs.forEach((org) => {
        expect(org.totalCpuQuota).toBe(75)
        expect(org.totalMemoryQuota).toBe(150)
      })

      console.log(`📊 批量更新 ${organizations.length} 个组织耗时: ${duration}ms`)
    })

    it('should efficiently delete multiple records', async () => {
      // 创建测试数据
      const organizations = await organizationRepository.save(
        Array.from({ length: 50 }, (_, i) => ({
          name: `Bulk Delete Org ${i + 1}`,
          createdBy: 'bulk-user',
          personal: false,
          totalCpuQuota: 30,
          totalMemoryQuota: 60,
        })),
      )

      const startTime = Date.now()

      // 批量删除 - 删除一半
      const orgIdsToDelete = organizations.slice(0, 25).map((org) => org.id)
      await organizationRepository.delete({ id: In(orgIdsToDelete) })

      const duration = Date.now() - startTime

      // 验证删除
      const remainingOrgs = await organizationRepository.find({
        where: { name: Like('Bulk Delete Org%') },
      })

      expect(remainingOrgs).toHaveLength(25)

      console.log(`📊 批量删除 ${orgIdsToDelete.length} 个组织耗时: ${duration}ms`)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      // 创建大量数据
      const batchSize = 500
      const userData = Array.from({ length: batchSize }, (_, i) => ({
        id: `mem-user-${i + 1}`,
        name: `Memory Test User ${i + 1}`,
        email: `memuser${i + 1}@test.com`,
        emailVerified: true,
        role: SystemRole.USER,
        publicKeys: Array.from({ length: 3 }, (_, j) => ({
          name: `key-${i + 1}-${j + 1}`,
          key: `ssh-rsa MEMORY${i + 1}${j + 1}...`,
        })),
      }))

      await userRepository.save(userData)

      const startTime = Date.now()
      const memBefore = process.memoryUsage()

      // 查询大量数据
      const users = await userRepository.find({
        order: { name: 'ASC' },
      })

      const memAfter = process.memoryUsage()
      const duration = Date.now() - startTime

      expect(users).toHaveLength(batchSize)

      const memUsed = memAfter.heapUsed - memBefore.heapUsed
      const memUsedMB = Math.round(memUsed / 1024 / 1024)

      console.log(`📊 查询 ${batchSize} 个用户耗时: ${duration}ms, 内存使用: ${memUsedMB}MB`)
    }, 10000)

    it('should use streams for large datasets', async () => {
      // 创建数据
      const organizations = await organizationRepository.save(
        Array.from({ length: 200 }, (_, i) => ({
          name: `Stream Org ${i + 1}`,
          createdBy: 'stream-user',
          personal: false,
          totalCpuQuota: 25 + i,
          totalMemoryQuota: 50 + i * 2,
        })),
      )

      const startTime = Date.now()
      let processedCount = 0

      // 使用 QueryBuilder 的流式处理
      const stream = await organizationRepository
        .createQueryBuilder('org')
        .where('org.totalCpuQuota > :minCpu', { minCpu: 100 })
        .stream()

      return new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => {
          processedCount++
          // 模拟处理每条记录
        })

        stream.on('end', () => {
          const duration = Date.now() - startTime
          expect(processedCount).toBeGreaterThan(0)

          console.log(`📊 流式处理 ${processedCount} 个组织耗时: ${duration}ms`)
          resolve()
        })

        stream.on('error', reject)
      })
    })
  })
})
