#!/usr/bin/env bash
# Integration tests for the daggerheart-system Claude Code plugin
# Run from the plugin root: ./tests/integration.test.sh
#
# Tests:
# 1. Plugin structure validation (skill files exist)
# 2. SRD symlink resolution
# 3. Init command file operations (simulated via file checks)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Get the script directory and plugin root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${PLUGIN_ROOT}/.." && pwd)"

# Test utilities
pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
}

heading() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Cleanup function for test artifacts
cleanup() {
    if [[ -n "${TEST_DIR:-}" ]] && [[ -d "${TEST_DIR}" ]]; then
        rm -rf "${TEST_DIR}"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

#---------------------------------------
# Test Suite: Plugin Structure
#---------------------------------------
heading "Test Suite: Plugin Structure"

# Test: plugin.json exists
if [[ -f "${PLUGIN_ROOT}/.claude-plugin/plugin.json" ]]; then
    pass "plugin.json exists"
else
    fail "plugin.json missing at ${PLUGIN_ROOT}/.claude-plugin/plugin.json"
fi

# Test: CLAUDE.md exists
if [[ -f "${PLUGIN_ROOT}/CLAUDE.md" ]]; then
    pass "Plugin CLAUDE.md exists"
else
    fail "Plugin CLAUDE.md missing"
fi

# Test: System.md exists
if [[ -f "${PLUGIN_ROOT}/System.md" ]]; then
    pass "System.md exists"
else
    fail "System.md missing"
fi

# Test: dh-CLAUDE.md exists
if [[ -f "${PLUGIN_ROOT}/dh-CLAUDE.md" ]]; then
    pass "dh-CLAUDE.md exists"
else
    fail "dh-CLAUDE.md missing"
fi

# Test: init.md command exists
if [[ -f "${PLUGIN_ROOT}/commands/init.md" ]]; then
    pass "commands/init.md exists"
else
    fail "commands/init.md missing"
fi

#---------------------------------------
# Test Suite: Skill SKILL.md Validation
#---------------------------------------
heading "Test Suite: Skill Files"

SKILLS=("dh-players" "dh-combat" "dh-adversaries" "dh-domains" "dh-rules")

for skill in "${SKILLS[@]}"; do
    skill_file="${PLUGIN_ROOT}/skills/${skill}/SKILL.md"

    # Test: SKILL.md exists
    if [[ -f "${skill_file}" ]]; then
        pass "${skill}/SKILL.md exists"
    else
        fail "${skill}/SKILL.md missing"
        continue
    fi

    # Test: SKILL.md has frontmatter with name field
    if grep -q "^name:" "${skill_file}"; then
        pass "${skill}/SKILL.md has 'name' in frontmatter"
    else
        fail "${skill}/SKILL.md missing 'name' in frontmatter"
    fi

    # Test: SKILL.md has frontmatter with description field
    if grep -q "^description:" "${skill_file}"; then
        pass "${skill}/SKILL.md has 'description' in frontmatter"
    else
        fail "${skill}/SKILL.md missing 'description' in frontmatter"
    fi

    # Test: SKILL.md is valid markdown (has at least one heading)
    if grep -q "^#" "${skill_file}"; then
        pass "${skill}/SKILL.md contains markdown headings"
    else
        fail "${skill}/SKILL.md has no markdown headings"
    fi
done

#---------------------------------------
# Test Suite: SRD Symlink Resolution
#---------------------------------------
heading "Test Suite: SRD Symlink"

SRD_SYMLINK="${PLUGIN_ROOT}/skills/dh-rules/references/srd"
SRD_TARGET="${PROJECT_ROOT}/docs/research/daggerheart-srd"

# Test: SRD symlink exists
if [[ -L "${SRD_SYMLINK}" ]]; then
    pass "SRD symlink exists at skills/dh-rules/references/srd"
else
    fail "SRD symlink missing at skills/dh-rules/references/srd"
fi

# Test: SRD symlink points to correct target
if [[ -L "${SRD_SYMLINK}" ]]; then
    actual_target=$(readlink "${SRD_SYMLINK}")
    expected_target="../../../../docs/research/daggerheart-srd"
    if [[ "${actual_target}" == "${expected_target}" ]]; then
        pass "SRD symlink points to correct relative path"
    else
        fail "SRD symlink target mismatch: expected '${expected_target}', got '${actual_target}'"
    fi
fi

# Test: SRD symlink resolves to existing directory
if [[ -d "${SRD_SYMLINK}" ]]; then
    pass "SRD symlink resolves to existing directory"
else
    fail "SRD symlink does not resolve to existing directory (submodule may not be initialized)"
fi

# Test: SRD contains expected directories
if [[ -d "${SRD_SYMLINK}" ]]; then
    expected_dirs=("classes" "adversaries" "abilities" "domains" "contents")
    for dir in "${expected_dirs[@]}"; do
        if [[ -d "${SRD_SYMLINK}/${dir}" ]]; then
            pass "SRD contains '${dir}' directory"
        else
            fail "SRD missing '${dir}' directory"
        fi
    done
fi

#---------------------------------------
# Test Suite: Init Command Simulation
#---------------------------------------
heading "Test Suite: Init Command Simulation"

# Create a temporary test directory
TEST_DIR=$(mktemp -d)

# Test: System.md can be copied to test directory
cp "${PLUGIN_ROOT}/System.md" "${TEST_DIR}/System.md"
if [[ -f "${TEST_DIR}/System.md" ]]; then
    pass "System.md copied to test directory"
else
    fail "Failed to copy System.md to test directory"
fi

# Test: System.md content matches source
if diff -q "${PLUGIN_ROOT}/System.md" "${TEST_DIR}/System.md" > /dev/null 2>&1; then
    pass "System.md content matches source"
else
    fail "System.md content differs from source"
fi

# Test: dh-CLAUDE.md can be appended to new CLAUDE.md
cat "${PLUGIN_ROOT}/dh-CLAUDE.md" >> "${TEST_DIR}/CLAUDE.md"
if [[ -f "${TEST_DIR}/CLAUDE.md" ]]; then
    pass "CLAUDE.md created with dh-CLAUDE.md content"
else
    fail "Failed to create CLAUDE.md from dh-CLAUDE.md"
fi

# Test: CLAUDE.md contains the idempotency marker
MARKER="# Daggerheart System GM Guidance"
if grep -q "${MARKER}" "${TEST_DIR}/CLAUDE.md"; then
    pass "CLAUDE.md contains idempotency marker"
else
    fail "CLAUDE.md missing idempotency marker '${MARKER}'"
fi

# Test: Idempotency - second append should be detected
# Simulate the idempotency check from init.md
if grep -q "${MARKER}" "${TEST_DIR}/CLAUDE.md"; then
    # Marker found, skip append (this is expected behavior)
    pass "Idempotency check works - second append would be skipped"
else
    # This shouldn't happen since we just added it
    fail "Idempotency check failed"
fi

# Test: Merge with existing CLAUDE.md preserves original content
echo "# Existing Project Config" > "${TEST_DIR}/CLAUDE-existing.md"
echo "" >> "${TEST_DIR}/CLAUDE-existing.md"
echo "Some existing content here." >> "${TEST_DIR}/CLAUDE-existing.md"
original_content=$(cat "${TEST_DIR}/CLAUDE-existing.md")

# Simulate merge (append if marker not present)
if ! grep -q "${MARKER}" "${TEST_DIR}/CLAUDE-existing.md"; then
    echo "" >> "${TEST_DIR}/CLAUDE-existing.md"
    cat "${PLUGIN_ROOT}/dh-CLAUDE.md" >> "${TEST_DIR}/CLAUDE-existing.md"
fi

# Verify original content preserved
if echo "$(cat "${TEST_DIR}/CLAUDE-existing.md")" | grep -q "# Existing Project Config"; then
    pass "Merge preserves original CLAUDE.md content"
else
    fail "Merge destroyed original CLAUDE.md content"
fi

# Verify new content added
if grep -q "${MARKER}" "${TEST_DIR}/CLAUDE-existing.md"; then
    pass "Merge adds Daggerheart GM Guidance"
else
    fail "Merge failed to add Daggerheart GM Guidance"
fi

#---------------------------------------
# Test Suite: Skill Reference Files
#---------------------------------------
heading "Test Suite: Skill Reference Files"

# dh-players references
PLAYER_REFS=("sheet-template.md" "story-template.md" "experience-template.md" "sheet-example.md")
for ref in "${PLAYER_REFS[@]}"; do
    if [[ -f "${PLUGIN_ROOT}/skills/dh-players/references/${ref}" ]]; then
        pass "dh-players/references/${ref} exists"
    else
        fail "dh-players/references/${ref} missing"
    fi
done

# dh-combat references
COMBAT_REFS=("action-outcomes.md" "encounter-template.md" "conditions.md")
for ref in "${COMBAT_REFS[@]}"; do
    if [[ -f "${PLUGIN_ROOT}/skills/dh-combat/references/${ref}" ]]; then
        pass "dh-combat/references/${ref} exists"
    else
        fail "dh-combat/references/${ref} missing"
    fi
done

# dh-adversaries references
ADVERSARY_REFS=("stat-block-template.md" "stat-block-example.md" "encounter-building.md")
for ref in "${ADVERSARY_REFS[@]}"; do
    if [[ -f "${PLUGIN_ROOT}/skills/dh-adversaries/references/${ref}" ]]; then
        pass "dh-adversaries/references/${ref} exists"
    else
        fail "dh-adversaries/references/${ref} missing"
    fi
done

# dh-domains references
if [[ -f "${PLUGIN_ROOT}/skills/dh-domains/references/domain-overview.md" ]]; then
    pass "dh-domains/references/domain-overview.md exists"
else
    fail "dh-domains/references/domain-overview.md missing"
fi

# dh-rules License
if [[ -f "${PLUGIN_ROOT}/skills/dh-rules/License.md" ]]; then
    pass "dh-rules/License.md exists"
else
    fail "dh-rules/License.md missing"
fi

#---------------------------------------
# Test Suite: Content Validation
#---------------------------------------
heading "Test Suite: Content Validation"

# Test: System.md contains Duality Dice section
if grep -q "## Duality Dice" "${PLUGIN_ROOT}/System.md"; then
    pass "System.md contains Duality Dice section"
else
    fail "System.md missing Duality Dice section"
fi

# Test: System.md contains Traits section
if grep -q "## Traits" "${PLUGIN_ROOT}/System.md"; then
    pass "System.md contains Traits section"
else
    fail "System.md missing Traits section"
fi

# Test: System.md contains Hope and Fear section
if grep -q "## Hope and Fear" "${PLUGIN_ROOT}/System.md"; then
    pass "System.md contains Hope and Fear section"
else
    fail "System.md missing Hope and Fear section"
fi

# Test: dh-CLAUDE.md contains State File Management
if grep -q "## State File Management" "${PLUGIN_ROOT}/dh-CLAUDE.md"; then
    pass "dh-CLAUDE.md contains State File Management section"
else
    fail "dh-CLAUDE.md missing State File Management section"
fi

# Test: CLAUDE.md contains skill descriptions
for skill in "${SKILLS[@]}"; do
    if grep -q "${skill}" "${PLUGIN_ROOT}/CLAUDE.md"; then
        pass "Plugin CLAUDE.md references ${skill}"
    else
        fail "Plugin CLAUDE.md missing reference to ${skill}"
    fi
done

#---------------------------------------
# Summary
#---------------------------------------
heading "Test Summary"

TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo ""
echo "Total tests: ${TOTAL}"
echo -e "  ${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "  ${RED}Failed: ${TESTS_FAILED}${NC}"
echo -e "  ${YELLOW}Skipped: ${TESTS_SKIPPED}${NC}"
echo ""

if [[ ${TESTS_FAILED} -gt 0 ]]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
