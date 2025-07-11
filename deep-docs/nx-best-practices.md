# Daytona 项目中的 Nx 最佳实践

## 项目概览

Daytona 是一个使用 Nx monorepo 架构管理的多语言项目，包含 TypeScript、Go、Python 等多种技术栈。本文档总结了项目中 Nx 的使用模式和最佳实践。

## 工作区架构

### 项目结构

```
daytona/
├── apps/                    # 应用程序
│   ├── api/                # NestJS API 服务 (TypeScript)
│   ├── cli/                # CLI 工具 (Go)
│   ├── daemon/             # 守护进程 (Go)
│   ├── dashboard/          # 前端仪表板 (React + Vite)
│   ├── proxy/              # 代理服务 (Go)
│   ├── runner/             # 运行器服务 (Go)
│   └── daytona-e2e/        # E2E 测试
├── libs/                   # 共享库
│   ├── api-client/         # TypeScript API 客户端
│   ├── api-client-go/      # Go API 客户端
│   ├── api-client-python/  # Python API 客户端
│   ├── sdk-typescript/     # TypeScript SDK
│   └── sdk-python/         # Python SDK
└── examples/               # 示例代码
```

### 项目类型划分

- **applications**: 可独立部署的应用程序
- **libraries**: 可重用的共享代码库
- **e2e**: 端到端测试项目

## Nx 配置最佳实践

### 1. 工作区级别配置 (nx.json)

#### 核心配置要点

```json
{
  "neverConnectToCloud": true,  // 禁用 Nx Cloud，保持项目私有
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/eslint.config.mjs",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/.github/workflows/ci.yml",
      "{workspaceRoot}/go.work"  // 包含 Go workspace 文件
    ]
  }
}
```

**最佳实践：**

- ✅ 定义清晰的 `namedInputs` 来优化缓存策略
- ✅ 生产环境构建排除测试文件和配置文件
- ✅ 将跨项目的全局文件（如 CI 配置、Go workspace）包含在 `sharedGlobals` 中

#### 插件配置策略

```json
{
  "plugins": [
    {
      "plugin": "@nx/webpack/plugin",
      "options": {
        "buildTargetName": "build",
        "serveTargetName": "serve"
      }
    },
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "buildTargetName": "build",
        "testTargetName": "test",
        "serveTargetName": "serve"
      }
    }
  ]
}
```

**最佳实践：**

- ✅ 使用插件自动检测和配置项目目标
- ✅ 保持目标命名的一致性 (`build`, `serve`, `test`, `lint`)
- ✅ 为不同技术栈使用相应的专用插件

### 2. 项目级别配置 (project.json)

#### TypeScript 项目配置模式

**API 服务配置示例：**

```json
{
  "name": "api",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/apps/api",
        "main": "apps/api/src/main.ts",
        "generatePackageJson": true
      },
      "configurations": {
        "production": {
          "optimization": true,
          "extractLicenses": true
        }
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "dependsOn": ["build"],
      "options": {
        "buildTarget": "api:build",
        "watch": true
      }
    }
  }
}
```

**库配置示例：**

```json
{
  "name": "api-client",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/libs/api-client",
        "updateBuildableProjectDepsInPackageJson": true
      }
    },
    "generate:api-client": {
      "executor": "nx:run-commands",
      "dependsOn": [
        {
          "target": "openapi",
          "projects": "api"
        }
      ]
    }
  }
}
```

**最佳实践：**

- ✅ 明确指定 `projectType` (application/library)
- ✅ 使用 `updateBuildableProjectDepsInPackageJson` 自动管理依赖
- ✅ 通过 `dependsOn` 明确指定构建依赖关系

#### Go 项目配置模式

```json
{
  "name": "daemon",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx-go/nx-go:build",
      "options": {
        "main": "{projectRoot}/cmd/daemon/main.go",
        "outputPath": "dist/apps/daemon"
      }
    },
    "build-amd64": {
      "executor": "@nx-go/nx-go:build",
      "options": {
        "env": {
          "GOARCH": "amd64",
          "GOOS": "linux"
        }
      },
      "dependsOn": ["prepare"]
    },
    "serve": {
      "executor": "@nx-go/nx-go:serve",
      "options": {
        "cmd": "gow",  // 使用 gow 进行热重载
        "main": "{projectRoot}/cmd/daemon/main.go"
      }
    }
  }
}
```

**最佳实践：**

- ✅ 使用 `@nx-go/nx-go` 插件管理 Go 项目
- ✅ 为不同平台创建专门的构建目标
- ✅ 使用 `gow` 实现开发环境的热重载
- ✅ 通过环境变量控制构建目标平台

