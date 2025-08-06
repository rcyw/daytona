/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Repository, EntityManager, IsNull, Not } from 'typeorm'
import { Organization } from '../entities/organization.entity'
import { OrganizationUser, OrganizationMemberRole } from '../entities/organization-user.entity'
import { AppDataSource } from '../config/database'

export interface CreateOrganizationDto {
  name: string
  personal?: boolean
}

export interface UpdateOrganizationQuotaDto {
  totalCpuQuota?: number
  totalMemoryQuota?: number
  totalDiskQuota?: number
  maxCpuPerSandbox?: number
  maxMemoryPerSandbox?: number
  maxDiskPerSandbox?: number
  maxSnapshotSize?: number
  volumeQuota?: number
  snapshotQuota?: number
}

export interface OverviewDto {
  totalCpuQuota: number
  totalGpuQuota: number
  totalMemoryQuota: number
  totalDiskQuota: number
  currentCpuUsage: number
  currentMemoryUsage: number
  currentDiskUsage: number
}

export class OrganizationService {
  private organizationRepository: Repository<Organization>
  private organizationUserRepository: Repository<OrganizationUser>

  constructor() {
    this.organizationRepository = AppDataSource.getRepository(Organization)
    this.organizationUserRepository = AppDataSource.getRepository(OrganizationUser)
  }

  async create(
    createOrganizationDto: CreateOrganizationDto,
    createdBy: string,
    personal = false,
    creatorEmailVerified = false,
  ): Promise<Organization> {
    return this.createWithEntityManager(
      this.organizationRepository.manager,
      createOrganizationDto,
      createdBy,
      creatorEmailVerified,
      personal,
    )
  }

  async findByUser(userId: string): Promise<Organization[]> {
    return this.organizationRepository.find({
      where: {
        users: {
          userId,
        },
      },
      relations: ['users'],
    })
  }

