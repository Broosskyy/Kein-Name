#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_file="$root_dir/production-assets/source/harvest-arena-macro-terrain-kit-01.png"
output_dir="$root_dir/public/assets/terrain"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT
mkdir -p "$output_dir"

names=(
  harvest-stone-intact
  harvest-stone-fractured
  harvest-ring-segment
  harvest-approach
  harvest-boundary-wall
  harvest-crystal-corruption-transition
)

for index in "${!names[@]}"; do
  col=$((index % 3))
  row=$((index / 3))
  name="${names[$index]}"
  staged_png="$stage_dir/$name.png"
  destination="$output_dir/$name.webp"
  convert "$source_file" -crop "512x512+$((col * 512))+$((row * 512))" +repage \
    -trim +repage -bordercolor none -border 18 "$staged_png"

  encoded="$(mktemp "$stage_dir/$name-XXXXXX.webp")"
  convert "$staged_png" -quality 90 -define webp:method=6 "$encoded"
  test -s "$encoded"
  test "$(identify -format '%[channels]' "$encoded")" = "srgba"
  mv "$encoded" "$destination"
done

echo "Extracted ${#names[@]} M09.3 macro terrain assets to $output_dir"
