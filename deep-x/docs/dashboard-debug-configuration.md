# Daytona Dashboard 前端调试配置指南

## 项目概况

Daytona Dashboard 是一个基于 Vite + React + TypeScript 的前端项目，运行在 Nx 单体仓库中。本文档详细介绍如何配置和解决前端调试问题，特别是断点不生效的问题。

## 项目技术栈

- **构建工具**: Vite 5.x
- **前端框架**: React 18
- **语言**: TypeScript 5.x
- **单体仓库**: Nx
- **开发服务器**: Vite Dev Server
- **包管理器**: Yarn

## 项目启动方式

### 1. 启动整个开发环境

```bash
# 在项目根目录运行，会启动所有服务（除了 daemon）
yarn serve

# 或者跳过某些服务
yarn serve:skip-proxy-runner  # 跳过 proxy 和 runner
yarn serve:skip-runner        # 跳过 runner
```

### 2. 单独启动 Dashboard 前端

```bash
# 使用 Nx 命令直接启动 dashboard
npx nx serve dashboard

# 或者进入 dashboard 目录使用 Vite
cd apps/dashboard
npx vite --config vite.config.mts
```

## 快速调试配置（推荐方法）

### 最简单的调试配置

只需要两个步骤即可实现 Dashboard 的断点调试：

#### 1. 安装 VS Code 扩展

确保安装了 **Debugger for Chrome** 扩展：

- 在 VS Code 中按 `Ctrl+Shift+X` 打开扩展面板
- 搜索 "Debugger for Chrome" 并安装

#### 2. 配置 launch.json

在 `.vscode/launch.json` 中添加以下配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Dashboard",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/apps/dashboard/src",
      "sourceMaps": true,
      "resolveSourceMapLocations": [
        "${workspaceFolder}/apps/dashboard/**",
        "!**/node_modules/**"
      ]
    }
  ]
}
```

### 使用方法

1. 启动 Dashboard 开发服务器：

   ```bash
   npx nx serve dashboard
   ```

2. 在 VS Code 中设置断点

3. 按 `F5` 或选择 "Launch Dashboard" 配置启动调试

4. 断点即可正常生效！

## 高级调试配置（可选）

如果上述简单配置无法满足需求，可以使用以下更详细的配置：

### 完整的 VS Code 调试配置

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Dashboard (Advanced)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/apps/dashboard",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/src/*",
        "webpack:///./*": "${webRoot}/*",
        "webpack:///src/*": "${webRoot}/src/*"
      },
      "preLaunchTask": "start-dashboard"
    },
    {
      "name": "Attach to Dashboard",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/apps/dashboard"
    }
  ]
}
```

### VS Code 任务配置（可选）

如果需要自动启动服务器，创建 `.vscode/tasks.json`：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "shell",
      "label": "start-dashboard",
      "command": "npx nx serve dashboard",
      "group": "build",
      "isBackground": true,
      "problemMatcher": [
        {
          "pattern": [
            {
              "regexp": ".",
              "file": 1,
              "location": 2,
              "message": 3
            }
          ],
          "background": {
            "activeOnStart": true,
            "beginsPattern": ".",
            "endsPattern": "Local:.*http://localhost"
          }
        }
      ]
    }
  ]
}
```

### Vite 配置确认（通常不需要修改）

项目的 `apps/dashboard/vite.config.mts` 默认已经支持 source maps，通常不需要额外配置：

```typescript
// vite.config.mts - 默认配置已足够
export default defineConfig({
  // Source maps 在开发模式下默认启用
  // 如果需要显式配置：
  build: {
    sourcemap: true, // 生产环境 source map（可选）
  },
})
```

## 常见调试问题及解决方案

### 1. 断点不生效

**症状**: 在 VS Code 中设置断点，但调试时无法命中

**解决方案**:

1. **检查 Source Map 配置**:

   ```typescript
   // vite.config.mts
   export default defineConfig({
     build: {
       sourcemap: true,
     },
     esbuild: {
       sourcemap: true,
     }
   })
   ```

2. **确认端口匹配**:
   - 检查 Vite 服务器端口（默认 3000）
   - 确保调试配置中的 URL 端口正确

3. **清除缓存重启**:

   ```bash
   # 清除 Vite 缓存
   rm -rf node_modules/.vite
   
   # 重启开发服务器
   npx nx serve dashboard
   ```

### 2. Source Map 路径问题

**症状**: 能看到源码但断点位置偏移

**解决方案**:

```json
// .vscode/launch.json
{
  "sourceMapPathOverrides": {
    "/static/js/*": "${webRoot}/src/*",
    "webpack:///apps/dashboard/src/*": "${webRoot}/src/*",
    "webpack:///../*": "${webRoot}/*"
  }
}
```

### 3. 热重载断点失效

**症状**: 修改代码后断点失效

**解决方案**:

1. **配置 Vite HMR**:

   ```typescript
   // vite.config.mts
   export default defineConfig({
     server: {
       hmr: {
         overlay: true
       }
     }
   })
   ```

2. **重新设置断点**: 代码变更后重新设置断点

### 4. Chrome DevTools 调试

**推荐调试流程**:

1. **启动开发服务器**:

   ```bash
   npx nx serve dashboard
   ```

2. **在 Chrome 中打开**:

   ```
   http://localhost:3000
   ```

3. **开启开发者工具** (F12)

4. **在 Sources 标签页中**:
   - 找到 `webpack://` 或相应的源码路径
   - 直接在源码中设置断点

