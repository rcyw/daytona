# Daytona Computer Use Demo Container

这个目录包含了一个完整的演示容器，用于验证和学习 Daytona Computer Use 插件的功能。该容器提供了一个完整的 VNC 桌面环境，包含 XFCE4 桌面、VNC 服务器、Web VNC 客户端，以及预装的 Computer Use 插件。

## 目录结构

```
deep-docs/computer-use-demo-container/
├── Dockerfile                     # 统一构建文件（支持多镜像源）
├── startup.sh                     # VNC 模式启动脚本
├── scripts/                       # 脚本工具集目录
│   ├── demo.sh                    # 演示脚本
│   ├── test-lock.sh               # 锁屏功能测试脚本
│   ├── unlock-screen.sh           # 桌面解锁脚本
│   ├── restore-gui-lock.sh        # GUI锁屏恢复工具
│   └── daytona/                   # Daytona 模式专用脚本
│       ├── run.sh                 # Daytona 模式启动脚本
│       └── test-computer-use-api.sh # Computer-Use API测试脚本
├── config/                        # 配置文件目录
│   ├── xfce4/                     # XFCE4 桌面环境配置
│   │   └── xfconf/                # XFCE4 设置
│   │       └── xfce-perchannel-xml/
│   │           ├── xfce4-screensaver.xml    # 禁用屏保和锁屏
│   │           └── xfce4-power-manager.xml  # 禁用电源管理
│   ├── bashrc_additions           # Bash 环境变量配置
│   └── README.md                  # 配置文件详细说明
├── docs/                          # 文档目录
│   ├── README.md                  # 文档索引和使用说明
│   └── xdotool-guide.md           # xdotool 自动化工具使用指南
├── build-fast.sh                 # 一键构建+运行（阿里云镜像）
├── build-ustc.sh                 # 一键构建+运行（中科大镜像）
├── build-tuna.sh                 # 一键构建+运行（清华镜像）
├── build-demo-image.sh           # 只构建镜像（支持多镜像源）
├── build-daemon.sh               # 构建daemon二进制文件
├── run-demo.sh                   # 只运行容器
├── README.md                     # 本文档
├── DOCKERFILE_ARCHITECTURE.md   # Dockerfile 架构说明
├── shared/                       # 共享文件夹（容器创建后）
└── logs/                         # 日志文件夹（容器创建后）
```

## 功能特性

### VNC 桌面环境

- **Xvfb**: X 虚拟帧缓冲，提供虚拟显示
- **XFCE4**: 轻量级桌面环境
- **x11vnc**: VNC 服务器，提供远程桌面访问
- **NoVNC**: 基于 Web 的 VNC 客户端

### 桌面自动化工具

- **xdotool**: 鼠标和键盘自动化 ([详细使用指南](docs/xdotool-guide.md))
- **scrot**: 屏幕截图工具
- **wmctrl**: 窗口管理
- **imagemagick**: 图像处理
- **Computer Use Plugin**: Daytona 桌面自动化插件

### 预装应用程序

- **xfce4-terminal**: 终端模拟器
- **thunar**: 文件管理器
- **chromium**: Web 浏览器
- **编辑器**: vim, nano

## 环境要求

### 先决条件

1. **Docker** 已安装
2. **Computer Use 插件已构建**: 运行以下命令构建 AMD64 版本

   ```bash
   ./hack/computer-use/build-computer-use-amd64.sh
   ```

3. **端口可用**: 确保端口 5901 (VNC)、6080 (NoVNC)、2280 (Computer-Use API)、22222 (Terminal) 未被占用
4. **Yarn/Node.js**: 用于构建 Daytona daemon（自动包含 Computer-Use API 功能）

### 系统兼容性

- **所有平台**: 通过 AMD64 模拟支持，Docker 自动处理架构兼容性
- **Linux x86_64**: 原生 AMD64 支持
- **Linux ARM64**: AMD64 模拟（性能完全够用）
- **macOS Intel**: AMD64 支持 (通过 Docker Desktop)
- **macOS Apple Silicon**: AMD64 模拟 (通过 Docker Desktop)
- **Windows x86_64**: AMD64 支持 (通过 Docker Desktop)

