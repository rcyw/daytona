/*
 * Copyright 2025 Daytona Platforms Inc.
 * SPDX-License-Identifier: AGPL-3.0
 */

import 'reflect-metadata'
import { DatabaseManager } from '../config/database'

let databaseManager: DatabaseManager

beforeAll(async () => {
  databaseManager = DatabaseManager.getInstance()
  await databaseManager.connect()
})

afterAll(async () => {
  if (databaseManager) {
    await databaseManager.disconnect()
  }
})

beforeEach(async () => {
  if (databaseManager) {
    await databaseManager.clearDatabase()
  }
})

// Global test timeout
jest.setTimeout(30000)
