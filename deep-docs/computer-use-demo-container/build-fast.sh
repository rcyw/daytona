#!/bin/bash

set -e

# Parse startup mode parameter
MODE=${1:-"vnc"}  # Default to VNC mode

echo "=== Fast Build Mode with Alibaba Cloud Mirrors ==="
echo ""
echo "This will use the unified Dockerfile with optimized Alibaba Cloud mirror sources"
echo "for faster package downloads in China/Asia region."
echo ""
echo "Startup mode: $MODE"
echo ""

# Set environment variables for fast build
export MIRROR_SOURCE=aliyun
export DOCKERFILE_NAME=Dockerfile

# Build image if needed
./build-demo-image.sh

# Run the container with specified mode
./run-demo.sh "$MODE" 