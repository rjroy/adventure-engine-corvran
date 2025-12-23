#!/bin/bash
# Test suite for the dice roller script
# Covers DdD (Duality Dice) notation and backward compatibility
#
# Usage: ./roll.test.sh
# Exit code: 0 if all tests pass, 1 otherwise

# Don't use set -e as we handle errors ourselves

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLL_SCRIPT="$SCRIPT_DIR/roll.sh"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
pass() {
    ((TESTS_PASSED++))
    echo -e "${GREEN}PASS${NC}: $1"
}

fail() {
    ((TESTS_FAILED++))
    echo -e "${RED}FAIL${NC}: $1"
    if [ -n "$2" ]; then
        echo -e "       ${YELLOW}Details:${NC} $2"
    fi
}

run_test() {
    ((TESTS_RUN++))
}

# JSON field extraction helper (portable, no jq dependency)
get_json_field() {
    local json="$1"
    local field="$2"
    # Extract string field (quoted)
    local result
    result=$(echo "$json" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1)
    if [ -n "$result" ]; then
        echo "$result"
        return
    fi
    # Extract number field (unquoted) - handle negative numbers too
    result=$(echo "$json" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\(-\{0,1\}[0-9]*\).*/\1/p" | head -1)
    echo "$result"
}

get_json_array() {
    local json="$1"
    local field="$2"
    # Extract array field from JSON
    echo "$json" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\(\[[^]]*\]\).*/\1/p" | head -1
}

# Check if a value is in a valid range
in_range() {
    local value="$1"
    local min="$2"
    local max="$3"
    [ "$value" -ge "$min" ] && [ "$value" -le "$max" ]
}

echo "=============================================="
echo "  Dice Roller Test Suite"
echo "=============================================="
echo ""

# Verify roll.sh exists and is executable
if [ ! -x "$ROLL_SCRIPT" ]; then
    echo -e "${RED}ERROR${NC}: roll.sh not found or not executable at $ROLL_SCRIPT"
    exit 1
fi

echo "--- DdD (Duality Dice) Tests ---"
echo ""

# TEST: DdD basic roll returns valid JSON with all fields
run_test
output=$("$ROLL_SCRIPT" "DdD")
expression=$(get_json_field "$output" "expression")
hope=$(get_json_field "$output" "hope")
fear=$(get_json_field "$output" "fear")
higher=$(get_json_field "$output" "higher")
total=$(get_json_field "$output" "total")
modifier=$(get_json_field "$output" "modifier")
rolls=$(get_json_array "$output" "rolls")

if [ "$expression" = "DdD" ] && \
   [ -n "$hope" ] && in_range "$hope" 1 12 && \
   [ -n "$fear" ] && in_range "$fear" 1 12 && \
   [ -n "$higher" ] && \
   [ -n "$total" ] && \
   [ "$modifier" = "0" ] && \
   [ -n "$rolls" ]; then
    pass "DdD basic roll returns valid JSON with all fields"
else
    fail "DdD basic roll returns valid JSON with all fields" "Output: $output"
fi

# TEST: DdD hope/fear values are in range 1-12
run_test
valid_count=0
for i in {1..10}; do
    output=$("$ROLL_SCRIPT" "DdD")
    hope=$(get_json_field "$output" "hope")
    fear=$(get_json_field "$output" "fear")
    if in_range "$hope" 1 12 && in_range "$fear" 1 12; then
        ((valid_count++))
    fi
done
if [ "$valid_count" -eq 10 ]; then
    pass "DdD hope/fear values are always in range 1-12 (10 samples)"
else
    fail "DdD hope/fear values are always in range 1-12" "Only $valid_count/10 were valid"
fi

# TEST: DdD total equals hope + fear (no modifier)
run_test
output=$("$ROLL_SCRIPT" "DdD")
hope=$(get_json_field "$output" "hope")
fear=$(get_json_field "$output" "fear")
total=$(get_json_field "$output" "total")
expected=$((hope + fear))
if [ "$total" -eq "$expected" ]; then
    pass "DdD total equals hope + fear (no modifier)"
else
    fail "DdD total equals hope + fear" "Expected $expected, got $total"
fi

# TEST: DdD+N modifier (positive)
run_test
output=$("$ROLL_SCRIPT" "DdD+5")
expression=$(get_json_field "$output" "expression")
hope=$(get_json_field "$output" "hope")
fear=$(get_json_field "$output" "fear")
total=$(get_json_field "$output" "total")
modifier=$(get_json_field "$output" "modifier")
expected=$((hope + fear + 5))
if [ "$expression" = "DdD+5" ] && \
   [ "$modifier" = "5" ] && \
   [ "$total" -eq "$expected" ]; then
    pass "DdD+N modifier adds correctly"
else
    fail "DdD+N modifier adds correctly" "Output: $output, expected total: $expected"