### 3. 依赖管理最佳实践

#### 项目间依赖配置

**显式依赖声明：**

```json
{
  "targets": {
    "build": {
      "dependsOn": [
        {
          "target": "build",
          "projects": "daemon"
        },
        {
          "target": "build-amd64", 
          "projects": "daemon"
        },
        "copy-daemon-bin"
      ]
    }
  }
}
```

**隐式依赖配置：**

```json
{
  "implicitDependencies": ["api"]
}
```

**最佳实践：**

- ✅ 使用 `dependsOn` 明确构建时依赖关系
- ✅ 使用 `implicitDependencies` 声明运行时依赖
- ✅ 避免循环依赖，保持依赖图的清晰性

#### 跨语言依赖处理

在 Daytona 项目中，Go 项目之间通过二进制文件共享：

```json
{
  "copy-daemon-bin": {
    "executor": "nx:run-commands", 
    "options": {
      "command": "cp dist/apps/daemon-amd64 {projectRoot}/pkg/daemon/static"
    },
    "dependsOn": [
      {
        "target": "build",
        "projects": "daemon"
      }
    ]
  }
}
```

## 执行器 (Executors) 使用指南

### 1. 内置执行器

#### `nx:run-commands` - 通用命令执行器

```json
{
  "format": {
    "executor": "nx:run-commands",
    "options": {
      "command": "cd {projectRoot} && prettier --write \"**/*.{ts,json}\"",
      "cwd": "{projectRoot}"
    }
  }
}
```

**使用场景：**

- ✅ 格式化代码
- ✅ 生成代码 (OpenAPI 客户端)
- ✅ 自定义构建步骤
- ✅ 运行外部工具

#### TypeScript 相关执行器

- `@nx/js:tsc` - TypeScript 编译
- `@nx/webpack:webpack` - Webpack 构建  
- `@nx/js:node` - Node.js 应用服务器

#### Go 相关执行器

- `@nx-go/nx-go:build` - Go 构建
- `@nx-go/nx-go:serve` - Go 开发服务器
- `@nx-go/nx-go:test` - Go 测试
- `@nx-go/nx-go:lint` - Go 代码检查

### 2. 自定义执行器最佳实践

**参数化配置：**

```json
{
  "options": {
    "main": "{projectRoot}/cmd/daemon/main.go",
    "outputPath": "dist/apps/{projectName}",
    "env": {
      "GOARCH": "amd64",
      "GOOS": "linux"
    }
  }
}
```

**最佳实践：**

- ✅ 使用 `{projectRoot}` 和 `{projectName}` 变量
- ✅ 通过环境变量参数化构建配置
- ✅ 保持配置的可重用性

## 缓存策略优化

### 1. 输入配置

```json
{
  "targetDefaults": {
    "@nx/js:tsc": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    }
  }
}
```

### 2. 输出配置

```json
{
  "build": {
    "executor": "@nx/js:tsc",
    "outputs": ["{options.outputPath}"]
  }
}
```

**最佳实践：**

- ✅ 为构建目标启用缓存
- ✅ 明确指定输入和输出文件
- ✅ 使用 `^` 前缀表示依赖项的输出

## 脚本与命令最佳实践

### 1. 根级别脚本 (package.json)

```json
{
  "scripts": {
    "build": "nx run-many --target=build --all --parallel=$(getconf _NPROCESSORS_ONLN)",
    "build:production": "nx run-many --target=build --all --parallel=$(getconf _NPROCESSORS_ONLN) --configuration=production",
    "serve": "nx run-many --target=serve --all --exclude=daemon --parallel=$(getconf _NPROCESSORS_ONLN)",
    "generate:api-client": "yarn generate:openapi && nx run-many --target=generate:api-client --all"
  }
}
```

**最佳实践：**

- ✅ 使用 `nx run-many` 批量执行目标
- ✅ 通过 `--parallel` 利用多核并行构建
- ✅ 使用 `--exclude` 排除特定项目
- ✅ 链式命令确保依赖顺序执行

### 2. 开发工作流

#### 完整开发环境启动

```bash
yarn serve
```

#### 排除特定服务的开发环境

```bash
yarn serve:skip-runner
yarn serve:skip-proxy
```

#### 生产环境构建

```bash
yarn build:production
```

## 多语言项目集成

### 1. Go Workspace 集成

**Go 工作区配置 (go.work)：**

```go
go 1.23.4

use (
    ./apps/cli
    ./apps/daemon
    ./apps/proxy
    ./apps/runner
    ./libs/api-client-go
    ./libs/common-go
)
```

