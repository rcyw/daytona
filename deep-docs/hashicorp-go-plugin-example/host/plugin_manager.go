package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/daytonaio/daytona/deep-docs/hashicorp-go-plugin-example/shared"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
)

// PluginManager manages the lifecycle of plugins
type PluginManager struct {
	client    plugin.ClientProtocol
	rawClient *plugin.Client
}

// NewPluginManager creates a new plugin manager instance
func NewPluginManager() *PluginManager {
	return &PluginManager{}
}

// LoadPlugin loads and initializes a plugin from the given path
func (pm *PluginManager) LoadPlugin(pluginPath string) (shared.Calculator, error) {
	// Create a logger
	logger := hclog.New(&hclog.LoggerOptions{
		Name:   "plugin-host",
		Output: os.Stdout,
		Level:  hclog.Info,
	})

	// Create the plugin map
	pluginMap := map[string]plugin.Plugin{
		"calculator": &shared.CalculatorPlugin{},
	}

	// Create the client configuration
	config := &plugin.ClientConfig{
		HandshakeConfig: shared.HandshakeConfig,
		Plugins:         pluginMap,
		Cmd:             exec.Command(pluginPath),
		Logger:          logger,
		Managed:         true,
	}

	// Start the plugin client
	client := plugin.NewClient(config)
	pm.rawClient = client

	// Connect via RPC
	rpcClient, err := client.Client()
	if err != nil {
		client.Kill()
		return nil, fmt.Errorf("failed to create RPC client: %w", err)
	}
	pm.client = rpcClient

	// Dispense the plugin
	raw, err := rpcClient.Dispense("calculator")
	if err != nil {
		client.Kill()
		return nil, fmt.Errorf("failed to dispense plugin: %w", err)
	}

	// Type assert to our Calculator interface
	calculator, ok := raw.(shared.Calculator)
	if !ok {
		client.Kill()
		return nil, fmt.Errorf("plugin does not implement Calculator interface")
	}

	return calculator, nil
}

// Cleanup cleans up plugin resources
func (pm *PluginManager) Cleanup() {
	if pm.rawClient != nil {
		pm.rawClient.Kill()
		pm.rawClient = nil
	}
	pm.client = nil
}

// IsAlive checks if the plugin process is still alive
func (pm *PluginManager) IsAlive() bool {
	if pm.rawClient == nil {
		return false
	}
	return !pm.rawClient.Exited()
}
