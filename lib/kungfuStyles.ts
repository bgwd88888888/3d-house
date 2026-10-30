import { KUNGFU_ACTIONS, KUNGFU_COMBOS, type KungfuAction, type KungfuMotion } from "./kungfuSpec";
import type { SparringAttack } from "./kungfuSparring";

type ActionDescription = { label: string; english: string; hint: string };
type StyleOptions = {
  label: string;
  clips?: Partial<Record<KungfuMotion, string>>;
  actions?: Partial<Record<KungfuAction, ActionDescription>>;
  attacks?: Partial<Record<KungfuAction, SparringAttack>>;
  combos?: readonly { label: string; actions: readonly KungfuAction[] }[];
  groundHands?: boolean;
};

function createStyle(options: StyleOptions) {
  const actions = KUNGFU_ACTIONS.map((action) => ({ ...action, ...options.actions?.[action.id] }));
  return {
    label: options.label, clips: options.clips ?? {}, actions,
    actionLabels: Object.fromEntries(actions.map((action) => [action.id, action.label])) as Record<KungfuAction, string>,
    attacks: options.attacks ?? {}, combos: options.combos ?? KUNGFU_COMBOS,
    groundHands: options.groundHands ?? false,
  };
}

export type KungfuStyle = ReturnType<typeof createStyle>;

export const KUNGFU_STYLES = {
  boxing: createStyle({ label: "拳击" }),
  mai: createStyle({
    label: "灵动腿法",
    clips: { kick: "highKick", roundhouse: "fastRoundhouse" },
    actions: {
      kick: { label: "高踢", english: "HIGH KICK", hint: "提膝 · 开髋 · 高位出腿" },
      roundhouse: { label: "疾旋踢", english: "SPIN KICK", hint: "转髋摆腿 · 快速收势" },
    },
    attacks: {
      jab: { bone: "LeftHand", kind: "block", start: 0.16, peak: 0.3, end: 0.44, advance: 0.27, radius: 0.13 },
      kick: { bone: "RightFoot", kind: "hit", start: 0.22, peak: 0.367, end: 0.53, advance: 0.43, radius: 0.14 },
      roundhouse: { bone: "RightFoot", kind: "hit", start: 0.3, peak: 0.45, end: 0.6, advance: 0.5, radius: 0.14 },
    },
    combos: [{ label: "拳腿交织", actions: ["jab", "kick", "hook"] }, { label: "双腿连击", actions: ["kick", "roundhouse"] }, { label: "守后旋踢", actions: ["block", "jab", "roundhouse"] }],
  }),
  kungfu: createStyle({
    label: "近身功夫",
    clips: { kick: "snapKick", jab: "cross", hook: "elbow" },
    actions: {
      kick: { label: "弹腿", english: "SNAP KICK", hint: "前脚提膝 · 弹腿回收" },
      jab: { label: "冲拳", english: "CROSS", hint: "转腰进身 · 后手冲拳" },
      hook: { label: "顶肘", english: "ELBOW", hint: "贴身进步 · 横肘出击" },
    },
    attacks: {
      kick: { bone: "LeftFoot", kind: "hit", start: 0.45, peak: 0.66, end: 0.83, advance: 0.42, radius: 0.14 },
      jab: { bone: "RightHand", kind: "block", start: 0.4, peak: 0.567, end: 0.7, advance: 0.4, radius: 0.13 },
      hook: { bone: "RightForeArm", kind: "hit", start: 0.22, peak: 0.385, end: 0.6, advance: 0.78, radius: 0.14 },
    },
    combos: [{ label: "拳肘连环", actions: ["jab", "hook", "uppercut"] }, { label: "弹腿冲拳", actions: ["kick", "jab", "hook"] }, { label: "守中反击", actions: ["block", "jab", "kick"] }],
  }),
  ninja: createStyle({
    label: "忍者踢技",
    clips: { idle: "ninjaIdle", kick: "sideKick", jab: "quickJab", hook: "leadHook", roundhouse: "backKick" },
    actions: {
      kick: { label: "侧踹", english: "SIDE KICK", hint: "侧身蓄力 · 足跟蹬出" },
      jab: { label: "快刺拳", english: "QUICK JAB", hint: "短促出拳 · 迅速回防" },
      hook: { label: "前手勾", english: "LEAD HOOK", hint: "前手弧线 · 转肩勾击" },
      roundhouse: { label: "转身后踢", english: "BACK KICK", hint: "回身找位 · 后脚蹬击" },
    },
    attacks: {
      kick: { bone: "RightFoot", kind: "hit", start: 0.23, peak: 0.4, end: 0.6, advance: 0.35, radius: 0.14 },
      jab: { bone: "LeftHand", kind: "block", start: 0.35, peak: 0.55, end: 0.7, advance: 0.35, radius: 0.13 },
      hook: { bone: "LeftHand", kind: "block", start: 0.25, peak: 0.45, end: 0.64, advance: 0.32, radius: 0.14 },
      roundhouse: { bone: "RightFoot", kind: "hit", start: 0.4, peak: 0.55, end: 0.7, advance: 0.5, radius: 0.14 },
    },
    combos: [{ label: "快拳侧踹", actions: ["jab", "hook", "kick"] }, { label: "回身追击", actions: ["kick", "roundhouse"] }, { label: "隐守突击", actions: ["block", "jab", "roundhouse"] }],
  }),
  capoeira: createStyle({
    label: "卡波耶拉",
    clips: { idle: "capoeiraIdle", kick: "doubleKick", roundhouse: "capoeiraSweep" },
    groundHands: true,
    actions: {
      kick: { label: "连环踢", english: "DOUBLE KICK", hint: "交替提膝 · 双腿衔接" },
      roundhouse: { label: "旋身摆踢", english: "CAPOEIRA", hint: "低身转体 · 摆腿回势" },
    },
    attacks: {
      kick: { bone: "LeftFoot", kind: "hit", start: 0.2, peak: 0.288, end: 0.47, advance: 0.4, radius: 0.14 },
      roundhouse: { bone: "RightFoot", kind: "hit", start: 0.25, peak: 0.5, end: 0.7, advance: 0.5, radius: 0.14 },
    },
    combos: [{ label: "节奏连踢", actions: ["kick", "roundhouse"] }, { label: "拳腿流转", actions: ["jab", "hook", "roundhouse"] }, { label: "守后双踢", actions: ["block", "kick", "roundhouse"] }],
  }),
} satisfies Record<string, KungfuStyle>;
