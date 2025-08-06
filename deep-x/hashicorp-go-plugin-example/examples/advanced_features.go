package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"

	"hashicorp-go-plugin-example/shared"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
)

// AdvancedExample demonstrates advanced plugin features
func main() {
	fmt.Println("=== 高级功能示例 ===")

	// Create a custom logger with more options
	logger := hclog.New(&hclog.LoggerOptions{
		Name:       "advanced-example",
		Output:     os.Stdout,
		Level:      hclog.Debug,
		JSONFormat: false,
		Color:      hclog.AutoColor,
		TimeFormat: "2006-01-02 15:04:05",
	})

	pluginPath := "./calculator-plugin"
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		log.Fatalf("插件文件未找到: %s", pluginPath)
	}

	// Plugin map
	pluginMap := map[string]plugin.Plugin{
		"calculator": &shared.CalculatorPlugin{},
	}

	// Create client with timeout and custom configuration
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig: shared.HandshakeConfig,
		Plugins:         pluginMap,
		Cmd:             exec.Command(pluginPath),
		Logger:          logger,
		Managed:         true,
		SyncStdout:      os.Stdout,
		SyncStderr:      os.Stderr,
		StartTimeout:    30 * time.Second,
		SecureConfig:    nil, // For production, configure TLS
	})
	defer client.Kill()

	fmt.Println("1. 连接到插件...")
	rpcClient, err := client.Client()
	if err != nil {
		log.Fatalf("RPC 连接失败: %v", err)
	}

	raw, err := rpcClient.Dispense("calculator")
	if err != nil {
		log.Fatalf("插件分发失败: %v", err)
	}

	calculator := raw.(shared.Calculator)

	// Test 1: Initialization
	fmt.Println("\n2. 测试初始化...")
	if err := calculator.Initialize(); err != nil {
		log.Fatalf("初始化失败: %v", err)
	}

	// Test 2: Multiple operations
	fmt.Println("\n3. 执行多个操作...")
	operations := []struct {
		name string
		fn   func() (float64, error)
	}{
		{"加法", func() (float64, error) { return calculator.Add(100, 50) }},
		{"减法", func() (float64, error) { return calculator.Subtract(100, 30) }},
		{"乘法", func() (float64, error) { return calculator.Multiply(12, 8) }},
		{"除法", func() (float64, error) { return calculator.Divide(144, 12) }},
	}

	for _, op := range operations {
		result, err := op.fn()
		if err != nil {
			fmt.Printf("  %s 失败: %v\n", op.name, err)
		} else {
			fmt.Printf("  %s 结果: %.2f\n", op.name, result)
		}
	}

	// Test 3: Error handling
	fmt.Println("\n4. 测试错误处理...")

	// Division by zero
	_, err = calculator.Divide(10, 0)
	if err != nil {
		fmt.Printf("  ✓ 除零错误正确处理: %v\n", err)
	}

	// Test 4: Performance testing
	fmt.Println("\n5. 性能测试...")

	start := time.Now()
	iterations := 10000
	var totalErrors int

	for i := 0; i < iterations; i++ {
		_, err := calculator.Add(float64(i), float64(i+1))
		if err != nil {
			totalErrors++
		}
	}

	duration := time.Since(start)
	rps := float64(iterations-totalErrors) / duration.Seconds()

	fmt.Printf("  执行 %d 次操作\n", iterations)
	fmt.Printf("  总耗时: %v\n", duration)
	fmt.Printf("  错误数: %d\n", totalErrors)
	fmt.Printf("  吞吐量: %.0f ops/sec\n", rps)

	// Test 5: Status monitoring
	fmt.Println("\n6. 状态监控...")
	for i := 0; i < 3; i++ {
		status, err := calculator.GetStatus()
		if err != nil {
			fmt.Printf("  状态检查失败: %v\n", err)
		} else {
			fmt.Printf("  状态 #%d: %s - %s\n", i+1, status.Status, status.Message)
		}
		time.Sleep(1 * time.Second)
	}

	// Test 6: Plugin process monitoring
	fmt.Println("\n7. 进程监控...")

	// Check if plugin process is alive
	fmt.Printf("  插件进程存活: %t\n", !client.Exited())

	// Test 7: Graceful shutdown
	fmt.Println("\n8. 优雅关闭...")
	if err := calculator.Shutdown(); err != nil {
		fmt.Printf("  插件关闭失败: %v\n", err)
	} else {
		fmt.Println("  ✓ 插件关闭成功")
	}

	// Test if plugin is still responding after shutdown
	_, err = calculator.Add(1, 2)
	if err != nil {
		fmt.Printf("  ✓ 关闭后正确拒绝请求: %v\n", err)
	}

	fmt.Println("\n=== 高级功能示例完成 ===")
}
