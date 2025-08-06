# Daytona Proxy 服务架构文档

## 概览

Daytona Proxy 是一个专用的代理服务，负责为沙盒（Sandbox）环境提供安全的外部访问入口。它通过子域名路由机制，实现了对沙盒内部服务端口的访问控制和流量转发。

## 核心功能

### 1. 子域名路由系统

**URL 格式解析**

- 期望格式：`{port}-{sandbox-id}.proxy.domain`
- 示例：`3000-uuid-1234.proxy.daytona.com`
- 功能：从主机名中提取目标端口和沙盒 ID

**路由逻辑**

```go
func (p *Proxy) parseHost(host string) (targetPort string, sandboxID string, err error) {
    // 解析主机名，提取端口和沙盒ID
    hostPrefix := parts[0] // "3000-uuid-1234"
    targetPort = hostPrefix[:dashIndex] // "3000"
    sandboxID = hostPrefix[dashIndex+1:] // "uuid-1234"
}
```

### 2. 多层身份验证系统

**认证方式优先级**

1. **HTTP Header 认证**：`X-Daytona-Preview-Token`
2. **Query Parameter 认证**：`DAYTONA_SANDBOX_AUTH_KEY`
3. **Cookie 认证**：`daytona-sandbox-auth-{sandboxId}`
4. **OIDC OAuth2 流程**：重定向到 OAuth 提供商

**认证流程**

```go
func (p *Proxy) Authenticate(ctx *gin.Context, sandboxId string) (err error, didRedirect bool) {
    // 1. 检查 Header
    // 2. 检查 Query Parameter
    // 3. 检查 Cookie
    // 4. 触发 OIDC 流程
}
```

**OIDC 集成**

- 支持 OpenID Connect 认证流程
- 状态管理：使用 Base64 编码存储回调信息
- 访问权限验证：通过 Daytona API 验证用户对沙盒的访问权限

### 3. 智能缓存机制

**缓存层次**

- **Redis 缓存**：生产环境，支持分布式部署
- **内存缓存**：开发环境，基于 `concurrent-map`

**缓存数据类型**

```go
type Proxy struct {
    runnerCache              cache.ICache[RunnerInfo]     // 运行器信息，1小时TTL
    sandboxPublicCache       cache.ICache[bool]           // 沙盒公开状态，2分钟TTL
    sandboxAuthKeyValidCache cache.ICache[bool]           // 认证密钥有效性，2分钟TTL
}
```

**缓存策略**

- 运行器信息：长期缓存（1小时），减少对 API 的查询
- 沙盒状态：短期缓存（2分钟），保证权限变更的及时性
- 认证信息：短期缓存（2分钟），平衡安全性与性能

### 4. CORS 处理机制

**动态 CORS 配置**

```go
corsConfig := cors.DefaultConfig()
corsConfig.AllowOriginFunc = func(origin string) bool {
    return true // 允许所有来源
}
corsConfig.AllowCredentials = true
corsConfig.AllowHeaders = slices.Collect(maps.Keys(ctx.Request.Header))
```

**特殊功能**

- `X-Daytona-Disable-CORS`：临时禁用 CORS 检查
- 动态头部收集：自动允许请求中的所有头部

## 技术架构

### 1. 项目结构

```
apps/proxy/
├── cmd/proxy/
│   ├── main.go                # 应用程序入口
│   └── config/
│       └── config.go          # 配置管理
├── pkg/
│   ├── proxy/
│   │   ├── proxy.go           # 核心代理逻辑
│   │   ├── auth.go            # 身份验证
│   │   ├── auth_callback.go   # OIDC 回调处理
│   │   └── get_target.go      # 目标解析
│   └── cache/
│       ├── interface.go       # 缓存接口
│       ├── redis_cache.go     # Redis 实现
│       └── map_cache.go       # 内存实现
├── go.mod                     # Go 模块定义
└── project.json              # Nx 项目配置
```

### 2. 配置系统

**环境变量配置**

