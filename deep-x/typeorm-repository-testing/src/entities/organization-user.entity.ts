/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { Organization } from './organization.entity'
import { User } from './user.entity'

export enum OrganizationMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity()
export class OrganizationUser {
  @PrimaryColumn()
  organizationId: string

  @PrimaryColumn()
  userId: string

  @Column({
    type: 'enum',
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.MEMBER,
  })
  role: OrganizationMemberRole

  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization

  @ManyToOne(() => User, (user) => user.organizationUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  updatedAt: Date

  // Helper methods for testing
  public isOwner(): boolean {
    return this.role === OrganizationMemberRole.OWNER
  }

  public isAdmin(): boolean {
    return this.role === OrganizationMemberRole.ADMIN
  }

  public isMember(): boolean {
    return this.role === OrganizationMemberRole.MEMBER
  }

  public hasAdminAccess(): boolean {
    return this.isOwner() || this.isAdmin()
  }

  public canManageUsers(): boolean {
    return this.isOwner() || this.isAdmin()
  }

  public canManageSettings(): boolean {
    return this.isOwner()
  }
}
