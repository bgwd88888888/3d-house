# Kungfu motions

The male character reuses `../realistic-characters/man-avatarsdk.glb`; see that folder's attribution.

`mai-shiranui.glb` replaces the female fighter with Mai Shiranui's classic red/white costume and ponytail. Source: [Arhoangel's Mai Shiranui](https://smutba.se/project/31631/), Blender port uploaded by GamePlayerFR, file `DOA_-_Mai_Shiranui.blend` (2021-06-18). Character rights belong to their original owners. The source uploader lists CC BY-NC-ND 4.0; this local conversion does not grant permission to publish or redistribute an adapted model.

Only the classic outfit is included. Alternate costumes, source poses, morph controls and the source control rig are excluded. The mesh weights and rest pose are adapted to the existing kungfu skeleton; `MaiSash` anchors the simulated rear sash to the waist. Runtime assets are local. To regenerate from a separately obtained source file, run Blender with `-b -Y --python scripts/prepare-kungfu-mai.py -- /path/to/DOA_-_Mai_Shiranui.blend`.

The front skirt uses a pinned waistband, gravity, damped motion, and edge/face contact constraints. Bone colliders run in substeps of at most 1/120 animation seconds; a hidden, skinned `MaiBodyCollider` surface corrects contacts before rendering. This collision proxy is generated from the body at 8% of its original faces, with a 2.8 cm cloth clearance. Each character instance owns and disposes its simulated geometry; the cached GLB geometry is never modified.

The rear sash starts hanging and uses a flexible 21-node chain with gravity, inertia, and damped bending. Its decorative ball retains its rigid shape while the ribbon and tassel bend around the shared body colliders. Segment interiors, fabric edges, and the ground also receive contact checks. Both accessories share one collision surface update per rendered frame, including at double playback speed.

`motions.json` contains skeletal animation tracks converted from Mixamo FBX files distributed in [Linzhan/Mixamo-Animations-Characters](https://huggingface.co/datasets/Linzhan/Mixamo-Animations-Characters/tree/main/animation).
Original animation service: [Adobe Mixamo](https://www.mixamo.com/). The source collection does not grant a new license; original asset terms apply.

| Clip | Source FBX |
| --- | --- |
| idle | Fight_Idle.fbx |
| kick | Mma_Kick.fbx |
| block | Standing_Block.fbx |
| jab | Lead_Jab.fbx |
| hook | Hook_Punch.fbx |
| uppercut | Uppercut.fbx |
| roundhouse | Roundhouse_Kick_2.fbx |

Converted with the installed Three.js FBXLoader and AnimationClip.toJSON. Kept quaternion tracks and hip translation, removed `mixamorig` name prefixes, converted centimeters to meters, and removed the initial horizontal hip offset. The source rest hip height is 0.997919 m. Playback scales hip displacement to the target rig while retaining target bone lengths. No remote asset request is needed at runtime.

## Additional fighters and styles

The additional characters come from Adobe Mixamo, obtained from the existing [Linzhan collection](https://huggingface.co/datasets/Linzhan/Mixamo-Animations-Characters/tree/main/character_refined_glb). Original [Mixamo terms](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) apply; the mirror does not grant a new license.

| Local model | Character source | Display name | Style |
| --- | --- | --- | --- |
| `akai.glb` | `Akai_E_Espiritu.glb` | 玄衣武者 | Close-range punches, elbow strikes and snap kicks |
| `ninja.glb` | `Ninja.glb` | 影武忍者 | Ninja stance, quick punches, side and spinning back kicks |
| `kachujin.glb` | `Kachujin_G_Rosales.glb` | 赤衣女侠 | Capoeira stance, double kicks and a spinning kick |

Run `blender -b -Y --python scripts/prepare-kungfu-characters.py -- SOURCE_DIRECTORY` with those three source GLBs. The conversion bakes the source root rotation/scale into the rig and meshes, removes bone namespaces, normalizes height to 1.70–1.74 m, and caps textures at 2048 px. Then run `node scripts/pack-flight-model-textures.mjs public/models/kungfu/akai.glb public/models/kungfu/ninja.glb public/models/kungfu/kachujin.glb` to reuse the existing embedded WebP packer. Mesh buffers, skin weights, and UVs are retained. The three runtime models total approximately 5.6 MB.

`extra-motions.json` supplies shared animation overrides. Each fighter's motion mapping, labels, combos, contact windows and approach distances are defined in `lib/kungfuStyles.ts`. The original male moves remain available; Mai uses separate high and fast roundhouse kicks. Both fighter selections reset the queue and isolate stale loading callbacks.

| Extra clip | Source FBX |
| --- | --- |
| highKick | Mma_Kick_2.fbx |
| fastRoundhouse | Mma_Kick_4.fbx |
| cross | Cross_Punch.fbx |
| elbow | Elbow_Punch.fbx |
| snapKick | Kicking_8.fbx |
| sideKick | Side_Kick.fbx |
| backKick | Kicking_2.fbx |
| quickJab | Punching_3.fbx |
| leadHook | Punching_4.fbx |
| ninjaIdle | Ninja_Idle_2.fbx |
| capoeiraIdle | Capoeira.fbx |
| doubleKick | Kicking_3.fbx |
| capoeiraSweep | Capoeira_2.fbx, frames 120–209 at 30 fps |

These FBXs are from the same collection's `animation/` directory. Regenerate with `node scripts/prepare-kungfu-motions.mjs SOURCE_DIRECTORY`. Additional moves keep hip height but remove horizontal root travel; approach and return are controlled by each move's profile. Every clip has a deterministic, distinct UUID so the animation mixer cannot alias different moves. Capoeira grounding includes the hands for low poses. No new remote dependency or model request is required at runtime.
