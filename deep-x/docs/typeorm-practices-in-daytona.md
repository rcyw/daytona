# Daytona 项目中的 TypeORM 最佳实践

## 概述

Daytona 是一个使用 NestJS 和 TypeORM 构建的现代化沙盒开发环境平台。本文档详细分析了项目中 TypeORM 的应用实践，包括数据库配置、实体设计、迁移管理、关系映射等核心技术实现。

## 项目架构概览

### 技术栈

- **后端框架**: NestJS
- **ORM**: TypeORM 0.3.20
- **数据库**: PostgreSQL
- **缓存**: Redis
- **事件系统**: @nestjs/event-emitter

### 模块结构

```
apps/api/src/
├── sandbox/           # 沙盒模块 - 核心业务
├── organization/      # 组织管理模块
├── user/             # 用户管理模块
├── docker-registry/  # Docker 镜像仓库模块
├── api-key/          # API 密钥管理模块
├── usage/            # 使用量统计模块
├── migrations/       # 数据库迁移文件
└── common/           # 通用工具和中间件
```

## 数据库配置与初始化

### 1. 核心配置设置

**主应用模块配置 (`app.module.ts`)**

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (configService: TypedConfigService) => {
        return {
          type: 'postgres',
          host: configService.getOrThrow('database.host'),
          port: configService.getOrThrow('database.port'),
          username: configService.getOrThrow('database.username'),
          password: configService.getOrThrow('database.password'),
          database: configService.getOrThrow('database.database'),
          autoLoadEntities: true,                    // 自动加载实体
          migrations: [join(__dirname, 'migrations/**/*{.ts,.js}')],
          migrationsRun: !configService.getOrThrow('production'),
          namingStrategy: new CustomNamingStrategy(), // 自定义命名策略
          manualInitialization: configService.get('skipConnections'),
        }
      },
    }),
    // 其他模块...
  ],
})
export class AppModule {}
```

**数据源配置 (`data-source.ts`)**

```typescript
const AppDataSource = new DataSource({
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,                                // 生产环境禁用同步
  migrations: [join(__dirname, 'migrations/**/*{.ts,.js}')],
  migrationsRun: false,
  logging: process.env.DB_LOGGING === 'true',
  namingStrategy: new CustomNamingStrategy(),
  entities: [join(__dirname, '**/*.entity.ts')],
})
```

### 2. 自定义命名策略

**实现标准化的数据库对象命名**

```typescript
export class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: Table | string, columnNames: string[]) {
    const table = tableOrName instanceof Table ? tableOrName.name : tableOrName
    const columnsSnakeCase = columnNames.join('_')
    return `${table}_${columnsSnakeCase}_pk`
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    const table = tableOrName instanceof Table ? tableOrName.name : tableOrName
    const columnsSnakeCase = columnNames.join('_')
    return `${table}_${columnsSnakeCase}_fk`
  }

  uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    const table = tableOrName instanceof Table ? tableOrName.name : tableOrName
    const columnsSnakeCase = columnNames.join('_')
    return `${table}_${columnsSnakeCase}_unique`
  }

  indexName(tableOrName: Table | string, columnNames: string[]): string {
    const table = tableOrName instanceof Table ? tableOrName.name : tableOrName
    const columnsSnakeCase = columnNames.join('_')
    return `${table}_${columnsSnakeCase}_index`
  }
}
```

## 实体设计模式

### 1. 基础实体模式

**沙盒实体 (`sandbox.entity.ts`)**

```typescript
@Entity()
export class Sandbox {
  @PrimaryColumn()
  @Generated('uuid')
  id: string

  @Column({
    type: 'uuid',
  })
  organizationId: string

  @Column({
    type: 'enum',
    enum: RunnerRegion,
    default: RunnerRegion.EU,
  })
  region: RunnerRegion

  @Column({
    type: 'enum',
    enum: SandboxState,
    default: SandboxState.UNKNOWN,
  })
  state: SandboxState

  @Column({
    type: 'jsonb',
    default: {},
  })
  env: { [key: string]: string }

  @Column('jsonb', { nullable: true })
  labels: { [key: string]: string }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 生命周期钩子
  @BeforeUpdate()
  updateAccessToken() {
    if (this.state === SandboxState.STARTED) {
      this.authToken = nanoid(32).toLocaleLowerCase()
    }
  }

