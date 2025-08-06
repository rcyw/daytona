# Computer-Use API 测试指南

本文档详细介绍了 `scripts/test-computer-use-api.sh` 测试脚本的功能、使用方法和预期结果。

## 概述

`test-computer-use-api.sh` 是一个全面的自动化测试脚本，用于验证 Daytona Computer-Use API 的各项功能。该脚本通过 HTTP API 调用测试 daemon 的所有核心功能。

## 脚本功能

### 测试覆盖范围

| 类别 | API 端点 | 功能描述 |
|------|----------|----------|
| **系统信息** | `/version` | 获取 daemon 版本信息 |
| | `/project-dir` | 获取项目目录路径 |
| **插件状态** | `/computeruse/status` | 检查 Computer-Use 插件状态 |
| | `/computeruse/process-status` | 获取进程运行状态 |
| **显示管理** | `/computeruse/display/info` | 获取显示器信息 |
| | `/computeruse/display/windows` | 列出当前窗口 |
| | `/computeruse/screenshot` | 截取屏幕截图 |
| **鼠标控制** | `/computeruse/mouse/position` | 获取鼠标位置 |
| | `/computeruse/mouse/move` | 移动鼠标位置 |
| | `/computeruse/mouse/click` | 执行鼠标点击 |
| **键盘控制** | `/computeruse/keyboard/type` | 输入文本 |
| | `/computeruse/keyboard/key` | 按下特定按键 |
| | `/computeruse/keyboard/hotkey` | 执行快捷键组合 |

### 核心特性

1. **自动等待机制**：脚本启动时会等待 daemon 服务就绪（最多30秒）
2. **彩色输出**：使用颜色标识测试结果（绿色=成功，红色=失败，黄色=警告）
3. **详细响应**：显示 HTTP 状态码和响应内容
4. **错误处理**：区分不同类型的错误（连接失败、服务不可用等）

## 使用方法

### 启动测试

```bash
# 启动 Daytona 模式容器（自动启动桌面进程）
./build-fast.sh daytona

# 或分步操作：先构建再运行
./build-demo-image.sh
./run-demo.sh daytona

# 在容器内执行测试
docker exec -it daytona-computer-use-demo ./scripts/daytona/test-computer-use-api.sh
```

### 交互式测试

```bash
# 手动测试单个端点
curl http://localhost:2280/version
curl http://localhost:2280/computeruse/status
curl -X POST http://localhost:2280/computeruse/mouse/move \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'

# 截图测试
curl http://localhost:2280/computeruse/screenshot

# 进程状态查询
curl http://localhost:2280/computeruse/process-status
```

## 预期测试结果

### 正常运行结果

当所有服务正常运行时，预期看到以下结果：

```
=== Testing Daytona Computer-Use API ===

Waiting for Daytona daemon to be ready...
✓ Daemon is ready

Testing: Daemon version
GET http://localhost:2280/version
✓ Success (HTTP 200)
Response: {"version":"0.0.0-dev"}...

Testing: Project directory
GET http://localhost:2280/project-dir
✓ Success (HTTP 200)
Response: {"dir":"/home/daytona/shared"}...

Testing: Computer-use plugin status
GET http://localhost:2280/computeruse/status
✓ Success (HTTP 200)
Response: {"status":"active"}...

Testing: Display information
GET http://localhost:2280/computeruse/display/info
✓ Success (HTTP 200)
Response: {"displays":[{"id":0,"x":0,"y":0,"width":1280,"height":720,"isActive":true}]}...

Testing: Window list
GET http://localhost:2280/computeruse/display/windows
✓ Success (HTTP 200)
Response: {"windows":[{"id":94,"title":"xfce4-panel","x":0,"y":0,"width":0,"height":0,"isActive":false},{"id":107,"title":"Desktop","x":0,"y":0,"width":0,"height":0,"isActive":false},{"id":501,"title":"xfce4-pa...

Testing: Mouse position
GET http://localhost:2280/computeruse/mouse/position
✓ Success (HTTP 200)
Response: {"x":1131,"y":461}...

Testing: Screenshot capture
GET http://localhost:2280/computeruse/screenshot
✓ Success (HTTP 200)
Response: {"screenshot":"iVBORw0KGgoAAAANSUhEUgAABQAAAALQCAIAAABAH0oBAACAAElEQVR4nOydB1gURxvHZ3fvjuMOOLqgIIgUEVTEgmLDXkLsRo3G2GvUfGpiicbYSzSJRhNjN/aOxhJ77wVELBgVFem9c2V3v4cbWI5r3B3XwPnlHrM7uzPzztzesv9935lheXn7A...

Testing: Process status
GET http://localhost:2280/computeruse/process-status
✓ Success (HTTP 200)
Response: {"status":{"novnc":{"Running":true,"Priority":400,"AutoRestart":true,"Pid":233},"x11vnc":{"Running":true,"Priority":300,"AutoRestart":true,"Pid":127},"xfce4":{"Running":true,"Priority":200,"AutoRestar...

Testing: Move mouse to (100,100)
POST http://localhost:2280/computeruse/mouse/move
✓ Success (HTTP 200)
Response: {"x":100,"y":100}...

Testing: Click at (100,100)
POST http://localhost:2280/computeruse/mouse/click
✓ Success (HTTP 200)
Response: {"x":100,"y":100}...

Testing: Type text
POST http://localhost:2280/computeruse/keyboard/type
✓ Success (HTTP 200)

Testing: Press Escape key
POST http://localhost:2280/computeruse/keyboard/key
✓ Success (HTTP 200)

Testing: Press Ctrl+A hotkey
POST http://localhost:2280/computeruse/keyboard/hotkey
✓ Success (HTTP 200)

=== Test Summary ===

All tests completed. Check the results above for any failures.

To test interactively:
  - Open browser: http://localhost:6080/vnc.html
  - Check daemon logs: tail -f ~/.daytona/computeruse/daemon.log
  - Manual API test: curl http://localhost:2280/computeruse/status
```

