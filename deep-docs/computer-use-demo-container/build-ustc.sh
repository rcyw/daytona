#!/bin/bash

set -e

# Parse startup mode parameter
MODE=${1:-"vnc"}  # Default to VNC mode

echo "=== Fast Build Mode with USTC Mirrors ==="
echo ""
echo "This will use the unified Dockerfile with USTC (University of Science and Technology of China)"
echo "mirror sources for faster package downloads in China."
echo ""
echo "Startup mode: $MODE"
echo ""

# Set environment variables for USTC build
export MIRROR_SOURCE=ustc
export DOCKERFILE_NAME=Dockerfile

# Build image if needed
./build-demo-image.sh

# Run the container with specified mode
./run-demo.sh "$MODE" 