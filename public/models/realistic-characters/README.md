# Realistic Garden Characters

写实贴图人体 + Mixamo 步态。

| File | Source | Notes |
|------|--------|--------|
| `woman-avaturn.glb` | Avaturn via TalkingHead | 照片级女性；商用请核对 Avaturn 条款 |
| `woman-rpm.glb` | Ready Player Me via TalkingHead | CC BY-NC 4.0 |
| `man-avatarsdk.glb` | AvatarSDK via TalkingHead | 写实男性；商用请核对 AvatarSDK 条款 |
| `walking.fbx` | Mixamo via TalkingHead | Idle（首帧定格）/ Walk；厘米→米，去 `mixamorig` 前缀 |

骨骼为 Mixamo 兼容（`Hips` / `Spine`…）。勿用 three.js `Soldier.glb` 直接套动画——其髋骨绑定为 -90°，会导致角色趴地。
