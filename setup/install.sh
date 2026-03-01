#!/usr/bin/env bash
#
# Install the Adventure Engine systemd user service.
#
# Resolves the service template with the actual path to this repository,
# installs it into ~/.config/systemd/user/, and reloads systemd.
#
# Usage: bash setup/install.sh
#
# After installing, create your environment file:
#   cp setup/adventure-engine.env.example setup/adventure-engine.env
#   # Edit adventure-engine.env with your PROJECT_DIR and API tokens
#
# Then enable and start:
#   systemctl --user enable --now adventure-engine

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORVRAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$SCRIPT_DIR/adventure-engine.service.template"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/adventure-engine.service"
ENV_FILE="$SCRIPT_DIR/adventure-engine.env"

# Validate template exists
if [[ ! -f "$TEMPLATE" ]]; then
    echo "Error: Template not found: $TEMPLATE" >&2
    exit 1
fi

# Check for environment file
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Warning: Environment file not found: $ENV_FILE"
    echo "  cp setup/adventure-engine.env.example setup/adventure-engine.env"
    echo "  Then edit it with your PROJECT_DIR and API tokens."
    echo ""
fi

# Ensure systemd user directory exists
mkdir -p "$SERVICE_DIR"

# Generate service file from template
echo "Generating service file..."
echo "  CORVRAN_DIR = $CORVRAN_DIR"
sed "s|{{CORVRAN_DIR}}|$CORVRAN_DIR|g" "$TEMPLATE" > "$SERVICE_FILE"

# Reload systemd
echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

echo ""
echo "Installed: $SERVICE_FILE"
echo ""
echo "Next steps:"
if [[ ! -f "$ENV_FILE" ]]; then
    echo "  1. cp setup/adventure-engine.env.example setup/adventure-engine.env"
    echo "  2. Edit setup/adventure-engine.env with your settings"
    echo "  3. systemctl --user enable --now adventure-engine"
else
    echo "  systemctl --user enable --now adventure-engine"
fi
