export const KUNGFU_CHARACTERS = [
  { id: "male", label: "男角色", modelUrl: "/models/realistic-characters/man-avatarsdk.glb" },
  { id: "female", label: "不知火舞", modelUrl: "/models/kungfu/mai-shiranui.glb?v=cloth-1" },
] as const;

export type KungfuCharacterId = (typeof KUNGFU_CHARACTERS)[number]["id"];