  @BeforeUpdate()
  validateDesiredState() {
    // 状态验证逻辑
    switch (this.desiredState) {
      case SandboxDesiredState.STARTED:
        if (![SandboxState.STARTED, SandboxState.STOPPED, /* ... */].includes(this.state)) {
          throw new Error(`Sandbox ${this.id} is not in a valid state to be started`)
        }
        break
      // 其他状态验证...
    }
  }
}
```

### 2. 枚举类型的有效使用

**沙盒状态枚举**

```typescript
export enum SandboxState {
  CREATING = 'creating',
  RESTORING = 'restoring',
  DESTROYED = 'destroyed',
  DESTROYING = 'destroying',
  STARTED = 'started',
  STOPPED = 'stopped',
  STARTING = 'starting',
  STOPPING = 'stopping',
  ERROR = 'error',
  BUILD_FAILED = 'build_failed',
  PENDING_BUILD = 'pending_build',
  BUILDING_SNAPSHOT = 'building_snapshot',
  UNKNOWN = 'unknown',
  PULLING_SNAPSHOT = 'pulling_snapshot',
  ARCHIVING = 'archiving',
  ARCHIVED = 'archived',
}
```

### 3. 复杂数据类型处理

**JSONB 字段的使用**

```typescript
// 环境变量存储
@Column({
  type: 'jsonb',
  default: {},
})
env: { [key: string]: string }

// 标签存储
@Column('jsonb', { nullable: true })
labels: { [key: string]: string }

// 卷配置数组
@Column({
  type: 'jsonb',
  default: [],
})
volumes: SandboxVolume[]

// 备份快照历史
@Column({
  type: 'jsonb',
  default: [],
})
existingBackupSnapshots: Array<{
  snapshotName: string
  createdAt: Date
}>
```

## TypeORM 注解详解

### 1. 基础实体注解

#### `@Entity()`

- **作用**: 将类标记为数据库实体
- **用法**: 可指定表名，不指定则使用类名的蛇形命名

```typescript
@Entity()                    // 表名为 'sandbox'
export class Sandbox {}

@Entity('custom_table_name') // 指定表名
export class CustomEntity {}
```

#### `@PrimaryColumn()` 和 `@PrimaryGeneratedColumn()`

- **作用**: 定义主键列
- **区别**:
  - `@PrimaryColumn()`: 手动设置主键值
  - `@PrimaryGeneratedColumn()`: 自动生成主键

```typescript
@PrimaryColumn()              // 手动设置 UUID
@Generated('uuid')
id: string

@PrimaryGeneratedColumn()     // 自增整数主键
id: number

@PrimaryGeneratedColumn('uuid') // 自动生成 UUID
id: string
```

#### `@Column()` 列定义注解

- **作用**: 定义普通列属性
- **常用选项**:

```typescript
@Column()                     // 基础列
name: string

@Column({
  type: 'varchar',           // 指定数据库类型
  length: 100,               // 字段长度
  nullable: true,            // 允许为空
  default: 'default_value',  // 默认值
  unique: true,              // 唯一约束
})
email: string

@Column({
  type: 'enum',              // 枚举类型
  enum: SandboxState,
  default: SandboxState.PENDING,
})
state: SandboxState

@Column({
  type: 'jsonb',             // PostgreSQL JSONB 类型
  default: {},
})
metadata: Record<string, any>
```

#### 时间戳注解

```typescript
@CreateDateColumn()          // 创建时间（自动设置）
createdAt: Date

@UpdateDateColumn()          // 更新时间（自动维护）
updatedAt: Date

@DeleteDateColumn()          // 软删除时间
deletedAt: Date
```

### 2. 关系映射注解

#### `@ManyToOne()` - 多对一关系

- **作用**: 定义多对一关系（当前实体的多个实例对应目标实体的一个实例）
- **参数说明**:

```typescript
@ManyToOne(
  () => Organization,        // 1. 目标实体类型（使用函数避免循环依赖）
  (org) => org.sandboxes,   // 2. 反向关系属性（可选）
  {
    nullable: false,         // 3. 是否允许为空
    eager: true,            // 4. 是否预加载关系
    onDelete: 'CASCADE',    // 5. 删除行为
    cascade: true,          // 6. 是否级联操作
  }
)
@JoinColumn({ name: 'org_id' }) // 指定外键列名
organization: Organization
```

#### `@OneToMany()` - 一对多关系

- **作用**: 定义一对多关系（当前实体的一个实例对应目标实体的多个实例）

```typescript
@OneToMany(
  () => Sandbox,             // 目标实体类型
  (sandbox) => sandbox.organization, // 反向关系属性
  {
    cascade: ['insert', 'update'], // 级联操作类型
    onDelete: 'CASCADE',     // 删除行为
  }
)
sandboxes: Sandbox[]
```

#### `@ManyToMany()` - 多对多关系

- **作用**: 定义多对多关系

```typescript
@ManyToMany(
  () => OrganizationRole,    // 目标实体
  (role) => role.users,     // 反向关系
  {
    cascade: true,
    onDelete: 'CASCADE',
  }
)
@JoinTable({                 // 连接表配置
  name: 'user_role_assignment', // 连接表名
  joinColumns: [             // 当前实体的连接列
    { name: 'user_id', referencedColumnName: 'id' }
  ],
  inverseJoinColumns: [      // 目标实体的连接列
    { name: 'role_id', referencedColumnName: 'id' }
  ],
})
roles: OrganizationRole[]
```

#### `@OneToOne()` - 一对一关系

```typescript
@OneToOne(() => Profile, (profile) => profile.user, {
  cascade: true,
  onDelete: 'CASCADE',
})
@JoinColumn()               // 一对一关系需要 JoinColumn
profile: Profile
```

### 3. 连接注解详解

#### `@JoinColumn()` - 外键列配置

- **作用**: 指定关系的外键列信息
- **使用场景**: `@ManyToOne` 和 `@OneToOne` 关系

```typescript
@JoinColumn()               // 使用默认外键列名
organization: Organization

