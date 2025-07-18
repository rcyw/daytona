package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

func main() {
	fmt.Println("=== HashiCorp Go-Plugin 学习案例 ===")
	fmt.Println("主程序启动中...")

	// 1. 查找插件二进制文件
	pluginPath := "./calculator-plugin"
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		// 尝试相对路径
		pluginPath = "../calculator-plugin"
		if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
			log.Fatalf("插件文件未找到: %s\n请先编译插件: cd plugin && go build -o ../calculator-plugin .", pluginPath)
		}
	}

	absPath, _ := filepath.Abs(pluginPath)
	fmt.Printf("[INFO] 发现插件: %s\n", absPath)

	// 2. 创建插件管理器
	manager := NewPluginManager()

	// 3. 加载插件
	calculator, err := manager.LoadPlugin(pluginPath)
	if err != nil {
		log.Fatalf("插件加载失败: %v", err)
	}
	defer manager.Cleanup()

	fmt.Println("[INFO] 插件握手成功")

	// 4. 初始化插件
	if err := calculator.Initialize(); err != nil {
		log.Fatalf("插件初始化失败: %v", err)
	}
	fmt.Println("[INFO] 插件初始化完成")

	// 5. 设置优雅关闭
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		fmt.Println("\n[INFO] 收到关闭信号，正在优雅关闭...")

		// 关闭插件
		if err := calculator.Shutdown(); err != nil {
			fmt.Printf("[WARN] 插件关闭出错: %v\n", err)
		}

		// 清理资源
		manager.Cleanup()
		fmt.Println("[INFO] 插件关闭完成")
		os.Exit(0)
	}()

	// 6. 演示基本功能
	fmt.Println("\n=== 基本计算演示 ===")

	// 检查插件状态
	if status, err := calculator.GetStatus(); err == nil {
		fmt.Printf("插件状态: %s (版本: %s)\n", status.Status, status.Version)
	}

	// 执行计算操作
	calculations := []struct {
		name string
		op   func() (float64, error)
	}{
		{"10 + 5", func() (float64, error) { return calculator.Add(10, 5) }},
		{"20 - 8", func() (float64, error) { return calculator.Subtract(20, 8) }},
		{"6 * 7", func() (float64, error) { return calculator.Multiply(6, 7) }},
		{"84 / 2", func() (float64, error) { return calculator.Divide(84, 2) }},
	}

	for _, calc := range calculations {
		result, err := calc.op()
		if err != nil {
			fmt.Printf("计算错误 [%s]: %v\n", calc.name, err)
		} else {
			fmt.Printf("计算结果: %s = %.2f\n", calc.name, result)
		}

		// 添加小延迟，模拟实际使用场景
		time.Sleep(500 * time.Millisecond)
	}

	// 7. 演示错误处理
	fmt.Println("\n=== 错误处理演示 ===")

	// 除零错误
	if result, err := calculator.Divide(10, 0); err != nil {
		fmt.Printf("除零错误处理: %v\n", err)
	} else {
		fmt.Printf("意外的结果: %.2f\n", result)
	}

	// 8. 性能测试
	fmt.Println("\n=== 性能测试 ===")

	start := time.Now()
	iterations := 1000

	for i := 0; i < iterations; i++ {
		_, err := calculator.Add(float64(i), float64(i+1))
		if err != nil {
			fmt.Printf("性能测试中出错: %v\n", err)
			break
		}
	}

	duration := time.Since(start)
	fmt.Printf("执行 %d 次计算耗时: %v (平均: %v/次)\n",
		iterations, duration, duration/time.Duration(iterations))

	fmt.Println("\n=== 演示完成 ===")
	fmt.Println("按 Ctrl+C 退出程序")

	// 保持程序运行，等待用户手动退出
	select {}
}
