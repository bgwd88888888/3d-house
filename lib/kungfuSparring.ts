import * as THREE from "three";
import type { KungfuAction, KungfuMotion } from "./kungfuSpec";

export type KungfuImpactKind = "block" | "hit";
export type KungfuImpact = { sequence: number; kind: KungfuImpactKind | "miss" };
export type KungfuFighterMotion = KungfuMotion | "guard" | "deflect" | "recoil";

export type SparringAttack = {
  bone: string;
  kind: KungfuImpactKind;
  start: number;
  peak: number;
  end: number;
  advance: number;
  radius: number;
};

export const KUNGFU_SPARRING_DISTANCE = 1.44;
export const KUNGFU_SPARRING_OFFSET = 0.08;

const ATTACKS: Partial<Record<KungfuAction, SparringAttack>> = {
  jab: { bone: "LeftHand", kind: "block", start: 0.16, peak: 0.3, end: 0.44, advance: 0.18, radius: 0.13 },
  hook: { bone: "RightHand", kind: "block", start: 0.3, peak: 0.54, end: 0.66, advance: 0.3, radius: 0.14 },
  uppercut: { bone: "LeftHand", kind: "block", start: 0.16, peak: 0.35, end: 0.54, advance: 0.5, radius: 0.14 },
  kick: { bone: "RightFoot", kind: "hit", start: 0.3, peak: 0.475, end: 0.6, advance: 0.22, radius: 0.14 },
  roundhouse: { bone: "RightFoot", kind: "hit", start: 0.27, peak: 0.433, end: 0.57, advance: 0, radius: 0.14 },
};

export function getKungfuAttack(motion: KungfuMotion, attacks: Partial<Record<KungfuAction, SparringAttack>> = {}) {
  return motion === "idle" ? undefined : attacks[motion] ?? ATTACKS[motion];
}

/** 进身随出招推进，收势时回到原位，不在连招之间累计漂移。 */
export function getKungfuAdvance(motion: KungfuMotion, progress: number, attacks?: Partial<Record<KungfuAction, SparringAttack>>) {
  const attack = getKungfuAttack(motion, attacks);
  if (!attack) return 0;
  const amount = progress <= attack.peak
    ? THREE.MathUtils.smoothstep(progress, 0, attack.peak)
    : 1 - THREE.MathUtils.smoothstep(progress, attack.peak, 0.92);
  return attack.advance * amount;
}

/** 两条有限线段的胶囊接触；扫过上一帧到这一帧，避免快速出招漏判。 */
export function getKungfuContact(from: THREE.Vector3, to: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  const ux = to.x - from.x, uy = to.y - from.y, uz = to.z - from.z;
  const vx = end.x - start.x, vy = end.y - start.y, vz = end.z - start.z;
  const wx = from.x - start.x, wy = from.y - start.y, wz = from.z - start.z;
  const a = ux * ux + uy * uy + uz * uz;
  const b = ux * vx + uy * vy + uz * vz;
  const c = vx * vx + vy * vy + vz * vz;
  const d = ux * wx + uy * wy + uz * wz;
  const e = vx * wx + vy * wy + vz * wz;
  const determinant = a * c - b * b;
  let s = a < 1e-10 || determinant < 1e-10 ? 0 : THREE.MathUtils.clamp((b * e - c * d) / determinant, 0, 1);
  let t = c < 1e-10 ? 0 : (b * s + e) / c;
  if (t < 0) {
    t = 0;
    s = a < 1e-10 ? 0 : THREE.MathUtils.clamp(-d / a, 0, 1);
  } else if (t > 1) {
    t = 1;
    s = a < 1e-10 ? 0 : THREE.MathUtils.clamp((b - d) / a, 0, 1);
  } else if (c < 1e-10) {
    s = a < 1e-10 ? 0 : THREE.MathUtils.clamp(-d / a, 0, 1);
  }
  const dx = wx + s * ux - t * vx, dy = wy + s * uy - t * vy, dz = wz + s * uz - t * vz;
  if (dx * dx + dy * dy + dz * dz > radius * radius) return null;
  return new THREE.Vector3(from.x + s * ux, from.y + s * uy, from.z + s * uz);
}
