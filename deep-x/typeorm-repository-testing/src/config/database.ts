/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import { DataSource, DataSourceOptions } from 'typeorm'
import { CustomNamingStrategy } from './naming-strategy'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') })

export interface DatabaseConfig {
  type: 'postgres'
  host: string
  port: number
  username: string
  password: string
  database: string
  synchronize: boolean
  logging: boolean
  dropSchema: boolean
  entities: string[]
  namingStrategy: CustomNamingStrategy
}

export const databaseConfig: DatabaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'daytona_test',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_NAME || 'daytona_test',
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
  logging: process.env.DB_LOGGING === 'true' || true,
  dropSchema: process.env.DB_DROP_SCHEMA === 'true' || false,
  entities: [join(__dirname, '../entities/*.entity.{ts,js}')],
  namingStrategy: new CustomNamingStrategy(),
}

// Create TypeORM DataSource
export const AppDataSource = new DataSource(databaseConfig as DataSourceOptions)

// Database connection utilities
export class DatabaseManager {
  private static instance: DatabaseManager
  private dataSource: DataSource

  private constructor() {
    this.dataSource = AppDataSource
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public async connect(): Promise<DataSource> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize()
      console.log('✅ Database connected successfully!')
    }
    return this.dataSource
  }

  public async disconnect(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy()
      console.log('✅ Database disconnected successfully!')
    }
  }

  public getDataSource(): DataSource {
    return this.dataSource
  }

  public async clearDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database not initialized')
    }

    const entities = this.dataSource.entityMetadatas

    // Drop tables in reverse order to handle foreign key constraints
    for (const entity of entities.reverse()) {
      const repository = this.dataSource.getRepository(entity.name)
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`)
    }

    console.log('✅ Database cleared successfully!')
  }

  public async createTestData(): Promise<void> {
    // This will be implemented in the setup script
    console.log('✅ Test data created successfully!')
  }
}
