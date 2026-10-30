import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

export const FLIGHT_MOUNTAIN_DIVISIONS = 64;

function createMountainSamples(seed: number) {
  let state = seed * 1237 + 97;
  const noise = new SimplexNoise({ random: () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  } });
  const peaks = [[-0.22, 0.04, 0.72, 0.55, 1], [0.35, -0.16, 0.48, 0.44, 0.72 + Math.sin(seed) * 0.12], [-0.12, 0.4, 0.48, 0.4, 0.52]];
  return Array.from({ length: (FLIGHT_MOUNTAIN_DIVISIONS + 1) ** 2 }, (_, index) => {
    const x = index % (FLIGHT_MOUNTAIN_DIVISIONS + 1) / FLIGHT_MOUNTAIN_DIVISIONS * 2 - 1;
    const z = Math.floor(index / (FLIGHT_MOUNTAIN_DIVISIONS + 1)) / FLIGHT_MOUNTAIN_DIVISIONS * 2 - 1;
    const warp = noise.noise(x * 3.2 + seed, z * 3.2) * 0.085;
    let height = 0;
    for (const [cx, cz, rx, rz, amplitude] of peaks) {
      const distance = Math.hypot((x - cx + warp) / rx, (z - cz + warp) / rz);
      height = Math.max(height, Math.max(0, 1 - distance ** 1.3) ** 0.65 * amplitude);
    }
    const ridge = 1 - Math.abs(noise.noise(x * 8 + seed, z * 8));
    const y = height * (0.91 + ridge * 0.1 + noise.noise(x * 24, z * 24 + seed) * 0.012);
    return { x, z, y, ridge, greenery: Math.max(0, noise.noise(x * 7, z * 7 + seed)) * 0.35 };
  });
}

export const FLIGHT_MOUNTAIN_SHAPES = Array.from({ length: 5 }, (_, index) => createMountainSamples(index + 1));

export const FLIGHT_MOUNTAINS = Array.from({ length: 24 }, (_, index) => {
  const distant = index >= 14;
  const angle = distant ? (index - 14) / 10 * Math.PI * 2 + 0.2 : index / 14 * Math.PI * 2;
  const radius = (distant ? 1660 : 1120) + Math.sin(index * 4) * 90;
  return {
    x: Math.cos(angle) * radius, z: Math.sin(angle) * radius - 120,
    width: distant ? 150 + index % 3 * 18 : 100 + index % 4 * 15,
    height: distant ? 210 + index % 4 * 22 : 155 + index % 5 * 24,
    rotation: index * 1.73, shape: index % 5, distant,
  };
});

export function flightMountainHeight(x: number, z: number, mountain: (typeof FLIGHT_MOUNTAINS)[number]) {
  const dx = x - mountain.x;
  const dz = z - mountain.z;
  if (Math.abs(dx) > mountain.width * 1.5 || Math.abs(dz) > mountain.width * 1.5) return null;
  const cos = Math.cos(mountain.rotation);
  const sin = Math.sin(mountain.rotation);
  const u = ((dx * cos - dz * sin) / mountain.width + 1) * FLIGHT_MOUNTAIN_DIVISIONS / 2;
  const v = ((dx * sin + dz * cos) / (mountain.width * 0.8) + 1) * FLIGHT_MOUNTAIN_DIVISIONS / 2;
  if (u < 0 || v < 0 || u >= FLIGHT_MOUNTAIN_DIVISIONS || v >= FLIGHT_MOUNTAIN_DIVISIONS) return null;
  const col = Math.floor(u);
  const row = Math.floor(v);
  const fx = u - col;
  const fz = v - row;
  const samples = FLIGHT_MOUNTAIN_SHAPES[mountain.shape];
  const index = row * (FLIGHT_MOUNTAIN_DIVISIONS + 1) + col;
  const a = samples[index].y;
  const b = samples[index + 1].y;
  const c = samples[index + FLIGHT_MOUNTAIN_DIVISIONS + 1].y;
  const d = samples[index + FLIGHT_MOUNTAIN_DIVISIONS + 2].y;
  // Interpolate the same two triangles rendered by the mountain geometry.
  const height = fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  return height > 0.005 ? -45 + height * mountain.height : null;
}
