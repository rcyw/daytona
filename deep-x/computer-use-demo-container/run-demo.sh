#!/bin/bash

set -e

# Configuration
IMAGE_NAME="daytona-computer-use-demo"
TAG_SUFFIX=${MIRROR_SOURCE:-"aliyun"}
FULL_TAG="${IMAGE_NAME}:${TAG_SUFFIX}"
CONTAINER_NAME="daytona-computer-use-demo"

# Startup mode configuration
MODE=${1:-"vnc"}  # Default to VNC mode, can be 'vnc' or 'daytona'

echo "=== Daytona Computer Use Demo Container Runner ==="
echo ""
echo "Image: $FULL_TAG"
echo "Container: $CONTAINER_NAME"
echo "Mode: $MODE"
echo ""

# Check if image exists
if ! docker images | grep -q "$IMAGE_NAME.*$TAG_SUFFIX"; then
    echo "❌ Image $FULL_TAG not found!"
    echo ""
    echo "Please build the image first:"
    echo "  ./build-demo-image.sh"
    echo ""
    exit 1
fi

echo "✓ Found image $FULL_TAG"

# Create necessary directories
echo "Creating directories..."
mkdir -p shared logs
echo "✓ Created shared and logs directories"

# Determine startup script based on mode
if [ "$MODE" = "daytona" ]; then
    ENTRYPOINT="/home/daytona/scripts/daytona/run.sh"
    PORT_MAPPING="-p 5901:5901 -p 6080:6080 -p 2280:2280 -p 22222:22222"
    MODE_LABEL="mode=daytona"
    DESCRIPTION_LABEL="Daytona Computer Use Demo Container (Daemon Mode)"
else
    ENTRYPOINT="/usr/local/bin/startup.sh"
    PORT_MAPPING="-p 5901:5901 -p 6080:6080"
    MODE_LABEL="mode=vnc"
    DESCRIPTION_LABEL="Daytona Computer Use Demo Container (VNC Mode)"
fi

# Stop and remove existing container if running
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "Stopping existing container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "✓ Cleaned up existing container"
fi

# Run the container
echo ""
echo "Starting container in $MODE mode..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --platform linux/amd64 \
    $PORT_MAPPING \
    -v "$(pwd)/shared:/home/daytona/shared" \
    -v "$(pwd)/logs:/home/daytona/.daytona/computeruse" \
    -e DISPLAY=:1 \
    -e VNC_PORT=5901 \
    -e NO_VNC_PORT=6080 \
    -e VNC_RESOLUTION=1280x720 \
    -e VNC_USER=daytona \
    --label "description=$DESCRIPTION_LABEL" \
    --label "version=1.0" \
    --label "architecture=amd64" \
    --label "$MODE_LABEL" \
    --entrypoint "$ENTRYPOINT" \
    "$FULL_TAG"

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 10

# Check container status
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ Container is running successfully in $MODE mode!"
    echo ""
    echo "=== Access Information ==="
    echo ""
    echo "🖥️  VNC Client: localhost:5901"
    echo "🌐 Web Browser: http://localhost:6080/vnc.html"
    
    if [ "$MODE" = "daytona" ]; then
        echo ""
        echo "=== Daytona Services ==="
        echo ""
        echo "🚀 Computer-Use API: http://localhost:2280"
        echo "🔧 Terminal Server: http://localhost:22222"
        echo ""
        echo "=== API Testing ==="
        echo ""
        echo "🧪 Test API:         docker exec -it $CONTAINER_NAME ./scripts/daytona/test-computer-use-api.sh"
        echo "📊 API Status:       curl http://localhost:2280/computeruse/status"
        echo "📸 Screenshot:       curl http://localhost:2280/computeruse/screenshot"
    fi
    
    echo ""
    echo "=== Container Commands ==="
    echo ""
    echo "📊 View logs:        docker logs $CONTAINER_NAME"
    echo "🔍 Enter container:  docker exec -it $CONTAINER_NAME bash"
    echo "🎯 Run demo:         docker exec -it $CONTAINER_NAME ./scripts/demo.sh"
    echo "⏹️  Stop container:   docker stop $CONTAINER_NAME"
    echo ""
    echo "=== Files and Directories ==="
    echo ""
    echo "📁 Shared folder:    ./shared (mounted to /home/daytona/shared)"
    echo "📝 Log files:        ./logs (mounted to /home/daytona/.daytona/computeruse)"
    echo ""
    
    echo "=== Usage Examples ==="
    echo ""
    if [ "$MODE" = "daytona" ]; then
        echo "Daytona mode: Full Computer-Use API available"
        echo "  - All VNC desktop functionality"
        echo "  - Daytona daemon with Computer-Use plugin"
        echo "  - HTTP API for programmatic control"
        echo ""
        echo "To start in VNC mode (lighter): ./run-demo.sh vnc"
    else
        echo "VNC mode: Basic desktop environment"
        echo "  - VNC desktop with xdotool and automation tools"
        echo "  - No daemon or API services"
        echo "  - Lower resource usage"
        echo ""
        echo "To start in Daytona mode (full features): ./run-demo.sh daytona"
    fi
    echo ""
    
    # Try to open web browser
    if command -v open >/dev/null 2>&1; then
        echo "Opening web browser..."
        open "http://localhost:6080/vnc.html"
    elif command -v xdg-open >/dev/null 2>&1; then
        echo "Opening web browser..."
        xdg-open "http://localhost:6080/vnc.html"
    fi
else
    echo "❌ Container failed to start!"
    echo ""
    echo "Check logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
fi 