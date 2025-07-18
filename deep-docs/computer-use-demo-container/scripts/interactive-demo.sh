#!/bin/bash

# Daytona Computer Use Interactive Demo Script
# This script demonstrates various desktop automation capabilities with detailed steps

set -e

echo "=== Daytona Computer Use Interactive Demo Script ==="
echo ""

# Check if we're in a GUI environment
if [ -z "$DISPLAY" ]; then
    echo "Error: No DISPLAY environment variable set"
    echo "Please run this script inside the VNC container"
    exit 1
fi

# Function to wait for user input
wait_for_input() {
    echo "Press Enter to continue or Ctrl+C to exit..."
    read -r
}

# Function to take screenshot
take_screenshot() {
    local filename="$1"
    scrot "$filename" 2>/dev/null || {
        echo "Note: scrot failed, trying gnome-screenshot..."
        gnome-screenshot -f "$filename" 2>/dev/null || {
            echo "Screenshot tools not available"
            return 1
        }
    }
    echo "Screenshot saved: $filename"
}

# Check which mode we're running in
if pgrep -f "daytona-daemon" > /dev/null 2>&1; then
    echo "Running in: DAYTONA MODE (with Computer-Use API)"
    MODE="daytona"
else
    echo "Running in: VNC MODE (basic desktop environment)"
    MODE="vnc"
fi

echo ""
echo "1. Environment Information"
echo "=========================="
echo "Display: $DISPLAY"
echo "Resolution: $(xrandr 2>/dev/null | grep "Screen 0" | awk '{print $8 "x" $10}' | sed 's/,//' || echo 'Unable to detect')"
echo "X Server: $(ps aux | grep Xvfb | grep -v grep | wc -l) Xvfb process(es)"
echo "Desktop: $(ps aux | grep xfce4 | grep -v grep | wc -l) XFCE4 process(es)"
echo "VNC Server: $(ps aux | grep x11vnc | grep -v grep | wc -l) x11vnc process(es)"
echo "Web VNC: $(ps aux | grep websockify | grep -v grep | wc -l) websockify process(es)"

if [ "$MODE" = "daytona" ]; then
    echo "Daemon: $(ps aux | grep daytona-daemon | grep -v grep | wc -l) daemon process(es)"
fi

echo ""

wait_for_input

echo "2. Window Information"
echo "===================="
echo "Available windows:"
wmctrl -l 2>/dev/null || echo "wmctrl not available or no windows found"
echo ""
echo "Root window info:"
xwininfo -root | head -10
echo ""

wait_for_input

echo "3. Screenshot Demonstration"
echo "=========================="
echo "Taking a screenshot of the current desktop..."
mkdir -p ~/screenshots
screenshot_file="$HOME/screenshots/demo_$(date +%Y%m%d_%H%M%S).png"
take_screenshot "$screenshot_file"
echo ""

wait_for_input

echo "4. Opening Applications"
echo "======================"
echo "Opening a terminal window..."
xfce4-terminal --title="Demo Terminal" --geometry=80x24 &
sleep 2

echo "Opening file manager..."
thunar &
sleep 2

echo "Listing current windows:"
wmctrl -l 2>/dev/null || echo "wmctrl not available"
echo ""

wait_for_input

echo "5. Mouse Automation Demo"
echo "======================="
echo "Getting current mouse position..."
eval $(xdotool getmouselocation --shell)
echo "Mouse is at position: X=$X, Y=$Y"

echo "Moving mouse to center of screen..."
screen_info=$(xrandr 2>/dev/null | grep "Screen 0" | awk '{print $8 "x" $10}' | sed 's/,//' || echo "1280x720")
width=$(echo $screen_info | cut -d'x' -f1)
height=$(echo $screen_info | cut -d'x' -f2)
center_x=$((width / 2))
center_y=$((height / 2))

xdotool mousemove $center_x $center_y
echo "Mouse moved to center: ($center_x, $center_y)"

echo "Performing a click..."
xdotool click 1
echo ""

wait_for_input

echo "6. Keyboard Automation Demo"
echo "=========================="
echo "Focusing on a terminal and typing text..."

# Find a terminal window
terminal_id=$(wmctrl -l | grep -i terminal | head -1 | awk '{print $1}')
if [ -n "$terminal_id" ]; then
    echo "Found terminal window: $terminal_id"
    wmctrl -i -a "$terminal_id"
    sleep 1
    
    echo "Typing demo text..."
    xdotool type "echo 'Hello from Daytona Computer Use Demo!'"
    sleep 1
    xdotool key Return
    sleep 1
    xdotool type "date"
    xdotool key Return
    sleep 1
    xdotool type "uname -a"
    xdotool key Return
else
    echo "No terminal window found, opening one..."
    xfce4-terminal &
    sleep 3
    xdotool type "echo 'Demo text input from xdotool'"
    xdotool key Return
