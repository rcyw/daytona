/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Repository } from 'typeorm'
import { Organization } from '../entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../entities/organization-user.entity'
import { User, SystemRole } from '../entities/user.entity'
import { OrganizationService } from '../services/organization.service'
import { AppDataSource } from '../config/database'

describe('Organization Entity and Repository Tests', () => {
  let organizationRepository: Repository<Organization>
  let organizationUserRepository: Repository<OrganizationUser>
  let userRepository: Repository<User>
  let organizationService: OrganizationService

  beforeEach(async () => {
    organizationRepository = AppDataSource.getRepository(Organization)
    organizationUserRepository = AppDataSource.getRepository(OrganizationUser)
    userRepository = AppDataSource.getRepository(User)
    organizationService = new OrganizationService()
  })

  describe('Basic CRUD Operations', () => {
    it('should create an organization', async () => {
      const org = organizationRepository.create({
        name: 'Test Organization',
        createdBy: 'user-1',
        personal: false,
      })

      const savedOrg = await organizationRepository.save(org)

      expect(savedOrg.id).toBeDefined()
      expect(savedOrg.name).toBe('Test Organization')
      expect(savedOrg.createdBy).toBe('user-1')
      expect(savedOrg.personal).toBe(false)
      expect(savedOrg.suspended).toBe(false)
      expect(savedOrg.totalCpuQuota).toBe(10)
    })

    it('should find organization by id', async () => {
      const org = await organizationRepository.save({
        name: 'Find Test Organization',
        createdBy: 'user-1',
        personal: false,
      })

      const foundOrg = await organizationRepository.findOne({
        where: { id: org.id },
      })

      expect(foundOrg).toBeDefined()
      expect(foundOrg!.name).toBe('Find Test Organization')
    })

    it('should update organization', async () => {
      const org = await organizationRepository.save({
        name: 'Original Name',
        createdBy: 'user-1',
        personal: false,
      })

      org.name = 'Updated Name'
      org.totalCpuQuota = 20

      const updatedOrg = await organizationRepository.save(org)

      expect(updatedOrg.name).toBe('Updated Name')
      expect(updatedOrg.totalCpuQuota).toBe(20)
    })

    it('should delete organization', async () => {
      const org = await organizationRepository.save({
        name: 'To Delete',
        createdBy: 'user-1',
        personal: false,
      })

      await organizationRepository.remove(org)

      const foundOrg = await organizationRepository.findOne({
        where: { id: org.id },
      })

      expect(foundOrg).toBeNull()
    })
  })

  describe('Entity Relationships', () => {
    it('should create organization with users', async () => {
      // Create user first
      const user = await userRepository.save({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        publicKeys: [],
      })

      // Create organization
      const org = await organizationRepository.save({
        name: 'Test Organization',
        createdBy: user.id,
        personal: false,
      })

      // Create organization-user relationship
      const orgUser = await organizationUserRepository.save({
        organizationId: org.id,
        userId: user.id,
        role: OrganizationMemberRole.OWNER,
      })

      // Test relationship loading
      const orgWithUsers = await organizationRepository.findOne({
        where: { id: org.id },
        relations: ['users'],
      })

      expect(orgWithUsers).toBeDefined()
      expect(orgWithUsers!.users).toHaveLength(1)
      expect(orgWithUsers!.users[0].userId).toBe(user.id)
      expect(orgWithUsers!.users[0].role).toBe(OrganizationMemberRole.OWNER)
    })

    it('should handle cascade delete of organization users', async () => {
      // Create user and organization
      const user = await userRepository.save({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        publicKeys: [],
      })

      const org = await organizationRepository.save({
        name: 'Test Organization',
        createdBy: user.id,
        personal: false,
        users: [
          {
            organizationId: '', // Will be set automatically
            userId: user.id,
            role: OrganizationMemberRole.OWNER,
          } as OrganizationUser,
        ],
      })

      // Verify organization user was created
      const orgUsers = await organizationUserRepository.find({
        where: { organizationId: org.id },
      })
      expect(orgUsers).toHaveLength(1)

      // Delete organization
      await organizationRepository.remove(org)

      // Verify organization users were also deleted
      const remainingOrgUsers = await organizationUserRepository.find({
        where: { organizationId: org.id },
      })
      expect(remainingOrgUsers).toHaveLength(0)
    })
  })

  describe('Complex Queries', () => {
    beforeEach(async () => {
      // Create test data
      const user1 = await userRepository.save({
        id: 'user-1',
        name: 'User 1',
        email: 'user1@example.com',
        publicKeys: [],
      })

      const user2 = await userRepository.save({
        id: 'user-2',
        name: 'User 2',
        email: 'user2@example.com',
        publicKeys: [],
      })

      const org1 = await organizationRepository.save({
        name: 'Organization 1',
        createdBy: user1.id,
        personal: false,
      })

      const org2 = await organizationRepository.save({
        name: 'Organization 2',
        createdBy: user2.id,
        personal: true,
      })

      await organizationUserRepository.save([
        {
          organizationId: org1.id,
          userId: user1.id,
          role: OrganizationMemberRole.OWNER,
        },
        {
          organizationId: org1.id,
          userId: user2.id,
          role: OrganizationMemberRole.MEMBER,
        },
        {
          organizationId: org2.id,
          userId: user2.id,
          role: OrganizationMemberRole.OWNER,
        },
      ])
    })

    it('should find organizations by user', async () => {
      const orgs = await organizationRepository.find({
        where: {
          users: {
            userId: 'user-2',
          },
        },
        relations: ['users'],
      })

      expect(orgs).toHaveLength(2)
      expect(orgs.some((org) => org.name === 'Organization 1')).toBe(true)
      expect(orgs.some((org) => org.name === 'Organization 2')).toBe(true)
    })

    it('should find personal organizations', async () => {
      const personalOrgs = await organizationRepository.find({
        where: { personal: true },
      })

      expect(personalOrgs).toHaveLength(1)
      expect(personalOrgs[0].name).toBe('Organization 2')
    })

    it('should find organizations by user role', async () => {
      const ownedOrgs = await organizationRepository.find({
        where: {
          users: {
            userId: 'user-1',
            role: OrganizationMemberRole.OWNER,
          },
        },
        relations: ['users'],
      })

      expect(ownedOrgs).toHaveLength(1)
      expect(ownedOrgs[0].name).toBe('Organization 1')
    })

    it('should use query builder for complex conditions', async () => {
      const result = await organizationRepository
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.users', 'orgUser')
        .where('org.personal = :personal', { personal: false })
        .andWhere('orgUser.role = :role', { role: OrganizationMemberRole.OWNER })
        .getMany()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Organization 1')
    })
  })

  describe('Organization Service Tests', () => {
    beforeEach(async () => {
      // Create test user before each service test
      await userRepository.save({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        publicKeys: [],
        role: SystemRole.USER,
      })
    })

    it('should create organization with service', async () => {
      const org = await organizationService.create({ name: 'Service Test Org' }, 'user-1', false, true)

      expect(org.id).toBeDefined()
      expect(org.name).toBe('Service Test Org')
      expect(org.suspended).toBe(false)
      expect(org.users).toHaveLength(1)
      expect(org.users[0].role).toBe(OrganizationMemberRole.OWNER)
    })

    it('should suspend organization without email verification', async () => {
      const org = await organizationService.create(
        { name: 'Unverified Org' },
        'user-1',
        false,
        false, // Not email verified
      )

      expect(org.suspended).toBe(true)
      expect(org.suspensionReason).toBe('Please verify your email address')
    })

    it('should find organizations by user', async () => {
      await organizationService.create({ name: 'User Org 1' }, 'user-1', false, true)

      await organizationService.create({ name: 'User Org 2' }, 'user-1', false, true)

      const orgs = await organizationService.findByUser('user-1')
      expect(orgs).toHaveLength(2)
    })

    it('should prevent creating multiple personal organizations', async () => {
      await organizationService.create({ name: 'Personal 1' }, 'user-1', true, true)

      await expect(organizationService.create({ name: 'Personal 2' }, 'user-1', true, true)).rejects.toThrow(
        'Personal organization already exists',
      )
    })

    it('should suspend and unsuspend organization', async () => {
      const org = await organizationService.create({ name: 'Suspend Test' }, 'user-1', false, true)

      await organizationService.suspend(org.id, 'Test suspension')

      const suspendedOrg = await organizationService.findOne(org.id)
      expect(suspendedOrg!.suspended).toBe(true)
      expect(suspendedOrg!.suspensionReason).toBe('Test suspension')

      await organizationService.unsuspend(org.id)

      const unsuspendedOrg = await organizationService.findOne(org.id)
      expect(unsuspendedOrg!.suspended).toBe(false)
      expect(unsuspendedOrg!.suspensionReason).toBeNull()
    })
  })

  describe('Advanced Repository Patterns', () => {
    it('should test transaction rollback', async () => {
      const initialCount = await organizationRepository.count()

      try {
        await AppDataSource.transaction(async (manager) => {
          await manager.save(Organization, {
            name: 'Transaction Test 1',
            createdBy: 'user-1',
            personal: false,
          })

          await manager.save(Organization, {
            name: 'Transaction Test 2',
            createdBy: 'user-1',
            personal: false,
          })

          // Force rollback
          throw new Error('Rollback test')
        })
      } catch (error) {
        // Expected error
      }

      const finalCount = await organizationRepository.count()
      expect(finalCount).toBe(initialCount)
    })

    it('should test bulk operations', async () => {
      const orgs = []
      for (let i = 0; i < 5; i++) {
        orgs.push({
          name: `Bulk Org ${i}`,
          createdBy: 'user-1',
          personal: false,
        })
      }

      const savedOrgs = await organizationRepository.save(orgs)
      expect(savedOrgs).toHaveLength(5)

      // Bulk update
      await organizationRepository.update({ createdBy: 'user-1' }, { totalCpuQuota: 20 })

      const updatedOrgs = await organizationRepository.find({
        where: { createdBy: 'user-1' },
      })

      updatedOrgs.forEach((org) => {
        expect(org.totalCpuQuota).toBe(20)
      })
    })

    it('should test raw SQL queries', async () => {
      await organizationRepository.save({
        name: 'Raw Query Test',
        createdBy: 'user-1',
        personal: false,
        suspended: true,
        suspendedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      })

      // Test raw query similar to the one in organization.service.ts
      const result = await organizationRepository.query(`
        SELECT id, name FROM organization 
        WHERE suspended = true 
        AND "suspendedAt" < NOW() - INTERVAL '1 day'
        AND "suspendedAt" > NOW() - INTERVAL '7 day'
      `)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Raw Query Test')
    })
  })

  describe('Entity Helper Methods', () => {
    it('should test organization helper methods', async () => {
      const org = new Organization()
      org.name = 'Helper Test'
      org.createdBy = 'user-1'
      org.personal = false
      org.suspended = true
      org.suspendedAt = new Date()
      // Set up quotas for testing
      org.totalCpuQuota = 10
      org.totalMemoryQuota = 20
      org.totalDiskQuota = 30
      org.maxCpuPerSandbox = 8
      org.maxMemoryPerSandbox = 8 // Make this smaller so 10 exceeds it
      org.maxDiskPerSandbox = 25

      expect(org.isSuspended()).toBe(true)
      expect(org.canCreateSandbox(2, 4, 5)).toBe(false) // Suspended

      org.suspendedUntil = new Date(Date.now() - 1000) // Past date
      expect(org.isSuspended()).toBe(false)

      org.suspended = false // Not suspended
      expect(org.canCreateSandbox(2, 4, 5)).toBe(true)
      expect(org.canCreateSandbox(20, 4, 5)).toBe(false) // Exceeds total quota
      expect(org.canCreateSandbox(2, 10, 5)).toBe(false) // Exceeds per-sandbox limit
    })

    it('should test organization user helper methods', async () => {
      const orgUser = new OrganizationUser()
      orgUser.role = OrganizationMemberRole.OWNER

      expect(orgUser.isOwner()).toBe(true)
      expect(orgUser.hasAdminAccess()).toBe(true)
      expect(orgUser.canManageSettings()).toBe(true)

      orgUser.role = OrganizationMemberRole.ADMIN
      expect(orgUser.isOwner()).toBe(false)
      expect(orgUser.hasAdminAccess()).toBe(true)
      expect(orgUser.canManageSettings()).toBe(false)

      orgUser.role = OrganizationMemberRole.MEMBER
      expect(orgUser.hasAdminAccess()).toBe(false)
      expect(orgUser.canManageUsers()).toBe(false)
    })
  })
})