@JoinColumn({ 
  name: 'org_id',          // 自定义外键列名
  referencedColumnName: 'id' // 引用的目标列名（默认为主键）
})
organization: Organization

// 复合外键
@JoinColumn([
  { name: 'org_id', referencedColumnName: 'organizationId' },
  { name: 'user_id', referencedColumnName: 'userId' },
])
organizationUser: OrganizationUser
```

#### `@JoinTable()` - 连接表配置

- **作用**: 配置多对多关系的连接表
- **使用场景**: `@ManyToMany` 关系的拥有方

```typescript
@JoinTable({
  name: 'user_roles',        // 连接表名
  joinColumn: {              // 当前实体的连接配置
    name: 'user_id',
    referencedColumnName: 'id'
  },
  inverseJoinColumn: {       // 目标实体的连接配置
    name: 'role_id',
    referencedColumnName: 'id'
  }
})
roles: Role[]
```

**详细配置说明**:

以项目中的角色分配为例：

```typescript
// OrganizationUser 实体中的配置
@ManyToMany(() => OrganizationRole, (role) => role.users, {
  cascade: true,
  onDelete: 'CASCADE',
})
@JoinTable({
  name: 'organization_role_assignment',  // 生成的连接表名
  joinColumns: [                         // 当前实体(OrganizationUser)的连接配置
    { 
      name: 'organizationId',            // 连接表中的列名
      referencedColumnName: 'organizationId' // 引用 OrganizationUser 的字段
    },
    { 
      name: 'userId',                    // 连接表中的列名
      referencedColumnName: 'userId'     // 引用 OrganizationUser 的字段
    },
  ],
  inverseJoinColumns: [                  // 目标实体(OrganizationRole)的连接配置
    { 
      name: 'roleId',                    // 连接表中的列名
      referencedColumnName: 'id'         // 引用 OrganizationRole 的字段
    }
  ],
})
assignedRoles: OrganizationRole[]
```

**生成的数据库表结构**:

上述配置会生成名为 `organization_role_assignment` 的连接表，包含以下列：

```sql
CREATE TABLE organization_role_assignment (
  organizationId UUID NOT NULL,  -- 来自 joinColumns[0].name
  userId UUID NOT NULL,          -- 来自 joinColumns[1].name  
  roleId UUID NOT NULL,          -- 来自 inverseJoinColumns[0].name
  
  PRIMARY KEY (organizationId, userId, roleId),
  
  -- 外键约束
  FOREIGN KEY (organizationId, userId) 
    REFERENCES organization_user (organizationId, userId),
  FOREIGN KEY (roleId) 
    REFERENCES organization_role (id)
);
```

**字段映射关系**:

| 配置项 | 含义 | 示例值 |
|--------|------|--------|
| `joinColumns[].name` | 连接表中的列名 | `organizationId`, `userId` |
| `joinColumns[].referencedColumnName` | 当前实体中被引用的字段名 | `OrganizationUser.organizationId`, `OrganizationUser.userId` |
| `inverseJoinColumns[].name` | 连接表中的列名 | `roleId` |
| `inverseJoinColumns[].referencedColumnName` | 目标实体中被引用的字段名 | `OrganizationRole.id` |

**关键理解点**:

1. **joinColumns**: 描述当前实体（拥有 `@JoinTable` 的实体）如何连接到连接表
   - `name`: 连接表中的外键列名
   - `referencedColumnName`: 当前实体中被引用的字段

2. **inverseJoinColumns**: 描述目标实体如何连接到连接表
   - `name`: 连接表中的外键列名  
   - `referencedColumnName`: 目标实体中被引用的字段

3. **复合主键支持**: 当实体有复合主键时，可以在 `joinColumns` 数组中指定多个列映射

**实际数据示例**:

```sql
-- organization_role_assignment 表中的数据
INSERT INTO organization_role_assignment VALUES
('org-uuid-1', 'user-uuid-1', 'role-uuid-admin'),
('org-uuid-1', 'user-uuid-2', 'role-uuid-developer'),
('org-uuid-2', 'user-uuid-1', 'role-uuid-viewer');
```

这样的配置确保了：

- 每个组织用户可以拥有多个角色
- 每个角色可以分配给多个组织用户
- 通过连接表维护这种多对多关系
- 支持复合主键的复杂关系映射

### 4. 约束和索引注解

#### `@Unique()` - 唯一约束

```typescript
@Entity()
@Unique(['organizationId', 'name']) // 复合唯一约束
@Unique('UQ_user_email', ['email']) // 命名唯一约束
export class Sandbox {
  @Column({ unique: true })          // 单列唯一约束
  name: string
}
```

#### `@Index()` - 索引

```typescript
@Entity()
@Index(['organizationId', 'state'])  // 复合索引
@Index('IDX_sandbox_created', ['createdAt']) // 命名索引
export class Sandbox {
  @Column()
  @Index()                          // 单列索引
  organizationId: string
}
```

### 5. 生命周期钩子注解

#### 实体生命周期事件

```typescript
@BeforeInsert()             // 插入前执行
generateId() {
  if (!this.id) {
    this.id = generateUuid()
  }
}

