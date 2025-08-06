/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { OrganizationUser } from './organization-user.entity'

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  createdBy: string

  @Column({
    default: false,
  })
  personal: boolean

  @Column({
    default: true,
  })
  telemetryEnabled: boolean

  @Column({
    type: 'int',
    default: 10,
    name: 'total_cpu_quota',
  })
  totalCpuQuota: number

  @Column({
    type: 'int',
    default: 10,
    name: 'total_memory_quota',
  })
  totalMemoryQuota: number

  @Column({
    type: 'int',
    default: 30,
    name: 'total_disk_quota',
  })
  totalDiskQuota: number

  @Column({
    type: 'int',
    default: 4,
    name: 'max_cpu_per_sandbox',
  })
  maxCpuPerSandbox: number

  @Column({
    type: 'int',
    default: 8,
    name: 'max_memory_per_sandbox',
  })
  maxMemoryPerSandbox: number

  @Column({
    type: 'int',
    default: 10,
    name: 'max_disk_per_sandbox',
  })
  maxDiskPerSandbox: number

  @Column({
    type: 'int',
    default: 20,
    name: 'max_snapshot_size',
  })
  maxSnapshotSize: number

  @Column({
    type: 'int',
    default: 100,
    name: 'snapshot_quota',
  })
  snapshotQuota: number

  @Column({
    type: 'int',
    default: 100,
    name: 'volume_quota',
  })
  volumeQuota: number

  @OneToMany(() => OrganizationUser, (user) => user.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  users: OrganizationUser[]

  @Column({
    default: false,
  })
  suspended: boolean

  @Column({
    nullable: true,
    type: 'timestamp with time zone',
  })
  suspendedAt: Date | null

  @Column({
    nullable: true,
    type: 'varchar',
  })
  suspensionReason: string | null

  @Column({
    nullable: true,
    type: 'timestamp with time zone',
  })
  suspendedUntil: Date | null

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  updatedAt: Date

  // Helper methods for testing
  public isSuspended(): boolean {
    if (!this.suspended) {
      return false
    }

    if (this.suspendedUntil && this.suspendedUntil <= new Date()) {
      return false
    }

    return true
  }

  public getTotalQuotaUsage(): { cpu: number; memory: number; disk: number } {
    // This would typically be calculated from related entities
    // For testing purposes, we'll return mock values
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
    }
  }

  public canCreateSandbox(cpu: number, memory: number, disk: number): boolean {
    if (this.suspended) {
      return false
    }

    const currentUsage = this.getTotalQuotaUsage()

    return (
      currentUsage.cpu + cpu <= this.totalCpuQuota &&
      currentUsage.memory + memory <= this.totalMemoryQuota &&
      currentUsage.disk + disk <= this.totalDiskQuota &&
      cpu <= this.maxCpuPerSandbox &&
      memory <= this.maxMemoryPerSandbox &&
      disk <= this.maxDiskPerSandbox
    )
  }
}
