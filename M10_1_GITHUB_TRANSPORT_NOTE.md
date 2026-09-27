# M10.1 GitHub transport note

The Hybrid 3D M10.1 architecture and visual-proof source are applied here.
The ChatGPT connector cannot stream the original binary directional-art archive directly into the repository in one operation, so the GitHub runtime temporarily uses the existing `creature.base` production image for the Hero billboard. The canonical local M10.1 package still contains all 32 directional Hero frames.
This fallback affects only Hero presentation, not 3D world coordinates, camera, terrain, collision, boss proxy, occlusion, telegraphs or loot.
