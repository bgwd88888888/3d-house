import { FLIGHT_SPEED, FLIGHT_START } from "./swordFlightSpec";
import { flightLandingAt } from "./swordFlightLanding";
import { advanceAirborneFlight, advanceWalkingFlight } from "./swordFlightLocomotion";
import type { FlightInput, FlightState } from "./swordFlightTypes";

export type { FlightInput, FlightState } from "./swordFlightTypes";

export function createFlightState(): FlightState {
  return {
    position: FLIGHT_START, yaw: 0, pitch: 0, bank: 0, speed: FLIGHT_SPEED,
    mode: "flying", location: null, visited: [], elapsed: 0, distance: 0,
    notice: "没有航线，也没有终点。靠近岛屿按 X 减速、C 降低，按 E 收剑落地。",
  };
}

export function advanceFlight(state: FlightState, input: FlightInput, delta: number): FlightState {
  const dt = Math.max(0, Math.min(delta, 0.05));
  if (dt === 0) return state;
  let next: FlightState;
  const landing = state.mode === "flying" && input.land ? flightLandingAt(state.position) : null;
  if (landing) {
    const visited = landing.islandId && !state.visited.includes(landing.islandId) ? [...state.visited, landing.islandId] : state.visited;
    next = { ...state, position: landing.position, mode: "walking", location: landing.islandId,
      speed: 0, pitch: 0, bank: 0, visited, notice: `已抵达${landing.name}。W / S 漫步，走出边缘或按空格即可御剑。` };
  } else {
    next = state.mode === "walking" ? advanceWalkingFlight(state, input, dt) : advanceAirborneFlight(state, input, dt);
    if (state.mode === "flying" && input.land) next.notice = "再靠近一些：到平台上方 7 米内，留出头顶空间后按 E。";
  }
  return { ...next, elapsed: state.elapsed + dt,
    distance: state.distance + Math.hypot(next.position[0] - state.position[0], next.position[1] - state.position[1], next.position[2] - state.position[2]) };
}
