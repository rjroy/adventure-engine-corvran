#!/usr/bin/env bash
#
# Stop the Adventure Engine application
# Usage: stop-world.sh <project-directory>
#
# This script stops a running Adventure Engine server by reading
# the PID file created by launch-world.sh.

set -euo pipefail

PROJECT_DIR="${1:-.}"

# Validate project directory exists
if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "Error: Project directory does not exist: $PROJECT_DIR" >&2
    exit 1
fi

PID_FILE="$PROJECT_DIR/.adventure-engine.pid"
LOG_FILE="$PROJECT_DIR/.adventure-engine.log"

# Check if PID file exists
if [[ ! -f "$PID_FILE" ]]; then
    echo "No running Adventure Engine found (no PID file at $PID_FILE)"
    exit 0
fi

# Read PID
SERVER_PID=$(cat "$PID_FILE")

# Check if process is running
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Adventure Engine is not running (PID $SERVER_PID not found)"
    rm -f "$PID_FILE"
    exit 0
fi

# Log the stop
{
    echo ""
    echo "=== Adventure Engine Stop ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Stopping server (PID: $SERVER_PID)"
} >> "$LOG_FILE"

# Send SIGTERM for graceful shutdown
echo "Stopping Adventure Engine (PID: $SERVER_PID)..."
kill "$SERVER_PID"

# Wait for process to terminate (with timeout)
MAX_WAIT=10
for i in $(seq 1 $MAX_WAIT); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Adventure Engine stopped successfully"
        echo "Server stopped gracefully" >> "$LOG_FILE"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo "Force killing Adventure Engine..."
kill -9 "$SERVER_PID" 2>/dev/null || true
echo "Server force killed" >> "$LOG_FILE"
rm -f "$PID_FILE"
echo "Adventure Engine stopped (forced)"