## 快速开始

### 1. 构建和启动容器 (推荐方式)

**两种运行模式**：

- **VNC 模式**（默认）: 基础桌面环境，无 daemon，资源占用低
- **Daytona 模式**: 完整功能，包含 Computer-Use API，**自动启动桌面进程**，适合 API 测试

**一键构建和运行**（智能缓存，中国用户推荐）：

```bash
cd deep-docs/computer-use-demo-container

# VNC 模式 (默认，推荐日常使用)
./build-fast.sh vnc

# Daytona 模式 (完整功能，包含 Computer-Use API)
./build-fast.sh daytona

# 其他镜像源
./build-ustc.sh vnc      # 中科大镜像源 + VNC 模式
./build-tuna.sh daytona  # 清华镜像源 + Daytona 模式

# 强制重建版本（清理缓存）
FORCE_REBUILD=true ./build-fast.sh daytona
```

**分步操作** - 先构建再运行：

```bash
# 只构建镜像（支持缓存复用）
./build-demo-image.sh

# 运行容器（指定模式）
./run-demo.sh vnc      # VNC 模式
./run-demo.sh daytona  # Daytona 模式
```

### 2. 强制重建镜像

如果需要强制重建镜像：

```bash
# 强制重建
FORCE_REBUILD=true ./build-demo-image.sh

# 然后运行容器
./run-demo.sh
```

### 2. 访问桌面环境

#### 方法一：Web 浏览器 (推荐)

打开浏览器访问：

```
http://localhost:6080/vnc.html
```

#### 方法二：VNC 客户端

使用任何 VNC 客户端连接：

```
地址: localhost:5901
```

### 登录信息

如果遇到桌面锁屏或需要登录，请使用：

- **用户名**: `daytona`  
- **密码**: `daytona`

> 注意：系统默认启用屏幕锁定功能，这样更安全。你可以使用 Ctrl+Alt+L 主动锁屏。

#### 快速解锁脚本

如果遇到桌面锁屏，可以使用自动解锁脚本：

```bash
# 在另一个终端中运行
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/unlock-screen.sh'
```

> 提示：解锁脚本不会永久禁用锁屏功能，保留了安全性。

### 3. 运行演示

进入容器运行演示脚本：

```bash
docker exec -it daytona-computer-use-demo ./scripts/demo.sh
```

演示脚本将展示：

- 环境信息检查
- 窗口信息查询
- 屏幕截图功能
- 应用程序启动
- 鼠标自动化
- 键盘自动化
- Computer Use 插件验证
- 进程监控
- 日志文件查看

### 4. 测试Computer-Use API

仅在 **Daytona 模式** 下可用。**注意**：Daytona 模式会在启动时自动启动桌面进程，无需手动调用 start 接口。

```bash
# 启动 Daytona 模式容器（自动启动桌面进程）
./run-demo.sh daytona

# 等待服务启动完成，然后运行API测试脚本
docker exec -it daytona-computer-use-demo ./scripts/daytona/test-computer-use-api.sh

# 手动测试API
curl http://localhost:2280/computeruse/status
curl http://localhost:2280/computeruse/screenshot

# 查看daemon日志
docker exec -it daytona-computer-use-demo tail -f ~/.daytona/computeruse/daemon.log
```

API服务端点（仅 Daytona 模式）：

- **Toolbox API**: `http://localhost:2280`
- **Terminal服务**: `http://localhost:22222`
- **Computer-Use状态**: `GET /computeruse/status`
- **截图**: `GET /computeruse/screenshot`
- **鼠标控制**: `POST /computeruse/mouse/move`
- **键盘控制**: `POST /computeruse/keyboard/type`
- **进程状态**: `GET /computeruse/process-status`