@AfterInsert()              // 插入后执行
logCreation() {
  console.log(`Entity ${this.id} created`)
}

@BeforeUpdate()             // 更新前执行
validateUpdate() {
  if (this.state === SandboxState.DESTROYED) {
    throw new Error('Cannot update destroyed sandbox')
  }
}

@AfterUpdate()              // 更新后执行
@AfterLoad()                // 从数据库加载后执行
@BeforeRemove()             // 删除前执行
@AfterRemove()              // 删除后执行
```

### 6. 高级注解配置

#### 级联操作详解

```typescript
@OneToMany(() => Comment, comment => comment.post, {
  cascade: true,              // 所有级联操作
  cascade: ['insert'],        // 仅插入级联
  cascade: ['update'],        // 仅更新级联
  cascade: ['remove'],        // 仅删除级联
  cascade: ['soft-remove'],   // 仅软删除级联
  cascade: ['recover'],       // 仅恢复级联
})
comments: Comment[]
```

#### 删除行为配置

```typescript
@ManyToOne(() => Organization, org => org.users, {
  onDelete: 'CASCADE',        // 级联删除
  onDelete: 'SET NULL',       // 设置为 NULL
  onDelete: 'RESTRICT',       // 限制删除
  onDelete: 'NO ACTION',      // 无操作
})
organization: Organization
```

#### 预加载策略

```typescript
@ManyToOne(() => BuildInfo, buildInfo => buildInfo.snapshots, {
  eager: true,                // 总是预加载
  lazy: true,                 // 懒加载（返回 Promise）
})
buildInfo: Promise<BuildInfo> // lazy 时必须是 Promise 类型
```

### 7. 常用注解组合模式

#### 标准外键关系

```typescript
// 多对一关系的标准配置
@ManyToOne(() => Organization, org => org.sandboxes, {
  nullable: false,            // 不允许为空
  onDelete: 'CASCADE',        // 级联删除
})
@JoinColumn({ name: 'organization_id' }) // 指定外键列名
organization: Organization

@Column({ type: 'uuid' })     // 外键列定义
organizationId: string
```

#### 软删除配置

```typescript
@Entity()
export class SoftDeletableEntity {
  @DeleteDateColumn()         // 软删除时间戳
  deletedAt: Date

  @Column({ default: false }) // 软删除标志
  isDeleted: boolean
}
```

#### 审计字段组合

```typescript
// 标准审计字段
@CreateDateColumn()
createdAt: Date

@UpdateDateColumn()
updatedAt: Date

@Column({ type: 'uuid' })
createdBy: string

@Column({ type: 'uuid' })
updatedBy: string

@ManyToOne(() => User)
@JoinColumn({ name: 'created_by' })
creator: User

