/**
 * 建筑场景：西式小院 / 四进合院。天空、天气、草地共用。
 */
export const SCENE_KINDS = ["cottage", "courtyard"] as const;

export type SceneKind = (typeof SCENE_KINDS)[number];

export const SCENE_LABELS: Record<SceneKind, string> = {
  cottage: "西式小院",
  courtyard: "四进合院",
};

export const DEFAULT_SCENE: SceneKind = "courtyard";
