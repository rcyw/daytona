/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { OrganizationUser } from './organization-user.entity'

export enum SystemRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface UserSSHKeyPair {
  publicKey: string
  privateKey: string
}

export interface UserPublicKey {
  name: string
  key: string
}

@Entity()
export class User {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column({
    default: '',
  })
  email: string

  @Column({
    default: false,
  })
  emailVerified: boolean

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  keyPair: UserSSHKeyPair

  @Column('simple-json')
  publicKeys: UserPublicKey[]

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  role: SystemRole

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  updatedAt: Date

  // Helper methods for testing
  public isAdmin(): boolean {
    return this.role === SystemRole.ADMIN
  }

  public hasVerifiedEmail(): boolean {
    return this.emailVerified
  }

  public addPublicKey(name: string, key: string): void {
    if (!this.publicKeys) {
      this.publicKeys = []
    }

    // Remove existing key with same name
    this.publicKeys = this.publicKeys.filter((k) => k.name !== name)

    // Add new key
    this.publicKeys.push({ name, key })
  }

  public removePublicKey(name: string): boolean {
    if (!this.publicKeys) {
      return false
    }

    const initialLength = this.publicKeys.length
    this.publicKeys = this.publicKeys.filter((k) => k.name !== name)

    return this.publicKeys.length < initialLength
  }

  public getPublicKey(name: string): UserPublicKey | undefined {
    return this.publicKeys?.find((k) => k.name === name)
  }

  @OneToMany(() => OrganizationUser, (orgUser) => orgUser.user)
  organizationUsers?: OrganizationUser[]
}
