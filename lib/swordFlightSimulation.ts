import {
  FLIGHT_BOOST_SPEED,
  FLIGHT_GATE_RADIUS,
  FLIGHT_GATES,
  FLIGHT_SPEED,
  FLIGHT_START,
  type FlightPoint,
} from "./swordFlightSpec";
import { collidesWithFlightIsland } from "./swordFlightCollision";

export interface FlightInput {
  turn: number;
  pitch: number;
  lift: number;
  boost: boolean;
}

export interface FlightState {
  position: FlightPoint;
  yaw: number;
  pitch: number;
  bank: number;
  speed: number;
  gate: number;
  laps: number;
  elapsed: number;
  lastLap: number | null;
  bestLap: number | null;
  notice: string;
}

export function createFlightState(): FlightState {
  return {
    position: FLIGHT_START,
    yaw: 0,
    pitch: 0,
    bank: 0,
    speed: FLIGHT_SPEED,
    gate: 0,
    laps: 0,
    elapsed: 0,
    lastLap: null,
    bestLap: null,
    notice: "循着金色光环，开始你的第一圈。",
  };
}

export function gateNormal(index: number): FlightPoint {
  const previous = FLIGHT_GATES[(index + FLIGHT_GATES.length - 1) % FLIGHT_GATES.length];
  const current = FLIGHT_GATES[index];
  const x = current[0] - previous[0];
  const z = current[2] - previous[2];
  const length = Math.hypot(x, z);
  return [x / length, 0, z / length];
}

// Segment/plane intersection prevents boosted flight from skipping a thin ring.
export function crossesFlightGate(from: FlightPoint, to: FlightPoint, index: number): boolean {
  const center = FLIGHT_GATES[index];
  const normal = gateNormal(index);
  const before = (from[0] - center[0]) * normal[0] + (from[2] - center[2]) * normal[2];
  const after = (to[0] - center[0]) * normal[0] + (to[2] - center[2]) * normal[2];
  if (before >= 0 || after < 0) return false;
  const t = before / (before - after);
  const x = from[0] + (to[0] - from[0]) * t - center[0];
  const y = from[1] + (to[1] - from[1]) * t - center[1];
  const z = from[2] + (to[2] - from[2]) * t - center[2];
  return x * x + y * y + z * z < (FLIGHT_GATE_RADIUS - 0.6) ** 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function advanceFlight(state: FlightState, input: FlightInput, delta: number): FlightState {
  const dt = clamp(delta, 0, 0.05);
  const blend = 1 - Math.exp(-dt * 5);
  const yaw = state.yaw + input.turn * dt * 1.1;
  const pitch = state.pitch + (input.pitch * 0.65 - state.pitch) * blend;
  const bank = state.bank + (-input.turn * 0.42 - state.bank) * blend;
  const speed = state.speed + ((input.boost ? FLIGHT_BOOST_SPEED : FLIGHT_SPEED) - state.speed) * blend;
  const position: FlightPoint = [
    state.position[0] + Math.sin(yaw) * Math.cos(pitch) * speed * dt,
    clamp(state.position[1] + (Math.sin(pitch) * speed + input.lift * 12) * dt, 17, 95),
    state.position[2] - Math.cos(yaw) * Math.cos(pitch) * speed * dt,
  ];

  const outside = Math.hypot(position[0] - 45, position[2] - 30) > 290;
  const collision = collidesWithFlightIsland(state.position, position);
  if (outside || collision) {
    return {
      ...createFlightState(),
      laps: state.laps,
      lastLap: state.lastLap,
      bestLap: state.bestLap,
      notice: outside ? "飞得太远啦，已回到起点。" : "碰到山体或亭阁，已回到起点。",
    };
  }

  const next = { ...state, position, yaw, pitch, bank, speed, elapsed: state.elapsed + dt };
  if (crossesFlightGate(state.position, position, state.gate)) {
    next.gate = (state.gate + 1) % FLIGHT_GATES.length;
    next.notice = "穿环成功，继续追寻下一道金光。";
    if (next.gate === 0) {
      next.laps += 1;
      next.lastLap = next.elapsed;
      next.bestLap = Math.min(state.bestLap ?? Infinity, next.elapsed);
      next.elapsed = 0;
      next.notice = "一圈完成！继续飞，试着刷新纪录。";
    }
  }
  return next;
}

export function flightTarget(state: FlightState) {
  const target = FLIGHT_GATES[state.gate];
  const x = target[0] - state.position[0];
  const z = target[2] - state.position[2];
  const bearing = Math.atan2(x, -z) - state.yaw;
  return {
    distance: Math.hypot(x, target[1] - state.position[1], z),
    bearing: Math.atan2(Math.sin(bearing), Math.cos(bearing)),
    height: target[1] - state.position[1],
  };
}
