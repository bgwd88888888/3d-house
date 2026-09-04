/**
 * 庭院寻路：按当前建筑场景切换障碍与软边界。
 */
import {
  buildCompoundObstacles,
  COMPOUND_HALF_X,
  COMPOUND_HALF_Z,
  KOI_POND_OBSTACLE,
  ROCKERY_OBSTACLE,
} from "@/lib/geoCompound";
import {
  buildCottageYardObstacles,
  COTTAGE_YARD_BOUNDS,
} from "@/lib/cottageYard";
import type { SceneKind } from "@/lib/sceneKinds";

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

export type SoftBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** 人物碰撞半径 */
export const DEFAULT_AGENT_RADIUS = 0.55;

const COTTAGE_BOUNDS: SoftBounds = { ...COTTAGE_YARD_BOUNDS };

const COURTYARD_BOUNDS: SoftBounds = {
  minX: -(COMPOUND_HALF_X - 1.2),
  maxX: COMPOUND_HALF_X - 1.2,
  minZ: -(COMPOUND_HALF_Z - 1.2),
  maxZ: COMPOUND_HALF_Z - 1.2,
};

const COTTAGE_OBSTACLES: readonly GardenObstacle[] = [
  {
    kind: "box",
    minX: -6.5,
    maxX: 6.5,
    minZ: -5.2,
    maxZ: 5.2,
  },
  {
    kind: "box",
    minX: 0.8,
    maxX: 3.9,
    minZ: 4.2,
    maxZ: 6.15,
  },
  {
    kind: "box",
    minX: 10.3,
    maxX: 13.7,
    minZ: 1.1,
    maxZ: 7.7,
  },
  {
    kind: "circle",
    x: 11.2,
    z: 10.4,
    radius: 3.0,
  },
  { kind: "circle", x: 14.1, z: 9.3, radius: 2.5 },
  { kind: "circle", x: -9.05, z: 3.2, radius: 2.3 },
  ...buildCottageYardObstacles(),
];

const COURTYARD_TREE_OBSTACLES: readonly CircleObstacle[] = [
  { kind: "circle", x: -7, z: -20, radius: 1.4 },
  { kind: "circle", x: 6, z: -22, radius: 1.3 },
  { kind: "circle", x: -2, z: -16, radius: 1.25 },
  { kind: "circle", x: -8, z: -5, radius: 1.25 },
  { kind: "circle", x: 8, z: -6, radius: 1.25 },
  { kind: "circle", x: -7.5, z: 8.5, radius: 1.2 },
  { kind: "circle", x: 7.5, z: 8, radius: 1.2 },
  { kind: "circle", x: -7, z: 24, radius: 1.15 },
  { kind: "circle", x: 7, z: 23.5, radius: 1.15 },
];

const COURTYARD_OBSTACLES: readonly GardenObstacle[] = [
  ...buildCompoundObstacles(),
  KOI_POND_OBSTACLE,
  ROCKERY_OBSTACLE,
  ...COURTYARD_TREE_OBSTACLES,
];

type SceneNav = {
  bounds: SoftBounds;
  obstacles: readonly GardenObstacle[];
  defaultHomeRadius: number;
};

const SCENE_NAV: Record<SceneKind, SceneNav> = {
  cottage: {
    bounds: COTTAGE_BOUNDS,
    obstacles: COTTAGE_OBSTACLES,
    defaultHomeRadius: 7.5,
  },
  courtyard: {
    bounds: COURTYARD_BOUNDS,
    obstacles: COURTYARD_OBSTACLES,
    defaultHomeRadius: 22,
  },
};

let activeScene: SceneKind = "courtyard";

export function setActiveGardenScene(scene: SceneKind): void {
  activeScene = scene;
}

export function getActiveGardenScene(): SceneKind {
  return activeScene;
}

/** @deprecated 用 getSoftBounds；保留兼容导出 */
export const GARDEN_SOFT_BOUNDS = COURTYARD_BOUNDS;

export const DEFAULT_HOME_RADIUS = 12;

/** @deprecated 用 getActiveObstacles */
export const GARDEN_OBSTACLES = COURTYARD_OBSTACLES;

export function getSoftBounds(): SoftBounds {
  return SCENE_NAV[activeScene].bounds;
}

export function getActiveObstacles(): readonly GardenObstacle[] {
  return SCENE_NAV[activeScene].obstacles;
}

export function getDefaultHomeRadius(): number {
  return SCENE_NAV[activeScene].defaultHomeRadius;
}

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
  obstacles: readonly GardenObstacle[] = getActiveObstacles(),
): boolean {
  const bounds = getSoftBounds();
  if (
    x < bounds.minX + agentRadius ||
    x > bounds.maxX - agentRadius ||
    z < bounds.minZ + agentRadius ||
    z > bounds.maxZ - agentRadius
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

export function sampleWanderTarget(
  home: Vec2,
  random: () => number,
  homeRadius = getDefaultHomeRadius(),
  agentRadius = DEFAULT_AGENT_RADIUS,
): Vec2 | null {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const dist = 2.2 + random() * Math.max(0.5, homeRadius - 2.2);
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
    state =
      (Math.imul(state ^ (state >>> 15), state | 1) +
        Math.imul(state ^ (state >>> 7), state | 61)) >>>
      0;
    return (state ^ (state >>> 14)) / 4294967296;
  };
}
