#!/usr/bin/env bash
#
# Launch the Adventure Engine application
# Usage: launch-world.sh <project-directory>
#
# This script is invoked by the enter-world skill to start
# the Adventure Engine in fire-and-forget mode.

set -euo pipefail

# Determine where the Adventure Engine code lives (relative to this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

PROJECT_DIR="${1:-.}"

# Validate project directory exists
if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "Error: Project directory does not exist: $PROJECT_DIR" >&2
    exit 1
fi

# Convert to absolute path (required for SDK cwd)
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

# Source .env files (engine defaults first, then project overrides)
DEBUG="${DEBUG:-}"
set -a  # Export all variables
# Engine backend .env (development defaults)
if [[ -f "$ENGINE_DIR/backend/.env" ]]; then
    source "$ENGINE_DIR/backend/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced: $ENGINE_DIR/backend/.env" >&2
fi
# Engine root .env
if [[ -f "$ENGINE_DIR/.env" ]]; then
    source "$ENGINE_DIR/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced: $ENGINE_DIR/.env" >&2
fi
# Project directory .env (adventure-specific overrides)
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced: $PROJECT_DIR/.env" >&2
fi
set +a

# Debug: confirm critical env vars (without exposing values)
if [[ -n "$DEBUG" ]]; then
    [[ -n "${REPLICATE_API_TOKEN:-}" ]] && echo "[env] REPLICATE_API_TOKEN is set" >&2 || echo "[env] WARNING: REPLICATE_API_TOKEN is NOT set" >&2
fi

# Log file for headless operation
LOG_FILE="$PROJECT_DIR/.adventure-engine.log"

# Configuration
SERVER_HOST="${HOST:-localhost}"
SERVER_PORT="${PORT:-3000}"
SERVER_URL="http://${SERVER_HOST}:${SERVER_PORT}"
BACKEND_DIR="$ENGINE_DIR/backend"
FRONTEND_DIR="$ENGINE_DIR/frontend"
PID_FILE="$PROJECT_DIR/.adventure-engine.pid"

# Validate directories exist
if [[ ! -d "$BACKEND_DIR" ]]; then
    echo "Error: Backend directory does not exist: $BACKEND_DIR" >&2
    exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
    echo "Error: Frontend directory does not exist: $FRONTEND_DIR" >&2
    exit 1
fi

# Start logging
{
    echo "=== Adventure Engine Launch ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Engine directory: $ENGINE_DIR"
    echo "Project directory: $PROJECT_DIR"
    echo "Server URL: $SERVER_URL"
    echo ""
} >> "$LOG_FILE"

# Build the frontend
echo "Building frontend..." >> "$LOG_FILE"
cd "$FRONTEND_DIR"
if ! bun run build >> "$LOG_FILE" 2>&1; then
    echo "Error: Frontend build failed" >> "$LOG_FILE"
    exit 1
fi
echo "Frontend build complete" >> "$LOG_FILE"

# Start the backend server in background
# Pass PROJECT_DIR so the SDK works in the adventure world directory
cd "$BACKEND_DIR"
PROJECT_DIR="$PROJECT_DIR" bun run start >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Save and log server PID
echo "$SERVER_PID" > "$PID_FILE"
{
    echo "Backend server started (PID: $SERVER_PID)"
    echo "PID file: $PID_FILE"
    echo ""
} >> "$LOG_FILE"

# Wait for server to be ready
echo "Waiting for server to be ready..." >> "$LOG_FILE"
MAX_RETRIES=30
RETRY_DELAY=1

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/health" | grep -q "200"; then
        echo "Server is ready!" >> "$LOG_FILE"
        break
    fi

    if [ $i -eq $MAX_RETRIES ]; then
        {
            echo "Error: Server failed to start within ${MAX_RETRIES} seconds"
            echo "Server PID: $SERVER_PID"
        } >> "$LOG_FILE"
        # Kill the server process and clean up PID file
        kill $SERVER_PID 2>/dev/null || true
        rm -f "$PID_FILE"
        exit 1
    fi

    sleep $RETRY_DELAY
done

# Open browser (cross-platform)
# Redirect browser output to /dev/null to avoid capturing browser's internal errors
if command -v xdg-open > /dev/null; then
    # Linux
    xdg-open "$SERVER_URL" > /dev/null 2>&1 &
    echo "Browser opened with xdg-open" >> "$LOG_FILE"
elif command -v open > /dev/null; then
    # macOS
    open "$SERVER_URL" > /dev/null 2>&1 &
    echo "Browser opened with open" >> "$LOG_FILE"
else
    echo "Warning: Could not detect browser open command (xdg-open or open)" >> "$LOG_FILE"
    echo "Please manually open: $SERVER_URL" >> "$LOG_FILE"
fi

{
    echo ""
    echo "Adventure Engine is running"
    echo "Server PID: $SERVER_PID"
    echo "Access at: $SERVER_URL"
    echo ""
} >> "$LOG_FILE"
