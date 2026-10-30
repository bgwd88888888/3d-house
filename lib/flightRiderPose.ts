import type { FlightState } from "./swordFlightTypes";

export type RiderAngles = readonly [number, number, number];
export interface RiderMotion {
  time: number;
  phase: number;
  flight: number;
  movement: number;
  speed: number;
  direction: number;
  bank: number;
  pitch: number;
  landing: number;
  mode: FlightState["mode"];
}

const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function createRiderMotion(mode: FlightState["mode"]): RiderMotion {
  return { time: 0, phase: 0, flight: mode === "flying" ? 1 : 0, movement: 0, speed: 0, direction: 1, bank: 0, pitch: 0, landing: 1, mode };
}

export function advanceRiderMotion(previous: RiderMotion, state: FlightState, direction: number, delta: number): RiderMotion {
  const dt = Math.min(0.05, Math.max(0, delta));
  if (!dt) return previous;
  const walking = state.mode === "walking";
  const ease = 1 - Math.exp(-dt * 8);
  const speed = mix(previous.speed, walking ? state.speed : 0, ease);
  const movement = mix(previous.movement, walking && state.speed > 0.05 ? 1 : 0, ease);
  const stride = 0.88 + Math.min(1, speed / 3.8) * 0.18;
  return {
    time: previous.time + dt,
    phase: (previous.phase + speed * 0.6 / stride * dt) % 1,
    flight: mix(previous.flight, walking ? 0 : 1, 1 - Math.exp(-dt * 7)),
    movement, speed,
    direction: mix(previous.direction, direction, ease),
    bank: mix(previous.bank, state.bank, ease),
    pitch: mix(previous.pitch, state.pitch, ease),
    landing: previous.mode === "flying" && walking ? 0 : Math.min(1, previous.landing + dt / 0.6),
    mode: state.mode,
  };
}

export function sampleRiderStep(phase: number, span: number, movement: number, direction: number) {
  const cycle = ((phase % 1) + 1) % 1;
  const swing = Math.max(0, (cycle - 0.6) / 0.4);
  const z = cycle < 0.6 ? mix(-span / 2, span / 2, cycle / 0.6) : mix(span / 2, -span / 2, smooth(swing));
  return { z: z * movement * direction, lift: Math.sin(swing * Math.PI) ** 2 * 0.085 * movement };
}

export function solveRiderLeg(forward: number, vertical: number) {
  const upper = 0.3528;
  const lower = 0.4153;
  const length = Math.min(upper + lower - 0.0001, Math.hypot(forward, vertical));
  const hip = Math.atan2(forward, vertical) + Math.acos(Math.max(-1, Math.min(1, (upper * upper + length * length - lower * lower) / (2 * upper * length))));
  const knee = -(Math.PI - Math.acos(Math.max(-1, Math.min(1, (upper * upper + lower * lower - length * length) / (2 * upper * lower)))));
  return { hip, knee, ankle: -hip - knee };
}

