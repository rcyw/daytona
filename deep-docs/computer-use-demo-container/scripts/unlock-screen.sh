#!/bin/bash

echo "Daytona Desktop Screen Unlock Tool"
echo "=================================="
echo ""

# Check if we're inside the container
if [ "$(whoami)" = "daytona" ] && [ "$DISPLAY" = ":1" ]; then
    echo "Running inside Daytona container..."
    
    # Set proper environment variables
    export DISPLAY=:1
    export XAUTHORITY=/home/daytona/.Xauthority
    
    echo "Attempting to unlock the current screen..."
    
    # Try to unlock the screen using xdotool
    echo "Sending unlock commands..."
    xdotool key Escape 2>/dev/null || true
    sleep 1
    
    # Type the password if unlock dialog is still showing
    xdotool type "daytona" 2>/dev/null || true
    sleep 0.5
    xdotool key Return 2>/dev/null || true
    
    # Ensure screensaver is running properly
    echo "Checking and ensuring screensaver service status..."
    
    # Check if process is running
    SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
    if [ -n "$SCREENSAVER_PID" ]; then
        echo "✓ xfce4-screensaver process is running (PID: $SCREENSAVER_PID)"
        
        # Test command interface
        if xfce4-screensaver-command --query >/dev/null 2>&1; then
            echo "✓ xfce4-screensaver command interface is responding"
        else
            echo "⚠️  Command interface not responding, fixing integration..."
            
            # Get session environment for proper integration
            SESSION_PID=$(pgrep -f "xfce4-session" | head -1)
            if [ -n "$SESSION_PID" ]; then
                echo "Restoring screensaver with session integration..."
                
                # Save session environment
                SESSION_ENV_FILE="/tmp/session_env_$$"
                cat /proc/$SESSION_PID/environ 2>/dev/null | tr '\0' '\n' > "$SESSION_ENV_FILE"
                
                # Kill current screensaver
                pkill -f xfce4-screensaver || true
                sleep 2
                
                # Start with session environment
                (
                    # Load session environment variables
                    while IFS='=' read -r key value; do
                        [ -n "$key" ] && [ -n "$value" ] && export "$key"="$value"
                    done < "$SESSION_ENV_FILE"
                    
                    # Ensure display settings
                    export DISPLAY=:1
                    export XAUTHORITY=/home/daytona/.Xauthority
                    
                    # Start screensaver
                    nohup xfce4-screensaver >/dev/null 2>&1 &
                )
                
                rm -f "$SESSION_ENV_FILE"
                sleep 3
                
                # Verify both command interface and GUI functionality
                if xfce4-screensaver-command --query >/dev/null 2>&1; then
                    echo "✓ Command interface restored"
                else
                    echo "⚠️  Command interface still not optimal"
                fi
                
                # Test GUI lock functionality
                echo "Testing GUI lock functionality (xflock4)..."
                if timeout 2 xflock4 >/dev/null 2>&1; then
                    echo "✅ GUI lock functionality restored!"
                    # Auto-unlock the test lock
                    sleep 1 && xdotool key Escape && sleep 1 && xdotool type "daytona" && sleep 0.5 && xdotool key Return &
                else
                    echo "⚠️  GUI lock needs additional setup, but basic functionality should work"
                fi
            else
                echo "⚠️  xfce4-session not found, basic restart attempted"
                pkill -f xfce4-screensaver || true
                sleep 2
                DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY nohup xfce4-screensaver >/dev/null 2>&1 &
                sleep 3
            fi
        fi
    else
        echo "❌ xfce4-screensaver process not found, starting..."
        
        # Start screensaver with proper environment
        DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY nohup xfce4-screensaver >/dev/null 2>&1 &
        sleep 3
        
        SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
        if [ -n "$SCREENSAVER_PID" ]; then
            echo "✓ xfce4-screensaver started (PID: $SCREENSAVER_PID)"
        else
            echo "❌ Failed to start xfce4-screensaver"
        fi
    fi
    
    echo ""
    echo "Available lock screen methods:"
    echo "  - Ctrl+Alt+L keyboard shortcut"
    echo "  - Lock Screen button in GUI"
    echo "  - Command: xfce4-screensaver-command --lock"
    
    echo ""
    echo "✅ Screen unlock and service check completed!"
    echo ""
    echo "If the screen is still locked, please:"
    echo "1. Click on the password field in the lock screen"
    echo "2. Type: daytona"
    echo "3. Press Enter"
    echo ""
    echo "To manually lock the screen again, use: Ctrl+Alt+L"
    
else
    echo "This script should be run inside the Daytona container."
    echo ""
    echo "To run this script inside the container:"
    echo ""
    echo "1. First, start the container:"
    echo "   ./run-demo.sh"
    echo ""
    echo "2. Then, in another terminal, run:"
    echo "   docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/unlock-screen.sh'"
    echo ""
    echo "Or simply use the login credentials in the web interface:"
    echo "   Username: daytona"
    echo "   Password: daytona"
fi

echo ""
echo "Note: Screen locking is enabled by default for security."
echo "To disable it permanently, see the configuration files in the config/ directory." 