@ManyToOne(() => User)
@JoinColumn({ name: 'updated_by' })
updater: User
```

## 实体关系设计

### 1. 一对多关系

**组织与用户关系**

```typescript
// Organization 实体
@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @OneToMany(() => OrganizationUser, (user) => user.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  users: OrganizationUser[]

  @OneToMany(() => OrganizationRole, (role) => role.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  roles: OrganizationRole[]
}

// OrganizationUser 实体
@Entity()
export class OrganizationUser {
  @PrimaryColumn()
  organizationId: string

  @PrimaryColumn()
  userId: string

  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization
}
```

### 2. 多对多关系

**角色与权限的多对多关系**

```typescript
@Entity()
export class OrganizationUser {
  @ManyToMany(() => OrganizationRole, (role) => role.users, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'organization_role_assignment',
    joinColumns: [
      { name: 'organizationId', referencedColumnName: 'organizationId' },
      { name: 'userId', referencedColumnName: 'userId' },
    ],
    inverseJoinColumns: [{ name: 'roleId', referencedColumnName: 'id' }],
  })
  assignedRoles: OrganizationRole[]
}

@Entity()
export class OrganizationRole {
  @ManyToMany(() => OrganizationUser, (user) => user.assignedRoles)
  users: OrganizationUser[]

  @ManyToMany(() => OrganizationInvitation, (invitation) => invitation.assignedRoles)
  invitations: OrganizationInvitation[]
}
```

### 3. 引用完整性约束

**快照与构建信息关系**

```typescript
@Entity()
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    nullable: true,
    type: 'uuid',
  })
  organizationId?: string

  @Column({ default: false })
  general: boolean

  @Column()
  name: string

  @Column()
  imageName: string

  @ManyToOne(() => BuildInfo, (buildInfo) => buildInfo.snapshots, {
    nullable: true,
    eager: true,  // 启用预加载
  })
  @JoinColumn()
  buildInfo?: BuildInfo

  @OneToMany(() => SnapshotRunner, (runner) => runner.snapshotRef)
  runners: SnapshotRunner[]
}

@Entity()
export class BuildInfo {
  @PrimaryColumn()
  snapshotRef: string

  @Column({ type: 'text', nullable: true })
  dockerfileContent?: string

  @Column('simple-array', { nullable: true })
  contextHashes?: string[]

  @OneToMany(() => Snapshot, (snapshot) => snapshot.buildInfo)
  snapshots: Snapshot[]

  @OneToMany(() => Sandbox, (sandbox) => sandbox.buildInfo)
  sandboxes: Sandbox[]

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @BeforeInsert()
  generateHash() {
    this.snapshotRef = generateBuildInfoHash(this.dockerfileContent, this.contextHashes)
  }
}
```

## 数据库迁移管理

### 1. 迁移文件结构

项目中的迁移文件按时间戳命名，确保执行顺序：

```
src/migrations/
├── 1741087887225-migration.ts  # 初始化迁移（用户、团队、工作空间等核心表）
├── 1741088165704-migration.ts  # Docker 注册表类型
├── 1741088883000-migration.ts  # 组织系统（组织、角色、权限等）
├── 1741088883001-migration.ts  # 用户邮箱字段
├── 1741088883002-migration.ts  # 组织角色初始化数据
├── 1742831092942-migration.ts  # 工作空间挂起状态
├── 1743683015304-migration.ts  # 工作空间名称字段移除
├── 1744378115901-migration.ts  # 组织挂起功能
├── 1744808444807-migration.ts  # 卷管理
├── 1744971114480-migration.ts  # 工作空间卷支持
├── 1745574377029-migration.ts  # 构建信息系统
├── 1749474791344-migration.ts  # 大型重命名（工作空间→沙盒）
├── 1749474791345-migration.ts  # 状态枚举更新
├── 1750077343089-migration.ts  # 守护进程版本
├── 1750751712412-migration.ts  # 快照状态更新
└── ...
```

### 2. 复杂迁移示例

**大型重构迁移 (`1749474791344-migration.ts`)**

```typescript
export class Migration1749474791344 implements MigrationInterface {
  name = 'Migration1749474791344'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 快照到备份重命名
    await queryRunner.renameColumn('workspace', 'snapshotRegistryId', 'backupRegistryId')
    await queryRunner.renameColumn('workspace', 'snapshotImage', 'backupSnapshot')
    await queryRunner.renameColumn('workspace', 'lastSnapshotAt', 'lastBackupAt')
    await queryRunner.renameColumn('workspace', 'snapshotState', 'backupState')
    await queryRunner.renameColumn('workspace', 'existingSnapshotImages', 'existingBackupSnapshots')

    // 节点到运行器重命名
    await queryRunner.renameTable('node', 'runner')
    await queryRunner.renameColumn('workspace', 'nodeId', 'runnerId')
    await queryRunner.renameColumn('workspace', 'prevNodeId', 'prevRunnerId')
    await queryRunner.renameTable('image_node', 'image_runner')
    await queryRunner.renameColumn('image_runner', 'nodeId', 'runnerId')

