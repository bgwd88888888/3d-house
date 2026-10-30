import { FLIGHT_ISLANDS, type FlightPoint } from "./swordFlightSpec";
import { FLIGHT_ISLAND_LAYOUTS } from "./flightIslandLayout";
import { FLIGHT_PAVILION as pavilion, islandSurfaceHeight } from "./flightIslandShape";
import { FLIGHT_MOUNTAINS, flightMountainHeight } from "./flightMountainShape";

export interface FlightSurface {
  height: number;
  islandId: string | null;
  name: string;
}

export function flightSurfaceAt(point: FlightPoint, maxRise = 0, radius = 0): FlightSurface | null {
  let surface: FlightSurface | null = null;
  const consider = (height: number, islandId: string | null, name: string) => {
    if (height <= point[1] + maxRise && (!surface || height > surface.height)) surface = { height, islandId, name };
  };
  for (const island of FLIGHT_ISLANDS) {
    const x = point[0] - island.position[0];
    const z = point[2] - island.position[2];
    if (Math.hypot(x, z) > island.radius * 1.12) continue;
    const ground = islandSurfaceHeight(x, z, island.radius);
    if (ground === null) continue;
    consider(island.position[1] + ground, island.id, island.name);
    for (const block of FLIGHT_ISLAND_LAYOUTS[island.id].blocks) {
      if (Math.abs(x - block.position[0]) <= block.size[0] / 2 + radius && Math.abs(z - block.position[2]) <= block.size[2] / 2 + radius) {
        consider(island.position[1] + block.position[1] + block.size[1] / 2, island.id, island.name);
      }
    }
    if (island.landmark !== "pavilion") continue;
    const px = x - pavilion.x;
    const pz = z - pavilion.z;
    if (Math.abs(px) <= pavilion.halfWidth + radius && Math.abs(pz) <= pavilion.halfWidth + radius) {
      consider(island.position[1] + pavilion.floor + 0.22, island.id, island.name);
    }
    for (let step = 0; step < 3; step += 1) {
      if (Math.abs(px) <= 1.5 + radius && Math.abs(pz - 4 - step * 0.45) <= 0.35 + radius) {
        consider(island.position[1] + pavilion.floor - 0.21 - step * 0.25, island.id, island.name);
      }
    }
  }
  for (const mountain of FLIGHT_MOUNTAINS) {
    const height = flightMountainHeight(point[0], point[2], mountain);
    if (height !== null) consider(height, null, "云外群峰");
  }
  return surface;
}
