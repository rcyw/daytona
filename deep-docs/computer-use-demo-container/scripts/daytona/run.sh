#!/bin/bash

set -e

echo "Starting Daytona Daemon for Computer-Use API..."
echo "Display: $DISPLAY"
echo "VNC Port: $VNC_PORT"
echo "NoVNC Port: $NO_VNC_PORT" 
echo "Resolution: $VNC_RESOLUTION"

# Ensure log directory exists
mkdir -p ~/.daytona/computeruse

# Set up X11 authorization for Computer-Use plugin
echo "Setting up X11 authorization..."
export XAUTHORITY=/home/daytona/.Xauthority
# Ensure the auth file exists with correct permissions
touch $XAUTHORITY
chmod 600 $XAUTHORITY
# Add authorization entry for the display
xauth add $DISPLAY . $(mcookie) 2>/dev/null || echo "Note: xauth add might fail in some environments"
echo "✓ X11 authorization configured for display $DISPLAY"

# Start Daytona daemon
echo "Starting Daytona daemon..."
if command -v daytona-daemon >/dev/null 2>&1; then
    echo "Daytona daemon is available at: $(which daytona-daemon)"
    # Set environment variables for daemon
    export DAYTONA_PROJECT_DIR=/home/daytona/shared
    export DAYTONA_DAEMON_LOG_FILE_PATH=/home/daytona/.daytona/computeruse/daemon.log
    export LOG_LEVEL=info
    
    # Start daemon in background
    nohup daytona-daemon > ~/.daytona/computeruse/daemon.log 2>&1 &
    DAEMON_PID=$!
    echo "Daytona daemon started with PID: $DAEMON_PID"
    
    # Wait a moment for daemon to start
    sleep 3
    
    # Check if daemon is running
    if kill -0 $DAEMON_PID 2>/dev/null; then
        echo "✓ Daytona daemon is running"
        echo "  - Toolbox API: http://localhost:2280"
        echo "  - Terminal server: http://localhost:22222"
        echo "  - Computer-use plugin: Available"
        
        # Wait for daemon API to be ready
        echo ""
        echo "Waiting for daemon API to be ready..."
        for i in {1..30}; do
            if curl -s "http://localhost:2280/version" >/dev/null 2>&1; then
                echo "✓ Daemon API is ready"
                break
            fi
            if [ $i -eq 30 ]; then
                echo "⚠️ Daemon API not responding after 30 seconds"
                break
            fi
            echo "Waiting for API... ($i/30)"
            sleep 1
        done
        
        # Start computer-use processes via API
        echo ""
        echo "Starting desktop processes via Computer-Use API..."
        response=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "http://localhost:2280/computeruse/start" 2>/dev/null || echo "HTTP_CODE:000")
        http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
        response_body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo "✓ Desktop processes started successfully"
        elif [ "$http_code" = "503" ]; then
            echo "⚠️ Some processes may already be running (HTTP 503)"
            echo "Response: $response_body"
        else
            echo "⚠️ Failed to start desktop processes (HTTP $http_code)"
            echo "Response: $response_body"
        fi
    else
        echo "⚠️ Daytona daemon failed to start"
    fi
else
    echo "Warning: daytona-daemon not found in PATH"
fi

# Start computer-use plugin for demonstration
echo "Verifying computer-use plugin availability..."
if command -v computer-use >/dev/null 2>&1; then
    echo "✓ Computer-use plugin is available at: $(which computer-use)"
    echo "✓ Computer-use plugin symlink: /usr/local/lib/daytona-computer-use"
else
    echo "Warning: computer-use plugin not found in PATH"
fi

echo ""
echo "=== Daytona Mode Started Successfully ==="
echo ""
echo "Daytona Services:"
echo "  - Toolbox API: http://localhost:2280"
echo "  - Terminal Server: http://localhost:22222"
echo "  - Computer-use Plugin: Available"
echo ""
echo "Desktop Environment:"
echo "  - Status: Started via Computer-Use API"
echo "  - Access VNC Client: localhost:$VNC_PORT"
echo "  - Access Web Browser: http://localhost:$NO_VNC_PORT/vnc.html"
echo ""
echo "Computer-use API endpoints:"
echo "  - POST /computeruse/start - Start desktop processes"
echo "  - POST /computeruse/screenshot - Take screenshot"
echo "  - POST /computeruse/mouse/move - Move mouse"
echo "  - POST /computeruse/mouse/click - Click mouse"
echo "  - POST /computeruse/keyboard/type - Type text"
echo "  - GET /computeruse/status - Get plugin status"
echo ""
echo "Log files location: ~/.daytona/computeruse/"
echo "API test script: ~/scripts/daytona/test-computer-use-api.sh"
echo ""

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    pkill -f daytona-daemon || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Keep the container running and show daemon status
echo "Container is ready. Press Ctrl+C to stop."
echo ""

# Monitor daemon process
while true; do
    echo "=== Process Status $(date) ==="
    if pgrep -f daytona-daemon > /dev/null 2>&1; then
        echo "Daemon: Running"
        echo "API: http://localhost:2280 (accessible)"
    else
        echo "Daemon: Stopped"
        echo "Container will exit."
        break
    fi
    echo ""
    
    sleep 30
done 