## 核心脚本说明

### 🚀 一键构建+运行脚本

| 脚本文件 | 镜像源 | 用途 | 推荐度 |
|----------|--------|------|--------|
| `build-fast.sh [mode]` | 阿里云 | 🚀 一键构建+运行（支持 vnc/daytona 模式） | ⭐⭐⭐⭐⭐ 强烈推荐 |
| `build-ustc.sh [mode]` | 中科大 | 🚀 一键构建+运行（中科大镜像） | ⭐⭐⭐⭐ 中国用户 |
| `build-tuna.sh [mode]` | 清华大学 | 🚀 一键构建+运行（清华镜像） | ⭐⭐⭐⭐ 中国用户 |

**启动模式**:

- `vnc` (默认): 基础 VNC 桌面环境，资源占用低
- `daytona`: 完整功能 + Computer-Use API，适合 API 测试

### 🏗️ 分步操作脚本

| 脚本文件 | 用途 | 推荐度 |
|----------|------|--------|
| `build-demo-image.sh` | 🏗️ 只构建镜像（统一 Dockerfile） | ⭐⭐⭐⭐ 高级用户 |
| `run-demo.sh [mode]` | ▶️ 只运行容器（支持 vnc/daytona 模式） | ⭐⭐⭐⭐ 快速启动 |

### 🔧 工具和测试脚本

| 脚本文件 | 用途 | 使用场景 |
|----------|------|----------|
| `scripts/demo.sh` | 🎯 基础桌面自动化演示 | 学习和验证基本功能 |
| `scripts/interactive-demo.sh` | 🎯 详细交互式演示 | 完整的11步骤功能演示 |
| `scripts/test-lock.sh` | 🔒 智能锁屏测试 | 测试并自动保持GUI功能 |
| `scripts/unlock-screen.sh` | 🔓 智能解锁脚本 | 解锁并自动恢复GUI功能 |
| `scripts/restore-gui-lock.sh` | 🔧 专用恢复工具 | 强制恢复GUI锁屏功能 |
| `scripts/daytona/run.sh` | 🚀 Daytona模式启动脚本 | 设置X11认证+启动daemon+自动启动桌面进程 |
| `scripts/daytona/test-computer-use-api.sh` | 🧪 Computer-Use API测试 | 验证 Daytona 模式 API 功能 |
| `build-daemon.sh` | 🏗️ 构建daemon二进制 | 由build-demo-image.sh调用 |

## 构建优化选项

### 🚀 智能缓存系统

新版本构建系统的优势：

- ✅ **镜像复用**：已构建的镜像会被缓存，避免重复构建
- ✅ **快速启动**：第二次运行只需几秒钟
- ✅ **版本管理**：不同镜像源使用不同标签（如 `aliyun`、`ustc`）
- ✅ **强制重建**：支持 `FORCE_REBUILD=true` 强制重新构建

### 缓存使用示例

```bash
# 第一次运行（会构建镜像）
./build-fast.sh  # 需要 3-5 分钟

# 第二次运行（使用缓存）
./build-fast.sh  # 只需要 10-20 秒

# 强制重建
FORCE_REBUILD=true ./build-demo-image.sh
```

### 镜像源选择

项目提供统一的 Dockerfile，通过构建参数支持多种镜像源选择：

**`Dockerfile`** - 统一构建文件，支持动态镜像源选择：

- `MIRROR_SOURCE=aliyun` - 阿里云镜像源（默认，中国用户推荐）
- `MIRROR_SOURCE=ustc` - 中科大镜像源（教育网友好）
- `MIRROR_SOURCE=tuna` - 清华大学镜像源（教育网友好）  
- `MIRROR_SOURCE=ubuntu` - 官方 Ubuntu 镜像源（全球用户）

镜像命名规范：

```bash
daytona-computer-use-demo:aliyun   # 阿里云镜像源版本（默认）
daytona-computer-use-demo:ustc     # 中科大镜像源版本
daytona-computer-use-demo:tuna     # 清华大学镜像源版本
daytona-computer-use-demo:ubuntu   # 官方镜像源版本
```

