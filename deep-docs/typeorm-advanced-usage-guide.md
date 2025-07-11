# Daytona 项目中的 TypeORM 高级用法指南

## 概述

本文档专门介绍 Daytona 项目中 TypeORM 的高级用法，重点关注 Raw 查询、查询操作符、复杂查询构建等高级特性。这些技术在处理复杂业务逻辑、时间相关查询、动态条件过滤等场景中发挥重要作用。

## 技术栈概览

- **ORM**: TypeORM 0.3.20
- **数据库**: PostgreSQL 14+
- **后端框架**: NestJS 10
- **Node.js**: 18+

## Raw 查询详解

### 1. Raw 查询基础概念

`Raw()` 是 TypeORM 提供的一个特殊函数，允许你在 `where` 条件中直接写原生 SQL 表达式。这在需要使用数据库特定功能或复杂表达式时非常有用。

**基本语法**：

```typescript
import { Raw } from 'typeorm'

// 基本用法
Raw(aliasPath => `${aliasPath} = 'some_value'`)

// 带参数的用法  
Raw(aliasPath => `${aliasPath} > :minValue`, { minValue: 10 })
```

**核心理解点**：

- `aliasPath` 参数：代表当前字段在生成的 SQL 中的完整路径（包括表别名）
- 返回值：必须是一个有效的 SQL 表达式
- 参数绑定：通过第二个参数对象传递参数，避免 SQL 注入

### 2. 项目中的 Raw 查询实例

#### 时间间隔计算查询

**用例：自动停止检查**

```typescript
// apps/api/src/sandbox/managers/sandbox.manager.ts
const sandboxes = await this.sandboxRepository.find({
  where: {
    runnerId: runner.id,
    organizationId: Not(SANDBOX_WARM_POOL_UNASSIGNED_ORGANIZATION),
    state: SandboxState.STARTED,
    desiredState: SandboxDesiredState.STARTED,
    pending: Not(true),
    autoStopInterval: Not(0),
    lastActivityAt: Raw((alias) => 
      `${alias} < NOW() - INTERVAL '1 minute' * "autoStopInterval"`
    ),
  },
  order: {
    lastBackupAt: 'ASC',
  },
  take: 10,
})
```

**解析说明**：

- `alias` 参数：指向 `lastActivityAt` 字段，在 SQL 中可能是 `"Sandbox"."lastActivityAt"`
- PostgreSQL 语法：使用 `NOW()` 函数获取当前时间
- 动态间隔：`INTERVAL '1 minute' * "autoStopInterval"` 根据每个沙盒的配置计算间隔
- 查询逻辑：找到最后活动时间早于 `(当前时间 - 自动停止间隔)` 的沙盒

**生成的 SQL 示例**：

```sql
SELECT * FROM "sandbox" 
WHERE "sandbox"."runnerId" = $1
  AND "sandbox"."organizationId" != $2
  AND "sandbox"."state" = $3
  AND "sandbox"."desiredState" = $4
  AND "sandbox"."pending" != $5
  AND "sandbox"."autoStopInterval" != $6
  AND "sandbox"."lastActivityAt" < NOW() - INTERVAL '1 minute' * "autoStopInterval"
ORDER BY "sandbox"."lastBackupAt" ASC
LIMIT 10
```

#### 自动归档检查

```typescript
// 类似的逻辑用于自动归档
lastActivityAt: Raw((alias) => 
  `${alias} < NOW() - INTERVAL '1 minute' * "autoArchiveInterval"`
),
```

#### 容量比较查询

**用例：可用 Runner 筛选**

```typescript
// apps/api/src/sandbox/services/runner.service.ts
const runnerFilter: FindOptionsWhere<Runner> = {
  state: RunnerState.READY,
  unschedulable: Not(true),
  used: Raw((alias) => `${alias} < capacity`), // 当前使用量小于容量
}
```

**解析说明**：

- 比较当前实体的两个字段：`used` 字段与 `capacity` 字段
- 注意：这里直接引用了同一表的另一个字段 `capacity`
- 用途：筛选出还有可用容量的 Runner

#### 字符串比较查询

**用例：状态不一致检查**

