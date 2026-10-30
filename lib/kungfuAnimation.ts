import * as THREE from "three";
import type { KungfuMotion } from "./kungfuSpec";

type MotionLibrary = {
  sourceHipHeight: number;
  clips: Parameters<typeof THREE.AnimationClip.parse>[0][];
};

/** 保留目标骨骼长度，仅将动画髋部位移缩放到人物比例。 */
export function prepareKungfuClips(json: string, hipHeight: number, extraJson?: string, clipNames: Partial<Record<KungfuMotion, string>> = {}): THREE.AnimationClip[] {
  const library = JSON.parse(json) as MotionLibrary;
  const extra = extraJson ? JSON.parse(extraJson) as MotionLibrary : undefined;
  return library.clips.map((data) => {
    const override = clipNames[data.name as KungfuMotion];
    const source = override ? extra?.clips.find((item) => item.name === override) : data;
    if (!source) throw new Error(`缺少角色动作：${override}`);
    const clip = THREE.AnimationClip.parse(source);
    clip.name = data.name;
    const scale = hipHeight / (override && extra ? extra.sourceHipHeight : library.sourceHipHeight);
    for (const track of clip.tracks) {
      if (track.name !== "Hips.position") continue;
      for (let index = 0; index < track.values.length; index += 1) {
        track.values[index] *= scale;
      }
    }
    return clip;
  });
}