```go
type Config struct {
    ProxyPort     int          // 代理服务端口 (默认4000)
    ProxyDomain   string       // 代理域名
    ProxyProtocol string       // 协议 (http/https)
    ProxyApiKey   string       // API 密钥
    TLSCertFile   string       // TLS 证书文件
    TLSKeyFile    string       // TLS 私钥文件
    EnableTLS     bool         // 启用 TLS
    DaytonaApiUrl string       // Daytona API URL
    Oidc          OidcConfig   // OIDC 配置
    Redis         *RedisConfig // Redis 配置（可选）
}
```

**OIDC 配置**

```go
type OidcConfig struct {
    ClientId     string // OIDC 客户端 ID
    ClientSecret string // OIDC 客户端密钥
    Domain       string // OIDC 提供商域名
    Audience     string // OIDC 受众
}
```

### 3. 代理目标解析

**目标构建流程**

1. 解析主机名获取端口和沙盒 ID
2. 验证沙盒访问权限
3. 获取运行器信息
4. 构建目标 URL

**目标 URL 格式**

```
{runner.ApiUrl}/sandboxes/{sandboxId}/toolbox/proxy/{port}{path}
```

**请求头处理**

- 添加 `X-Daytona-Authorization: Bearer {runner.ApiKey}`
- 保持原始请求头
- 设置适当的 Host 头

## 安全机制

### 1. 访问控制

**沙盒公开性检查**

```go
func (p *Proxy) getSandboxPublic(ctx context.Context, sandboxId string) (*bool, error) {
    // 通过 Daytona API 检查沙盒是否为公开状态
    _, resp, _ := p.daytonaApiClient.PreviewAPI.IsSandboxPublic(context.Background(), sandboxId).Execute()
    return resp.StatusCode == http.StatusOK
}
```

**特殊端口策略**

- 端口 22222（SSH）：始终需要认证，即使沙盒是公开的
- 其他端口：根据沙盒公开性决定是否需要认证

### 2. Cookie 安全

**安全 Cookie 设置**

```go
encoded, err := p.secureCookie.Encode(DAYTONA_SANDBOX_AUTH_COOKIE_NAME+sandboxId, sandboxId)
ctx.SetCookie(DAYTONA_SANDBOX_AUTH_COOKIE_NAME+sandboxId, encoded, 3600, "/", 
              cookieDomain, p.config.EnableTLS, true) // HttpOnly=true
```

**域名安全**

- 使用通配符域名：`.proxy.domain`
- HttpOnly 标志防止 XSS 攻击
- Secure 标志确保 HTTPS 传输

### 3. 状态管理

**OIDC 状态编码**

```go
stateData := map[string]string{
    "state":     randomState,
    "returnTo":  originalURL,
    "sandboxId": sandboxId,
}
encodedState := base64.URLEncoding.EncodeToString(stateJson)
```

## 性能优化

### 1. 连接池管理

**HTTP 传输配置**

```go
var proxyTransport = &http.Transport{
    MaxIdleConns:        100,
    MaxIdleConnsPerHost: 100,
    DialContext: (&net.Dialer{
        KeepAlive: 30 * time.Second,
    }).DialContext,
}
```

### 2. WebSocket 支持

**升级处理**

```go
if ctx.Request.Header.Get("Upgrade") == "websocket" {
    // WebSocket 代理逻辑
    ws, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
    // 双向流量转发
}
```

### 3. 重定向处理

**自定义重定向策略**

- 限制最大重定向次数（10次）
- 保持原始请求头（除 Cookie 外）
- 处理循环重定向

## 集成与依赖

### 1. 与 Daytona 生态系统的集成

**API 客户端**

- 使用 `daytonaapiclient` 与主 API 通信
- 运行器管理：获取沙盒对应的运行器信息
- 权限验证：检查用户访问权限

**与其他服务的关系**

- **Runner 服务**：最终的代理目标
- **API 服务**：权限验证和配置获取
- **Dashboard**：通过代理访问沙盒服务

### 2. 共享库使用

**通用代理库** (`libs/common-go/pkg/proxy`)

- 提供核心代理转发逻辑
- WebSocket 支持
- 错误处理中间件

**通用错误处理** (`libs/common-go/pkg/errors`)

- 标准化错误响应
- HTTP 状态码映射

### 3. 第三方依赖

**核心依赖**

