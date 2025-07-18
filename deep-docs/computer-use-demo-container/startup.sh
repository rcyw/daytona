#!/bin/bash

set -e

echo "Starting Daytona Computer Use Demo Container..."
echo "Display: $DISPLAY"
echo "VNC Port: $VNC_PORT"
echo "NoVNC Port: $NO_VNC_PORT" 
echo "Resolution: $VNC_RESOLUTION"

# Ensure log directory exists
mkdir -p ~/.daytona/computeruse

# Function to check if process is running
check_process() {
    pgrep -f "$1" > /dev/null 2>&1
}

# Function to wait for process
wait_for_process() {
    local process_name="$1"
    local max_wait="$2"
    local wait_time=0
    
    echo "Waiting for $process_name to start..."
    while ! check_process "$process_name" && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    if [ $wait_time -ge $max_wait ]; then
        echo "Warning: $process_name did not start within $max_wait seconds"
        return 1
    else
        echo "$process_name started successfully"
        return 0
    fi
}

# Start D-Bus session
echo "Starting D-Bus session..."
if ! check_process "dbus-daemon"; then
    dbus-launch --sh-syntax > ~/.dbus-session
    source ~/.dbus-session
    export DBUS_SESSION_BUS_ADDRESS
fi

# 1. Start Xvfb (Priority 100)
echo "Starting Xvfb..."
if ! check_process "Xvfb"; then
    Xvfb $DISPLAY -screen 0 ${VNC_RESOLUTION}x24 &
    wait_for_process "Xvfb" 10
fi

# Wait a moment for X server to be ready
sleep 2

# Set up X11 authorization
echo "Setting up X11 authorization..."
export XAUTHORITY=/home/daytona/.Xauthority
# Ensure the auth file exists with correct permissions
touch $XAUTHORITY
chmod 600 $XAUTHORITY
# Add authorization entry
xauth add $DISPLAY . $(mcookie) 2>/dev/null || echo "Note: xauth add might fail in some environments"
echo "X11 authorization configured for display $DISPLAY"

# 2. Start XFCE4 (Priority 200)
echo "Starting XFCE4 desktop environment..."
if ! check_process "xfce4-session"; then
    export HOME=/home/daytona
    export USER=daytona
    export XAUTHORITY=/home/daytona/.Xauthority
    source ~/.dbus-session 2>/dev/null || true
    startxfce4 > ~/.daytona/computeruse/xfce4.log 2> ~/.daytona/computeruse/xfce4.err &
    wait_for_process "xfce4-session" 15
fi

# Wait for desktop to be fully loaded
sleep 3

# Start xfce4-screensaver with correct environment variables
echo "Starting xfce4-screensaver with proper X11 authorization..."
if ! check_process "xfce4-screensaver"; then
    # Kill any existing screensaver processes first
    pkill -f xfce4-screensaver || true
    sleep 1
    
    # Start with explicit environment variables
    DISPLAY=$DISPLAY XAUTHORITY=/home/daytona/.Xauthority nohup xfce4-screensaver > ~/.daytona/computeruse/screensaver.log 2>&1 &
    wait_for_process "xfce4-screensaver" 5
    
    # Verify it can communicate
    if DISPLAY=$DISPLAY XAUTHORITY=/home/daytona/.Xauthority xfce4-screensaver-command --query >/dev/null 2>&1; then
        echo "✓ xfce4-screensaver command interface is working"
    else
        echo "⚠️ xfce4-screensaver command interface not responding"
    fi
fi

# 3. Start x11vnc (Priority 300)
echo "Starting x11vnc VNC server..."
if ! check_process "x11vnc"; then
    x11vnc -display $DISPLAY -forever -shared -rfbport $VNC_PORT -bg -o ~/.daytona/computeruse/x11vnc.log
    wait_for_process "x11vnc" 10
fi

# 4. Start NoVNC (Priority 400)
echo "Starting NoVNC web client..."
if ! check_process "novnc"; then
    # Use novnc_proxy instead of launch.sh for better compatibility
    websockify --web=/usr/share/novnc/ $NO_VNC_PORT localhost:$VNC_PORT &
    wait_for_process "websockify" 10
fi

# Note: This is VNC mode - provides basic desktop environment
# For Daytona daemon with Computer-Use API, use daytona mode

echo ""
echo "=== VNC Desktop Environment Started Successfully ==="
echo ""
echo "Access methods:"
echo "  - VNC Client: Connect to localhost:$VNC_PORT"
echo "  - Web Browser: http://localhost:$NO_VNC_PORT/vnc.html"
echo ""
echo "Available tools for testing:"
echo "  - xdotool: Mouse and keyboard automation"
echo "  - scrot: Screenshot capture"
echo "  - xwininfo: Window information"
echo "  - wmctrl: Window management"
echo ""
echo "VNC Desktop mode: Basic desktop environment without Daytona daemon"
echo ""
echo "To start Daytona daemon with Computer-Use API:"
echo "  Run container with 'daytona' mode using run.sh"
echo ""
echo "Log files location: ~/.daytona/computeruse/"
echo "Demo script: ~/scripts/demo.sh"
echo ""

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    pkill -f novnc || true
    pkill -f websockify || true
    pkill -f x11vnc || true
    pkill -f xfce4 || true
    pkill -f Xvfb || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Keep the container running and show process status
echo "Container is ready. Press Ctrl+C to stop."
echo ""

# Monitor processes and show status
while true; do
    echo "=== Process Status $(date) ==="
    echo "Xvfb: $(check_process 'Xvfb' && echo 'Running' || echo 'Stopped')"
    echo "XFCE4: $(check_process 'xfce4-session' && echo 'Running' || echo 'Stopped')"
    echo "x11vnc: $(check_process 'x11vnc' && echo 'Running' || echo 'Stopped')"
    echo "NoVNC: $(check_process 'websockify' && echo 'Running' || echo 'Stopped')"
    echo ""
    
    # Check if any critical process has stopped
    if ! check_process 'Xvfb' || ! check_process 'x11vnc'; then
        echo "Critical process stopped. Container will exit."
        break
    fi
    
    sleep 30
done