    // 镜像到快照重命名
    await queryRunner.renameColumn('warm_pool', 'image', 'snapshot')
    await queryRunner.renameColumn('organization', 'image_quota', 'snapshot_quota')
    await queryRunner.renameColumn('organization', 'max_image_size', 'max_snapshot_size')
    
    // 枚举值更新
    await queryRunner.query(
      `ALTER TYPE "public"."organization_role_permissions_enum" RENAME VALUE 'write:images' TO 'write:snapshots'`
    )
    await queryRunner.query(
      `ALTER TYPE "public"."organization_role_permissions_enum" RENAME VALUE 'delete:images' TO 'delete:snapshots'`
    )
    await queryRunner.query(
      `ALTER TYPE "public"."api_key_permissions_enum" RENAME VALUE 'write:images' TO 'write:snapshots'`
    )
    await queryRunner.query(
      `ALTER TYPE "public"."api_key_permissions_enum" RENAME VALUE 'delete:images' TO 'delete:snapshots'`
    )

    // 工作空间到沙盒重命名
    await queryRunner.renameTable('workspace', 'sandbox')
    await queryRunner.renameTable('workspace_usage_periods', 'sandbox_usage_periods')
    await queryRunner.renameColumn('organization', 'max_cpu_per_workspace', 'max_cpu_per_sandbox')
    await queryRunner.renameColumn('organization', 'max_memory_per_workspace', 'max_memory_per_sandbox')
    await queryRunner.renameColumn('organization', 'max_disk_per_workspace', 'max_disk_per_sandbox')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚操作（省略详细实现）
  }
}
```

### 3. 数据迁移与 Seed

**组织角色初始化**

```typescript
export class Migration1741088883002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 插入开发者角色
    await queryRunner.query(`
      INSERT INTO "organization_role" 
        ("id", "name", "description", "permissions", "isGlobal")
      VALUES 
        (
          '${GlobalOrganizationRolesIds.DEVELOPER}',
          'Developer', 
          'Grants the ability to create sandboxes and keys in the organization', 
          ARRAY[
            '${OrganizationResourcePermission.WRITE_SANDBOXES}'
          ]::organization_role_permissions_enum[],
          TRUE
        )
    `)

    // 插入沙盒管理员角色
    await queryRunner.query(`
      INSERT INTO "organization_role" 
        ("id", "name", "description", "permissions", "isGlobal")
      VALUES 
        (
          '${GlobalOrganizationRolesIds.SANDBOXES_ADMIN}',
          'Sandboxes Admin', 
          'Grants admin access to sandboxes in the organization', 
          ARRAY[
            '${OrganizationResourcePermission.WRITE_SANDBOXES}',
            '${OrganizationResourcePermission.DELETE_SANDBOXES}'
          ]::organization_role_permissions_enum[],
          TRUE
        )
    `)
  }
}
```

## 仓储模式与服务层

### 1. 标准仓储注入

```typescript
@Injectable()
export class SandboxService {
  constructor(
    @InjectRepository(Sandbox)
    private readonly sandboxRepository: Repository<Sandbox>,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Runner)
    private readonly runnerRepository: Repository<Runner>,
    @InjectRepository(BuildInfo)
    private readonly buildInfoRepository: Repository<BuildInfo>,
    // 其他依赖注入...
  ) {}
}
```

### 2. 复杂查询实现

**条件查询与关系加载**

```typescript
async findAll(organizationId: string, filters?: SandboxFilters): Promise<Sandbox[]> {
  const queryBuilder = this.sandboxRepository.createQueryBuilder('sandbox')
    .leftJoinAndSelect('sandbox.buildInfo', 'buildInfo')
    .where('sandbox.organizationId = :organizationId', { organizationId })
    .andWhere('sandbox.state != :destroyedState', { destroyedState: SandboxState.DESTROYED })

  if (filters?.state) {
    queryBuilder.andWhere('sandbox.state = :state', { state: filters.state })
  }

  if (filters?.region) {
    queryBuilder.andWhere('sandbox.region = :region', { region: filters.region })
  }

  return queryBuilder.getMany()
}
```

**批量操作优化**

```typescript
async findExpiredSandboxes(): Promise<Sandbox[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  
  return this.sandboxRepository.find({
    where: {
      state: In([SandboxState.STARTED, SandboxState.STOPPED]),
      lastActivityAt: LessThan(thirtyMinutesAgo),
      autoStopInterval: Not(0),
    },
    relations: ['buildInfo'],
  })
}
```

### 3. 事务管理

**跨服务事务处理**

```typescript
async remove(id: string): Promise<void> {
  await this.dataSource.transaction(async (em) => {
    await em.delete(User, id)
    await this.eventEmitter.emitAsync(UserEvents.DELETED, new UserDeletedEvent(em, id))
  })
}