### 手动选择镜像源

| 镜像源 | 地理位置 | 适用地区 | 稳定性 | 速度 |
|--------|----------|----------|--------|------|
| `aliyun` | 阿里云 | 中国大陆 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| `ustc` | 中科大 | 中国大陆 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `tuna` | 清华大学 | 中国大陆 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `ubuntu` | 官方源 | 全球 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

```bash
# 使用阿里云镜像源（默认，推荐）
MIRROR_SOURCE=aliyun ./build-demo-image.sh

# 使用中科大镜像源
MIRROR_SOURCE=ustc ./build-demo-image.sh

# 使用清华大学镜像源
MIRROR_SOURCE=tuna ./build-demo-image.sh

# 使用官方 Ubuntu 镜像源
MIRROR_SOURCE=ubuntu ./build-demo-image.sh
```

## 手动操作指南

### 容器管理

```bash
# 查看容器状态
docker ps | grep daytona-computer-use-demo

# 查看日志
docker logs -f daytona-computer-use-demo

# 进入容器
docker exec -it daytona-computer-use-demo bash

# 停止容器
docker stop daytona-computer-use-demo

# 删除容器
docker rm daytona-computer-use-demo

# 重新运行
./run-demo.sh
```

### 桌面操作测试

#### 截图测试

```bash
# 进入容器
docker exec -it daytona-computer-use-demo bash

# 截图到文件
scrot ~/screenshot.png

# 查看截图
ls -la ~/screenshot.png
```

#### 鼠标自动化测试

```bash
# 获取鼠标位置
xdotool getmouselocation

# 移动鼠标到指定位置
xdotool mousemove 640 360

# 执行点击
xdotool click 1
```

#### 键盘自动化测试

```bash
# 打开终端
xfce4-terminal &

# 等待终端打开
sleep 2

# 输入文本
xdotool type "echo 'Hello from automation!'"

# 按回车键
xdotool key Return
```

#### 窗口管理测试

```bash
# 列出所有窗口
wmctrl -l

# 获取窗口信息
xwininfo -root

# 激活特定窗口
wmctrl -a "Terminal"
```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DISPLAY` | `:1` | X 显示服务器 |
| `VNC_PORT` | `5901` | VNC 服务器端口 |
| `NO_VNC_PORT` | `6080` | NoVNC Web 端口 |
| `VNC_RESOLUTION` | `1280x720` | 桌面分辨率 |
| `VNC_USER` | `daytona` | 运行用户 |

### 端口映射

| 容器端口 | 主机端口 | 服务 |
|----------|----------|------|
| 5901 | 5901 | VNC 服务器 |
| 6080 | 6080 | NoVNC Web 客户端 |
| 2280 | 2280 | Daytona Computer-Use API |
| 22222 | 22222 | Terminal 服务器 |

### 卷挂载

| 主机路径 | 容器路径 | 用途 |
|----------|----------|------|
| `./shared` | `/home/daytona/shared` | 文件共享 |
| `./logs` | `/home/daytona/.daytona/computeruse` | 日志文件 |

## 🔒 屏幕锁定配置

### 默认行为

- ✅ **锁屏启用**: 系统默认启用屏幕锁定功能
- 🔐 **手动锁屏**: 使用 `Ctrl+Alt+L` 快速锁屏
- 🔓 **解锁**: 使用密码 `daytona` 解锁
- 🛡️ **安全性**: 保持锁屏功能确保安全访问

### 禁用锁屏（可选）

如果你需要禁用锁屏功能（比如自动化测试环境），可以：

#### 方法1: 取消注释 Dockerfile 配置

在 `Dockerfile` 中找到以下注释行：

```dockerfile
# Uncomment the following lines to copy XFCE4 configurations (e.g., disable screen locking):
# COPY config/xfce4/ /home/daytona/.config/xfce4/
# RUN chown -R daytona:daytona /home/daytona/.config/
```

取消注释这些行，然后重新构建：

```bash
FORCE_REBUILD=true ./build-demo-image.sh
```

#### 方法2: 修改运行时配置

在 `config/bashrc_additions` 文件中，取消注释禁用锁屏的代码段，然后重新构建。

### 解锁工具

使用内置的解锁脚本（会自动修复锁屏功能）：

```bash
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/unlock-screen.sh'
```

### 锁屏测试

测试锁屏功能是否正常：

```bash
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/test-lock.sh'
```

### 智能锁屏功能

锁屏和解锁脚本已经集成了智能恢复功能，**大多数情况下无需手动运行额外脚本**：

- **`scripts/test-lock.sh`** - 自动检测并保持GUI锁屏功能
- **`scripts/unlock-screen.sh`** - 自动恢复GUI Lock Screen按钮功能

```bash
# 测试锁屏功能（自动保持GUI功能）
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/test-lock.sh'