- `gin-gonic/gin`：HTTP 框架
- `gorilla/securecookie`：安全 Cookie 处理
- `coreos/go-oidc`：OIDC 客户端
- `redis/go-redis`：Redis 客户端

## 部署与运维

### 1. Nx 配置

**构建配置**

```json
{
  "build": {
    "executor": "@nx-go/nx-go:build",
    "options": {
      "main": "{projectRoot}/cmd/proxy/main.go",
      "outputPath": "dist/apps/proxy"
    }
  }
}
```

**开发服务**

```json
{
  "serve": {
    "executor": "@nx-go/nx-go:serve",
    "options": {
      "cmd": "gow", // 热重载
      "main": "{projectRoot}/cmd/proxy/main.go"
    }
  }
}
```

### 2. 环境配置

**必需配置**

```bash
PROXY_PORT=4000
PROXY_DOMAIN=proxy.daytona.com
PROXY_PROTOCOL=https
PROXY_API_KEY=your-api-key
DAYTONA_API_URL=https://api.daytona.com
```

**OIDC 配置**

```bash
OIDC_CLIENT_ID=your-client-id
OIDC_DOMAIN=your-auth-provider.com
OIDC_AUDIENCE=your-audience
```

**可选 Redis 配置**

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### 3. 健康检查

**内置端点**

- `GET /health`：返回服务状态
- 不匹配代理规则时返回 404

## 使用场景

### 1. 开发环境访问

**场景**：开发者需要在浏览器中预览运行在沙盒中的 Web 应用

**流程**：

1. 沙盒运行 Web 服务在端口 3000
2. 访问 `https://3000-sandbox-id.proxy.daytona.com`
3. Proxy 验证身份后转发到沙盒内的服务

### 2. 团队协作

**场景**：团队成员需要共享正在开发的功能

**流程**：

1. 开发者将沙盒设置为公开
2. 团队成员直接访问公开 URL
3. 无需额外认证即可查看内容

### 3. API 调试

**场景**：前端开发者需要访问沙盒中的后端 API

**流程**：

1. API 服务运行在端口 8080
2. 通过 `https://8080-sandbox-id.proxy.daytona.com/api` 访问
3. 支持所有 HTTP 方法和 WebSocket 连接

## 安全考虑

### 1. 威胁模型

**潜在威胁**

- 未授权访问沙盒服务
- 跨站脚本攻击 (XSS)
- 中间人攻击
- Cookie 劫持

**防护措施**

- 多层身份验证
- 安全 Cookie 设置
- HTTPS 强制传输
- OIDC 标准认证流程

### 2. 最佳实践

**配置安全**

- 使用强随机 API 密钥
- 定期轮换认证凭据
- 启用 TLS 加密
- 配置适当的 CORS 策略

**监控建议**

- 记录所有认证尝试
- 监控异常访问模式
- 定期审查访问日志
- 设置访问频率限制

## 扩展与维护

### 1. 水平扩展

**Redis 缓存**

- 支持多实例部署
- 共享缓存状态
- 会话一致性保证

**负载均衡**

- 支持无状态部署
- Cookie 域名配置
- 健康检查端点

### 2. 监控指标

**关键指标**

- 请求响应时间
- 认证成功/失败率
- 缓存命中率
- 错误率统计

**日志记录**

- 结构化日志格式
- 请求追踪 ID
- 安全事件记录
- 性能指标

### 3. 故障排除

**常见问题**

- 认证失败：检查 OIDC 配置
- 缓存问题：验证 Redis 连接
- 路由错误：确认域名配置
- 性能问题：检查连接池设置

## 总结

Daytona Proxy 服务是整个 Daytona 生态系统中的关键组件，它提供了：

1. **安全的外部访问**：通过多层认证确保只有授权用户能访问沙盒服务
2. **灵活的路由机制**：基于子域名的智能路由，支持任意端口访问
3. **高性能代理**：智能缓存和连接池优化，支持 WebSocket 和 HTTP/HTTPS
4. **标准化集成**：与 Daytona 生态系统深度集成，使用标准 OIDC 认证

该服务的设计充分考虑了安全性、性能和可扩展性，为开发者提供了便捷而安全的沙盒访问体验。
