#!/bin/bash

echo "Lock Screen Test Tool"
echo "===================="
echo ""

# Check if we're inside the container
if [ "$(whoami)" = "daytona" ] && [ "$DISPLAY" = ":1" ]; then
    echo "Running inside Daytona container..."
    
    # Set environment variables first
    export DISPLAY=:1
    export XAUTHORITY=/home/daytona/.Xauthority
    
    # Check if xfce4-screensaver process is running
    SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
    if [ -n "$SCREENSAVER_PID" ]; then
        echo "✓ xfce4-screensaver process is running (PID: $SCREENSAVER_PID)"
        
        # Test if the command interface works
        if xfce4-screensaver-command --query >/dev/null 2>&1; then
            echo "✓ xfce4-screensaver command interface is responding"
        else
            echo "⚠️  xfce4-screensaver command interface not responding"
            echo "Attempting to fix screensaver integration..."
            
            # Get session environment for proper integration
            SESSION_PID=$(pgrep -f "xfce4-session" | head -1)
            if [ -n "$SESSION_PID" ]; then
                echo "Found xfce4-session (PID: $SESSION_PID), restarting screensaver with session integration..."
                
                # Save current session environment
                SESSION_ENV_FILE="/tmp/session_env_$$"
                cat /proc/$SESSION_PID/environ 2>/dev/null | tr '\0' '\n' > "$SESSION_ENV_FILE"
                
                # Kill and restart screensaver with proper environment
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
                
                # Verify command interface is working
                if xfce4-screensaver-command --query >/dev/null 2>&1; then
                    echo "✓ xfce4-screensaver command interface fixed"
                    
                    # Test GUI lock functionality
                    echo "Testing GUI lock functionality (xflock4)..."
                    if timeout 2 xflock4 >/dev/null 2>&1; then
                        echo "✅ GUI lock functionality working"
                        # Auto-unlock test
                        sleep 1 && xdotool key Escape && sleep 1 && xdotool type "daytona" && sleep 0.5 && xdotool key Return &
                    else
                        echo "⚠️  GUI lock functionality needs additional setup"
                    fi
                else
                    echo "❌ Command interface still not working"
                    echo "Note: Keyboard shortcut Ctrl+Alt+L may still work"
                fi
            else
                echo "❌ xfce4-session not found, basic restart attempted"
                pkill -f xfce4-screensaver || true
                sleep 2
                DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY nohup xfce4-screensaver >/dev/null 2>&1 &
                sleep 3
            fi
        fi
    else
        echo "❌ xfce4-screensaver process is not running"
        echo "Starting xfce4-screensaver..."
        
        # Start with proper environment
        export XAUTHORITY=/home/daytona/.Xauthority
        DISPLAY=$DISPLAY nohup xfce4-screensaver >/dev/null 2>&1 &
        sleep 3
        
        SCREENSAVER_PID=$(pgrep -f "xfce4-screensaver" | head -1)
        if [ -n "$SCREENSAVER_PID" ]; then
            echo "✓ xfce4-screensaver started successfully (PID: $SCREENSAVER_PID)"
        else
            echo "❌ Failed to start xfce4-screensaver"
            exit 1
        fi
    fi
    
    echo ""
    echo "Testing lock screen command..."
    echo "This will lock the screen in 3 seconds..."
    echo "Use password 'daytona' to unlock"
    echo ""
    
    sleep 3
    
    # Lock the screen
    echo "Executing: xfce4-screensaver-command --lock"
    xfce4-screensaver-command --lock
    LOCK_EXIT_CODE=$?
    
    if [ $LOCK_EXIT_CODE -eq 0 ]; then
        echo "✅ Lock command executed successfully!"
    else
        echo "❌ Lock command failed (exit code: $LOCK_EXIT_CODE)"
        echo "Trying alternative lock method (Ctrl+Alt+L)..."
        xdotool key ctrl+alt+l
        echo "Note: Alternative lock method attempted"
    fi
    
else
    echo "This script should be run inside the Daytona container."
    echo ""
    echo "To run this script inside the container:"
    echo ""
    echo "1. First, start the container:"
    echo "   ./run-demo.sh"
    echo ""
    echo "2. Then, in another terminal, run:"
    echo "   docker exec -it daytona-computer-use-demo bash -c '/home/daytona/scripts/test-lock.sh'"
fi

echo ""
echo "Note: If the screen locks successfully, you can unlock it with password: daytona" 