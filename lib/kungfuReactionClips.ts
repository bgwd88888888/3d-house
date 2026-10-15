import * as THREE from "three";

const REACTION_TIMES = [0, 0.08, 0.2, 0.36, 0.54, 0.78, 1.05];
const RECOIL_WEIGHTS = [0, 0.7, 1, 0.82, 0.55, 0.2, 0];
const LEFT_STEPS = [0, 0.35, 1, 0, 0, 0.65, 0];
const RIGHT_STEPS = [0, 0, 0.3, 1, 0, 0.25, 0];

function sampleTrack(track: THREE.KeyframeTrack, time: number) {
  const size = track.getValueSize();
  let index = 0;
  while (index < track.times.length - 2 && track.times[index + 1] < time) index++;
  const next = Math.min(index + 1, track.times.length - 1);
  const span = track.times[next] - track.times[index];
  const alpha = span > 0 ? THREE.MathUtils.clamp((time - track.times[index]) / span, 0, 1) : 0;
  const start = Array.from(track.values.slice(index * size, (index + 1) * size));
  const end = Array.from(track.values.slice(next * size, (next + 1) * size));
  if (track instanceof THREE.QuaternionKeyframeTrack) {
    return new THREE.Quaternion().fromArray(start).slerp(new THREE.Quaternion().fromArray(end), alpha).toArray();
  }
  return start.map((value, component) => THREE.MathUtils.lerp(value, end[component], alpha));
}

/** 从现有姿态生成护架、格挡震动和受击退步，不修改原动作或模型资源。 */
export function createKungfuReactionClips(clips: THREE.AnimationClip[]) {
  const idle = clips.find((clip) => clip.name === "idle");
  const block = clips.find((clip) => clip.name === "block");
  if (!idle || !block) throw new Error("陪练需要待机和防守动作");

  const guard = new THREE.AnimationClip("guard", 1, block.tracks.map((track) => {
    const pose = sampleTrack(track, 0.4);
    if (track.name === "Hips.position") { pose[0] = 0; pose[2] = 0; }
    const copy = track.clone();
    copy.times = new Float32Array([0, 1]);
    copy.values = new Float32Array([...pose, ...pose]);
    return copy;
  }));

  const reactions = (["deflect", "recoil"] as const).map((name) => {
    const isHit = name === "recoil";
    const source = isHit ? idle : guard;
    const duration = isHit ? 1.05 : 0.5;
    const tracks = source.tracks.map((track) => {
      const pose = sampleTrack(track, isHit ? 0.25 : 0);
      const values = REACTION_TIMES.flatMap((_, index) => {
        const weight = RECOIL_WEIGHTS[index];
        if (track.name === "Hips.position") {
          return [pose[0], pose[1] - weight * (isHit ? 0.035 : 0.01), pose[2] - weight * (isHit ? 0.3 : 0.055)];
        }
        if (!(track instanceof THREE.QuaternionKeyframeTrack)) return pose;
        let angle = 0;
        if (track.name === "Spine.quaternion") angle = -weight * (isHit ? 0.12 : 0.025);
        if (track.name === "Spine2.quaternion") angle = -weight * (isHit ? 0.15 : 0.04);
        if (isHit) {
          if (track.name === "LeftUpLeg.quaternion") angle = -LEFT_STEPS[index] * 0.22;
          if (track.name === "LeftLeg.quaternion") angle = LEFT_STEPS[index] * 0.36;
          if (track.name === "RightUpLeg.quaternion") angle = -RIGHT_STEPS[index] * 0.22;
          if (track.name === "RightLeg.quaternion") angle = RIGHT_STEPS[index] * 0.36;
        }
        return new THREE.Quaternion().fromArray(pose).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle)).toArray();
      });
      const copy = track.clone();
      copy.times = new Float32Array(REACTION_TIMES.map((time) => time / 1.05 * duration));
      copy.values = new Float32Array(values);
      return copy;
    });
    return new THREE.AnimationClip(name, duration, tracks);
  });
  return [guard, ...reactions];
}
