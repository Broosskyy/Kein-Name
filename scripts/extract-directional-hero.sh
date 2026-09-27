#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/assets/creature/directional"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
mkdir -p "$OUT"

xs=(0 314 627 941)
ys=(0 314 627 941)
ws=(314 313 314 313)
hs=(314 313 314 313)

extract_sheet() {
  local source="$1"; shift
  local names=("$@")
  local index=0
  for row in 0 1 2 3; do
    for col in 0 1 2 3; do
      local name="${names[$index]}"
      local staged_png="$TMP_DIR/creature-${name}.png"
      local destination="$OUT/creature-${name}.webp"
      local encoded_webp=""

      # Staging through PNG avoids an ImageMagick 6 edge case where a direct
      # crop-to-WebP conversion can exit successfully while creating 0 bytes.
      convert "$source" -crop "${ws[$col]}x${hs[$row]}+${xs[$col]}+${ys[$row]}" +repage \
        -trim +repage -bordercolor none -border 14 -gravity center -background none -extent 384x384 \
        "$staged_png"
      for attempt in 1 2 3; do
        encoded_webp="$(mktemp "$TMP_DIR/creature-${name}-${attempt}-XXXXXX.webp")"
        convert "$staged_png" -define webp:lossless=true "$encoded_webp"
        if test -s "$encoded_webp" \
          && test "$(identify -format '%wx%h' "$encoded_webp" 2>/dev/null)" = "384x384" \
          && test "$(identify -format '%[channels]' "$encoded_webp" 2>/dev/null)" = "srgba"; then
          mv "$encoded_webp" "$destination"
          encoded_webp=""
          break
        fi
        encoded_webp=""
      done

      test -s "$destination"
      test "$(identify -format '%wx%h:%[channels]' "$destination")" = "384x384:srgba"
      index=$((index + 1))
    done
  done
}

extract_sheet "$ROOT/production-assets/source/creature-directional-locomotion-kit-01.png" \
  n-idle n-run ne-idle ne-run e-idle e-run se-idle se-run s-idle s-run sw-idle sw-run w-idle w-run nw-idle nw-run
extract_sheet "$ROOT/production-assets/source/creature-directional-action-kit-01.png" \
  n-dash n-attack ne-dash ne-attack e-dash e-attack se-dash se-attack s-dash s-attack sw-dash sw-attack w-dash w-attack nw-dash nw-attack

echo "Extracted 32 directional hero assets to $OUT"
