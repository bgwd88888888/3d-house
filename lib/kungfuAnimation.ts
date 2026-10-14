import * as THREE from "three";

type MotionLibrary = {
  sourceHipHeight: number;
  clips: Parameters<typeof THREE.AnimationClip.parse>[0][];
};

/** 保留目标骨骼长度，仅将动画髋部位移缩放到人物比例。 */
export function prepareKungfuClips(json: string, hipHeight: number): THREE.AnimationClip[] {
  const library = JSON.parse(json) as MotionLibrary;
  const scale = hipHeight / library.sourceHipHeight;
  return library.clips.map((data) => {
    const clip = THREE.AnimationClip.parse(data);
    for (const track of clip.tracks) {
      if (track.name !== "Hips.position") continue;
      for (let index = 0; index < track.values.length; index += 1) {
        track.values[index] *= scale;
      }
    }
    return clip;
  });
}