fi

# TEST: DdD-N modifier (negative)
run_test
output=$("$ROLL_SCRIPT" "DdD-3")
expression=$(get_json_field "$output" "expression")
hope=$(get_json_field "$output" "hope")
fear=$(get_json_field "$output" "fear")
total=$(get_json_field "$output" "total")
modifier=$(get_json_field "$output" "modifier")
expected=$((hope + fear - 3))
if [ "$expression" = "DdD-3" ] && \
   [ "$modifier" = "-3" ] && \
   [ "$total" -eq "$expected" ]; then
    pass "DdD-N modifier subtracts correctly"
else
    fail "DdD-N modifier subtracts correctly" "Output: $output, expected total: $expected"
fi

# TEST: DdD rolls array contains exactly 2 values
run_test
output=$("$ROLL_SCRIPT" "DdD")
rolls=$(get_json_array "$output" "rolls")
# Count commas in array to determine element count
comma_count=$(echo "$rolls" | tr -cd ',' | wc -c)
if [ "$comma_count" -eq 1 ]; then
    pass "DdD rolls array contains exactly 2 values"
else
    fail "DdD rolls array contains exactly 2 values" "Rolls: $rolls"
fi

# TEST: Critical detection (doubles)
# We can't guarantee doubles, but we can verify the logic is correct
run_test
# Run many times to try to get a critical (statistically likely in 50 attempts)
critical_found=0
for i in {1..50}; do
    output=$("$ROLL_SCRIPT" "DdD")
    hope=$(get_json_field "$output" "hope")
    fear=$(get_json_field "$output" "fear")
    higher=$(get_json_field "$output" "higher")

    if [ "$hope" -eq "$fear" ]; then
        if [ "$higher" = "critical" ]; then
            critical_found=1
            break
        else
            fail "Critical detection (doubles)" "Hope=$hope, Fear=$fear but higher=$higher (expected 'critical')"
            critical_found=-1
            break
        fi
    fi
done
if [ "$critical_found" -eq 1 ]; then
    pass "Critical detection (doubles result in 'critical')"
elif [ "$critical_found" -eq 0 ]; then
    # Didn't find a critical in 50 attempts, but logic might still be correct
    # Let's verify hope > fear and fear > hope cases instead
    echo -e "${YELLOW}SKIP${NC}: Critical detection - no doubles occurred in 50 attempts (statistically rare but possible)"
    ((TESTS_RUN--))  # Don't count as failed
fi

# TEST: Hope/fear detection (higher die wins)
run_test
all_correct=1
for i in {1..20}; do
    output=$("$ROLL_SCRIPT" "DdD")
    hope=$(get_json_field "$output" "hope")
    fear=$(get_json_field "$output" "fear")
    higher=$(get_json_field "$output" "higher")

    if [ "$hope" -gt "$fear" ] && [ "$higher" != "hope" ]; then
        all_correct=0
        fail "Hope/fear detection" "Hope ($hope) > Fear ($fear) but higher=$higher"
        break
    elif [ "$fear" -gt "$hope" ] && [ "$higher" != "fear" ]; then
        all_correct=0
        fail "Hope/fear detection" "Fear ($fear) > Hope ($hope) but higher=$higher"
        break
    elif [ "$hope" -eq "$fear" ] && [ "$higher" != "critical" ]; then
        all_correct=0
        fail "Hope/fear detection" "Hope = Fear = $hope but higher=$higher"
        break
    fi
done
if [ "$all_correct" -eq 1 ]; then
    pass "Hope/fear detection (higher die wins, ties are critical)"
fi

# TEST: Error case DdD+abc (invalid modifier)
run_test
output=$("$ROLL_SCRIPT" "DdD+abc" 2>&1) || true
if echo "$output" | grep -q '"error"'; then
    pass "Error case DdD+abc returns error JSON"
else
    fail "Error case DdD+abc returns error JSON" "Output: $output"
fi

# TEST: Error case DdD+xyz (invalid modifier variation)
run_test
output=$("$ROLL_SCRIPT" "DdD+xyz" 2>&1) || true
if echo "$output" | grep -qi 'invalid\|error'; then
    pass "Error case DdD+xyz returns error"
else
    fail "Error case DdD+xyz returns error" "Output: $output"
fi

echo ""
echo "--- Backward Compatibility Tests ---"
echo ""

# TEST: 1d20 standard roll
run_test
output=$("$ROLL_SCRIPT" "1d20")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
rolls=$(get_json_array "$output" "rolls")
if [ "$expression" = "1d20" ] && \
   in_range "$total" 1 20 && \
   [ -n "$rolls" ]; then
    pass "1d20 standard roll works"
else
    fail "1d20 standard roll works" "Output: $output"
fi

