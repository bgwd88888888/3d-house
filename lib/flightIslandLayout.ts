import { FLIGHT_ISLANDS, type FlightIsland, type FlightPoint } from "./swordFlightSpec";
import { islandSurfaceHeight } from "./flightIslandShape";

export interface FlightStoneBlock {
  position: FlightPoint;
  size: FlightPoint;
}

function createIslandLayout(island: FlightIsland) {
  const { radius, landmark } = island;
  const deckZ = radius * 0.62;
  const blocks: FlightStoneBlock[] = [
    { position: [0, 2.65, deckZ], size: [10, 0.8, 8] },
  ];
  // Both ends of the terrace have real steps, shared by rendering and walking.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      blocks.push({ position: [0, 2.72 - index * 0.18, deckZ + side * (4.35 + index * 0.65)], size: [4, 0.3, 0.7] });
    }
  }
  for (let z = 4; z < deckZ - 6.5; z += 1.8) {
    blocks.push({ position: [0, islandSurfaceHeight(0, z, radius)! + 0.03, z], size: [2.5, 0.12, 1.3] });
  }
  if (landmark === "ruins") {
    for (const side of [-1, 1]) {
      blocks.push(
        { position: [side * 4, 2.9, -6], size: [2.6, 0.8, 2.6] },
        { position: [side * 4, 6, -6], size: [1.4, 6, 1.5] },
        { position: [side * 4, 9.2, -6], size: [2.3, 0.6, 2] },
        { position: [side * 7, 3.5, -8], size: [1.3, 2.3, 1.4] },
      );
    }
    blocks.push({ position: [0, 8.5, -6], size: [10.6, 0.8, 1.8] });
    blocks.push({ position: [0, 9, -6], size: [7.2, 0.3, 2.1] });
  }
  if (landmark === "shrine") {
    blocks.push(
      { position: [0, 2.7, -5], size: [7, 0.6, 6] },
      { position: [0, 3, -5], size: [5, 0.3, 4] },
      { position: [0, 3.4, -6], size: [2.4, 0.6, 1.8] },
      { position: [0, 6.3, -6], size: [1.6, 5.4, 0.8] },
      { position: [0, 9.1, -6], size: [2.2, 0.3, 1.2] },
    );
  }
  if (landmark === "garden") {
    blocks.push({ position: [0, 2.6, -5], size: [10, 0.3, 8] });
    for (const side of [-1, 1]) {
      blocks.push({ position: [side * 5, 2.85, -5], size: [0.6, 0.6, 8.6] });
      blocks.push({ position: [0, 2.85, -5 + side * 4], size: [10, 0.6, 0.6] });
    }
    // Low stepping stones cross a shallow reflecting pool.
    for (let z = -8; z <= -2; z += 1.5) blocks.push({ position: [0, 2.92, z], size: [1.5, 0.35, 1.1] });
  }
  const trees = Array.from({ length: island.trees }, (_, index) => {
    const angle = 0.15 + index / island.trees * Math.PI * 1.55;
    const x = Math.cos(angle) * radius * 0.68;
    const z = -Math.sin(angle) * radius * 0.68;
    return { position: [x, islandSurfaceHeight(x, z, radius)!, z] as FlightPoint, scale: 0.85 + index % 3 * 0.24 };
  });
  const rocks = Array.from({ length: 6 }, (_, index) => {
    const angle = index * 2.4 + 0.2;
    const x = Math.cos(angle) * radius * 0.86;
    const z = Math.sin(angle) * radius * 0.86;
    return { position: [x, islandSurfaceHeight(x, z, radius)! - 0.12, z] as FlightPoint, scale: 0.8 + index % 3 * 0.15, angle };
  });
  return { blocks, trees, rocks, deckZ };
}

export const FLIGHT_ISLAND_LAYOUTS = Object.fromEntries(FLIGHT_ISLANDS.map((island) => [island.id, createIslandLayout(island)]));