## 开发工作流最佳实践

### 1. 推荐的调试工作流（简化版）

```bash
# 1. 启动开发服务器
npx nx serve dashboard

# 2. 在 VS Code 中设置断点

# 3. 按 F5 启动调试（或选择 "Launch Dashboard"）

# 4. 断点即可生效，无需额外配置！
```

### 2. 实时调试技巧

1. **使用 console.log 进行快速调试**:

   ```typescript
   // 临时调试输出
   console.log('Debug point reached:', { data, state })
   ```

2. **使用 debugger 语句**:

   ```typescript
   // 强制断点
   debugger;
   ```

3. **React DevTools 配合使用**:
   - 安装 React Developer Tools 浏览器扩展
   - 检查组件状态和 props

### 3. 性能调试

```typescript
// 性能监控
console.time('Component Render')
// ... 组件逻辑
console.timeEnd('Component Render')
```

## 环境配置检查清单

### 基本要求（必需）

- [ ] Node.js 版本 >= 18
- [ ] Yarn 版本 >= 1.22
- [ ] VS Code 已安装 **Debugger for Chrome** 扩展
- [ ] Chrome 浏览器最新版本
- [ ] 确认防火墙不会阻止 localhost:3000

### 可选扩展

- [ ] ES7+ React/Redux/React-Native snippets
- [ ] TypeScript Importer
- [ ] React Developer Tools（浏览器扩展）

## 故障排除命令

```bash
# 清理并重装依赖
rm -rf node_modules
rm -rf dist
rm -rf .nx/cache
yarn install

# 重置 Nx 缓存
npx nx reset

# 检查端口占用
lsof -ti:3000

# 强制终止端口进程
kill -9 $(lsof -ti:3000)
```

## 团队开发建议

1. **统一开发环境**:
   - 使用相同的 Node.js 版本
   - 统一的 VS Code 设置和扩展

2. **调试约定**:
   - 不要提交包含 `debugger` 语句的代码
   - 移除临时的 `console.log` 输出

3. **文档维护**:
   - 记录特殊的调试配置
   - 分享有效的调试技巧

## 参考资源

- [Vite 官方调试指南](https://vitejs.dev/guide/debugging.html)
- [VS Code JavaScript 调试](https://code.visualstudio.com/docs/nodejs/javascript-debugging)
- [Chrome DevTools 文档](https://developer.chrome.com/docs/devtools/)
- [React DevTools 使用指南](https://react.dev/learn/react-developer-tools)

---

## 总结

通过以上配置，特别是最简单的两步配置方法，你应该能够快速解决 Daytona Dashboard 前端项目的调试问题：

1. **安装 Debugger for Chrome 扩展**
2. **配置简单的 launch.json**

这样就能实现完整的断点调试功能，无需复杂的配置。如果遇到问题，首先检查端口是否正确（默认 3000），然后确认扩展是否正确安装。
