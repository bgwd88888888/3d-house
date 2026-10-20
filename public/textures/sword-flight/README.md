# Sword-flight PBR and sky assets

PBR and HDR sources: [Poly Haven](https://polyhaven.com). License: [CC0 1.0](https://polyhaven.com/license).
Downloaded 2026-10-20. Files are hosted locally with the scene.

| Files | Source | Use |
| --- | --- | --- |
| `rock_face_03_*.webp` | [Rock Face 03](https://polyhaven.com/a/rock_face_03) | Cliff color, OpenGL normal and roughness |
| `rocky_terrain_02_*.webp` | [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) | Island ground color, OpenGL normal and roughness |
| `rough_linen_*.webp` | [Rough Linen](https://polyhaven.com/a/rough_linen) | Rider robe/sleeve color, OpenGL normal and roughness |
| `aerial_rocks_01_*.webp` | [Aerial Rocks 01](https://polyhaven.com/a/aerial_rocks_01) | Large-scale mountain rock color, OpenGL normal and roughness |
| `sky.hdr` | [Kloppenheim 06 (Pure Sky)](https://polyhaven.com/a/kloppenheim_06_puresky) | Sky background and static image-based lighting |

PBR maps are the official 1K JPEG maps converted to WebP at quality 85 (95 for normals), without displacement or mesh changes. Color maps use sRGB; normal and roughness maps use linear data. The HDR is the official 1K Radiance file, unchanged. Texture filtering is capped at 8x anisotropy.

`cloud-puff.webp` is the [default cloud sprite used by Drei's Cloud component](https://github.com/pmndrs/drei-assets/blob/9225a9f1fbd449d9411125c2f419b843d0308c9f/cloud.png),
stored locally as WebP at its original 256 px resolution. Its source is the
`pmndrs/drei-assets` repository, separate from the Poly Haven CC0 assets above;
that repository does not provide a separate CC0 declaration for the sprite.
`cloud-sea.webp` is locally generated seamless procedural noise.
Pack both with `node scripts/prepare-flight-clouds.mjs /path/to/drei-cloud.png`.
Neither runs volume/noise calculations while flying.
The scene batches 96 depth-sorted cloud billboards into one draw call, avoiding point-size
limits. Mountain variants share five geometries and one PBR texture set.

Pavilion wood, roofing and stone reuse the project's existing ambientCG Wood049,
RoofingTiles007 and Concrete033 maps. One 2048 px directional shadow map is baked after
the static scene loads (`BakeShadows`); the moving rider does not cast a frozen shadow.
No per-frame shadow rendering, volumetric cloud tracing or cloth solver was added.
The robe's small wind motion runs in its vertex shader.
