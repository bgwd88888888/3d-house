/**
 * 五亩四进中式合院：坐北朝南（+Z 南门，-Z 北园）。
 * 1 亩 ≈ 666.67 m² → 5 亩 ≈ 3333 m² → 约 58×58 m 方院。
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const MU_TO_M2 = 666.67;
export const COMPOUND_MU = 5;
/** 方院边长（米），≈ √(5×666.67) */
export const COMPOUND_SIDE = Math.sqrt(COMPOUND_MU * MU_TO_M2); // ~57.74
export const COMPOUND_HALF = COMPOUND_SIDE * 0.5;

export type CompoundLayers = {
  foundations: THREE.BufferGeometry | null;
  walls: THREE.BufferGeometry | null;
  roofs: THREE.BufferGeometry | null;
  woodwork: THREE.BufferGeometry | null;
  courtyards: THREE.BufferGeometry | null;
  accents: THREE.BufferGeometry | null;
};

type Parts = {
  foundations: THREE.BufferGeometry[];
  walls: THREE.BufferGeometry[];
  roofs: THREE.BufferGeometry[];
  woodwork: THREE.BufferGeometry[];
  courtyards: THREE.BufferGeometry[];
  accents: THREE.BufferGeometry[];
};

/** 四进院落中心与尺寸（供路径/假山/人物摆放） */
export const COURTYARDS = {
  /** 一进：门内影壁前 */
  first: { cx: 0, cz: 24.2, w: 42, d: 7.2 },
  /** 二进：会客 */
  second: { cx: 0, cz: 14.8, w: 42, d: 8.2 },
  /** 三进：正厅主院 */
  third: { cx: 0, cz: 3.2, w: 42, d: 10.5 },
  /** 四进：后花园（假山鱼池） */
  fourth: { cx: 0, cz: -14.5, w: 44, d: 18 },
} as const;

export const COMPOUND_LANDMARKS = {
  gate: { x: 0, z: COMPOUND_HALF - 0.4 },
  screenWall: { x: 0, z: 25.6 },
  hall1: { z: 20.6 },
  hall2: { z: 10.2 },
  mainHall: { z: -2.4 },
  rearHall: { z: -24.2 },
  rockery: { x: -9.5, z: -16.5 },
  koiPond: { x: 7.2, z: -13.8 },
} as const;

export const KOI_POND_OBSTACLE = {
  kind: "circle" as const,
  x: COMPOUND_LANDMARKS.koiPond.x,
  z: COMPOUND_LANDMARKS.koiPond.z,
  radius: 2.8,
};

export const ROCKERY_OBSTACLE = {
  kind: "circle" as const,
  x: COMPOUND_LANDMARKS.rockery.x,
  z: COMPOUND_LANDMARKS.rockery.z,
  radius: 2.6,
};

const FOUNDATION_H = 0.35;
const WALL_H = 4.0;
const HALL_H = 5.2;
const MAIN_H = 6.0;
const ROOF_H = 2.4;
const MAIN_ROOF_H = 2.9;
const WALL_T = 0.42;
const HALL_DEPTH = 5.8;
const WING_DEPTH = 5.4;

