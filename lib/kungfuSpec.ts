export const KUNGFU_ACTIONS = [
  { id: "kick", label: "踢腿", english: "KICK", key: "1", hint: "提膝 · 送髋 · 出腿" },
  { id: "block", label: "防守", english: "GUARD", key: "2", hint: "收颌 · 护头 · 格挡" },
  { id: "jab", label: "直拳", english: "STRAIGHT", key: "3", hint: "前手出击 · 快速回收" },
  { id: "hook", label: "勾拳", english: "HOOK", key: "4", hint: "转髋 · 平勾 · 回防" },
  { id: "uppercut", label: "上勾拳", english: "UPPERCUT", key: "5", hint: "下潜蓄力 · 向上出拳" },
  { id: "roundhouse", label: "回旋踢", english: "ROUNDHOUSE", key: "6", hint: "转身 · 摆腿 · 收势" },
] as const;

export type KungfuAction = (typeof KUNGFU_ACTIONS)[number]["id"];
export type KungfuMotion = KungfuAction | "idle";
export type KungfuCommand = { motion: KungfuMotion; sequence: number; reset?: true };

export const KUNGFU_MODES = [
  { id: "solo", label: "单人演武" },
  { id: "sparring", label: "双人陪练" },
] as const;

export type KungfuMode = (typeof KUNGFU_MODES)[number]["id"];

export const KUNGFU_COMBOS = [
  { label: "拳腿连击", actions: ["jab", "hook", "kick"] },
  { label: "防守反击", actions: ["block", "jab", "uppercut"] },
  { label: "四式连打", actions: ["jab", "hook", "uppercut", "roundhouse"] },
] as const satisfies readonly { label: string; actions: readonly KungfuAction[] }[];

export const KUNGFU_MOTIONS_URL = "/models/kungfu/motions.json";
export const KUNGFU_SPEEDS = [0.5, 1, 1.5, 2] as const;