# 解锁屏幕（自动恢复GUI功能）
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/unlock-screen.sh'
```

### 专用恢复脚本

如果集成方案无法解决问题，或需要强制恢复GUI锁屏功能：

```bash
# 专用GUI锁屏恢复工具
docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/restore-gui-lock.sh'
```

> **注意**: 由于容器环境的特殊性，xfce4-screensaver 可能需要重新启动才能正常工作。解锁和测试脚本会自动处理这个问题。

## 故障排除

### 常见问题

#### 1. 容器启动失败

```bash
# 检查日志
docker logs daytona-computer-use-demo

# 检查端口占用
netstat -ln | grep 5901
netstat -ln | grep 6080
```

#### 2. VNC 连接失败

```bash
# 检查 VNC 进程
docker exec -it daytona-computer-use-demo ps aux | grep vnc

# 检查网络连接
docker exec -it daytona-computer-use-demo netstat -ln | grep 5901
```

#### 3. 桌面无响应

```bash
# 检查 X 服务器
docker exec -it daytona-computer-use-demo ps aux | grep Xvfb

# 检查 XFCE 进程
docker exec -it daytona-computer-use-demo ps aux | grep xfce
```

#### 4. Computer Use 插件未找到

```bash
# 检查插件位置
docker exec -it daytona-computer-use-demo which computer-use

# 检查插件权限
docker exec -it daytona-computer-use-demo ls -la /usr/local/bin/computer-use
```

#### 5. 架构相关问题

```bash
# 检查容器架构
docker exec -it daytona-computer-use-demo uname -m

# 检查宿主机架构
uname -m

# 检查可用的 computer-use 镜像
docker images | grep computer-use
```

解决方案：

- **推荐**: 使用 `./build-fast.sh` 一键构建+运行（支持 AMD64 模拟）
- **手动构建**: 使用 `./build-demo-image.sh` 然后 `./run-demo.sh`
- **性能对比**: AMD64 模拟通常性能已足够，无需特殊配置

### 调试模式

启用详细日志输出：

```bash
# 查看容器启动日志
docker logs -f daytona-computer-use-demo

