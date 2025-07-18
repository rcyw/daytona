#!/bin/bash

# Build daemon and copy to local build context
# This script is called by build-demo-image.sh when daemon support is needed

set -e

echo "=== Building Daytona Daemon ==="

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Container directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Check if we're in the right directory structure
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "Error: Could not find package.json in $PROJECT_ROOT"
    echo "Please ensure this script is run from the deep-docs/computer-use-demo-container directory"
    exit 1
fi

# Build the daemon for Linux AMD64 (container target)
echo "Building daemon for Linux AMD64 with yarn..."
cd "$PROJECT_ROOT"

if command -v yarn >/dev/null 2>&1; then
    # Build AMD64 version for Linux containers
    yarn nx run daemon:build-amd64
else
    echo "Error: yarn not found. Please install yarn first."
    exit 1
fi

# Check if daemon was built successfully
if [ ! -f "$PROJECT_ROOT/dist/apps/daemon-amd64" ]; then
    echo "Error: daemon-amd64 binary not found at $PROJECT_ROOT/dist/apps/daemon-amd64"
    echo "Build failed!"
    exit 1
fi

# Copy daemon to container build context (rename to daemon for container use)
cd "$SCRIPT_DIR"
mkdir -p dist/apps
cp "$PROJECT_ROOT/dist/apps/daemon-amd64" dist/apps/daemon

echo "✓ Daemon built and copied successfully: $(ls -lh dist/apps/daemon | awk '{print $5}')"
echo "✓ Ready for Docker build" 