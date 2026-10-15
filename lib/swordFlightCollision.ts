import { FLIGHT_ISLANDS, type FlightPoint } from "./swordFlightSpec";
import { FLIGHT_PAVILION as pavilion, islandEdge, islandSideRadius, islandTopHeight, pavilionRoofHeight } from "./flightIslandShape";

const BODY_RADIUS = 0.24;
const BODY_HEIGHT = 2.4;

function touchesIsland(point: FlightPoint, island: (typeof FLIGHT_ISLANDS)[number]) {
  const x = point[0] - island.position[0];
  const y = point[1] - island.position[1];
  const z = point[2] - island.position[2];
  const distance = Math.hypot(x, z);
  if (distance > island.radius * 1.12 + BODY_RADIUS || y > 11.1 || y + BODY_HEIGHT < -island.height) return false;

  // The ground ends at its visible surface, never at an island-wide ceiling.
  const edge = islandEdge(Math.atan2(z, x), island.radius);
  const sectionRadius = y >= 0 ? edge : edge * islandSideRadius(-y / island.height);
  if (distance < sectionRadius + BODY_RADIUS && y - 0.12 <= islandTopHeight(x, z, island.radius)) return true;

  const px = x - pavilion.x;
  const pz = z - pavilion.z;
  if (Math.abs(px) > pavilion.roofHalfWidth + BODY_RADIUS || Math.abs(pz) > pavilion.roofHalfWidth + BODY_RADIUS) return false;
  const head = y + BODY_HEIGHT;
  if (Math.abs(px) < pavilion.halfWidth + BODY_RADIUS && Math.abs(pz) < pavilion.halfWidth + BODY_RADIUS && y < pavilion.floor + 0.22 && head > pavilion.floor - 0.22) return true;

  // A curved roof shell and four slim posts keep the pavilion's airspace open.
  if (Math.abs(px) <= pavilion.roofHalfWidth && Math.abs(pz) <= pavilion.roofHalfWidth) {
    const roof = pavilionRoofHeight(px, pz);
    if (y - 0.12 <= roof + 0.12 && head >= roof - 0.12) return true;
  }
  if (y < pavilion.floor + pavilion.postHeight && head > pavilion.floor) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        if (Math.hypot(px - sx * pavilion.postOffset, pz - sz * pavilion.postOffset) < pavilion.postRadius + BODY_RADIUS) return true;
      }
    }
  }
  return false;
}

export function collidesWithFlightIsland(from: FlightPoint, to: FlightPoint): boolean {
  // Sample the swept body, including the start, so boost cannot skip a roof or post.
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / 0.25));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const point: FlightPoint = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    if (FLIGHT_ISLANDS.some((island) => touchesIsland(point, island))) return true;
  }
  return false;
}