```typescript
// 查找期望状态与当前状态不一致的沙盒
desiredState: Raw(() =>
  `"Sandbox"."desiredState"::text != "Sandbox"."state"::text AND "Sandbox"."desiredState"::text != 'archived'`
),
```

**解析说明**：

- PostgreSQL 类型转换：`::text` 将枚举转换为文本进行比较
- 表名引用：直接使用 `"Sandbox"` 表名和字段名
- 复合条件：既要状态不一致，又要排除特定状态
- 这里不使用 `alias` 参数，因为需要引用多个字段

## TypeORM 查询操作符详解

### 1. 逻辑操作符

#### `Not()` - 逻辑非

```typescript
import { Not } from 'typeorm'

// 排除特定值
state: Not(SandboxState.DESTROYED)

// 排除数组中的值
state: Not(In([SandboxState.DESTROYED, SandboxState.ERROR]))

// 排除布尔值
pending: Not(true)  // 等同于 pending: false

// 排除零值
autoStopInterval: Not(0)
```

**使用场景**：

- 排除已销毁、错误状态的记录
- 过滤非挂起状态的实体
- 排除禁用或无效的配置

#### `In()` - 包含检查

```typescript
import { In } from 'typeorm'

// 单值数组
state: In([SandboxState.STARTED])

// 多值数组
state: In([SandboxState.STARTED, SandboxState.STOPPED])

// 动态数组
const excludedIds = ['id1', 'id2', 'id3']
id: Not(In(excludedIds))

// 查询结果数组
const userIds = users.map(user => user.id)
userId: In(userIds)
```

**性能考虑**：

- PostgreSQL 对 `IN` 查询进行了优化
- 数组长度建议控制在 1000 以内
- 对于大数组，考虑使用子查询

### 2. 比较操作符

#### `LessThan()` / `MoreThan()` - 大小比较

```typescript
import { LessThan, MoreThan } from 'typeorm'

// 时间比较
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
lastActivityAt: LessThan(thirtyMinutesAgo)

// 数值比较
used: LessThan(100)

// 范围查询组合
where: {
  suspendedAt: MoreThan(suspendedAfter),
  suspendedAt: LessThan(suspendedBefore),
}
```

#### `IsNull()` / `IsNotNull()` - 空值检查

```typescript
import { IsNull, IsNotNull } from 'typeorm'

// 查找空值
deletedAt: IsNull()

// 查找非空值  
backupRegistryId: IsNotNull()

// 复合条件：已挂起但未设置恢复时间或恢复时间在未来
suspended: true,
suspendedUntil: Or(IsNull(), MoreThan(new Date()))
```

### 3. 逻辑组合操作符

#### `Or()` - 逻辑或

```typescript
import { Or, IsNull, MoreThan } from 'typeorm'

// 基本或条件
where: Or(
  { state: SandboxState.STARTED },
  { state: SandboxState.STOPPED }
)

// 复杂或条件
suspendedUntil: Or(IsNull(), MoreThan(new Date()))

// 数组形式的或条件
where: [
  { state: SandboxState.ARCHIVING },
  { 
    state: Not(In([SandboxState.ARCHIVED, SandboxState.DESTROYED])),
    desiredState: SandboxDesiredState.ARCHIVED 
  }
]
```

### 4. 特殊查询操作符

#### `JsonContains()` - JSONB 包含查询

```typescript
import { JsonContains } from 'typeorm'

// 查找包含特定标签的沙盒
const labels = { environment: 'production', team: 'backend' }
where: {
  organizationId,
  labels: JsonContains(labels)
}
```

**PostgreSQL JSONB 功能**：

- 高效的 JSON 查询和索引
- 支持部分匹配和复杂嵌套结构
- 自动压缩和优化存储

## 复杂查询构建模式

### 1. QueryBuilder 高级用法

#### 动态条件构建

```typescript
async findSandboxes(organizationId: string, filters?: SandboxFilters) {
  const queryBuilder = this.sandboxRepository.createQueryBuilder('sandbox')
    .leftJoinAndSelect('sandbox.buildInfo', 'buildInfo')
    .where('sandbox.organizationId = :organizationId', { organizationId })
    
  // 动态添加条件
  if (filters?.state) {
    queryBuilder.andWhere('sandbox.state = :state', { state: filters.state })
  }
  
  if (filters?.region) {
    queryBuilder.andWhere('sandbox.region = :region', { region: filters.region })
  }
  
  // 排除终态
  queryBuilder.andWhere('sandbox.state != :destroyedState', { 
    destroyedState: SandboxState.DESTROYED 
  })
  
  return queryBuilder.getMany()
}
```

