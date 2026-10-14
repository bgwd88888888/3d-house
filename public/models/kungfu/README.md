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
