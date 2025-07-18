# Dockerfile 架构说明

本项目使用统一的 `Dockerfile`，通过构建参数 `MIRROR_SOURCE` 支持多种镜像源动态选择，适应不同地区的网络环境需求。

## Dockerfile (统一版本)

**设计原则**: 一个 Dockerfile，多种镜像源选择，全球适用

**核心特性**:

- 🌍 **全球兼容**: 支持官方源和中国镜像源
- 🚀 **动态选择**: 通过 `MIRROR_SOURCE` 参数选择镜像源
- 🔧 **统一维护**: 单一文件，避免重复代码
- ⚡ **智能构建**: 根据参数自动配置最适合的镜像源

**软件包**: 47个软件包，包含完整的 VNC 桌面环境、开发工具和自动化工具

## 支持的镜像源

| 镜像源代码 | 描述 | 地理位置 | 适用用户 | 稳定性 | 速度 |
|-----------|------|----------|----------|--------|------|
| `aliyun` | 阿里云镜像源 | 中国大陆 | 中国用户（推荐） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| `ustc` | 中科大镜像源 | 中国大陆 | 教育网用户 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `tuna` | 清华大学镜像源 | 中国大陆 | 教育网用户 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `ubuntu` | 官方 Ubuntu 源 | 全球 | 全球用户 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 技术实现

### 动态镜像源配置

```dockerfile
# 声明构建参数
ARG MIRROR_SOURCE=aliyun

# 根据参数动态配置镜像源
RUN if [ "$MIRROR_SOURCE" = "aliyun" ]; then \
        echo "配置阿里云镜像源..."; \
    elif [ "$MIRROR_SOURCE" = "ustc" ]; then \
        echo "配置中科大镜像源..."; \
    elif [ "$MIRROR_SOURCE" = "tuna" ]; then \
        echo "配置清华大学镜像源..."; \
    fi
```

### 构建参数传递

由于使用多阶段构建，需要在主构建阶段重新声明参数：

```dockerfile
FROM computer-use-${TARGETARCH}:build AS computer-use-plugin
FROM ubuntu:22.04

# 重新声明参数（多阶段构建要求）
ARG MIRROR_SOURCE=aliyun
```

## 使用示例

### 一键构建+运行（推荐）

```bash
# 方式1: 阿里云镜像源（默认）
./build-fast.sh

# 方式2: 中科大镜像源
./build-ustc.sh

# 方式3: 清华大学镜像源
./build-tuna.sh
```

### 分步操作（高级用户）

```bash
# 使用阿里云镜像源
MIRROR_SOURCE=aliyun ./build-demo-image.sh
./run-demo.sh

# 使用中科大镜像源
MIRROR_SOURCE=ustc ./build-demo-image.sh  
./run-demo.sh

# 使用清华大学镜像源
MIRROR_SOURCE=tuna ./build-demo-image.sh
./run-demo.sh

# 使用官方 Ubuntu 源
MIRROR_SOURCE=ubuntu ./build-demo-image.sh
./run-demo.sh

# 只运行 (镜像已存在)
./run-demo.sh
```

### 直接 Docker 命令

```bash
# 使用中科大镜像源构建
docker build --build-arg MIRROR_SOURCE=ustc -t demo:ustc .

# 使用官方源构建
docker build --build-arg MIRROR_SOURCE=ubuntu -t demo:ubuntu .
```

## 功能对比

| 特性 | 统一 Dockerfile | 原多文件方案 |
|------|----------------|--------------|
| 维护成本 | ✅ 低（单文件） | ❌ 高（多文件同步） |
| 功能一致性 | ✅ 保证一致 | ⚠️ 需要手动同步 |
| 镜像源选择 | ✅ 动态选择 | ❌ 静态固定 |
| 构建灵活性 | ✅ 参数化 | ❌ 硬编码 |
| 代码重复 | ✅ 零重复 | ❌ 大量重复 |

## 设计理念

1. **统一维护**: 单一 Dockerfile 避免代码重复和维护负担
2. **参数化配置**: 通过构建参数实现灵活的镜像源选择
3. **全球适用**: 支持全球用户和中国用户的不同需求
4. **向后兼容**: 保持所有原有功能和使用方式

## 选择建议

### 根据地理位置选择

- **中国大陆用户**: 推荐 `aliyun`（阿里云镜像源）
- **中国教育网用户**: 可选择 `ustc` 或 `tuna`
- **海外用户**: 使用 `ubuntu`（官方源）
- **CI/CD 环境**: 建议使用 `ubuntu` 确保一致性

### 根据使用场景选择

- **快速开发**: 使用 `./build-fast.sh`（默认阿里云）
- **教育环境**: 使用 `./build-ustc.sh` 或 `./build-tuna.sh`
- **生产部署**: 使用 `MIRROR_SOURCE=ubuntu` 官方源
- **测试验证**: 可以使用 `./test-mirrors.sh` 测试所有镜像源

## 注意事项

- 统一 Dockerfile 的最终镜像功能完全相同
- 镜像大小和运行时性能无差异
- 只是构建过程中的软件包下载源不同
- 默认使用 `aliyun` 镜像源优化中国用户体验
- 如果不确定，使用默认配置即可
