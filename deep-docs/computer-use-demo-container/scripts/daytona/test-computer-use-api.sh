#!/bin/bash

# Test script for Daytona Computer-Use API
# Tests various endpoints of the computer-use plugin

set -e

echo "=== Testing Daytona Computer-Use API ==="
echo ""

# API base URL
API_BASE="http://localhost:2280"
COMPUTER_USE_API="$API_BASE/computeruse"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local description="$4"
    
    echo -e "${BLUE}Testing:${NC} $description"
    echo -e "${YELLOW}$method${NC} $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTP_CODE:%{http_code}" "$endpoint" 2>/dev/null || echo "HTTP_CODE:000")
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "HTTP_CODE:%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$endpoint" 2>/dev/null || echo "HTTP_CODE:000")
        else
            response=$(curl -s -w "HTTP_CODE:%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                "$endpoint" 2>/dev/null || echo "HTTP_CODE:000")
        fi
    fi
    
    # Extract HTTP code
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    response_body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ Success${NC} (HTTP $http_code)"
        if [ -n "$response_body" ] && [ "$response_body" != "{}" ]; then
            echo "Response: $(echo "$response_body" | head -c 200)..."
        fi
    elif [ "$http_code" = "503" ]; then
        echo -e "${YELLOW}⚠ Service Unavailable${NC} (HTTP $http_code)"
        echo "Response: $response_body"
    elif [ "$http_code" = "000" ]; then
        echo -e "${RED}✗ Connection Failed${NC}"
    else
        echo -e "${RED}✗ Failed${NC} (HTTP $http_code)"
        echo "Response: $response_body"
    fi
    echo ""
}

# Wait for daemon to be ready
echo "Waiting for Daytona daemon to be ready..."
for i in {1..30}; do
    if curl -s "$API_BASE/version" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Daemon is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Daemon not responding after 30 seconds${NC}"
        exit 1
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done
echo ""

# Test daemon version
test_endpoint "GET" "$API_BASE/version" "" "Daemon version"

# Test project directory
test_endpoint "GET" "$API_BASE/project-dir" "" "Project directory"

# Test computer-use status
test_endpoint "GET" "$COMPUTER_USE_API/status" "" "Computer-use plugin status"

# Test display info
test_endpoint "GET" "$COMPUTER_USE_API/display/info" "" "Display information"

# Test window list
test_endpoint "GET" "$COMPUTER_USE_API/display/windows" "" "Window list"

# Test mouse position
test_endpoint "GET" "$COMPUTER_USE_API/mouse/position" "" "Mouse position"

# Test screenshot
test_endpoint "GET" "$COMPUTER_USE_API/screenshot" "" "Screenshot capture"

# Test process status
test_endpoint "GET" "$COMPUTER_USE_API/process-status" "" "Process status"

# Test mouse movement
test_endpoint "POST" "$COMPUTER_USE_API/mouse/move" '{"x": 100, "y": 100}' "Move mouse to (100,100)"

# Test mouse click
test_endpoint "POST" "$COMPUTER_USE_API/mouse/click" '{"x": 100, "y": 100, "button": "left", "double": false}' "Click at (100,100)"

# Test typing
test_endpoint "POST" "$COMPUTER_USE_API/keyboard/type" '{"text": "Hello Computer-Use!", "delay": 50}' "Type text"

# Test key press
test_endpoint "POST" "$COMPUTER_USE_API/keyboard/key" '{"key": "Escape", "modifiers": []}' "Press Escape key"

# Test hotkey
test_endpoint "POST" "$COMPUTER_USE_API/keyboard/hotkey" '{"keys": "ctrl+a"}' "Press Ctrl+A hotkey"

echo "=== Test Summary ==="
echo ""
echo "All tests completed. Check the results above for any failures."
echo ""
echo "To test interactively:"
echo "  - Open browser: http://localhost:6080/vnc.html"
echo "  - Check daemon logs: tail -f ~/.daytona/computeruse/daemon.log"
echo "  - Manual API test: curl http://localhost:2280/computeruse/status"
echo "" 