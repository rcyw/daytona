package shared

import (
	"net/rpc"
)

// StatusResponse represents the status of the plugin
type StatusResponse struct {
	Status      string `json:"status"`
	Version     string `json:"version"`
	Initialized bool   `json:"initialized"`
	Message     string `json:"message,omitempty"`
}

// CalculationRequest represents a calculation request
type CalculationRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

// CalculationResponse represents a calculation response
type CalculationResponse struct {
	Result float64 `json:"result"`
}

// ===== RPC Client Implementation =====

// CalculatorRPCClient implements Calculator interface using RPC
type CalculatorRPCClient struct {
	client *rpc.Client
}

// Ensure CalculatorRPCClient implements Calculator interface
var _ Calculator = &CalculatorRPCClient{}

func (c *CalculatorRPCClient) Initialize() error {
	return c.client.Call("Plugin.Initialize", new(interface{}), new(interface{}))
}

func (c *CalculatorRPCClient) Add(a, b float64) (float64, error) {
	req := &CalculationRequest{A: a, B: b}
	var resp CalculationResponse
	err := c.client.Call("Plugin.Add", req, &resp)
	return resp.Result, err
}

func (c *CalculatorRPCClient) Subtract(a, b float64) (float64, error) {
	req := &CalculationRequest{A: a, B: b}
	var resp CalculationResponse
	err := c.client.Call("Plugin.Subtract", req, &resp)
	return resp.Result, err
}

func (c *CalculatorRPCClient) Multiply(a, b float64) (float64, error) {
	req := &CalculationRequest{A: a, B: b}
	var resp CalculationResponse
	err := c.client.Call("Plugin.Multiply", req, &resp)
	return resp.Result, err
}

func (c *CalculatorRPCClient) Divide(a, b float64) (float64, error) {
	req := &CalculationRequest{A: a, B: b}
	var resp CalculationResponse
	err := c.client.Call("Plugin.Divide", req, &resp)
	return resp.Result, err
}

func (c *CalculatorRPCClient) GetStatus() (*StatusResponse, error) {
	var resp StatusResponse
	err := c.client.Call("Plugin.GetStatus", new(interface{}), &resp)
	return &resp, err
}

func (c *CalculatorRPCClient) Shutdown() error {
	return c.client.Call("Plugin.Shutdown", new(interface{}), new(interface{}))
}

// ===== RPC Server Implementation =====

// CalculatorRPCServer implements the RPC server for Calculator
type CalculatorRPCServer struct {
	Impl Calculator
}

func (s *CalculatorRPCServer) Initialize(args interface{}, resp *interface{}) error {
	return s.Impl.Initialize()
}

func (s *CalculatorRPCServer) Add(args *CalculationRequest, resp *CalculationResponse) error {
	result, err := s.Impl.Add(args.A, args.B)
	if err != nil {
		return err
	}
	resp.Result = result
	return nil
}

func (s *CalculatorRPCServer) Subtract(args *CalculationRequest, resp *CalculationResponse) error {
	result, err := s.Impl.Subtract(args.A, args.B)
	if err != nil {
		return err
	}
	resp.Result = result
	return nil
}

func (s *CalculatorRPCServer) Multiply(args *CalculationRequest, resp *CalculationResponse) error {
	result, err := s.Impl.Multiply(args.A, args.B)
	if err != nil {
		return err
	}
	resp.Result = result
	return nil
}

func (s *CalculatorRPCServer) Divide(args *CalculationRequest, resp *CalculationResponse) error {
	result, err := s.Impl.Divide(args.A, args.B)
	if err != nil {
		return err
	}
	resp.Result = result
	return nil
}

func (s *CalculatorRPCServer) GetStatus(args interface{}, resp *StatusResponse) error {
	status, err := s.Impl.GetStatus()
	if err != nil {
		return err
	}
	*resp = *status
	return nil
}

func (s *CalculatorRPCServer) Shutdown(args interface{}, resp *interface{}) error {
	return s.Impl.Shutdown()
}
