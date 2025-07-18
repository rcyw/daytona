#!/bin/bash

# HashiCorp Go-Plugin 学习案例构建脚本

set -e

echo "=== HashiCorp Go-Plugin 学习案例构建 ==="

# 1. 初始化 Go 模块
echo "1. 初始化 Go 模块..."
if [ ! -f go.mod ]; then
    go mod init hashicorp-go-plugin-example
fi

# 2. 下载依赖
echo "2. 下载依赖..."
go mod tidy

# 3. 编译插件
echo "3. 编译插件..."
cd plugin
go build -o ../calculator-plugin .
cd ..

echo "4. 插件编译完成: $(pwd)/calculator-plugin"

# 4. 编译主程序
echo "5. 编译主程序..."
cd host
go build -o ../host-program .
cd ..

echo "6. 主程序编译完成: $(pwd)/host-program"

# 5. 编译示例
echo "7. 编译示例..."
cd examples/basic
go build -o ../../basic-example .
cd ../..

cd examples
go build -o ../advanced-example advanced_features.go
cd ..

echo "8. 示例编译完成: $(pwd)/basic-example, $(pwd)/advanced-example"

echo ""
echo "=== 构建完成 ==="
echo "运行方式:"
echo "  ./host-program          # 运行完整演示"
echo "  ./basic-example         # 运行基本示例"
echo "  ./advanced-example      # 运行高级功能示例"
echo ""
echo "手动清理:"
echo "  rm -f calculator-plugin host-program basic-example advanced-example" 