# 文档目录

本目录包含 Daytona Computer Use Demo Container 的详细技术文档和使用指南。

## 文档列表

| 文档名称 | 内容描述 | 适用对象 |
|----------|----------|----------|
| [xdotool-guide.md](xdotool-guide.md) | xdotool 自动化工具完整使用指南 | 开发者、自动化测试人员 |
| [computer-use-api-testing.md](computer-use-api-testing.md) | Computer-Use API 测试脚本使用指南和预期结果 | 开发者、测试人员、运维人员 |
| [process-management-comparison.md](process-management-comparison.md) | startup.sh 与 computeruse.go 进程管理对比分析 | 系统架构师、开发者 |

## 文档特点

- ✅ **实战导向**: 所有示例都在容器环境中验证过
- ✅ **详细说明**: 从基础概念到高级技巧的完整覆盖
- ✅ **问题解决**: 包含常见问题和调试技巧
- ✅ **最佳实践**: 基于容器环境的优化建议

## 如何使用这些文档

1. **学习基础**: 从概念和环境要求开始
2. **动手实践**: 在运行的容器中测试示例代码
3. **解决问题**: 遇到问题时查阅常见问题章节
4. **深入应用**: 参考实际应用示例开发自己的自动化脚本

## 访问演示容器

在阅读文档的同时，建议启动演示容器进行实际操作：

```bash
# 启动容器
./build-fast.sh

# 访问桌面
# 浏览器打开: http://localhost:6080/vnc.html

# 进入容器测试
docker exec -it daytona-computer-use-demo bash
```

## 反馈和贡献

如果您发现文档中有错误或需要补充的内容，欢迎提出建议或贡献改进。

## 相关资源

- [项目主文档](../README.md)
- [脚本工具说明](../scripts/README.md)
- [配置文件说明](../config/README.md)
- [Dockerfile 架构说明](../DOCKERFILE_ARCHITECTURE.md)
