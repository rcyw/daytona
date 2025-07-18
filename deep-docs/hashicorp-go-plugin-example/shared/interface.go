package shared

import (
	"net/rpc"

	"github.com/hashicorp/go-plugin"
)

// Calculator defines the interface that our plugin must implement
type Calculator interface {
	// Initialize initializes the plugin
	Initialize() error

	// Add performs addition
	Add(a, b float64) (float64, error)

	// Subtract performs subtraction
	Subtract(a, b float64) (float64, error)

	// Multiply performs multiplication
	Multiply(a, b float64) (float64, error)

	// Divide performs division
	Divide(a, b float64) (float64, error)

	// GetStatus returns the current status of the plugin
	GetStatus() (*StatusResponse, error)

	// Shutdown gracefully shuts down the plugin
	Shutdown() error
}

// CalculatorPlugin implements the plugin.Plugin interface
type CalculatorPlugin struct {
	Impl Calculator
}

// Server returns the RPC server implementation
func (p *CalculatorPlugin) Server(*plugin.MuxBroker) (interface{}, error) {
	return &CalculatorRPCServer{Impl: p.Impl}, nil
}

// Client returns the RPC client implementation
func (p *CalculatorPlugin) Client(b *plugin.MuxBroker, c *rpc.Client) (interface{}, error) {
	return &CalculatorRPCClient{client: c}, nil
}

// HandshakeConfig defines the handshake configuration
var HandshakeConfig = plugin.HandshakeConfig{
	ProtocolVersion:  1,
	MagicCookieKey:   "CALCULATOR_PLUGIN",
	MagicCookieValue: "calculator_example",
}
