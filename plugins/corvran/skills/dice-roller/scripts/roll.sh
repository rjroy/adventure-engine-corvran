#!/bin/bash
# Dice Roller Script
# Usage: roll.sh "2d6+3"
# Output: JSON with expression, individual rolls, modifier, and total

set -e

# Check for input
if [ -z "$1" ]; then
    echo '{"error": "No dice expression provided. Usage: roll.sh \"2d6+3\""}' >&2
    exit 1
fi

expression="$1"

# Parse the dice expression: NdX+M or NdX-M or NdX
# Supports: d4, d6, d8, d10, d12, d20, d100, dF (Fudge dice)
# Also supports: DdD (Duality Dice for Daggerheart - 2d12 with Hope/Fear semantics)

# Check for Duality Dice (DdD) notation first
if [[ "$expression" =~ ^DdD([+-][a-zA-Z0-9]+)?$ ]]; then
    modifier_str="${BASH_REMATCH[1]:-+0}"

    # Validate modifier is numeric
    if [[ "$modifier_str" =~ ^[+-][0-9]+$ ]]; then
        modifier="${modifier_str//+/}"
        modifier=$((modifier))
    elif [[ "$modifier_str" == "+0" ]]; then
        modifier=0
    else
        echo "{\"error\": \"Invalid DdD expression: $expression. Modifier must be numeric.\"}" >&2
        exit 1
    fi

    # Roll two d12s for Hope (first) and Fear (second)
    hope=$((RANDOM % 12 + 1))
    fear=$((RANDOM % 12 + 1))
    total=$((hope + fear + modifier))

    # Determine which die is higher (or critical if they match)
    if [ "$hope" -eq "$fear" ]; then
        higher="critical"
    elif [ "$hope" -gt "$fear" ]; then
        higher="hope"
    else
        higher="fear"
    fi

    # Output Duality Dice JSON
    echo "{\"expression\": \"$expression\", \"rolls\": [$hope, $fear], \"modifier\": $modifier, \"total\": $total, \"hope\": $hope, \"fear\": $fear, \"higher\": \"$higher\"}"
    exit 0
fi

# Extract components using regex for standard dice
if [[ "$expression" =~ ^([0-9]*)d([0-9]+|F)([+-][0-9]+)?$ ]]; then
    num_dice="${BASH_REMATCH[1]:-1}"  # Default to 1 if not specified
    die_type="${BASH_REMATCH[2]}"
    modifier_str="${BASH_REMATCH[3]:-+0}"

    # Parse modifier
    modifier="${modifier_str//+/}"  # Remove + sign
    modifier="${modifier:--0}"       # Default to 0
    modifier=$((modifier))           # Convert to integer
else
    echo "{\"error\": \"Invalid dice expression: $expression. Use format like 2d6+3\"}" >&2
    exit 1
fi

# Roll the dice
rolls=()
total=0

for ((i=0; i<num_dice; i++)); do
    if [ "$die_type" = "F" ]; then
        # Fudge dice: -1, 0, or +1
        roll=$((RANDOM % 3 - 1))
    else
        # Regular dice: 1 to die_type
        roll=$((RANDOM % die_type + 1))
    fi
    rolls+=($roll)
    total=$((total + roll))
done

# Add modifier to total
total=$((total + modifier))

# Build JSON output
rolls_json=$(printf '%s,' "${rolls[@]}")
rolls_json="[${rolls_json%,}]"  # Remove trailing comma, wrap in brackets

# Determine modifier for output (show 0 as 0, not omit it)
if [ $modifier -ge 0 ]; then
    modifier_display=$modifier
else
    modifier_display=$modifier
fi

echo "{\"expression\": \"$expression\", \"rolls\": $rolls_json, \"modifier\": $modifier_display, \"total\": $total}"
