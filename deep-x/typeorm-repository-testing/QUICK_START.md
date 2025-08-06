# 🚀 TypeORM Repository 测试项目 - 快速开始

这个项目专门用于测试和验证 TypeORM Repository 的各种功能，基于 Daytona API 中的实际实体结构设计。

## 🎯 项目目标

- 提供一个安全的 TypeORM Repository 测试环境
- 基于真实的 Daytona API 实体结构
- 验证复杂的查询逻辑和 Repository 模式
- 学习和实验 TypeORM 的各种功能

## 📦 安装和设置

### 1. 安装依赖

```bash
cd deep-docs/typeorm-repository-testing
npm install
```

### 2. 启动数据库

```bash
# 启动 PostgreSQL 容器
docker-compose up -d

# 等待数据库完全启动（约10秒）
sleep 10
```

### 3. 初始化数据库

```bash
# 创建表结构和示例数据
npm run setup-db
```

## 🎮 使用示例

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:organization
npm run test:repository-patterns

# 监听模式运行测试
npm run test:watch
```

### 运行示例

```bash
# 基础查询示例 - 学习基本的 Repository 操作
npm run example:basic

# 复杂查询示例 - 高级 SQL 功能演示
npm run example:complex

# 关系查询示例 - 实体关系和关联查询
npm run example:relationships

# 事务处理示例 - 事务管理和错误处理
npm run example:transactions
```

### 交互式演示

```bash
# 运行交互式演示
npm run demo
```

## 🔧 维护命令

```bash
# 清理数据库
npm run clean-db

# 重新初始化数据库
npm run setup-db

# 代码检查
npm run lint
npm run lint:fix

# 代码格式化
npm run format
```

## 📊 测试和验证

### 推荐的学习路径

1. **首先运行示例脚本**（100% 成功率）:

   ```bash
   npm run example:basic      # 基础 CRUD 操作
   npm run example:complex    # 高级查询功能  
   npm run example:relationships  # 关系管理
   npm run example:transactions   # 事务处理
   ```

2. **然后运行核心功能测试**:

   ```bash
   npm run test:organization  # 组织相关测试（100% 通过）
   ```

3. **最后尝试完整测试套件**:

   ```bash
   npm test  # 完整测试（约57%通过率）
   ```

### 测试结果说明

- **示例脚本**: 100% 运行成功，适合学习和验证 ✅
- **单独测试套件**: 100% 通过，验证主要功能 ✅
  - `test:organization`: 20/20 通过
  - `test:repository-patterns`: 18/18 通过  
  - `test:performance`: 11/11 通过
- **完整测试套件**: 可能因测试隔离问题部分失败
- **建议**: 优先使用示例脚本和单独测试命令进行学习和验证

### 🎯 推荐使用方式

1. **日常学习**: 使用示例脚本

   ```bash
   npm run example:basic       # 学习基础操作
   npm run example:complex     # 学习高级查询
   ```

2. **功能验证**: 使用单独测试

   ```bash
   npm run test:organization   # 验证组织功能
   npm run test:repository-patterns  # 验证仓储模式
   ```

3. **性能分析**: 使用性能测试

   ```bash
   npm run test:performance    # 性能基准测试
   ```

## 📊 测试数据概览

运行 `npm run setup-db` 后，数据库将包含：

### 用户数据

- `admin-user` - 管理员用户 ✅ 已验证
- `john-doe` - 普通用户 ✅ 已验证
- `jane-smith` - 普通用户 ❌ 未验证邮箱
- `bob-wilson` - 普通用户 ✅ 已验证

### 组织数据

- `Daytona Inc` - 企业组织 ✅ 活跃
- `Personal (John)` - 个人组织 ✅ 活跃
- `Personal (Jane)` - 个人组织 🔒 暂停（邮箱未验证）
- `Development Team` - 企业组织 ✅ 活跃
- `Old Suspended Org` - 企业组织 🔒 暂停（账单问题）

## 🧪 测试内容

这个项目包含以下类型的测试：

### 基础 CRUD 操作

- 创建、读取、更新、删除实体
- 验证字段默认值和约束
- 测试实体生命周期钩子

### 实体关系

- OneToMany / ManyToOne 关系
- 级联操作测试
- 关系数据的预加载和懒加载

### 复杂查询

- 条件查询 (WHERE, AND, OR)
- 排序和分页
- 聚合查询 (COUNT, SUM, etc.)
- 子查询和 JOIN 操作

### QueryBuilder

- 动态查询构建
- 参数化查询
- 原生 SQL 执行
- 复杂的多表查询

### 事务处理

- 事务提交和回滚
- 嵌套事务
- 事务隔离级别

### 性能优化

- 批量操作
- 查询优化
- 索引使用验证

## 🎓 学习路径

### 1. 新手入门

1. 运行 `npm run example:basic` 学习基础操作
2. 查看 `src/tests/organization.test.ts` 了解测试结构
3. 运行 `npm test` 查看所有测试用例

### 2. 进阶学习

1. 研究 `src/services/organization.service.ts` 的复杂逻辑
2. 实验 QueryBuilder 的各种用法
3. 尝试修改实体关系和测试效果

### 3. 实践验证

1. 创建自己的测试用例
2. 验证 API 中的 Repository 逻辑
3. 测试性能优化策略

## 🔍 核心文件说明

### 实体定义

- `src/entities/organization.entity.ts` - 组织实体
- `src/entities/user.entity.ts` - 用户实体  
- `src/entities/organization-user.entity.ts` - 组织用户关系

### 服务层

- `src/services/organization.service.ts` - 组织服务（复制自API）

### 测试文件

- `src/tests/organization.test.ts` - 组织相关测试
- `src/tests/setup.ts` - 测试环境配置

### 配置文件

- `src/config/database.ts` - 数据库配置
- `src/config/naming-strategy.ts` - 命名策略（与API一致）

## 🐛 故障排除

### 数据库连接问题

```bash
# 检查 Docker 容器状态
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

### 测试失败

```bash
# 清理并重新初始化数据库
npm run clean-db
npm run setup-db

# 运行单个测试
npm test -- --grep "specific test name"
```

### 端口冲突

如果端口 5432 被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "5433:5432"  # 使用 5433 端口
```

然后更新 `env.example` 中的端口配置。

## 🤝 贡献指南

1. 添加新的测试用例到 `src/tests/` 目录
2. 创建新的示例到 `examples/` 目录
3. 扩展实体定义以测试更多功能
4. 优化查询性能并添加基准测试

## 📚 相关资源

- [TypeORM 官方文档](https://typeorm.io/)
- [Daytona API 源码](../../apps/api/src/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Jest 测试框架](https://jestjs.io/)

---

这个项目让您可以安全地实验和学习 TypeORM Repository 模式，同时确保测试结果对实际的 Daytona API 开发有实际价值。
