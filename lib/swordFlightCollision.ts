import { FLIGHT_ISLANDS, type FlightPoint } from "./swordFlightSpec";
import { FLIGHT_PAVILION as pavilion, islandEdge, islandSideRadius, islandSurfaceHeight, pavilionRoofHeight } from "./flightIslandShape";
import { FLIGHT_ISLAND_LAYOUTS, type FlightStoneBlock } from "./flightIslandLayout";
import { FLIGHT_MOUNTAINS, flightMountainHeight } from "./flightMountainShape";

interface FlightBody {
  radius: number;
  height: number;
  clearance: number;
}

const RIDER_BODY: FlightBody = { radius: 0.24, height: 2.4, clearance: 0.1 };
export const FLIGHT_CAMERA_BODY: FlightBody = { radius: 0.15, height: 0.15, clearance: 0.15 };

function touchesBlock(x: number, y: number, z: number, block: FlightStoneBlock, body: FlightBody) {
  return Math.abs(x - block.position[0]) < block.size[0] / 2 + body.radius
    && Math.abs(z - block.position[2]) < block.size[2] / 2 + body.radius
    && y - body.clearance < block.position[1] + block.size[1] / 2
    && y + body.height > block.position[1] - block.size[1] / 2;
}

export function isFlightPositionBlocked(point: FlightPoint, body = RIDER_BODY): boolean {
  for (const island of FLIGHT_ISLANDS) {
    const x = point[0] - island.position[0];
    const y = point[1] - island.position[1];
    const z = point[2] - island.position[2];
    const distance = Math.hypot(x, z);
    if (distance > island.radius * 1.12 + body.radius || y > 11.1 || y + body.height < -island.height) continue;
    const edge = islandEdge(Math.atan2(z, x), island.radius);
    const sectionRadius = y >= 0 ? edge : edge * islandSideRadius(-y / island.height);
    const ground = islandSurfaceHeight(x, z, island.radius);
    if (ground !== null && distance < sectionRadius && y - body.clearance <= ground) return true;
    const layout = FLIGHT_ISLAND_LAYOUTS[island.id];
    if (layout.blocks.some((block) => touchesBlock(x, y, z, block, body))) return true;
    for (const tree of layout.trees) {
      if (y < tree.position[1] + 4.4 * tree.scale && y + body.height > tree.position[1]
        && Math.hypot(x - tree.position[0], z - tree.position[2]) < 0.16 * tree.scale + body.radius) return true;
    }
    for (const rock of layout.rocks) {
      const dx = (x - rock.position[0]) / (1.1 * rock.scale + body.radius);
      const dz = (z - rock.position[2]) / (0.85 * rock.scale + body.radius);
      if (y + body.height > rock.position[1] && y < rock.position[1] + rock.scale && dx * dx + dz * dz < 1) return true;
    }
    if (island.landmark !== "pavilion") continue;
    const px = x - pavilion.x;
    const pz = z - pavilion.z;
    if (Math.abs(px) > pavilion.roofHalfWidth + body.radius || Math.abs(pz) > pavilion.roofHalfWidth + body.radius) continue;
    const floor: FlightStoneBlock = { position: [pavilion.x, pavilion.floor - 0.65, pavilion.z], size: [pavilion.halfWidth * 2, 1.74, pavilion.halfWidth * 2] };
    if (touchesBlock(x, y, z, floor, body)) return true;
    for (let step = 0; step < 3; step += 1) {
      if (touchesBlock(x, y, z, { position: [pavilion.x, pavilion.floor - 0.35 - step * 0.25, pavilion.z + 4 + step * 0.45], size: [3, 0.28, 0.7] }, body)) return true;
    }
    if (Math.abs(px) <= pavilion.roofHalfWidth && Math.abs(pz) <= pavilion.roofHalfWidth) {
      const roof = pavilionRoofHeight(px, pz);
      if (y - body.clearance <= roof + 0.12 && y + body.height >= roof - 0.12) return true;
    }
    if (y < pavilion.floor + pavilion.postHeight && y + body.height > pavilion.floor) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const radius = y < pavilion.floor + 0.4 ? 0.32 : pavilion.postRadius;
          if (Math.hypot(px - sx * pavilion.postOffset, pz - sz * pavilion.postOffset) < radius + body.radius) return true;
        }
      }
      if (y + body.height > pavilion.roofBase - 0.425
        && ((Math.abs(Math.abs(px) - pavilion.postOffset) < 0.13 + body.radius && Math.abs(pz) < 3.05)
          || (Math.abs(Math.abs(pz) - pavilion.postOffset) < 0.13 + body.radius && Math.abs(px) < 3.05))) return true;
    }
  }
  for (const mountain of FLIGHT_MOUNTAINS) {
    const height = flightMountainHeight(point[0], point[2], mountain);
    if (height !== null && point[1] - body.clearance <= height && point[1] + body.height > -45) return true;
  }
  return false;
}

export function traceFlightMotion(from: FlightPoint, to: FlightPoint, body = RIDER_BODY) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / 0.2));
  let position = from;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const point: FlightPoint = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    if (isFlightPositionBlocked(point, body)) return { position, blocked: true };
    position = point;
  }
  return { position, blocked: false };
}
