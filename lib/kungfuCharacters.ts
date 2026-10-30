export const KUNGFU_CHARACTERS = [
  { id: "male", label: "男路人", modelUrl: "/models/realistic-characters/man-avatarsdk.glb", style: "boxing" },
  { id: "female", label: "不知火舞", modelUrl: "/models/kungfu/mai-shiranui.glb?v=cloth-1", style: "mai" },
  { id: "akai", label: "玄衣武者", modelUrl: "/models/kungfu/akai.glb", style: "kungfu" },
  { id: "ninja", label: "影武忍者", modelUrl: "/models/kungfu/ninja.glb", style: "ninja" },
  { id: "kachujin", label: "赤衣女侠", modelUrl: "/models/kungfu/kachujin.glb", style: "capoeira" },
] as const;

export type KungfuCharacterId = (typeof KUNGFU_CHARACTERS)[number]["id"];