#### 子查询和聚合

```typescript
// 查找有多个快照正在构建的 Runner
const runnersWith3InProgress = await this.sandboxRepository
  .createQueryBuilder('sandbox')
  .select('"runnerId"')
  .where('"sandbox"."state" = :state', { state: SandboxState.ARCHIVING })
  .groupBy('"runnerId"')
  .having('COUNT(*) >= 3')
  .getRawMany()

// 在主查询中使用子查询结果
const sandboxes = await this.sandboxRepository.find({
  where: {
    state: SandboxDesiredState.ARCHIVED,
    runnerId: Not(In(runnersWith3InProgress.map(r => r.runnerId))),
  }
})
```

### 2. 条件分支查询

#### 多条件 OR 查询

```typescript
// 组织服务中的查找挂起组织逻辑
async findSuspended(suspendedBefore?: Date, suspendedAfter?: Date, take?: number) {
  return this.organizationRepository.find({
    where: {
      suspended: true,
      suspendedUntil: Or(IsNull(), MoreThan(new Date())),
      // 使用三元运算符动态添加条件
      ...(suspendedBefore ? { suspendedAt: LessThan(suspendedBefore) } : {}),
      ...(suspendedAfter ? { suspendedAt: MoreThan(suspendedAfter) } : {}),
    },
    take: take || 100,
  })
}
```

#### 复杂状态筛选

```typescript
// 沙盒服务中的状态筛选逻辑
async findAll(organizationId: string, includeErroredDestroyed?: boolean) {
  const baseFindOptions = {
    organizationId,
  }

  const where: FindOptionsWhere<Sandbox>[] = [
    {
      ...baseFindOptions,
      // 正常状态的沙盒
      state: Not(In([SandboxState.DESTROYED, SandboxState.ERROR, SandboxState.BUILD_FAILED])),
    },
    {
      ...baseFindOptions,
      // 错误状态的沙盒，但未被标记为销毁
      state: In([SandboxState.ERROR, SandboxState.BUILD_FAILED]),
      ...(includeErroredDestroyed ? {} : { 
        desiredState: Not(SandboxDesiredState.DESTROYED) 
      }),
    },
  ]

  return this.sandboxRepository.find({ where })
}
```

## 时间相关查询模式

### 1. 过期检查模式

```typescript
// 查找过期的邀请
async findPendingInvitations(userId: string) {
  return this.organizationInvitationRepository.find({
    where: {
      email: user.email,
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: MoreThan(new Date()), // 未过期
    },
    relations: {
      organization: true,
      assignedRoles: true,
    },
  })
}
```

### 2. 时间窗口查询

```typescript
// 查找在特定时间窗口内的记录
const timeWindowQuery = {
  createdAt: Raw((alias) => `${alias} BETWEEN :startTime AND :endTime`),
}

// 使用参数绑定
const result = await repository.find({
  where: timeWindowQuery,
  parameters: {
    startTime: startDate,
    endTime: endDate,
  }
})
```

### 3. 相对时间查询

```typescript
// 查找指定时间前创建的记录
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

// 查找7天前的快照
const oldSnapshots = await this.snapshotRepository.find({
  where: [
    { lastUsedAt: LessThan(daysAgo(7)) },
    { 
      lastUsedAt: IsNull(),
      createdAt: LessThan(daysAgo(7))
    }
  ]
})
```

## 性能优化策略

### 1. 索引配合查询

```typescript
// 为经常查询的字段组合添加索引
@Entity()
@Index(['organizationId', 'state', 'lastActivityAt']) // 复合索引
export class Sandbox {
  @Column()
  @Index() // 单列索引
  organizationId: string
  
  @Column()
  state: SandboxState
  
  @Column()
  lastActivityAt: Date
}
```

### 2. 分页和限制

