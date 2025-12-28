#!/usr/bin/env bash
#
# Stop the Adventure Engine application
# Usage: stop-world.sh [run-directory]
#
# The run directory is where launch-world.sh stored the .adventure-engine.pid
# and .adventure-engine.log files. This is typically the project directory
# passed to launch-world.sh.

set -euo pipefail

RUN_DIR="${1:-.}"

# Convert to absolute path if exists
if [[ -d "$RUN_DIR" ]]; then
    RUN_DIR="$(cd "$RUN_DIR" && pwd)"
else
    echo "Error: Run directory does not exist: $RUN_DIR" >&2
    exit 1
fi

PID_FILE="$RUN_DIR/.adventure-engine.pid"
LOG_FILE="$RUN_DIR/.adventure-engine.log"

if [[ ! -f "$PID_FILE" ]]; then
    echo "No running Adventure Engine found (PID file not found: $PID_FILE)"
    exit 0
fi

SERVER_PID=$(cat "$PID_FILE")

# Validate PID is numeric
if ! [[ "$SERVER_PID" =~ ^[0-9]+$ ]]; then
    echo "Error: Invalid PID in file: $SERVER_PID" >&2
    rm -f "$PID_FILE"
    exit 1
fi

# Verify this PID is actually a bun/node process (guard against PID reuse)
if ! ps -p "$SERVER_PID" -o comm= 2>/dev/null | grep -qE '^(bun|node)$'; then
    echo "Warning: PID $SERVER_PID does not appear to be a bun/node process"
    echo "Cleaning up stale PID file"
    rm -f "$PID_FILE"
    exit 0
fi

# Log the stop attempt
{
    echo ""
    echo "=== Adventure Engine Stop ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Stopping server (PID: $SERVER_PID)..."
} >> "$LOG_FILE" 2>/dev/null || true

# Check if process is running
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Server (PID: $SERVER_PID) is not running"
    rm -f "$PID_FILE"
    echo "Cleaned up stale PID file"
    echo "Server already stopped" >> "$LOG_FILE" 2>/dev/null || true
    exit 0
fi

# Graceful shutdown
echo "Stopping Adventure Engine (PID: $SERVER_PID)..."
kill "$SERVER_PID" 2>/dev/null || true

# Wait for graceful shutdown (up to 5 seconds)
for i in $(seq 1 5); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Server stopped gracefully"
        rm -f "$PID_FILE"
        echo "Server stopped gracefully" >> "$LOG_FILE" 2>/dev/null || true
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo "Server did not stop gracefully, force killing..."
kill -9 "$SERVER_PID" 2>/dev/null || true
sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Error: Failed to stop server (PID: $SERVER_PID)" >&2
    echo "Force kill failed" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
fi

rm -f "$PID_FILE"
echo "Server force stopped"
echo "Server force stopped" >> "$LOG_FILE" 2>/dev/null || true

