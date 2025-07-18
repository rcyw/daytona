package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/daytonaio/daytona/deep-docs/hashicorp-go-plugin-example/shared"
	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
)

// BasicExample demonstrates basic plugin usage
func main() {
	fmt.Println("=== 基本用法示例 ===")

	// Step 1: Check if plugin exists
	pluginPath := "../../calculator-plugin"
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		log.Fatalf("插件文件未找到: %s", pluginPath)
	}

	// Step 2: Create logger
	logger := hclog.New(&hclog.LoggerOptions{
		Name:   "basic-example",
		Output: os.Stdout,
		Level:  hclog.Debug,
	})

	// Step 3: Define plugin map
	pluginMap := map[string]plugin.Plugin{
		"calculator": &shared.CalculatorPlugin{},
	}

	// Step 4: Create client
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig: shared.HandshakeConfig,
		Plugins:         pluginMap,
		Cmd:             exec.Command(pluginPath),
		Logger:          logger,
		Managed:         true,
	})
	defer client.Kill()

	// Step 5: Connect via RPC
	rpcClient, err := client.Client()
	if err != nil {
		log.Fatalf("RPC 连接失败: %v", err)
	}

	// Step 6: Dispense plugin
	raw, err := rpcClient.Dispense("calculator")
	if err != nil {
		log.Fatalf("插件分发失败: %v", err)
	}

	// Step 7: Type assert to our interface
	calculator := raw.(shared.Calculator)

	// Step 8: Use the plugin
	fmt.Println("1. 初始化插件...")
	if err := calculator.Initialize(); err != nil {
		log.Fatalf("初始化失败: %v", err)
	}

	fmt.Println("2. 执行计算...")
	result, err := calculator.Add(10, 5)
	if err != nil {
		log.Fatalf("计算失败: %v", err)
	}
	fmt.Printf("10 + 5 = %.2f\n", result)

	fmt.Println("3. 检查状态...")
	status, err := calculator.GetStatus()
	if err != nil {
		log.Fatalf("状态检查失败: %v", err)
	}
	fmt.Printf("插件状态: %s (版本: %s)\n", status.Status, status.Version)

	fmt.Println("4. 关闭插件...")
	if err := calculator.Shutdown(); err != nil {
		log.Fatalf("关闭失败: %v", err)
	}

	fmt.Println("=== 示例完成 ===")
}
