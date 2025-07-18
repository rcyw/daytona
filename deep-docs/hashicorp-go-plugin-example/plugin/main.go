package main

import (
	"os"

	"github.com/daytonaio/daytona/deep-docs/hashicorp-go-plugin-example/shared"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
)

func main() {
	logger := hclog.New(&hclog.LoggerOptions{
		Level:      hclog.Trace,
		Output:     os.Stderr,
		JSONFormat: true,
	})

	// Create the calculator implementation
	calculator := &CalculatorImpl{}

	// Serve the plugin
	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: shared.HandshakeConfig,
		Plugins: map[string]plugin.Plugin{
			"calculator": &shared.CalculatorPlugin{Impl: calculator},
		},
		Logger: logger,
	})
}