async createWithEntityManager(
  entityManager: EntityManager,
  organizationData: CreateOrganizationDto,
  createdBy: string,
  emailVerified: boolean,
  personal = false,
  quota?: CreateOrganizationQuotaDto
): Promise<Organization> {
  const organization = new Organization()
  // 设置组织属性...
  
  return entityManager.save(organization)
}
```

## 模块配置模式

### 1. 功能模块实体注册

```typescript
@Module({
  imports: [
    UserModule,
    AuthModule,
    DockerRegistryModule,
    OrganizationModule,
    TypeOrmModule.forFeature([
      Sandbox, 
      Runner, 
      Snapshot, 
      BuildInfo, 
      SnapshotRunner, 
      DockerRegistry, 
      WarmPool, 
      Volume
    ]),
  ],
  controllers: [
    SandboxController,
    RunnerController,
    ToolboxController,
    SnapshotController,
    WorkspaceController,    // 向后兼容的控制器
    PreviewController,
    VolumeController,
  ],
  providers: [
    SandboxService,
    SandboxManager,
    BackupManager,
    SandboxWarmPoolService,
    RunnerService,
    RunnerApiFactory,
    ToolboxService,
    SnapshotService,
    SnapshotManager,
    DockerProvider,
    SandboxSubscriber,      // 实体事件订阅者
    RedisLockProvider,
    SnapshotSubscriber,
    VolumeService,
    VolumeManager,
    VolumeSubscriber,
    SnapshotRunnerService,
  ],
  exports: [
    SandboxService,
    RunnerService,
    RedisLockProvider,
    SnapshotService,
    VolumeService,
    VolumeManager,
    SnapshotRunnerService,
  ],
})
export class SandboxModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({ 
      path: 'sandbox', 
      method: RequestMethod.POST 
    })
  }
}
```

### 2. 跨模块实体共享

**组织模块中引用沙盒实体**

```typescript
@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([
      Organization,
      OrganizationRole,
      OrganizationUser,
      OrganizationInvitation,
      Sandbox,        // 跨模块引用
      Snapshot,       // 跨模块引用
      Volume,         // 跨模块引用
      SnapshotRunner, // 跨模块引用
    ]),
  ],
  // 配置...
})
export class OrganizationModule {}
```

## 事件驱动架构

### 1. 实体订阅者模式

**沙盒状态变更监听**

```typescript
@EventSubscriber()
export class SandboxSubscriber implements EntitySubscriberInterface<Sandbox> {
  @Inject(EventEmitter2)
  private eventEmitter: EventEmitter2

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this)
  }

  listenTo() {
    return Sandbox
  }

  afterInsert(event: InsertEvent<Sandbox>) {
    this.eventEmitter.emit(SandboxEvents.CREATED, new SandboxCreatedEvent(event.entity as Sandbox))
  }

  afterUpdate(event: UpdateEvent<Sandbox>) {
    const updatedColumns = event.updatedColumns.map((col) => col.propertyName)

    updatedColumns.forEach((column) => {
      switch (column) {
        case 'state':
          this.eventEmitter.emit(
            SandboxEvents.STATE_UPDATED,
            new SandboxStateUpdatedEvent(event.entity as Sandbox, event.databaseEntity[column], event.entity[column])
          )
          break
        case 'desiredState':
          this.eventEmitter.emit(
            SandboxEvents.DESIRED_STATE_UPDATED,
            new SandboxDesiredStateUpdatedEvent(event.entity as Sandbox, event.databaseEntity[column], event.entity[column])
          )
          break
        // 其他字段变更处理...
      }
    })
  }
}
```

### 2. 事件处理服务

**跨模块事件响应**

```typescript
@Injectable()
export class OrganizationService {
  @OnAsyncEvent({
    event: UserEvents.CREATED,
  })
  async handleUserCreatedEvent(payload: UserCreatedEvent): Promise<Organization> {
    return this.createWithEntityManager(
      payload.entityManager,
      { name: 'Personal' },
      payload.userId,
      payload.emailVerified || false,
      true,
      payload.personalOrganizationQuota,
    )
  }

  @OnAsyncEvent({
    event: UserEvents.DELETED,
  })
  async handleUserDeletedEvent(payload: UserDeletedEvent): Promise<void> {
    const organization = await this.findPersonalWithEntityManager(payload.entityManager, payload.userId)
    await this.removeWithEntityManager(payload.entityManager, organization, true)
  }
}
```

## 性能优化策略

### 1. 查询优化

**预加载关系**

```typescript
@Entity()
export class Snapshot {
  @ManyToOne(() => BuildInfo, (buildInfo) => buildInfo.snapshots, {
    nullable: true,
    eager: true,  // 自动预加载
  })
  @JoinColumn()
  buildInfo?: BuildInfo
}
```

**选择性加载**

```typescript
async findWithBuildInfo(snapshotId: string): Promise<Snapshot> {
  return this.snapshotRepository.findOne({
    where: { id: snapshotId },
    relations: ['buildInfo', 'runners'], // 手动指定关系
  })
}
```

### 2. 索引策略

**复合唯一约束**

```typescript
@Entity()
@Unique(['organizationId', 'name'])  // 复合唯一索引
export class Snapshot {
  @Column({
    nullable: true,
    type: 'uuid',
  })
  organizationId?: string