fi
echo ""

wait_for_input

echo "7. Computer-use Plugin Test"
echo "=========================="
if command -v computer-use >/dev/null 2>&1; then
    echo "Computer-use plugin is available at: $(which computer-use)"
    echo "Plugin file info:"
    ls -la $(which computer-use)
    echo ""
    echo "Note: The plugin runs as a HashiCorp plugin and would normally"
    echo "be started by the Daytona toolbox service, not directly."
else
    echo "Computer-use plugin not found in PATH"
fi
echo ""

wait_for_input

echo "8. API Testing (Daytona Mode Only)"
echo "================================="
if [ "$MODE" = "daytona" ]; then
    echo "Testing Computer-Use API endpoints..."
    
    # Test version endpoint
    echo "Testing daemon version:"
    if curl -s "http://localhost:2280/version" >/dev/null 2>&1; then
        echo "  ✓ Version API: Available"
        curl -s "http://localhost:2280/version" | head -c 100
        echo "..."
    else
        echo "  ✗ Version API: Not available"
    fi
    
    echo ""
    echo "Testing Computer-Use status:"
    if curl -s "http://localhost:2280/computeruse/status" >/dev/null 2>&1; then
        echo "  ✓ Computer-Use API: Available"
        curl -s "http://localhost:2280/computeruse/status" | head -c 100
        echo "..."
    else
        echo "  ✗ Computer-Use API: Not available"
    fi
    
    echo ""
    echo "For full API testing, run:"
    echo "  ./scripts/daytona/test-computer-use-api.sh"
else
    echo "API testing only available in Daytona mode."
    echo "To test APIs, restart container with:"
    echo "  ./run-demo.sh daytona"
fi
echo ""

wait_for_input

echo "9. Process Monitoring"
echo "===================="
echo "Current VNC-related processes:"
echo ""
echo "Xvfb processes:"
ps aux | grep Xvfb | grep -v grep || echo "  None found"
echo ""
echo "XFCE4 processes:"
ps aux | grep xfce4 | grep -v grep || echo "  None found"
echo ""
echo "x11vnc processes:"
ps aux | grep x11vnc | grep -v grep || echo "  None found"
echo ""
echo "NoVNC/websockify processes:"
ps aux | grep websockify | grep -v grep || echo "  None found"

if [ "$MODE" = "daytona" ]; then
    echo ""
    echo "Daytona daemon processes:"
    ps aux | grep daytona-daemon | grep -v grep || echo "  None found"
fi

echo ""

wait_for_input

echo "10. Log Files"
echo "============"
echo "Computer-use log directory contents:"
ls -la ~/.daytona/computeruse/ 2>/dev/null || echo "Log directory not found"
echo ""
echo "Recent XFCE4 log entries:"
tail -5 ~/.daytona/computeruse/xfce4.log 2>/dev/null || echo "XFCE4 log not found"

if [ "$MODE" = "daytona" ]; then
    echo ""
    echo "Recent daemon log entries:"
    tail -5 ~/.daytona/computeruse/daemon.log 2>/dev/null || echo "Daemon log not found"
fi

echo ""

wait_for_input

echo "11. Final Screenshot"
echo "==================="
echo "Taking a final screenshot showing the demo results..."
final_screenshot="$HOME/screenshots/demo_final_$(date +%Y%m%d_%H%M%S).png"
take_screenshot "$final_screenshot"
echo ""

echo "=== Interactive Demo Complete ==="
echo ""
echo "Demo Results:"
echo "- Screenshots saved in ~/screenshots/"
echo "- Applications opened: terminal, file manager"
echo "- Mouse and keyboard automation demonstrated"
echo "- Process monitoring completed"
echo "- Computer-use plugin location verified"

if [ "$MODE" = "daytona" ]; then
    echo "- API endpoints tested"
fi

echo ""
echo "Access the desktop via:"
echo "- VNC Client: localhost:$VNC_PORT"
echo "- Web Browser: http://localhost:$NO_VNC_PORT/vnc.html"

if [ "$MODE" = "daytona" ]; then
    echo ""
    echo "API Endpoints:"
    echo "- Toolbox API: http://localhost:2280"
    echo "- Terminal Server: http://localhost:22222"
    echo "- Computer-Use Status: curl http://localhost:2280/computeruse/status"
    echo "- Take Screenshot: curl http://localhost:2280/computeruse/screenshot"
fi

echo ""
echo "Available tools for further testing:"
echo "- xdotool: Mouse and keyboard automation"
echo "- scrot/gnome-screenshot: Screenshot capture"
echo "- wmctrl: Window management"
echo "- xwininfo: Window information"
echo "- computer-use: Daytona desktop automation plugin"
echo ""
echo "Thank you for using the Daytona Computer Use Interactive Demo!" 