# 查看 VNC 进程启动详情
docker exec -it daytona-computer-use-demo tail -f ~/.daytona/computeruse/x11vnc.log
```

## 学习建议

## 📁 配置文件架构

为了保持 Dockerfile 的简洁性和可维护性，项目采用了配置文件分离的架构：

### 配置文件目录

```
config/
├── xfce4/                          # XFCE4 桌面环境配置
│   └── xfconf/
│       └── xfce-perchannel-xml/
│           ├── xfce4-screensaver.xml     # 禁用屏保和锁屏
│           └── xfce4-power-manager.xml   # 禁用电源管理
└── bashrc_additions                 # Bash 环境变量配置
```

### 设计优势

- ✅ **Dockerfile 简洁**: 避免大量 `echo` 命令，提高可读性
- ✅ **配置集中**: 所有配置文件统一管理，易于维护
- ✅ **版本控制友好**: 配置文件独立，便于跟踪变更
- ✅ **易于扩展**: 新增配置只需添加文件，无需修改 Dockerfile

## 🚀 快速开始

1. **首次使用**: 运行 `./build-fast.sh` (适用所有平台)
2. **访问桌面**: 浏览器打开 http://localhost:6080/vnc.html
3. **运行演示**: `docker exec -it daytona-computer-use-demo ./scripts/demo.sh`
4. **手动测试**: 在 VNC 桌面中手动测试各种自动化工具

### 📚 深入学习步骤

1. **基础验证**
   - 确认 VNC 桌面可以正常访问
   - 测试基本的鼠标和键盘操作
   - 验证截图功能正常工作

2. **自动化测试**
   - 尝试使用 xdotool 进行简单的自动化
   - 测试窗口管理功能
   - 练习批量自动化操作

3. **插件理解**
   - 查看 Computer Use 插件的位置和权限
   - 了解插件与 VNC 环境的集成方式
   - 研究插件的日志输出

4. **扩展实验**
   - 修改桌面分辨率测试适配性
   - 尝试运行不同的应用程序
   - 测试长时间运行的稳定性

## 常见问题解答

### Q: 我是 ARM Mac 用户，应该用哪个脚本？

A: 直接使用 `./build-fast.sh`，Docker 会自动处理 AMD64 架构模拟，无需额外配置。

### Q: AMD64 模拟性能如何？

A: 对于 VNC 桌面自动化来说，性能完全够用。Docker 的架构模拟针对这类应用已经高度优化。

### Q: 容器启动失败怎么办？

A: 先检查是否已构建 `computer-use-amd64:build` 镜像，运行 `docker images | grep computer-use` 确认。如果包含daemon功能但daemon相关服务启动失败，检查daemon是否正确构建。

### Q: 端口被占用怎么办？

A: 修改 `run-demo.sh` 中的端口映射，例如将 `-p 5901:5901` 改为 `-p 5902:5901`。

### Q: 如何提高 VNC 桌面分辨率？

A: 修改环境变量 `VNC_RESOLUTION=1920x1080`，重新构建容器即可。

### Q: Computer-Use API 默认可用吗？

A: 是的，Daytona 模式默认包含 Daytona daemon 和 Computer-Use API，并会自动启动桌面进程。API 可通过端口 2280 访问，无需手动调用 start 接口。

### Q: 如何强制重新构建最新的镜像？

A: 使用 `FORCE_REBUILD=true ./build-fast.sh`，这会清理所有缓存并重新构建daemon和镜像。

## 相关文档

- [xdotool 自动化工具使用指南](docs/xdotool-guide.md) - 详细的 xdotool 使用教程和示例
- [Computer Use 插件架构分析](../computer-use-plugin-architecture-analysis.md)
- [Computer Use Plugin README](../../libs/computer-use/README.md)
- [VNC 官方文档](https://www.realvnc.com/en/)
- [XFCE 桌面环境](https://www.xfce.org/)

## 总结

这个演示容器为学习 Daytona Computer Use 插件提供了完整的实验环境。通过实际操作，您可以：

- 🎯 **快速上手**: 一键启动完整的 VNC 桌面环境
- 🔧 **实践验证**: 测试各种桌面自动化功能
- 📚 **深入理解**: 学习 VNC 架构和插件集成原理
- 🚀 **扩展开发**: 基于演示环境开发自己的自动化解决方案

**推荐开始方式**:

- **日常使用**: 运行 `./build-fast.sh vnc`，基础桌面环境，资源占用低
- **API 开发**: 运行 `./build-fast.sh daytona`，完整 Computer-Use API 功能，**自动启动桌面进程**，适合 API 测试
- **强制重建**: 运行 `FORCE_REBUILD=true ./build-fast.sh daytona`，清理所有缓存，重新构建最新版本！
