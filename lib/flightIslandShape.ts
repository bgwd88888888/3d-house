// Shared dimensions for the visible island and its collision surfaces.
export const FLIGHT_ISLAND_SEGMENTS = 64;
export const FLIGHT_ISLAND_TOP_RINGS = 24;

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

// Match the triangulated top mesh exactly, including its polygonal edge.
export function islandSurfaceHeight(x: number, z: number, radius: number): number | null {
  const angle = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
  const sector = Math.floor(angle / (Math.PI * 2) * FLIGHT_ISLAND_SEGMENTS);
  const a = sector / FLIGHT_ISLAND_SEGMENTS * Math.PI * 2;
  const b = (sector + 1) / FLIGHT_ISLAND_SEGMENTS * Math.PI * 2;
  const ax = Math.cos(a) * islandEdge(a, radius);
  const az = Math.sin(a) * islandEdge(a, radius);
  const bx = Math.cos(b) * islandEdge(b, radius);
  const bz = Math.sin(b) * islandEdge(b, radius);
  const determinant = ax * bz - az * bx;
  const u = (x * bz - z * bx) / determinant;
  const v = (ax * z - az * x) / determinant;
  const fraction = u + v;
  if (fraction > 1 + 1e-8) return null;
  const ring = Math.min(FLIGHT_ISLAND_TOP_RINGS - 1, Math.floor(fraction * FLIGHT_ISLAND_TOP_RINGS));
  const inner = ring / FLIGHT_ISLAND_TOP_RINGS;
  const outer = (ring + 1) / FLIGHT_ISLAND_TOP_RINGS;
  const ha = islandTopHeight(ax * inner, az * inner, radius);
  const hb = islandTopHeight(bx * inner, bz * inner, radius);
  const hc = islandTopHeight(ax * outer, az * outer, radius);
  const hd = islandTopHeight(bx * outer, bz * outer, radius);
  if (ring === 0) return ha * (1 - fraction / outer) + hc * u / outer + hd * v / outer;
  const wc = (fraction - inner) * FLIGHT_ISLAND_TOP_RINGS;
  const wb = v / inner;
  if (wb + wc <= 1) return ha * (1 - wb - wc) + hb * wb + hc * wc;
  const base = (outer - fraction) * FLIGHT_ISLAND_TOP_RINGS;
  return hb * base + hc * u / outer + hd * (1 - base - u / outer);
}

export function islandSideRadius(depth: number) {
  return Math.max(0, 1 - depth) ** 0.65 * (1 + Math.sin(depth * Math.PI * 5) * 0.045);
}

export function pavilionRoofHeight(x: number, z: number) {
  const t = Math.max(Math.abs(x), Math.abs(z)) / FLIGHT_PAVILION.roofHalfWidth;
  return FLIGHT_PAVILION.roofBase + 2.9 * (1 - t) ** 2 + 0.45 * t ** 10;
}