**Nx 中的 Go 依赖管理：**

```json
{
  "sharedGlobals": [
    "{workspaceRoot}/go.work"
  ]
}
```

### 2. Python 项目集成

```json
{
  "build": {
    "executor": "nx:run-commands",
    "options": {
      "cwd": "{projectRoot}",
      "command": "python3 -m build"
    }
  }
}
```

## 代码生成工作流

### 1. OpenAPI 客户端生成

**API 规范生成：**

```json
{
  "openapi": {
    "executor": "nx:run-commands",
    "options": {
      "command": "yarn ts-node apps/api/src/generate-openapi.ts -o dist/apps/api/openapi.json"
    }
  }
}
```

**多语言客户端生成：**

```json
{
  "generate:api-client": {
    "executor": "nx:run-commands",
    "options": {
      "commands": [
        "yarn run openapi-generator-cli generate -i dist/apps/api/openapi.json -g typescript-axios -o libs/api-client/src",
        "yarn nx format api-client"
      ],
      "parallel": false
    },
    "dependsOn": [
      {
        "target": "openapi",
        "projects": "api"
      }
    ]
  }
}
```

### 2. 文档生成

```json
{
  "docs": {
    "executor": "nx:run-commands",
    "options": {
      "cwd": "{projectRoot}",
      "command": "npm run docs"
    }
  }
}
```

## 测试策略

### 1. 单元测试配置

```json
{
  "test": {
    "executor": "@nx/jest:jest",
    "options": {
      "jestConfig": "apps/daytona-e2e/jest.config.ts",
      "passWithNoTests": true
    }
  }
}
```

### 2. E2E 测试配置

```json
{
  "e2e": {
    "executor": "@nx/jest:jest",
    "dependsOn": ["api:build"],
    "options": {
      "jestConfig": "apps/daytona-e2e/jest.config.ts"
    }
  }
}
```

## 发布与部署

### 1. 库发布配置

```json
{
  "publish": {
    "executor": "nx:run-commands",
    "options": {
      "commands": [
        "npm version $NX_PACKAGE_PUBLISH_VERSION",
        "npm publish"
      ],
      "cwd": "dist/libs/api-client",
      "parallel": false
    },
    "dependsOn": [
      {
        "target": "build"
      }
    ]
  }
}
```

### 2. Docker 构建

```json
{
  "docker-build": {
    "dependsOn": ["build"],
    "command": "docker build -f apps/api/Dockerfile . -t api"
  }
}
```

## 性能优化建议

### 1. 并行执行优化

- ✅ 使用 `--parallel` 参数
- ✅ 根据 CPU 核心数动态设置并行度：`$(getconf _NPROCESSORS_ONLN)`
- ✅ 合理配置项目依赖关系，避免不必要的串行等待

### 2. 缓存优化

- ✅ 启用 Nx 缓存：`"cache": true`
- ✅ 正确配置输入和输出文件
- ✅ 使用 `namedInputs` 优化缓存粒度

### 3. 依赖图优化

- ✅ 定期运行 `nx graph` 检查依赖关系
- ✅ 避免循环依赖
- ✅ 合理拆分大型库

## 常见问题与解决方案

### 1. 跨平台构建问题

**问题**：Go 项目在不同平台构建失败
**解决方案**：使用构建标签和平台特定文件

```go
//go:build darwin
// 文件: detector_darwin.go

//go:build !darwin  
// 文件: detector.go
```

### 2. 依赖管理问题

**问题**：API 客户端生成失败
**解决方案**：确保依赖顺序正确

```json
{
  "dependsOn": [
    {
      "target": "openapi",
      "projects": "api"
    }
  ]
}
```

### 3. 开发环境启动问题

**问题**：某些服务无法在开发环境运行
**解决方案**：使用排除选项

```bash
yarn serve:skip-daemon
```

## 总结

Daytona 项目充分发挥了 Nx monorepo 的优势：

1. **统一的构建工具链**：TypeScript、Go、Python 项目使用统一的 Nx 命令
2. **智能的依赖管理**：自动处理项目间依赖和构建顺序  
3. **高效的并行执行**：充分利用多核 CPU 加速构建
4. **灵活的缓存策略**：减少重复构建时间
5. **一致的开发体验**：所有项目使用相同的命令和工作流

这种架构特别适合：

- 多语言技术栈项目
- 需要频繁代码生成的项目
- 有复杂项目间依赖的大型项目
- 需要统一 CI/CD 流程的团队

通过遵循本文档中的最佳实践，可以充分发挥 Nx 在大型 monorepo 项目中的优势。
