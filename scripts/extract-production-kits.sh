#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$root_dir/production-assets/source"

extract_cell() {
  local source="$1" geometry="$2" output="$3" padding="${4:-24}"
  local temporary="${output%.webp}.extract.webp"
  mkdir -p "$(dirname "$output")"
  rm -f "$temporary"
  convert "$source" -crop "$geometry" +repage -trim +repage \
    -bordercolor none -border "$padding" -quality 90 -define webp:method=6 "$temporary"
  if [[ ! -s "$temporary" ]]; then
    rm -f "$temporary"
    convert "$source" -crop "$geometry" +repage -trim +repage \
      -bordercolor none -border "$padding" -quality 90 "$temporary"
  fi
  [[ -s "$temporary" ]]
  identify "$temporary" >/dev/null
  mv "$temporary" "$output"
}

# KIT 01 — the complete canonical base master. The remaining module cells stay
# in the source sheet for later mutation attachment authoring.
extract_cell "$source_dir/creature-base-modular-kit-01.png" 620x630+0+0 \
  "$root_dir/public/assets/creature/creature-base.webp" 32

# KIT 02 — ruins and battlefield props.
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 610x590+0+0 "$root_dir/public/assets/environment/arena-ruined-arch-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 410x590+505+0 "$root_dir/public/assets/environment/arena-broken-arch-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 340x590+900+0 "$root_dir/public/assets/environment/arena-ruin-pillar-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 310x590+1226+0 "$root_dir/public/assets/environment/arena-broken-pillar-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 470x434+0+590 "$root_dir/public/assets/environment/arena-collapsed-wall-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 390x434+430+590 "$root_dir/public/assets/environment/arena-rock-formation-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 390x434+790+590 "$root_dir/public/assets/environment/arena-rubble-cluster-01.webp"
extract_cell "$source_dir/arena-ruins-colossus-kit-01.png" 390x434+1146+590 "$root_dir/public/assets/environment/arena-altar-fragment-01.webp"

# KIT 03 — four crystal scales and four corruption assets.
crystal_names=(crystal-small-01 crystal-medium-01 crystal-large-01 crystal-corrupted-01 corruption-root-01 corruption-stone-01 corruption-ruin-01 crystal-shards-01)
for index in "${!crystal_names[@]}"; do
  col=$((index % 4)); row=$((index / 4))
  if [[ "$row" -eq 0 ]]; then geometry="444x470+$((col * 444))+0"; else geometry="444x397+$((col * 444))+490"; fi
  extract_cell "$source_dir/arena-crystal-corruption-kit-01.png" "$geometry" \
    "$root_dir/public/assets/environment/arena-${crystal_names[$index]}.webp" 20
done

# KIT 04 — arena-floor decals.
ground_names=(crack-01 impact-crack-01 fissure-orange-01 fissure-dormant-01 scorch-01 corruption-patch-01 rubble-debris-01 crystal-fragments-01)
for index in "${!ground_names[@]}"; do
  col=$((index % 4)); row=$((index / 4))
  extract_cell "$source_dir/arena-ground-details-kit-01.png" "444x444+$((col * 444))+$((row * 443))" \
    "$root_dir/public/assets/ground/ground-${ground_names[$index]}.webp" 18
done

# KIT 05 — runtime chooses one representative per rarity; the A/B variants
# remain available as authored alternates.
loot_names=(common-a common-b rare-a rare-b epic-a epic-b)
for index in "${!loot_names[@]}"; do
  col=$((index % 3)); row=$((index / 3))
  extract_cell "$source_dir/loot-kit-01.png" "512x512+$((col * 512))+$((row * 512))" \
    "$root_dir/public/assets/loot/loot-${loot_names[$index]}.webp" 22
done
resize_webp() {
  local file="$1" dimensions="$2"
  local temporary="${file%.webp}.resize.webp"
  rm -f "$temporary"
  convert "$file" -resize "$dimensions" -quality 90 -define webp:method=6 "$temporary"
  if [[ ! -s "$temporary" ]]; then
    convert "$file" -resize "$dimensions" -quality 90 "$temporary"
  fi
  identify "$temporary" >/dev/null
  mv "$temporary" "$file"
}
for name in common-a common-b; do resize_webp "$root_dir/public/assets/loot/loot-$name.webp" '192x192>'; done
for name in rare-a rare-b; do resize_webp "$root_dir/public/assets/loot/loot-$name.webp" '256x256>'; done
for name in epic-a epic-b; do resize_webp "$root_dir/public/assets/loot/loot-$name.webp" '320x320>'; done

# KIT 06 — VFX source sprites; code remains responsible for motion/lifetime.
vfx_names=(projectile-normal projectile-power impact-small impact-large shockwave crack-impact corruption pickup)
for index in "${!vfx_names[@]}"; do
  col=$((index % 4)); row=$((index / 4))
  extract_cell "$source_dir/combat-vfx-kit-01.png" "444x444+$((col * 444))+$((row * 443))" \
    "$root_dir/public/assets/vfx/vfx-${vfx_names[$index]}.webp" 18
done

# KIT 07 — fixed equal canvases preserve state alignment. Narrow cleared
# gutters remove cross-cell glow while keeping the boss anchor unchanged.
extract_boss_state() {
  local geometry="$1" output="$2" edge="$3"
  local temporary="${output%.webp}.extract.webp"
  rm -f "$temporary"
  convert "$source_dir/harvest-colossus-states-kit-01.png" -crop "$geometry" +repage \
    -alpha set -region "$edge" -channel alpha -evaluate set 0 +channel +region \
    -gravity northwest -background none -extent 665x592 \
    -bordercolor none -border 26 -quality 90 "$temporary"
  [[ -s "$temporary" ]]
  identify "$temporary" >/dev/null
  mv "$temporary" "$output"
}
extract_boss_state 665x592+0+0 "$root_dir/public/assets/boss/harvest-colossus-base.webp" '1x1+0+0'
extract_boss_state 665x592+665+0 "$root_dir/public/assets/boss/harvest-colossus-break1.webp" '16x592+0+0'
extract_boss_state 665x591+0+592 "$root_dir/public/assets/boss/harvest-colossus-break2.webp" '1x1+0+0'
extract_boss_state 665x591+665+592 "$root_dir/public/assets/boss/harvest-colossus-core.webp" '1x1+0+0'

# Standalone hero companion.
extract_cell "$source_dir/ember-wisp-master.png" '1312x1199+0+0' \
  "$root_dir/public/assets/pet/ember-wisp.webp" 28
resize_webp "$root_dir/public/assets/pet/ember-wisp.webp" '384x384>'

# ImageMagick 6's WebP delegate can leave zero-byte staging names after the
# encoded file has been atomically promoted. They are never runtime assets.
find "$root_dir/public/assets" -type f \
  \( -name '*.extract.webp' -o -name '*.resize.webp' \) -delete

echo "Production kit extraction complete."