function emptyParts(): Parts {
  return {
    foundations: [],
    walls: [],
    roofs: [],
    woodwork: [],
    courtyards: [],
    accents: [],
  };
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

/** 硬山顶：两坡盒体近似 */
function addGableRoof(
  parts: Parts,
  cx: number,
  baseY: number,
  cz: number,
  width: number,
  depth: number,
  roofH: number,
): void {
  const half = depth * 0.52;
  const thick = 0.22;
  // 南坡 / 北坡：旋转的薄板
  for (const sign of [-1, 1] as const) {
    const g = new THREE.BoxGeometry(width + 0.8, thick, half + 0.35);
    g.translate(0, 0, sign * (half * 0.5));
    g.rotateX(sign * -0.48);
    g.translate(cx, baseY + roofH * 0.42, cz);
    parts.roofs.push(g);
  }
  // 正脊
  parts.roofs.push(
    box(width + 0.5, 0.28, 0.35, cx, baseY + roofH * 0.85, cz),
  );
}

function addHall(
  parts: Parts,
  cz: number,
  height: number,
  roofH: number,
  width: number,
  depth: number,
  options?: { main?: boolean; door?: boolean },
): void {
  const y = FOUNDATION_H + height * 0.5;
  parts.foundations.push(
    box(width + 0.4, FOUNDATION_H, depth + 0.4, 0, FOUNDATION_H * 0.5, cz),
  );
  parts.walls.push(box(width, height, depth, 0, y, cz));
  addGableRoof(parts, 0, FOUNDATION_H + height, cz, width, depth, roofH);

  // 门洞暗示（木色门框）
  if (options?.door !== false) {
    const doorW = options?.main ? 2.6 : 2.1;
    const doorH = options?.main ? 3.4 : 2.9;
    parts.woodwork.push(
      box(doorW + 0.35, 0.22, 0.28, 0, FOUNDATION_H + doorH + 0.1, cz + depth * 0.5 + 0.05),
    );
    parts.woodwork.push(
      box(0.22, doorH, 0.28, -doorW * 0.5, FOUNDATION_H + doorH * 0.5, cz + depth * 0.5 + 0.05),
    );
    parts.woodwork.push(
      box(0.22, doorH, 0.28, doorW * 0.5, FOUNDATION_H + doorH * 0.5, cz + depth * 0.5 + 0.05),
    );
  }

  // 窗棂色带
  const winY = FOUNDATION_H + height * 0.55;
  for (const wx of [-width * 0.28, width * 0.28]) {
    parts.woodwork.push(box(1.4, 1.5, 0.12, wx, winY, cz + depth * 0.5 + 0.02));
    parts.woodwork.push(box(1.4, 1.5, 0.12, wx, winY, cz - depth * 0.5 - 0.02));
  }
}

function addWingSegment(
  parts: Parts,
  xSign: 1 | -1,
  z0: number,
  z1: number,
  height: number,
): void {
  const depth = Math.abs(z1 - z0);
  const cz = (z0 + z1) * 0.5;
  const cx = xSign * (COMPOUND_HALF - WING_DEPTH * 0.5 - 0.35);
  const y = FOUNDATION_H + height * 0.5;
  parts.foundations.push(
    box(WING_DEPTH + 0.3, FOUNDATION_H, depth + 0.2, cx, FOUNDATION_H * 0.5, cz),
  );
  parts.walls.push(box(WING_DEPTH, height, depth, cx, y, cz));
  addGableRoof(
    parts,
    cx,
    FOUNDATION_H + height,
    cz,
    WING_DEPTH + 0.2,
    depth * 0.92,
    ROOF_H * 0.85,
  );
  // 朝院内的窗
  const inward = -xSign;
  parts.woodwork.push(
    box(0.12, 1.35, 1.5, cx + inward * (WING_DEPTH * 0.5 + 0.02), FOUNDATION_H + height * 0.52, cz),
  );
}

function addPerimeter(parts: Parts): void {
  const h = WALL_H;
  const y = FOUNDATION_H + h * 0.5;
  const half = COMPOUND_HALF;
  const t = WALL_T;
  const gateW = 4.8;

  // 东/西/北实墙
  parts.walls.push(box(t, h, COMPOUND_SIDE, half - t * 0.5, y, 0));
  parts.walls.push(box(t, h, COMPOUND_SIDE, -(half - t * 0.5), y, 0));
  parts.walls.push(box(COMPOUND_SIDE, h, t, 0, y, -(half - t * 0.5)));

  // 南墙：大门两侧
  const sideW = (COMPOUND_SIDE - gateW) * 0.5;
  const southZ = half - t * 0.5;
  parts.walls.push(
    box(sideW, h, t, -(gateW * 0.5 + sideW * 0.5), y, southZ),
  );
  parts.walls.push(
    box(sideW, h, t, gateW * 0.5 + sideW * 0.5, y, southZ),
  );

  // 门楼
  const gateH = h + 1.4;
  parts.foundations.push(
    box(gateW + 2.2, FOUNDATION_H, 2.4, 0, FOUNDATION_H * 0.5, southZ),
  );
  parts.walls.push(box(1.1, gateH, 1.8, -gateW * 0.5 - 0.2, FOUNDATION_H + gateH * 0.5, southZ));
  parts.walls.push(box(1.1, gateH, 1.8, gateW * 0.5 + 0.2, FOUNDATION_H + gateH * 0.5, southZ));
  parts.woodwork.push(
    box(gateW + 0.6, 0.35, 0.4, 0, FOUNDATION_H + gateH - 0.15, southZ + 0.2),
  );
  addGableRoof(parts, 0, FOUNDATION_H + gateH, southZ, gateW + 2.4, 2.2, 1.8);

  // 大门门扇暗示
  parts.woodwork.push(
    box(1.9, 3.2, 0.16, -1.05, FOUNDATION_H + 1.7, southZ - 0.15),
  );
  parts.woodwork.push(
    box(1.9, 3.2, 0.16, 1.05, FOUNDATION_H + 1.7, southZ - 0.15),
  );
}

function addScreenWall(parts: Parts): void {
  const { x, z } = COMPOUND_LANDMARKS.screenWall;
  parts.foundations.push(box(8.5, FOUNDATION_H, 1.1, x, FOUNDATION_H * 0.5, z));
  parts.walls.push(box(8.2, 3.6, 0.55, x, FOUNDATION_H + 1.8, z));
  parts.accents.push(box(7.4, 2.4, 0.08, x, FOUNDATION_H + 1.9, z + 0.32));
  parts.woodwork.push(box(8.6, 0.2, 0.7, x, FOUNDATION_H + 3.7, z));
}

function addCourtyardFloors(parts: Parts): void {
  for (const yard of Object.values(COURTYARDS)) {
    const g = new THREE.BoxGeometry(yard.w, 0.06, yard.d);
    g.translate(yard.cx, 0.02, yard.cz);
    parts.courtyards.push(g);
  }
}

function addMoonGate(
  parts: Parts,
  cz: number,
  wallWidth: number,
): void {
  // 横向隔墙上的月洞门：两侧墙 + 上拱暗示
  const opening = 3.6;
  const side = (wallWidth - opening) * 0.5;
  const h = 3.8;
  const y = FOUNDATION_H + h * 0.5;
  parts.walls.push(box(side, h, 0.5, -(opening * 0.5 + side * 0.5), y, cz));
  parts.walls.push(box(side, h, 0.5, opening * 0.5 + side * 0.5, y, cz));
  parts.walls.push(box(opening + 0.8, 0.55, 0.55, 0, FOUNDATION_H + h - 0.1, cz));
  parts.woodwork.push(box(opening * 0.92, 0.18, 0.35, 0, FOUNDATION_H + 3.15, cz + 0.05));
}

/** 游廊柱列：一步一景的节奏感 */
function addCorridorPosts(parts: Parts): void {
  const postH = 3.1;
  for (const xSign of [-1, 1] as const) {
    const x = xSign * 18.5;
    for (let z = -20; z <= 26; z += 3.2) {
      // 避开厅堂实体
      if (Math.abs(z - 20.6) < 3.2) continue;
      if (Math.abs(z - 10.2) < 3.2) continue;
      if (Math.abs(z + 2.4) < 3.5) continue;
      if (Math.abs(z + 24.2) < 3) continue;
      parts.woodwork.push(
        box(0.28, postH, 0.28, x, FOUNDATION_H + postH * 0.5, z),
      );
      parts.woodwork.push(
        box(2.4, 0.16, 0.22, x, FOUNDATION_H + postH + 0.05, z),
      );
    }
  }
}

export function buildCompoundLayers(): CompoundLayers {
  const parts = emptyParts();

  addPerimeter(parts);
  addScreenWall(parts);
  addCourtyardFloors(parts);

  // 四进厅堂（南→北）
  addHall(parts, COMPOUND_LANDMARKS.hall1.z, HALL_H * 0.92, ROOF_H, 46, HALL_DEPTH);
  addHall(parts, COMPOUND_LANDMARKS.hall2.z, HALL_H, ROOF_H, 46, HALL_DEPTH);
  addHall(parts, COMPOUND_LANDMARKS.mainHall.z, MAIN_H, MAIN_ROOF_H, 48, HALL_DEPTH + 0.6, {
    main: true,
  });
  addHall(parts, COMPOUND_LANDMARKS.rearHall.z, HALL_H * 0.88, ROOF_H * 0.9, 46, HALL_DEPTH - 0.4);

  // 厢房分段
  addWingSegment(parts, 1, 21.5, 27.5, HALL_H * 0.85);
  addWingSegment(parts, -1, 21.5, 27.5, HALL_H * 0.85);
  addWingSegment(parts, 1, 11, 19.5, HALL_H * 0.9);
  addWingSegment(parts, -1, 11, 19.5, HALL_H * 0.9);
  addWingSegment(parts, 1, -1.5, 9, HALL_H);
  addWingSegment(parts, -1, -1.5, 9, HALL_H);
  addWingSegment(parts, 1, -23, -3.5, HALL_H * 0.88);
  addWingSegment(parts, -1, -23, -3.5, HALL_H * 0.88);

  // 月洞门节奏（二进/三进/后园入口）
  addMoonGate(parts, 17.4, 20);
  addMoonGate(parts, 6.6, 22);
  addMoonGate(parts, -6.8, 24);

  addCorridorPosts(parts);

  return {
    foundations: merge(parts.foundations),
    walls: merge(parts.walls),
    roofs: merge(parts.roofs),
    woodwork: merge(parts.woodwork),
    courtyards: merge(parts.courtyards),
    accents: merge(parts.accents),
  };
}

export function estimateCompoundBounds(): THREE.Sphere {
  const radius = COMPOUND_HALF * 1.15 + MAIN_H;
  return new THREE.Sphere(new THREE.Vector3(0, MAIN_H * 0.45, 0), radius);
}

/** 合院建筑占地障碍（供游荡避障） */
export function buildCompoundObstacles(): readonly {
  kind: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}[] {
  const half = COMPOUND_HALF;
  const wingInner = half - WING_DEPTH - 0.5;
  const hallHalfD = HALL_DEPTH * 0.5 + 0.3;
  return [
    // 外围墙带（内侧走道可走，墙体本身）
    { kind: "box", minX: half - WALL_T - 0.3, maxX: half, minZ: -half, maxZ: half },
    { kind: "box", minX: -half, maxX: -(half - WALL_T - 0.3), minZ: -half, maxZ: half },
    { kind: "box", minX: -half, maxX: half, minZ: -half, maxZ: -(half - WALL_T - 0.3) },
    // 南墙（留大门）
    { kind: "box", minX: -half, maxX: -2.5, minZ: half - WALL_T - 0.3, maxZ: half },
    { kind: "box", minX: 2.5, maxX: half, minZ: half - WALL_T - 0.3, maxZ: half },
    // 厅堂
    {
      kind: "box",
      minX: -23,
      maxX: 23,
      minZ: COMPOUND_LANDMARKS.hall1.z - hallHalfD,
      maxZ: COMPOUND_LANDMARKS.hall1.z + hallHalfD,
    },
    {
      kind: "box",
      minX: -23,
      maxX: 23,
      minZ: COMPOUND_LANDMARKS.hall2.z - hallHalfD,
      maxZ: COMPOUND_LANDMARKS.hall2.z + hallHalfD,
    },
    {
      kind: "box",
      minX: -24,
      maxX: 24,
      minZ: COMPOUND_LANDMARKS.mainHall.z - hallHalfD - 0.3,
      maxZ: COMPOUND_LANDMARKS.mainHall.z + hallHalfD + 0.3,
    },
    {
      kind: "box",
      minX: -23,
      maxX: 23,
      minZ: COMPOUND_LANDMARKS.rearHall.z - hallHalfD,
      maxZ: COMPOUND_LANDMARKS.rearHall.z + hallHalfD,
    },
    // 东/西厢
    { kind: "box", minX: wingInner, maxX: half - 0.2, minZ: -23, maxZ: 27.5 },
    { kind: "box", minX: -(half - 0.2), maxX: -wingInner, minZ: -23, maxZ: 27.5 },
    // 影壁
    { kind: "box", minX: -4.2, maxX: 4.2, minZ: 25.1, maxZ: 26.2 },
  ];
}