### 成功率统计

**预期成功的测试（13/13）**：

- ✅ 系统信息：2/2 测试通过
- ✅ 显示管理：3/3 测试通过  
- ✅ 鼠标控制：3/3 测试通过
- ✅ 键盘控制：3/3 测试通过
- ✅ 插件状态：2/2 测试通过

**总体成功率：100%**（13/13 功能测试通过）

### 特殊情况说明

#### Computer-Use 插件状态

插件状态显示为 "active" 表示：

- 插件已完全加载并处于活跃状态
- 桌面进程已通过 Daytona 模式自动启动
- 所有 API 功能都可以正常使用

#### 自动启动机制

**重要变化**：Daytona 模式现在会在容器启动时自动启动所有桌面进程：

- 无需手动调用 `/computeruse/start` 接口
- 进程状态显示所有服务都在运行（Running: true）
- 测试脚本不再包含 start 接口测试

## 故障排除

### 常见问题及解决方案

#### 1. 连接失败 (HTTP 000)

**症状**：

```
✗ Connection Failed
```

**原因**：

- daemon 服务未启动
- 端口映射不正确
- 防火墙阻止连接

**解决方案**：

```bash
# 检查 daemon 进程
docker exec -it daytona-computer-use-demo ps aux | grep daemon

# 检查端口监听
docker exec -it daytona-computer-use-demo netstat -tlnp | grep 2280

# 检查端口映射
docker port daytona-computer-use-demo

# 重启容器（确保使用 Daytona 模式）
./run-demo.sh daytona
```

#### 2. 桌面进程未启动

**症状**：

```
{"status":{"xfce4":{"Running":false,...}}}
```

**原因**：

- 容器在 VNC 模式启动（未启动 daemon）
- Daytona 模式启动失败
- 桌面进程异常退出

**解决方案**：

```bash
# 确认运行在 Daytona 模式
docker exec -it daytona-computer-use-demo ps aux | grep daytona-daemon

# 如果没有 daemon，重启为 Daytona 模式
docker stop daytona-computer-use-demo
./run-demo.sh daytona

# 检查进程状态
curl http://localhost:2280/computeruse/process-status
```

#### 3. 部分功能失败

**症状**：某些 API 调用返回错误

**诊断步骤**：

```bash
# 检查 daemon 日志
docker exec -it daytona-computer-use-demo tail -f ~/.daytona/computeruse/daemon.log

# 测试基础功能
docker exec -it daytona-computer-use-demo xdotool version
docker exec -it daytona-computer-use-demo echo $DISPLAY

# 验证桌面环境
docker exec -it daytona-computer-use-demo ps aux | grep xfce4
docker exec -it daytona-computer-use-demo ps aux | grep vnc
```

### 调试技巧

#### 1. 详细日志模式

```bash
# 启用详细日志
export LOG_LEVEL=debug

# 重启容器查看详细输出（Daytona 模式）
./run-demo.sh daytona
```

#### 2. 单步测试

```bash
# 测试单个端点
curl -v http://localhost:2280/version

# 测试带数据的端点
curl -v -X POST http://localhost:2280/computeruse/mouse/move \
  -H "Content-Type: application/json" \
  -d '{"x": 500, "y": 300}'
```

#### 3. 网络诊断

```bash
# 测试网络连通性
ping localhost
telnet localhost 2280

# 检查防火墙规则
sudo iptables -L
```

## 性能基准

### 响应时间基准

| API 类型 | 预期响应时间 | 说明 |
|----------|--------------|------|
| 信息查询 | < 50ms | version, status, display/info |
| 鼠标操作 | < 100ms | move, click |
| 键盘操作 | < 200ms | type, key, hotkey |
| 截图操作 | < 500ms | screenshot (取决于屏幕大小) |
| 窗口操作 | < 300ms | windows list |

### 并发测试

脚本支持并发测试多个端点：

```bash
# 并发测试示例
for i in {1..5}; do
  curl http://localhost:2280/computeruse/mouse/position &
done
wait
```

## 扩展和定制

### 添加自定义测试

您可以在脚本中添加更多测试用例：

```bash
# 添加到脚本末尾
test_endpoint "POST" "$COMPUTER_USE_API/custom/endpoint" '{"data": "value"}' "Custom test"
```

### 集成到 CI/CD

脚本可以集成到持续集成流程中：

```yaml
# GitHub Actions 示例
- name: Test Computer-Use API
  run: |
    ./build-demo-image.sh
    ./run-demo.sh daytona
    sleep 30  # 等待服务就绪
    docker exec daytona-computer-use-demo ./scripts/daytona/test-computer-use-api.sh
```

## 总结

`test-computer-use-api.sh` 脚本提供了：

- **全面覆盖**：测试所有核心 Computer-Use API 功能
- **自动化验证**：无需手动交互即可验证系统状态
- **清晰输出**：彩色编码的测试结果，易于理解
- **故障诊断**：详细的错误信息和状态码
- **可扩展性**：易于添加新的测试用例
- **架构兼容**：与 Daytona 模式自动启动机制完全兼容

通过定期运行此测试脚本，您可以确保 Daytona Computer-Use 功能的稳定性和可靠性。

## 相关资源

- [API 文档](../README.md#api-endpoints)
- [故障排除指南](../README.md#troubleshooting)
- [xdotool 使用指南](xdotool-guide.md)
- [脚本源码](../scripts/daytona/test-computer-use-api.sh)
- [架构对比分析](process-management-comparison.md)