export function sampleRiderPose(motion: RiderMotion) {
  const { time, flight, movement, direction, phase } = motion;
  const stepSpan = (0.88 + Math.min(1, motion.speed / 3.8) * 0.18) / 1.35;
  const left = sampleRiderStep(phase, stepSpan, movement, direction);
  const right = sampleRiderStep(phase + 0.5, stepSpan, movement, direction);
  left.z = mix(left.z, -0.095, flight);
  right.z = mix(right.z, 0.095, flight);
  left.lift *= 1 - flight;
  right.lift *= 1 - flight;
  const reach = Math.max(Math.abs(left.z), Math.abs(right.z));
  const landing = Math.sin(motion.landing * Math.PI) * 0.045 * (1 - flight);
  const drop = Math.max(0.008, 0.768 - Math.sqrt(0.757 ** 2 - reach ** 2)) + landing;
  const sway = Math.sin(phase * TAU) * movement * (1 - flight) * direction;
  const breath = Math.sin(time * 1.7);
  const joints: Record<string, RiderAngles> = {
    J_Bip_C_Spine: [0.025 + flight * 0.035 + movement * 0.025, sway * 0.035, sway * 0.02 - motion.bank * 0.12],
    J_Bip_C_Chest: [breath * 0.006 + flight * 0.025, -sway * 0.045, -motion.bank * 0.1],
    J_Bip_C_Neck: [-flight * 0.045 - motion.pitch * 0.15, -motion.bank * 0.12, motion.bank * 0.1],
    J_Bip_C_Head: [-breath * 0.009, Math.sin(time * 0.55) * 0.025, motion.bank * 0.06],
  };
  for (const [side, sign, step] of [["L", -1, left], ["R", 1, right]] as const) {
    const leg = solveRiderLeg(-step.z + 0.0275, 0.7668 - drop - step.lift);
    const armSwing = sway * sign * 0.2;
    joints[`J_Bip_${side}_UpperLeg`] = [leg.hip, flight * sign * 0.055, 0];
    joints[`J_Bip_${side}_LowerLeg`] = [leg.knee, 0, 0];
    joints[`J_Bip_${side}_Foot`] = [leg.ankle, -flight * sign * 0.055, 0];
    joints[`J_Bip_${side}_Shoulder`] = [0, 0, sign * (breath * 0.004 + Math.abs(motion.bank) * 0.02)];
    joints[`J_Bip_${side}_UpperArm`] = [armSwing, sign * (0.06 + flight * (side === "L" ? 0.12 : -0.08)), -sign * (1.27 - flight * 0.17) + breath * sign * 0.008];
    joints[`J_Bip_${side}_LowerArm`] = [0, sign * (0.18 + flight * (side === "L" ? 0.48 : 0.15)), sign * 0.035];
    joints[`J_Bip_${side}_Hand`] = [0.05, sign * 0.06, -sign * 0.09];
    joints[`J_Sec_${side}_LowerSleeve`] = [Math.sin(time * 2.3) * 0.025 * flight, 0, sign * breath * 0.012];
    for (const finger of ["Index", "Middle", "Ring", "Little"]) {
      const curl = 0.28 - (side === "L" && (finger === "Index" || finger === "Middle") ? flight * 0.22 : 0);
      for (let index = 1; index <= 3; index += 1) joints[`J_Bip_${side}_${finger}${index}`] = [0, 0, -sign * curl];
    }
    for (let index = 1; index <= 3; index += 1) joints[`J_Bip_${side}_Thumb${index}`] = [0, sign * 0.1, -sign * 0.12];
    for (const sector of ["Front", "Back", "Side"]) {
      const opening = sector === "Front" ? 0.09 + Math.max(0, -step.z) * 0.7 : sector === "Back" ? -0.06 - Math.max(0, step.z) * 0.5 : 0;
      for (let index = 1; index <= 3; index += 1) joints[`J_Sec_${side}_Skirt${sector}${index}`] = [opening / index - flight * 0.065 + Math.sin(time * 2.3 - index) * flight * 0.012, 0, sector === "Side" ? sign * 0.025 : 0];
    }
    for (let index = 0; index < 5; index += 1) joints[`FairyRibbon${side}${index}`] = [-flight * (index === 0 ? 0.65 : 0.18) + Math.sin(time * 2.5 - index * 0.7) * (0.014 + flight * 0.04), sign * motion.bank * 0.15, sign * (0.08 + Math.sin(time * 1.8 - index * 0.7) * 0.015)];
  }
  const blinkPhase = time % 4.6;
  const blink = smooth(Math.max(0, 1 - Math.abs(blinkPhase - 3.9) / 0.11));
  return { joints, drop, blink, flight, hairSway: Math.sin(time * 2.3) * (0.012 + flight * 0.025), bank: motion.bank };
}
