package main

import (
	"errors"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/daytonaio/daytona/deep-docs/hashicorp-go-plugin-example/shared"
)

// CalculatorImpl implements the Calculator interface
type CalculatorImpl struct {
	initialized bool
	startTime   time.Time
	mu          sync.RWMutex
}

// Ensure CalculatorImpl implements Calculator interface
var _ shared.Calculator = &CalculatorImpl{}

// Initialize initializes the calculator
func (c *CalculatorImpl) Initialize() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.initialized {
		return errors.New("calculator already initialized")
	}

	c.initialized = true
	c.startTime = time.Now()
	return nil
}

// Add performs addition
func (c *CalculatorImpl) Add(a, b float64) (float64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.initialized {
		return 0, errors.New("calculator not initialized")
	}

	return a + b, nil
}

// Subtract performs subtraction
func (c *CalculatorImpl) Subtract(a, b float64) (float64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.initialized {
		return 0, errors.New("calculator not initialized")
	}

	return a - b, nil
}

// Multiply performs multiplication
func (c *CalculatorImpl) Multiply(a, b float64) (float64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.initialized {
		return 0, errors.New("calculator not initialized")
	}

	return a * b, nil
}

// Divide performs division
func (c *CalculatorImpl) Divide(a, b float64) (float64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.initialized {
		return 0, errors.New("calculator not initialized")
	}

	if b == 0 {
		return 0, errors.New("division by zero")
	}

	result := a / b

	// Check for infinity or NaN
	if math.IsInf(result, 0) {
		return 0, errors.New("result is infinity")
	}
	if math.IsNaN(result) {
		return 0, errors.New("result is not a number")
	}

	return result, nil
}

// GetStatus returns the current status of the calculator
func (c *CalculatorImpl) GetStatus() (*shared.StatusResponse, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	status := "inactive"
	message := "Calculator not initialized"

	if c.initialized {
		status = "active"
		uptime := time.Since(c.startTime)
		message = fmt.Sprintf("Running for %v", uptime.Round(time.Second))
	}

	return &shared.StatusResponse{
		Status:      status,
		Version:     "1.0.0",
		Initialized: c.initialized,
		Message:     message,
	}, nil
}

// Shutdown gracefully shuts down the calculator
func (c *CalculatorImpl) Shutdown() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.initialized {
		return errors.New("calculator not initialized")
	}

	c.initialized = false
	return nil
}
