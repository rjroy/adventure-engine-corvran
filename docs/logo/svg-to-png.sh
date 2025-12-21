#!/bin/bash
# Convert SVG to PNG badge with rounded corners and border
# Usage: ./svg-to-png.sh input.svg [output.png] [size]

set -e

INPUT="$1"
OUTPUT="${2:-${INPUT%.svg}.png}"
SIZE="${3:-1024}"
BORDER_WIDTH=$((SIZE / 40))      # 2.5% of size
CORNER_RADIUS=$((SIZE / 8))      # 12.5% of size
BORDER_COLOR="#10101e"           # Dark color matching raven

if [[ -z "$INPUT" || ! -f "$INPUT" ]]; then
    echo "Usage: $0 input.svg [output.png] [size]"
    echo "  size: width in pixels (default: 1024)"
    exit 1
fi

echo "Converting $INPUT -> $OUTPUT (${SIZE}px badge)"

# Convert SVG to PNG at specified size
rsvg-convert -w "$SIZE" -h "$SIZE" "$INPUT" -o "/tmp/svg-badge-source.png"

# Create rounded rectangle mask
magick -size "${SIZE}x${SIZE}" xc:none \
    -fill white \
    -draw "roundrectangle 0,0,$((SIZE-1)),$((SIZE-1)),$CORNER_RADIUS,$CORNER_RADIUS" \
    "/tmp/svg-badge-mask.png"

# Apply mask to source image (rounded corners with transparency)
magick "/tmp/svg-badge-source.png" -alpha set "/tmp/svg-badge-mask.png" \
    -compose DstIn -composite \
    -background none \
    "/tmp/svg-badge-masked.png"

# Create border by drawing a stroked rounded rectangle
magick "/tmp/svg-badge-masked.png" \
    -background none \
    -fill none \
    -stroke "$BORDER_COLOR" \
    -strokewidth "$BORDER_WIDTH" \
    -draw "roundrectangle $((BORDER_WIDTH/2)),$((BORDER_WIDTH/2)),$((SIZE-1-BORDER_WIDTH/2)),$((SIZE-1-BORDER_WIDTH/2)),$CORNER_RADIUS,$CORNER_RADIUS" \
    "$OUTPUT"

rm -f /tmp/svg-badge-source.png /tmp/svg-badge-mask.png /tmp/svg-badge-masked.png

echo "Done: $OUTPUT"
