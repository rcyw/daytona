# HashiCorp Go-Plugin 学习案例 Makefile

.PHONY: all build clean run-host run-basic run-advanced help deps

# 默认目标
all: build

# 构建所有组件
build: deps build-plugin build-host build-examples

# 安装依赖
deps:
	@echo "=== 安装依赖 ==="
	go mod init hashicorp-go-plugin-example 2>/dev/null || true
	go mod tidy

# 构建插件
build-plugin:
	@echo "=== 构建插件 ==="
	cd plugin && go build -o ../calculator-plugin .
	@echo "✓ 插件构建完成: ./calculator-plugin"

# 构建主程序
build-host:
	@echo "=== 构建主程序 ==="
	cd host && go build -o ../host-program .
	@echo "✓ 主程序构建完成: ./host-program"

# 构建示例
build-examples:
	@echo "=== 构建示例 ==="
	cd examples/basic && go build -o ../../basic-example .
	cd examples && go build -o ../advanced-example advanced_features.go
	@echo "✓ 示例构建完成: ./basic-example, ./advanced-example"

# 运行主程序演示
run-host: build
	@echo "=== 运行主程序演示 ==="
	./host-program

# 运行基本示例
run-basic: build
	@echo "=== 运行基本示例 ==="
	./basic-example

# 运行高级功能示例
run-advanced: build
	@echo "=== 运行高级功能示例 ==="
	./advanced-example

# 运行性能测试
test-performance: build
	@echo "=== 性能测试 ==="
	@echo "测试 1000 次计算操作..."
	time sh -c 'for i in $$(seq 1 10); do ./basic-example >/dev/null; done'

# 检查插件进程
check-processes:
	@echo "=== 检查相关进程 ==="
	@ps aux | grep -E "(calculator-plugin|host-program)" | grep -v grep || echo "无相关进程运行"

# 清理构建产物
clean:
	@echo "=== 清理构建产物 ==="
	rm -f calculator-plugin host-program basic-example advanced-example
	@echo "✓ 清理完成"

# 完整清理（包括 go.mod）
clean-all: clean
	@echo "=== 完整清理 ==="
	rm -f go.mod go.sum
	@echo "✓ 完整清理完成"

# 验证代码
verify:
	@echo "=== 代码验证 ==="
	go mod verify
	go vet ./...
	@echo "✓ 代码验证通过"

# 格式化代码
format:
	@echo "=== 格式化代码 ==="
	go fmt ./...
	@echo "✓ 代码格式化完成"

# 显示帮助信息
help:
	@echo "HashiCorp Go-Plugin 学习案例"
	@echo ""
	@echo "可用命令:"
	@echo "  make build          - 构建所有组件"
	@echo "  make run-host       - 运行主程序演示"
	@echo "  make run-basic      - 运行基本示例"
	@echo "  make run-advanced   - 运行高级功能示例"
	@echo "  make test-performance - 运行性能测试"
	@echo "  make check-processes  - 检查相关进程"
	@echo "  make clean          - 清理构建产物"
	@echo "  make clean-all      - 完整清理"
	@echo "  make verify         - 验证代码"
	@echo "  make format         - 格式化代码"
	@echo "  make help           - 显示此帮助信息"
	@echo ""
	@echo "快速开始:"
	@echo "  make build && make run-host"

# 开发模式 - 监控文件变化并重新构建
dev:
	@echo "=== 开发模式 ==="
	@echo "监控文件变化并自动重建..."
	@while true; do \
		make build >/dev/null 2>&1; \
		echo "构建完成，等待文件变化..."; \
		sleep 2; \
	done 