  async findOne(organizationId: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['users'],
    })
  }

  async findPersonal(userId: string): Promise<Organization> {
    return this.findPersonalWithEntityManager(this.organizationRepository.manager, userId)
  }

  async delete(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } })

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`)
    }

    return this.removeWithEntityManager(this.organizationRepository.manager, organization)
  }

  async getUsageOverview(organizationId: string): Promise<OverviewDto> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } })
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`)
    }

    // For testing purposes, return mock usage data
    // In real implementation, this would calculate from related entities
    return {
      totalCpuQuota: organization.totalCpuQuota,
      totalGpuQuota: 0,
      totalMemoryQuota: organization.totalMemoryQuota,
      totalDiskQuota: organization.totalDiskQuota,
      currentCpuUsage: 0,
      currentMemoryUsage: 0,
      currentDiskUsage: 0,
    }
  }

  async updateQuota(
    organizationId: string,
    updateOrganizationQuotaDto: UpdateOrganizationQuotaDto,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } })
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`)
    }

    organization.totalCpuQuota = updateOrganizationQuotaDto.totalCpuQuota ?? organization.totalCpuQuota
    organization.totalMemoryQuota = updateOrganizationQuotaDto.totalMemoryQuota ?? organization.totalMemoryQuota
    organization.totalDiskQuota = updateOrganizationQuotaDto.totalDiskQuota ?? organization.totalDiskQuota
    organization.maxCpuPerSandbox = updateOrganizationQuotaDto.maxCpuPerSandbox ?? organization.maxCpuPerSandbox
    organization.maxMemoryPerSandbox =
      updateOrganizationQuotaDto.maxMemoryPerSandbox ?? organization.maxMemoryPerSandbox
    organization.maxDiskPerSandbox = updateOrganizationQuotaDto.maxDiskPerSandbox ?? organization.maxDiskPerSandbox
    organization.maxSnapshotSize = updateOrganizationQuotaDto.maxSnapshotSize ?? organization.maxSnapshotSize
    organization.volumeQuota = updateOrganizationQuotaDto.volumeQuota ?? organization.volumeQuota
    organization.snapshotQuota = updateOrganizationQuotaDto.snapshotQuota ?? organization.snapshotQuota

    return this.organizationRepository.save(organization)
  }

  async suspend(organizationId: string, suspensionReason?: string, suspendedUntil?: Date): Promise<void> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } })
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`)
    }

    organization.suspended = true
    organization.suspensionReason = suspensionReason || null
    organization.suspendedUntil = suspendedUntil || null
    organization.suspendedAt = new Date()
    await this.organizationRepository.save(organization)
  }

  async unsuspend(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } })
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`)
    }

    organization.suspended = false
    organization.suspensionReason = null
    organization.suspendedUntil = null
    organization.suspendedAt = null

    await this.organizationRepository.save(organization)
  }

  // Test method to find suspended organizations (similar to API's cron job query)
  async findSuspendedOrganizations(daysAgo = 1, maxDaysAgo = 7): Promise<Organization[]> {
    const queryResult = await this.organizationRepository
      .createQueryBuilder('organization')
      .where('organization.suspended = true')
      .andWhere(`organization.suspendedAt < NOW() - INTERVAL '${daysAgo} day'`)
      .andWhere(`organization.suspendedAt > NOW() - INTERVAL '${maxDaysAgo} day'`)
      .take(100)
      .getMany()

    return queryResult
  }

  // Additional test methods for complex queries
  async findOrganizationsWithUsers(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['users'],
      where: {
        users: {
          userId: Not(IsNull()),
        },
      },
    })
  }

  async findOrganizationsByUserRole(role: OrganizationMemberRole): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['users'],
      where: {
        users: {
          role,
        },
      },
    })
  }

  private async createWithEntityManager(
    entityManager: EntityManager,
    createOrganizationDto: CreateOrganizationDto,
    createdBy: string,
    creatorEmailVerified: boolean,
    personal = false,
  ): Promise<Organization> {
    if (personal) {
      const count = await entityManager.count(Organization, {
        where: { createdBy, personal: true },
      })
      if (count > 0) {
        throw new Error('Personal organization already exists')
      }
    }

    // Set some limit to the number of created organizations
    const createdCount = await entityManager.count(Organization, {
      where: { createdBy },
    })
    if (createdCount >= 10) {
      throw new Error('You have reached the maximum number of created organizations')
    }

    let organization = new Organization()

    organization.name = createOrganizationDto.name
    organization.createdBy = createdBy
    organization.personal = personal

    if (!creatorEmailVerified) {
      organization.suspended = true
      organization.suspendedAt = new Date()
      organization.suspensionReason = 'Please verify your email address'
    }

    return await entityManager.transaction(async (em) => {
      // 首先保存组织
      organization = await em.save(organization)

      // 然后创建组织用户关系
      const owner = new OrganizationUser()
      owner.organizationId = organization.id
      owner.userId = createdBy
      owner.role = OrganizationMemberRole.OWNER

      await em.save(owner)

      // 重新加载组织以包含用户关系
      const reloadedOrg = await em.findOne(Organization, {
        where: { id: organization.id },
        relations: ['users'],
      })

      if (!reloadedOrg) {
        throw new Error('Failed to reload organization after creation')
      }

      return reloadedOrg
    })
  }

  private async removeWithEntityManager(
    entityManager: EntityManager,
    organization: Organization,
    force = false,
  ): Promise<void> {
    if (!force) {
      if (organization.personal) {
        throw new Error('Cannot delete personal organization')
      }
    }
    await entityManager.remove(organization)
  }

  private async findPersonalWithEntityManager(entityManager: EntityManager, userId: string): Promise<Organization> {
    const organization = await entityManager.findOne(Organization, {
      where: { createdBy: userId, personal: true },
      relations: ['users'],
    })

    if (!organization) {
      throw new Error(`Personal organization for user ${userId} not found`)
    }

    return organization
  }

  assertOrganizationIsNotSuspended(organization: Organization): void {
    if (!organization.suspended) {
      return
    }

    if (organization.suspendedUntil ? organization.suspendedUntil > new Date() : true) {
      if (organization.suspensionReason) {
        throw new Error(`Organization is suspended: ${organization.suspensionReason}`)
      } else {
        throw new Error('Organization is suspended')
      }
    }
  }
}
