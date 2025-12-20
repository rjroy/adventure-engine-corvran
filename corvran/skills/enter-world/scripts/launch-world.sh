#!/usr/bin/env bash
#
# Launch the Adventure Engine application
# Usage: launch-world.sh [--no-browser] <project-directory>
#
# Options:
#   --no-browser, -n    Skip opening the browser (useful for remote/headless)
#
# This script is invoked by the enter-world skill to start
# the Adventure Engine in fire-and-forget mode.

set -euo pipefail

DEBUG="${DEBUG:-}"
OPEN_BROWSER=true

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-browser|-n)
            OPEN_BROWSER=false
            shift
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            echo "Usage: launch-world.sh [--no-browser] <project-directory>" >&2
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# Determine project directory from argument (default to current directory)
PROJECT_DIR="${1:-}"
if [[ -n "${PROJECT_DIR:-}" ]]; then
    # Convert to absolute path (required for SDK cwd)
    PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
else
    PROJECT_DIR="$(pwd)"
fi

# Validate project directory exists
if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "Error: Project directory does not exist: $PROJECT_DIR" >&2
    exit 1
fi


# Source .env files (project specific first-pass overrides)
set -a  # Export all variables
# Project directory .env (adventure-specific overrides)
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced (first-pass): $PROJECT_DIR/.env" >&2
fi
set +a


# Determine where the Adventure Engine code lives (relative to this script or provided by env)
if [[ -n "${CORVRAN_DIR:-}" ]]; then
    # Convert to absolute path (required for SDK cwd)
    CORVRAN_DIR="$(cd "$CORVRAN_DIR" && pwd)"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CORVRAN_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
fi

# Validate CORVRAN_DIR exists
if [[ ! -d "$CORVRAN_DIR" ]]; then
    echo "Error: CORVRAN_DIR does not exist: $CORVRAN_DIR" >&2
    exit 1
fi


# Source .env files (engine defaults first, then project overrides)
set -a  # Export all variables
# Engine backend .env (development defaults)
if [[ -f "$CORVRAN_DIR/backend/.env" ]]; then
    source "$CORVRAN_DIR/backend/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced: $CORVRAN_DIR/backend/.env" >&2
fi
# Engine root .env
if [[ -f "$CORVRAN_DIR/.env" ]]; then
    source "$CORVRAN_DIR/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced: $CORVRAN_DIR/.env" >&2
fi
# Project directory .env (adventure-specific overrides)
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
    [[ -n "$DEBUG" ]] && echo "[env] Sourced (second pass): $PROJECT_DIR/.env" >&2
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
BACKEND_DIR="$CORVRAN_DIR/backend"
FRONTEND_DIR="$CORVRAN_DIR/frontend"
PID_FILE="$PROJECT_DIR/.adventure-engine.pid"

# Track whether cleanup should kill the server
# In fire-and-forget mode, normal exit should leave server running
SHOULD_CLEANUP_SERVER=true

# Cleanup function for shutdown
cleanup() {
    local exit_code=$?

    # Only cleanup server on error or explicit signal
    if [[ "$SHOULD_CLEANUP_SERVER" == "true" ]]; then
        echo "Shutting down Adventure Engine..." >> "$LOG_FILE" 2>/dev/null || echo "Shutting down Adventure Engine..."

        # Kill the server process if running
        # Verify PID is set and is a bun/node process (guard against PID reuse)
        if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null && \
           ps -p "$SERVER_PID" -o comm= 2>/dev/null | grep -qE '^(bun|node)$'; then
            echo "Stopping server (PID: $SERVER_PID)..." >> "$LOG_FILE" 2>/dev/null || true
            kill "$SERVER_PID" 2>/dev/null || true
            # Give it a moment to shut down gracefully
            sleep 1
            # Force kill if still running
            if kill -0 "$SERVER_PID" 2>/dev/null; then
                echo "Force killing server..." >> "$LOG_FILE" 2>/dev/null || true
                kill -9 "$SERVER_PID" 2>/dev/null || true
            fi
        fi

        # Clean up PID file
        if [[ -f "$PID_FILE" ]]; then
            rm -f "$PID_FILE"
            echo "Removed PID file: $PID_FILE" >> "$LOG_FILE" 2>/dev/null || true
        fi

        echo "Adventure Engine stopped" >> "$LOG_FILE" 2>/dev/null || echo "Adventure Engine stopped"
    fi

    exit "$exit_code"
}

# Signal handler that ensures cleanup happens
handle_signal() {
    SHOULD_CLEANUP_SERVER=true
    cleanup
}

# Set up signal traps for cleanup
trap handle_signal INT TERM
trap cleanup EXIT

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
    echo "Engine directory: $CORVRAN_DIR"
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
        # Exit with error - cleanup trap will handle killing server and removing PID file
        exit 1
    fi

    sleep $RETRY_DELAY
done

# Open browser (cross-platform) unless --no-browser was specified
if [[ "$OPEN_BROWSER" == "true" ]]; then
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
else
    echo "Browser launch skipped (--no-browser)" >> "$LOG_FILE"
fi

{
    echo ""
    echo "Adventure Engine is running"
    echo "Server PID: $SERVER_PID"
    echo "Access at: $SERVER_URL"
    echo "To stop: kill $SERVER_PID (or use the stop-world script)"
    echo ""
} >> "$LOG_FILE"

# Successful launch - disable cleanup to leave server running (fire-and-forget mode)
# Server will continue in background; use stop-world.sh or kill PID to stop
SHOULD_CLEANUP_SERVER=false