```typescript
// 大数据集分页处理
async findWithPagination(organizationId: string, page: number = 1, limit: number = 20) {
  const [items, total] = await this.sandboxRepository.findAndCount({
    where: { 
      organizationId,
      state: Not(SandboxState.DESTROYED) 
    },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })
  
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}
```

### 3. 批量操作优化

```typescript
// 避免 N+1 查询问题
async recalculateAllRunnerUsage() {
  // 一次查询获取所有需要的数据
  const runners = await this.runnerRepository.find({
    relations: ['sandboxes']
  })
  
  // 批量更新
  const updates = runners.map(runner => ({
    id: runner.id,
    used: runner.sandboxes.filter(s => s.state !== SandboxState.DESTROYED).length
  }))
  
  // 使用事务批量更新
  await this.dataSource.transaction(async manager => {
    for (const update of updates) {
      await manager.update(Runner, update.id, { used: update.used })
    }
  })
}
```

## 错误处理和最佳实践

### 1. 参数验证

```typescript
// Raw 查询参数验证
private validateTimeInterval(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new BadRequestError('Time interval must be a positive integer')
  }
}

// 安全的 Raw 查询构建
private buildTimeIntervalQuery(fieldName: string, intervalMinutes: number): any {
  this.validateTimeInterval(intervalMinutes)
  
  return Raw((alias) => 
    `${alias} < NOW() - INTERVAL '${intervalMinutes} minutes'`
  )
}
```

### 2. 类型安全

```typescript
// 使用类型安全的查询构建
type SandboxFilters = {
  state?: SandboxState
  region?: RunnerRegion
  organizationId: string
}

async findSandboxes(filters: SandboxFilters): Promise<Sandbox[]> {
  const where: FindOptionsWhere<Sandbox> = {
    organizationId: filters.organizationId,
  }
  
  if (filters.state) {
    where.state = filters.state
  }
  
  if (filters.region) {
    where.region = filters.region
  }
  
  return this.sandboxRepository.find({ where })
}
```

### 3. 查询性能监控

```typescript
// 添加查询性能日志
async findWithPerformanceLogging<T>(
  repository: Repository<T>,
  options: FindManyOptions<T>
): Promise<T[]> {
  const startTime = Date.now()
  
  try {
    const result = await repository.find(options)
    const duration = Date.now() - startTime
    
    if (duration > 1000) { // 超过1秒的查询
      this.logger.warn(`Slow query detected: ${duration}ms`, {
        repository: repository.metadata.name,
        optionsCount: JSON.stringify(options).length
      })
    }
    
    return result
  } catch (error) {
    this.logger.error(`Query failed after ${Date.now() - startTime}ms`, error)
    throw error
  }
}
```

## 总结

Daytona 项目中的 TypeORM 高级用法展现了现代 ORM 在处理复杂业务逻辑时的强大能力：

### 核心特性应用

1. **Raw 查询的智能使用**：
   - 时间间隔计算（`INTERVAL` 语法）
   - 字段间比较（容量检查）
   - 复杂条件组合（状态一致性检查）

2. **查询操作符的系统化应用**：
   - 逻辑操作符（`Not`, `In`, `Or`）组合使用
   - 时间比较操作符（`LessThan`, `MoreThan`）处理过期逻辑
   - 空值检查操作符（`IsNull`, `IsNotNull`）处理可选字段

3. **复杂查询的模块化构建**：
   - QueryBuilder 的动态条件构建
   - 子查询与主查询的配合使用
   - 多条件分支的优雅处理

### 最佳实践要点

- ✅ **类型安全**：使用 TypeScript 类型确保查询条件的正确性
- ✅ **性能优化**：合理使用索引、分页和批量操作
- ✅ **参数验证**：对 Raw 查询参数进行严格验证
- ✅ **错误处理**：完善的异常处理和性能监控
- ✅ **代码复用**：将常用查询模式抽象为可复用的方法

### 架构价值

这些高级用法使得 Daytona 能够：

- 高效处理大规模数据查询
- 实现复杂的业务逻辑（如自动停止、归档等）
- 保证数据一致性和完整性
- 提供良好的系统性能和用户体验

通过掌握这些高级技术，开发者能够构建更加健壮、高效的企业级应用系统。
