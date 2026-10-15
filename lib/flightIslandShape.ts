// Shared dimensions for the visible island and its collision surfaces.
export const FLIGHT_PAVILION = {
  x: -3,
  z: -2,
  floor: 3.2,
  halfWidth: 3.7,
  postOffset: 2.8,
  postRadius: 0.17,
  postHeight: 4.4,
  roofBase: 7.6,
  roofHalfWidth: 4.9,
};

export function islandEdge(angle: number, radius: number) {
  return radius * (1 + 0.065 * Math.sin(angle * 3 + 0.4) + 0.035 * Math.cos(angle * 7));
}

export function islandTopHeight(x: number, z: number, radius: number) {
  const distance = Math.hypot(x, z) / islandEdge(Math.atan2(z, x), radius);
  const edge = Math.max(0, (distance - 0.78) / 0.22);
  return 2.3 + Math.sin(x * 0.37) * Math.cos(z * 0.31) * 0.35 + Math.sin(z * 0.7) * 0.15 - edge * edge * 1.4;
}

export function islandSideRadius(depth: number) {
  return Math.max(0, 1 - depth) ** 0.65 * (1 + Math.sin(depth * Math.PI * 5) * 0.045);
}

export function pavilionRoofHeight(x: number, z: number) {
  const t = Math.max(Math.abs(x), Math.abs(z)) / FLIGHT_PAVILION.roofHalfWidth;
  return FLIGHT_PAVILION.roofBase + 2.9 * (1 - t) ** 2 + 0.45 * t ** 10;
}
