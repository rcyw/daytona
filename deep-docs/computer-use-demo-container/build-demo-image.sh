#!/bin/bash

set -e

# Configuration
IMAGE_NAME="daytona-computer-use-demo"
TAG_SUFFIX=${MIRROR_SOURCE:-"aliyun"}   # Default: Alibaba Cloud mirror for China users
FULL_TAG="${IMAGE_NAME}:${TAG_SUFFIX}"
DOCKERFILE=${DOCKERFILE_NAME:-"Dockerfile"}      # Default: Unified Dockerfile with mirror source support
FORCE_REBUILD=${FORCE_REBUILD:-false}

echo "=== Daytona Computer Use Demo Image Builder ==="
echo ""
echo "Image: $FULL_TAG"
echo "Dockerfile: $DOCKERFILE"
echo "Force rebuild: $FORCE_REBUILD"
echo ""

# Check if image already exists
if docker images | grep -q "$IMAGE_NAME.*$TAG_SUFFIX"; then
    if [ "$FORCE_REBUILD" = "false" ]; then
        echo "✓ Image $FULL_TAG already exists"
        echo "  Use FORCE_REBUILD=true to rebuild"
        echo "  Use './run-demo.sh' to start the container"
        exit 0
    else
        echo "🔄 Force rebuilding existing image..."
    fi
else
    echo "🏗️  Building new image..."
fi

# Verify computer-use plugin image exists
if ! docker images | grep -q "computer-use.*build"; then
    echo "❌ Error: computer-use plugin image not found!"
    echo ""
    echo "Please build the computer-use plugin first:"
    echo "  ../../hack/computer-use/build-computer-use-amd64.sh"
    echo ""
    exit 1
fi

echo "✓ Found computer-use plugin image"

# Build daemon if force rebuild is requested
if [ "$FORCE_REBUILD" = "true" ]; then
    echo ""
    echo "🔧 Force rebuild detected - building Daytona daemon..."
    ./build-daemon.sh
else
    # Check if daemon already exists
    if [ -f "dist/apps/daemon" ]; then
        echo "✓ Found existing daemon binary"
    else
        echo "🔧 Daemon binary not found - building Daytona daemon..."
        ./build-daemon.sh
    fi
fi

# Build the image
echo ""
echo "Building image with $DOCKERFILE..."
echo "Mirror source: $TAG_SUFFIX"

# Prepare build arguments
BUILD_ARGS="--build-arg TARGETARCH=amd64 --build-arg MIRROR_SOURCE=$TAG_SUFFIX"

docker build \
    -f "$DOCKERFILE" \
    --platform linux/amd64 \
    $BUILD_ARGS \
    -t "$FULL_TAG" \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Image built successfully: $FULL_TAG"
    echo ""
    echo "Image size:"
    docker images | grep "$IMAGE_NAME.*$TAG_SUFFIX"
    
    # Check if daemon was included
    if [ -f "dist/apps/daemon" ]; then
        echo ""
        echo "🚀 This image includes Daytona daemon with Computer-Use API support"
        echo ""
        echo "To run the container:"
        echo "  ./run-demo.sh"
        echo ""
        echo "Computer-Use API is accessible on port 2280:"
        echo "  curl http://localhost:2280/computeruse/status"
        echo "  docker exec -it daytona-computer-use-demo ./scripts/test-computer-use-api.sh"
    else
        echo ""
        echo "To run the container:"
        echo "  ./run-demo.sh"
    fi
    
    echo ""
    echo "To force rebuild (including daemon):"
    echo "  FORCE_REBUILD=true ./build-demo-image.sh"
    echo ""
    echo "Cleanup local daemon files:"
    echo "  rm -rf dist/"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi 