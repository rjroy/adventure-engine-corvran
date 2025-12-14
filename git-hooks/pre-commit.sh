#!/bin/bash
#
# Pre-commit hook: Run linting and unit tests for all projects.
# Does NOT run integration or e2e tests.
#
# Install: ln -sf ../../git-hooks/pre-commit.sh .git/hooks/pre-commit

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running pre-commit checks...${NC}"

# Track failures
FAILED=0

# Get repo root
REPO_ROOT="$(git rev-parse --show-toplevel)"

#
# Backend checks
#
echo -e "\n${YELLOW}=== Backend ===${NC}"

cd "$REPO_ROOT/backend"

echo "Running typecheck..."
if ! bun run typecheck; then
    echo -e "${RED}Backend typecheck failed${NC}"
    FAILED=1
fi

echo "Running lint..."
if ! bun run lint; then
    echo -e "${RED}Backend lint failed${NC}"
    FAILED=1
fi

echo "Running unit tests..."
if ! bun run test:unit; then
    echo -e "${RED}Backend unit tests failed${NC}"
    FAILED=1
fi

#
# Frontend checks
#
echo -e "\n${YELLOW}=== Frontend ===${NC}"

cd "$REPO_ROOT/frontend"

echo "Running typecheck..."
if ! bun run typecheck; then
    echo -e "${RED}Frontend typecheck failed${NC}"
    FAILED=1
fi

echo "Running lint..."
if ! bun run lint; then
    echo -e "${RED}Frontend lint failed${NC}"
    FAILED=1
fi

echo "Running unit tests..."
if ! bun run test; then
    echo -e "${RED}Frontend unit tests failed${NC}"
    FAILED=1
fi

#
# Shared checks (if applicable)
#
if [ -f "$REPO_ROOT/shared/package.json" ]; then
    echo -e "\n${YELLOW}=== Shared ===${NC}"
    cd "$REPO_ROOT/shared"

    if grep -q '"typecheck"' package.json 2>/dev/null; then
        echo "Running typecheck..."
        if ! bun run typecheck; then
            echo -e "${RED}Shared typecheck failed${NC}"
            FAILED=1
        fi
    fi

    if grep -q '"lint"' package.json 2>/dev/null; then
        echo "Running lint..."
        if ! bun run lint; then
            echo -e "${RED}Shared lint failed${NC}"
            FAILED=1
        fi
    fi
fi

#
# Summary
#
cd "$REPO_ROOT"

if [ $FAILED -ne 0 ]; then
    echo -e "\n${RED}Pre-commit checks failed. Please fix the issues above.${NC}"
    exit 1
fi

echo -e "\n${GREEN}All pre-commit checks passed!${NC}"
exit 0
