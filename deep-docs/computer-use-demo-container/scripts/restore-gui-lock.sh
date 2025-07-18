#!/bin/bash

echo "GUI Lock Screen Restoration Tool"
echo "================================"
echo ""

# Check if we're inside the container
if [ "$(whoami)" = "daytona" ] && [ "$DISPLAY" = ":1" ]; then
    echo "Running inside Daytona container..."
    
    # Set environment variables
    export DISPLAY=:1
    export XAUTHORITY=/home/daytona/.Xauthority
    
    echo "Checking current screensaver status..."
    
    # Check if xfce4-screensaver process is running
    SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
    if [ -n "$SCREENSAVER_PID" ]; then
        echo "✓ xfce4-screensaver process is running (PID: $SCREENSAVER_PID)"
        
        # Test current GUI lock functionality
        echo "Testing GUI lock functionality (xflock4)..."
        if timeout 2 xflock4 2>/dev/null; then
            echo "✅ GUI lock is already working! No restoration needed."
            echo "You can use:"
            echo "  - Ctrl+Alt+L keyboard shortcut"
            echo "  - Lock Screen button in GUI"
            # Auto-unlock
            sleep 1 && xdotool key Escape && sleep 1 && xdotool type "daytona" && sleep 0.5 && xdotool key Return
            exit 0
        else
            echo "⚠️  GUI lock not working, attempting restoration..."
        fi
    else
        echo "❌ xfce4-screensaver process is not running"
    fi
    
    echo "Restoring xfce4-screensaver with full session integration..."
    
    # Kill any existing screensaver processes
    pkill -f xfce4-screensaver || true
    sleep 2
    
    # Get session manager PID for proper integration
    SESSION_PID=$(pgrep -f "xfce4-session" | head -1)
    
    if [ -n "$SESSION_PID" ]; then
        echo "Found xfce4-session (PID: $SESSION_PID)"
        
        # Get complete session environment
        SESSION_ENV_FILE="/tmp/session_env_$$"
        cat /proc/$SESSION_PID/environ 2>/dev/null | tr '\0' '\n' > "$SESSION_ENV_FILE"
        
        # Start with full session environment
        (
            set -a
            source "$SESSION_ENV_FILE" 2>/dev/null || true
            export DISPLAY=:1
            export XAUTHORITY=/home/daytona/.Xauthority
            nohup xfce4-screensaver >/dev/null 2>&1 &
        )
        
        rm -f "$SESSION_ENV_FILE"
        sleep 3
        
        # Verify the new process
        NEW_SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
        if [ -n "$NEW_SCREENSAVER_PID" ]; then
            echo "✓ xfce4-screensaver restarted (PID: $NEW_SCREENSAVER_PID)"
        else
            echo "❌ Failed to restart xfce4-screensaver"
            exit 1
        fi
    else
        echo "⚠️  xfce4-session not found, starting with basic environment..."
        DISPLAY=$DISPLAY XAUTHORITY=/home/daytona/.Xauthority nohup xfce4-screensaver >/dev/null 2>&1 &
        sleep 3
        
        SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
        if [ -n "$SCREENSAVER_PID" ]; then
            echo "✓ xfce4-screensaver started (PID: $SCREENSAVER_PID)"
        else
            echo "❌ Failed to start xfce4-screensaver"
            exit 1
        fi
    fi
    
    echo ""
    echo "Testing restored functionality..."
    
    # Test GUI lock functionality
    echo "Testing GUI lock method (xflock4)..."
    if timeout 2 xflock4 2>/dev/null; then
        echo "✅ GUI lock method working!"
        echo "Lock Screen button should now work in the GUI"
        # Auto-unlock
        sleep 1 && xdotool key Escape && sleep 1 && xdotool type "daytona" && sleep 0.5 && xdotool key Return
    else
        echo "⚠️  GUI lock method still not optimal"
    fi
    
    # Test command interface
    echo "Testing command interface..."
    if xfce4-screensaver-command --query >/dev/null 2>&1; then
        echo "✅ Command interface working!"
    else
        echo "⚠️  Command interface not responding"
    fi
    
    echo ""
    echo "=== Restoration Summary ==="
    echo "GUI Lock Screen button should now work properly."
    echo "You can test by:"
    echo "  1. Using Ctrl+Alt+L"
    echo "  2. Clicking Lock Screen button in GUI"
    echo "  3. Running: xflock4"
    echo ""
    
else
    echo "This script should be run inside the Daytona container."
    echo ""
    echo "To run this script inside the container:"
    echo ""
    echo "1. First, start the container:"
    echo "   ./run-demo.sh"
    echo ""
    echo "2. Then, in another terminal, run:"
    echo "   docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/restore-gui-lock.sh'"
fi 