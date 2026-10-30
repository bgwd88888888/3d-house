import { FLIGHT_BOOST_SPEED, FLIGHT_BRAKE_SPEED, FLIGHT_FOOT_CLEARANCE, FLIGHT_RUN_SPEED, FLIGHT_SPEED, FLIGHT_WALK_SPEED, type FlightPoint } from "./swordFlightSpec";
import { isFlightPositionBlocked, traceFlightMotion } from "./swordFlightCollision";
import { flightSurfaceAt } from "./swordFlightSurface";
import type { FlightInput, FlightState } from "./swordFlightTypes";

function takeOff(state: FlightState, position: FlightPoint, yaw: number, manual: boolean): FlightState {
  const lifted: FlightPoint = [position[0], position[1] + (manual ? 0.85 : 0.35), position[2]];
  const motion = traceFlightMotion(position, lifted);
  return { ...state, position: motion.position, yaw, mode: "flying", location: null, speed: 9, pitch: 0.12, bank: 0, notice: "剑已接住你，继续往想去的方向飞。" };
}

export function advanceAirborneFlight(state: FlightState, input: FlightInput, dt: number): FlightState {
  const blend = 1 - Math.exp(-dt * 5);
  const yaw = state.yaw + input.turn * dt * 1.1;
  const pitch = state.pitch + (input.pitch * 0.65 - state.pitch) * blend;
  const bank = state.bank + (-input.turn * 0.42 - state.bank) * blend;
  const targetSpeed = input.brake ? FLIGHT_BRAKE_SPEED : input.boost ? FLIGHT_BOOST_SPEED : FLIGHT_SPEED;
  const speed = state.speed + (targetSpeed - state.speed) * (1 - Math.exp(-dt * (input.brake ? 8 : 3)));
  const candidate: FlightPoint = [
    state.position[0] + Math.sin(yaw) * Math.cos(pitch) * speed * dt,
    Math.max(-22, Math.min(300, state.position[1] + (Math.sin(pitch) * speed + input.lift * (input.brake ? 5 : 12)) * dt)),
    state.position[2] - Math.cos(yaw) * Math.cos(pitch) * speed * dt,
  ];
  const motion = traceFlightMotion(state.position, candidate);
  let position = motion.position;
  if (motion.blocked) {
    // Preserve safe motion along a wall or beneath a roof so lifting can escape contact.
    position = traceFlightMotion(position, [position[0], candidate[1], position[2]]).position;
    position = traceFlightMotion(position, [candidate[0], position[1], candidate[2]]).position;
  }
  return { ...state, position, yaw, pitch, bank, speed: motion.blocked ? 0 : speed,
    notice: motion.blocked ? "前方有山石或建筑，转向或升高即可继续；靠近地面可按 E 落地。" : state.notice };
}

export function advanceWalkingFlight(state: FlightState, input: FlightInput, dt: number): FlightState {
  const yaw = state.yaw + input.turn * dt * 1.8;
  if (input.lift > 0) return takeOff(state, state.position, yaw, true);
  const speed = input.pitch * (input.boost ? FLIGHT_RUN_SPEED : FLIGHT_WALK_SPEED);
  const steps = Math.max(1, Math.ceil(Math.abs(speed * dt) / 0.18));
  let position = state.position;
  let location = state.location;
  let blocked = false;
  for (let step = 0; step < steps; step += 1) {
    const x = position[0] + Math.sin(yaw) * speed * dt / steps;
    const z = position[2] - Math.cos(yaw) * speed * dt / steps;
    const surface = flightSurfaceAt([x, position[1], z], 0.42, 0.24);
    if (!surface || position[1] - surface.height > 1.3) {
      const edge: FlightPoint = [x, position[1], z];
      if (isFlightPositionBlocked(edge)) { blocked = true; break; }
      return takeOff(state, edge, speed < 0 ? yaw + Math.PI : yaw, false);
    }
    const candidate: FlightPoint = [x, surface.height + FLIGHT_FOOT_CLEARANCE, z];
    if (isFlightPositionBlocked(candidate)) { blocked = true; break; }
    position = candidate;
    location = surface.islandId;
  }
  return { ...state, position, yaw, pitch: 0, bank: 0, speed: blocked ? 0 : Math.abs(speed), location };
}
