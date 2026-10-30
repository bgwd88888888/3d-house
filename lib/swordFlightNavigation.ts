import { FLIGHT_ISLANDS } from "./swordFlightSpec";
import { flightLandingAt } from "./swordFlightLanding";
import type { FlightState } from "./swordFlightTypes";

export function flightNavigation(state: FlightState) {
  let nearest = FLIGHT_ISLANDS[0];
  let distance = Infinity;
  for (const island of FLIGHT_ISLANDS) {
    const next = Math.hypot(island.position[0] - state.position[0], island.position[1] + 3 - state.position[1], island.position[2] - state.position[2]);
    if (next < distance) { nearest = island; distance = next; }
  }
  const bearing = Math.atan2(nearest.position[0] - state.position[0], state.position[2] - nearest.position[2]) - state.yaw;
  const heading = (state.yaw * 180 / Math.PI % 360 + 360) % 360;
  return {
    nearest, distance, heading,
    bearing: Math.atan2(Math.sin(bearing), Math.cos(bearing)),
    landing: state.mode === "flying" ? flightLandingAt(state.position) : null,
    location: FLIGHT_ISLANDS.find((island) => island.id === state.location)?.name ?? (state.mode === "walking" ? "云外群峰" : "云海上空"),
    direction: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"][Math.round(heading / 45) % 8],
  };
}

export type FlightNavigation = ReturnType<typeof flightNavigation>;
