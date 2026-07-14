/**
 * 庭院寻路辅助：障碍物与可走区域（XZ 平面）。
 * 人物随机走动时避开房子、台阶、树、皮卡，并限制离家距离。
 */

export type Vec2 = { x: number; z: number };

type CircleObstacle = {
  kind: "circle";
  x: number;
  z: number;
  radius: number;
};

type BoxObstacle = {
  kind: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type GardenObstacle = CircleObstacle | BoxObstacle;

/** 全局软边界：不要走出庭院视野 */
export const GARDEN_SOFT_BOUNDS = {
  minX: -18,
  maxX: 18,
  minZ: -16,
  maxZ: 16,
} as const;

/** 单人离家最远距离 */
export const DEFAULT_HOME_RADIUS = 7.5;

/** 人物碰撞半径 */
export const DEFAULT_AGENT_RADIUS = 0.55;

/**
 * 静态障碍：房子（含台阶外扩）+ 树干区 + 皮卡。
 * 坐标与 GardenTrees / GardenPickup / DEFAULT_HOUSE_SPEC 对齐。
 */
export const GARDEN_OBSTACLES: readonly GardenObstacle[] = [
  // 房子主体（墙体 + 少许屋檐余量，不含远处草坪）
  {
    kind: "box",
    minX: -6.5,
    maxX: 6.5,
    minZ: -5.2,
    maxZ: 5.2,
  },
  // 门前台阶
  {
    kind: "box",
    minX: 0.8,
    maxX: 3.9,
    minZ: 4.2,
    maxZ: 6.15,
  },
  // 皮卡（右侧，Quaternius pickup ~5m 长）
  {
    kind: "circle",
    x: 14.2,
    z: 4.2,
    radius: 2.9,
  },
  // 树木（Common / Pine，按树干与近地冠幅）
  { kind: "circle", x: -16, z: -10, radius: 1.55 },
  { kind: "circle", x: -17, z: 3, radius: 1.7 },
  { kind: "circle", x: -13, z: 12, radius: 1.4 },
  { kind: "circle", x: -5, z: 14, radius: 1.65 },
  { kind: "circle", x: 8, z: 14, radius: 1.75 },
  { kind: "circle", x: 17, z: 8, radius: 1.45 },
  { kind: "circle", x: 17, z: -4, radius: 1.6 },
  { kind: "circle", x: 13, z: -13, radius: 1.35 },
  { kind: "circle", x: -7, z: -14, radius: 1.7 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hitsBox(
  x: number,
  z: number,
  radius: number,
  box: BoxObstacle,
): boolean {
  const nearestX = clamp(x, box.minX, box.maxX);
  const nearestZ = clamp(z, box.minZ, box.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function hitsCircle(
  x: number,
  z: number,
  radius: number,
  circle: CircleObstacle,
): boolean {
  const dx = x - circle.x;
  const dz = z - circle.z;
  const limit = radius + circle.radius;
  return dx * dx + dz * dz < limit * limit;
}

export function isWalkable(
  x: number,
  z: number,
  agentRadius = DEFAULT_AGENT_RADIUS,
  obstacles: readonly GardenObstacle[] = GARDEN_OBSTACLES,
): boolean {
  if (
    x < GARDEN_SOFT_BOUNDS.minX + agentRadius ||
    x > GARDEN_SOFT_BOUNDS.maxX - agentRadius ||
    z < GARDEN_SOFT_BOUNDS.minZ + agentRadius ||
    z > GARDEN_SOFT_BOUNDS.maxZ - agentRadius
  ) {
    return false;
  }

  for (const obstacle of obstacles) {
    if (obstacle.kind === "box") {
      if (hitsBox(x, z, agentRadius, obstacle)) return false;
    } else if (hitsCircle(x, z, agentRadius, obstacle)) {
      return false;
    }
  }
  return true;
}

export function distance2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** 在家附近采样一个可走目标点 */
export function sampleWanderTarget(
  home: Vec2,
  random: () => number,
  homeRadius = DEFAULT_HOME_RADIUS,
  agentRadius = DEFAULT_AGENT_RADIUS,
): Vec2 | null {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const dist = 2.2 + random() * (homeRadius - 2.2);
    const x = home.x + Math.cos(angle) * dist;
    const z = home.z + Math.sin(angle) * dist;
    if (isWalkable(x, z, agentRadius)) {
      return { x, z };
    }
  }
  return null;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state ^ (state >>> 15), state | 1) +
      Math.imul(state ^ (state >>> 7), state | 61)) >>>
      0;
    return (state ^ (state >>> 14)) / 4294967296;
  };
}