  @Column()
  name: string
}
```

### 3. 分页与限制

```typescript
async findPaginated(organizationId: string, page: number, limit: number): Promise<[Sandbox[], number]> {
  return this.sandboxRepository.findAndCount({
    where: { 
      organizationId,
      state: Not(SandboxState.DESTROYED) 
    },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })
}
```

## 测试策略

### 1. 单元测试模拟

```typescript
describe('SandboxService', () => {
  let service: SandboxService
  let repository: Repository<Sandbox>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SandboxService,
        {
          provide: getRepositoryToken(Sandbox),
          useValue: {
            find: jest.fn().mockResolvedValue(sandboxArray),
            findOneBy: jest.fn().mockResolvedValue(oneSandbox),
            save: jest.fn().mockResolvedValue(oneSandbox),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<SandboxService>(SandboxService)
    repository = module.get<Repository<Sandbox>>(getRepositoryToken(Sandbox))
  })
})
```

### 2. 集成测试

使用 TestContainers 进行数据库集成测试：

```typescript
describe('Sandbox Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource

  beforeAll(async () => {
    // 启动测试数据库容器
    const testDb = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start()

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(DataSource)
    .useValue(createTestDataSource(testDb.getConnectionUri()))
    .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })
})
```

## 错误处理与验证

### 1. 自定义异常

```typescript
export class SandboxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SandboxError'
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}
```

### 2. 实体验证

```typescript
@Entity()
export class Sandbox {
  @BeforeUpdate()
  validateDesiredState() {
    switch (this.desiredState) {
      case SandboxDesiredState.STARTED:
        if (![/* 有效状态列表 */].includes(this.state)) {
          throw new Error(`Sandbox ${this.id} is not in a valid state to be started. State: ${this.state}`)
        }
        break
      // 其他验证逻辑...
    }
  }

  @BeforeUpdate()
  updatePendingFlag() {
    if (String(this.state) === String(this.desiredState)) {
      this.pending = false
    }
    if (this.state === SandboxState.ERROR || this.state === SandboxState.BUILD_FAILED) {
      this.pending = false
    }
  }
}
```

## 最佳实践总结

### 1. 实体设计原则

- ✅ 使用枚举类型确保数据一致性
- ✅ 合理使用 JSONB 存储复杂结构
- ✅ 实现生命周期钩子进行数据验证
- ✅ 设置适当的默认值和约束

### 2. 关系映射策略

- ✅ 明确指定级联操作 (`cascade`, `onDelete`)
- ✅ 使用 `@JoinColumn` 明确外键映射
- ✅ 合理设置预加载 (`eager`) 策略
- ✅ 复合主键使用 `@PrimaryColumn`

### 3. 查询优化技巧

- ✅ 使用 QueryBuilder 构建复杂查询
- ✅ 适当使用索引和约束
- ✅ 实现分页避免大数据集问题
- ✅ 选择性加载关系避免 N+1 问题

### 4. 迁移管理规范

- ✅ 使用描述性的迁移名称
- ✅ 总是实现 `up` 和 `down` 方法
- ✅ 大型重构分步进行
- ✅ 在迁移中包含数据转换逻辑

### 5. 事务与一致性

- ✅ 跨服务操作使用事务包装
- ✅ 实现事件驱动的数据一致性
- ✅ 使用乐观锁处理并发更新
- ✅ 实体验证确保业务规则

### 6. 测试覆盖策略

- ✅ 单元测试模拟仓储接口
- ✅ 集成测试使用真实数据库
- ✅ 测试数据迁移的完整性
- ✅ 验证事件系统的正确性

## 架构演进

该项目的 TypeORM 实践体现了以下架构演进模式：

1. **从单体到模块化**: 通过模块化的实体管理实现关注点分离
2. **事件驱动解耦**: 使用订阅者模式和事件发射器实现模块间解耦
3. **数据模型演进**: 通过迁移系统支持业务模型的持续演进
4. **性能优化**: 通过查询优化和关系设计提升系统性能

这些实践为构建可扩展、可维护的企业级应用提供了坚实的数据层基础。