# TEST: d20 (implicit 1d20)
run_test
output=$("$ROLL_SCRIPT" "d20")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
if [ "$expression" = "d20" ] && in_range "$total" 1 20; then
    pass "d20 (implicit 1) works"
else
    fail "d20 (implicit 1) works" "Output: $output"
fi

# TEST: 2d6+3 with modifier
run_test
output=$("$ROLL_SCRIPT" "2d6+3")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
modifier=$(get_json_field "$output" "modifier")
rolls=$(get_json_array "$output" "rolls")
# Total should be between 2+3=5 and 12+3=15
if [ "$expression" = "2d6+3" ] && \
   [ "$modifier" = "3" ] && \
   in_range "$total" 5 15 && \
   [ -n "$rolls" ]; then
    pass "2d6+3 with modifier works"
else
    fail "2d6+3 with modifier works" "Output: $output"
fi

# TEST: 2d6-2 with negative modifier
run_test
output=$("$ROLL_SCRIPT" "2d6-2")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
modifier=$(get_json_field "$output" "modifier")
# Total should be between 2-2=0 and 12-2=10
if [ "$expression" = "2d6-2" ] && \
   [ "$modifier" = "-2" ] && \
   in_range "$total" 0 10; then
    pass "2d6-2 with negative modifier works"
else
    fail "2d6-2 with negative modifier works" "Output: $output"
fi

# TEST: dF (Fudge dice)
run_test
output=$("$ROLL_SCRIPT" "dF")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
if [ "$expression" = "dF" ] && in_range "$total" -1 1; then
    pass "dF (Fudge dice) works"
else
    fail "dF (Fudge dice) works" "Output: $output"
fi

# TEST: 4dF (multiple Fudge dice)
run_test
output=$("$ROLL_SCRIPT" "4dF")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
# 4dF total should be between -4 and 4
if [ "$expression" = "4dF" ] && in_range "$total" -4 4; then
    pass "4dF (multiple Fudge dice) works"
else
    fail "4dF (multiple Fudge dice) works" "Output: $output"
fi

# TEST: d4, d6, d8, d10, d12, d100 all work
run_test
all_dice_work=1
for die in 4 6 8 10 12 100; do
    output=$("$ROLL_SCRIPT" "d$die")
    total=$(get_json_field "$output" "total")
    if ! in_range "$total" 1 "$die"; then
        all_dice_work=0
        fail "All standard dice types work" "d$die returned $total (expected 1-$die)"
        break
    fi
done
if [ "$all_dice_work" -eq 1 ]; then
    pass "All standard dice types (d4, d6, d8, d10, d12, d100) work"
fi

# TEST: Multiple dice (3d6)
run_test
output=$("$ROLL_SCRIPT" "3d6")
expression=$(get_json_field "$output" "expression")
total=$(get_json_field "$output" "total")
rolls=$(get_json_array "$output" "rolls")
# Count elements in rolls array
comma_count=$(echo "$rolls" | tr -cd ',' | wc -c)
element_count=$((comma_count + 1))
if [ "$expression" = "3d6" ] && \
   in_range "$total" 3 18 && \
   [ "$element_count" -eq 3 ]; then
    pass "Multiple dice (3d6) works with correct roll count"
else
    fail "Multiple dice (3d6) works" "Output: $output, element_count: $element_count"
fi

# TEST: No dice expression provided
run_test
output=$("$ROLL_SCRIPT" 2>&1) || true
if echo "$output" | grep -q '"error"'; then
    pass "No input returns error JSON"
else
    fail "No input returns error JSON" "Output: $output"
fi

# TEST: Invalid expression
run_test
output=$("$ROLL_SCRIPT" "invalid" 2>&1) || true
if echo "$output" | grep -q '"error"'; then
    pass "Invalid expression returns error JSON"
else
    fail "Invalid expression returns error JSON" "Output: $output"
fi

# TEST: DdD does NOT have standard dice fields that don't apply
run_test
output=$("$ROLL_SCRIPT" "DdD")
# Check that output has DdD-specific fields
if echo "$output" | grep -q '"hope"' && \
   echo "$output" | grep -q '"fear"' && \
   echo "$output" | grep -q '"higher"'; then
    pass "DdD output has DdD-specific fields (hope, fear, higher)"
else
    fail "DdD output has DdD-specific fields" "Output: $output"
fi

# TEST: Standard dice do NOT have DdD-specific fields
run_test
output=$("$ROLL_SCRIPT" "1d20")
if ! echo "$output" | grep -q '"hope"' && \
   ! echo "$output" | grep -q '"fear"' && \
   ! echo "$output" | grep -q '"higher"'; then
    pass "Standard dice output does NOT have DdD-specific fields"
else
    fail "Standard dice output does NOT have DdD-specific fields" "Output: $output"
fi

echo ""
echo "=============================================="
echo "  Test Results"
echo "=============================================="
echo ""
echo -e "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
