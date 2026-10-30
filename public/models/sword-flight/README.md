# Sword-flight models

The scenery assets below are **CC0 1.0**, published by [Poly Haven](https://polyhaven.com/license).
Downloaded 2026-10-20. Runtime files are self-hosted; no third-party requests are required.

| File | Source | Runtime geometry | Preparation |
| --- | --- | --- | --- |
| `pine.glb` | [Pine Sapling Small](https://polyhaven.com/a/pine_sapling_small) | 21,036 triangles, 2 material primitives | Keep variant `pine_sapling_small_a`; reduce from 142,506 triangles by preserving all 9,018 needles as two-triangle cards and simplifying branches to 3,000 triangles; center and normalize to 6.2 m; combine the official twig alpha mask with diffuse; preserve MASK foliage; embed 1K WebP maps. |
| `moss-rock.glb` | [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) | 3,000 triangles, 1 material primitive | Keep `rock_moss_set_01_rock01`; simplify, center and normalize to 2.8 m maximum horizontal width; embed 1K WebP maps. |

Preparation helpers:

- `scripts/prepare-sword-flight-models.py`: Blender import, selected-variant simplification, normalization, GLB export.
- `scripts/pack-flight-model-textures.mjs`: repack embedded textures using `EXT_texture_webp`, supported by the project's GLTFLoader. No mesh-compression decoder is needed.

The preparation script expects the official 1K glTF and relative buffer/texture dependencies under a source directory. The pine input `pine-with-alpha.gltf` differs only in the twig diffuse image: its RGB comes from `pine_sapling_small_twig_diff_1k.jpg`, and its alpha comes from `pine_sapling_small_twig_alpha_1k.png`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/prepare-sword-flight-models.py -- /path/to/source public/models/sword-flight
node scripts/pack-flight-model-textures.mjs public/models/sword-flight/pine.glb public/models/sword-flight/moss-rock.glb
```

Clones share mesh buffers, images and materials. These decorative props do not change the terrain/roof collision contract.

## Flight fairy

`fairy-rider.glb` is adapted from VRoid's **HairSample_Female**, listed as CC0 in
[the official sample-model license notice](https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use).
The source VRM also declares `licenseName: CC0`. The source was obtained on
2026-10-29 from [this mirror](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/HairSample_Female.vrm).
This license applies to this specific sample, not to every VRoid model.

The derivative keeps the authored face, visible body, UVs, garment folds and skin weights. Hidden thigh geometry under the long skirt is omitted.
It removes the animal ears, lengthens the hair and skirt, adds an open jade overskirt,
small hair ornaments and two skinned silk ribbons, and retains only the blink morph.
The embedded WebP asset is about 1.43 MiB with 27,764 triangles. There is no VRM
runtime dependency, remote model request or per-frame cloth simulation.

`flightRiderPose.ts` calculates leg placement, joint poses, breathing, blinking and
mode transitions. `flightFairyRig.ts` applies those poses to the skeleton. The source
skeleton uses meters; the scene scales the avatar by 1.35. The original shared
model buffers remain immutable, while each player owns a skeleton and materials.

Rebuild with the original source VRM:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/prepare-flight-rider.py -- /path/to/HairSample_Female.vrm public/models/sword-flight/fairy-rider.glb
node scripts/pack-flight-model-textures.mjs public/models/sword-flight/fairy-rider.glb
```
