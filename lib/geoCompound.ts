/**
 * 五亩四进中式合院：坐北朝南（+Z 南门，-Z 北园）。
 * 房子在北正房与东/西厢；南面仅大门墙（无倒座/厢房）；中间是院子 + 拱门隔墙。
 * 1 亩 ≈ 666.67 m² → 5 亩 ≈ 3333 m² → 约 48×69.4 m 纵深方院。
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const MU_TO_M2 = 666.67;
export const COMPOUND_MU = 5;
/** 东西向宽度（米） */
export const COMPOUND_WIDTH = 48;
/** 南北向进深（米），保持约五亩 */
export const COMPOUND_DEPTH = (COMPOUND_MU * MU_TO_M2) / COMPOUND_WIDTH;
export const COMPOUND_HALF_X = COMPOUND_WIDTH * 0.5;
export const COMPOUND_HALF_Z = COMPOUND_DEPTH * 0.5;
/** @deprecated 用 COMPOUND_WIDTH；南墙壁画宽度 */
export const COMPOUND_SIDE = COMPOUND_WIDTH;
/** @deprecated 南门 Z 请用 COMPOUND_HALF_Z */
export const COMPOUND_HALF = COMPOUND_HALF_Z;

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

const FOUNDATION_H = 0.35;
const WALL_H = 4.0;
const HALL_H = 5.2;
const MAIN_H = 6.2;
const ROOF_H = 2.4;
const MAIN_ROOF_H = 3.1;
const WALL_T = 0.42;
const HALL_DEPTH = 5.6;
const WING_DEPTH = 5.0;
/** 正房进深（含台基余量） */
const MAIN_HALL_DEPTH = HALL_DEPTH + 0.9;
/** 北端正房面宽：接到东西厢内侧，不留左右空档 */
const MAIN_HALL_SPAN = 2 * (COMPOUND_HALF_X - WING_DEPTH - 0.35);
/** 拱门隔墙宽度（接到厢房） */
const ARCH_WALL_W = MAIN_HALL_SPAN - 1.2;
/** 正房中心：北立面贴紧北围墙内侧 */
const MAIN_HALL_Z =
  -(COMPOUND_HALF_Z - WALL_T - MAIN_HALL_DEPTH * 0.5 - 0.08);

/** 四进院落：中间大面积空庭，仅拱门墙分隔 */
export const COURTYARDS = {
  first: { cx: 0, cz: 24.5, w: 34, d: 12 },
  second: { cx: 0, cz: 9.5, w: 34, d: 12 },
  third: { cx: 0, cz: -5.5, w: 35, d: 12 },
  fourth: { cx: 0, cz: -20.5, w: 36, d: 13 },
} as const;

/** 南大门洞净宽（米） */
export const GATE_OPENING_W = 6.4;
/** 门墩外缘 |x|（门洞半宽 + 墩宽），石狮须摆在此外侧以免埋进白墙 */
export const GATE_PIER_OUTER_X =
  GATE_OPENING_W * 0.5 + 1.85 * 0.35 + 1.85 * 0.5;

export const COMPOUND_LANDMARKS = {
  gate: { x: 0, z: COMPOUND_HALF_Z - 0.4 },
  /** 门外两侧完整石狮：门墩外缘外侧 + 门廊前，避免埋进白墩 */
  gateLions: {
    left: { x: -(GATE_PIER_OUTER_X + 0.85), z: COMPOUND_HALF_Z + 4.4 },
    right: { x: GATE_PIER_OUTER_X + 0.85, z: COMPOUND_HALF_Z + 4.4 },
  },
  /** 影壁（门内，不是房子） */
  screenWall: { x: 0, z: 28.5 },
  /** 中间三道拱门墙（不是房子） */
  arch1: { z: 16.5 },
  arch2: { z: 2.0 },
  arch3: { z: -13.0 },
  /** 北边房子：正房（贴北墙） */
  mainHall: { z: MAIN_HALL_Z },
  rockery: { x: -8.5, z: -19.5 },
  koiPond: { x: 7.5, z: -17.5 },
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
  const prepared = parts.map((part) => {
    if (part.index) {
      const nonIndexed = part.toNonIndexed();
      part.dispose();
      return nonIndexed;
    }
    return part;
  });
  const merged = mergeGeometries(prepared, false);
  for (const part of prepared) part.dispose();
  if (!merged) {
    console.error("mergeGeometries failed", prepared.length);
  }
  return merged;
}

const ROOF_TEXTURE_TILE = 2.35;

type RoofVert = { p: [number, number, number]; uv: [number, number] };

function addGableRoof(
  parts: Parts,
  cx: number,
  baseY: number,
  cz: number,
  width: number,
  depth: number,
  roofH: number,
  axis: "z" | "x" = "z",
): void {
  const hw = width * 0.5 + 0.35;
  const hd = depth * 0.5 + 0.2;
  const h = Math.max(roofH, 1.2);
  const verts: RoofVert[] = [];
  const pushTri = (a: RoofVert, b: RoofVert, c: RoofVert) => {
    verts.push(a, b, c);
  };

  if (axis === "z") {
    const slopeLen = Math.hypot(hd, h);
    const slopeUv = (x: number, z: number): [number, number] => [
      (x + hw) / ROOF_TEXTURE_TILE,
      (Math.abs(z) / hd) * (slopeLen / ROOF_TEXTURE_TILE),
    ];
    const gableUv = (z: number, y: number): [number, number] => [
      (z + hd) / ROOF_TEXTURE_TILE,
      y / ROOF_TEXTURE_TILE,
    ];

    const S0: RoofVert = { p: [-hw, 0, hd], uv: slopeUv(-hw, hd) };
    const S1: RoofVert = { p: [hw, 0, hd], uv: slopeUv(hw, hd) };
    const N0: RoofVert = { p: [-hw, 0, -hd], uv: slopeUv(-hw, -hd) };
    const N1: RoofVert = { p: [hw, 0, -hd], uv: slopeUv(hw, -hd) };
    const P0: RoofVert = { p: [-hw, h, 0], uv: slopeUv(-hw, 0) };
    const P1: RoofVert = { p: [hw, h, 0], uv: slopeUv(hw, 0) };

    pushTri(S0, S1, { p: P1.p, uv: slopeUv(hw, 0) });
    pushTri(S0, { p: P1.p, uv: slopeUv(hw, 0) }, { p: P0.p, uv: slopeUv(-hw, 0) });
    pushTri(P0, P1, { p: N1.p, uv: slopeUv(hw, -hd) });
    pushTri(P0, { p: N1.p, uv: slopeUv(hw, -hd) }, { p: N0.p, uv: slopeUv(-hw, -hd) });
    pushTri(
      { p: N0.p, uv: gableUv(-hd, 0) },
      { p: S0.p, uv: gableUv(hd, 0) },
      { p: P0.p, uv: gableUv(0, h) },
    );
    pushTri(
      { p: S1.p, uv: gableUv(hd, 0) },
      { p: N1.p, uv: gableUv(-hd, 0) },
      { p: P1.p, uv: gableUv(0, h) },
    );
  } else {
    const slopeLen = Math.hypot(hw, h);
    const slopeUv = (x: number, z: number): [number, number] => [
      (z + hd) / ROOF_TEXTURE_TILE,
      (Math.abs(x) / hw) * (slopeLen / ROOF_TEXTURE_TILE),
    ];
    const gableUv = (x: number, y: number): [number, number] => [
      (x + hw) / ROOF_TEXTURE_TILE,
      y / ROOF_TEXTURE_TILE,
    ];

    const E0: RoofVert = { p: [hw, 0, -hd], uv: slopeUv(hw, -hd) };
    const E1: RoofVert = { p: [hw, 0, hd], uv: slopeUv(hw, hd) };
    const W0: RoofVert = { p: [-hw, 0, -hd], uv: slopeUv(-hw, -hd) };
    const W1: RoofVert = { p: [-hw, 0, hd], uv: slopeUv(-hw, hd) };
    const P0: RoofVert = { p: [0, h, -hd], uv: slopeUv(0, -hd) };
    const P1: RoofVert = { p: [0, h, hd], uv: slopeUv(0, hd) };

    pushTri(E0, E1, { p: P1.p, uv: slopeUv(0, hd) });
    pushTri(E0, { p: P1.p, uv: slopeUv(0, hd) }, { p: P0.p, uv: slopeUv(0, -hd) });
    pushTri(P0, P1, { p: W1.p, uv: slopeUv(-hw, hd) });
    pushTri(P0, { p: W1.p, uv: slopeUv(-hw, hd) }, { p: W0.p, uv: slopeUv(-hw, -hd) });
    pushTri(
      { p: W1.p, uv: gableUv(-hw, 0) },
      { p: E1.p, uv: gableUv(hw, 0) },
      { p: P1.p, uv: gableUv(0, h) },
    );
    pushTri(
      { p: E0.p, uv: gableUv(hw, 0) },
      { p: W0.p, uv: gableUv(-hw, 0) },
      { p: P0.p, uv: gableUv(0, h) },
    );
  }

  const positions = new Float32Array(verts.length * 3);
  const uvs = new Float32Array(verts.length * 2);
  for (let i = 0; i < verts.length; i += 1) {
    positions[i * 3] = verts[i].p[0];
    positions[i * 3 + 1] = verts[i].p[1];
    positions[i * 3 + 2] = verts[i].p[2];
    uvs[i * 2] = verts[i].uv[0];
    uvs[i * 2 + 1] = verts[i].uv[1];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.translate(cx, baseY, cz);
  parts.roofs.push(geometry);

  if (axis === "z") {
    parts.roofs.push(box(width + 0.5, 0.22, 0.28, cx, baseY + h + 0.05, cz));
  } else {
    parts.roofs.push(box(0.28, 0.22, depth + 0.4, cx, baseY + h + 0.05, cz));
  }
}

function addHall(
  parts: Parts,
  cz: number,
  height: number,
  roofH: number,
  width: number,
  depth: number,
  options?: { main?: boolean; door?: boolean; doorFace?: "south" | "north" },
): void {
  const y = FOUNDATION_H + height * 0.5;
  const doorFace = options?.doorFace ?? "south";
  const doorZ =
    doorFace === "south" ? cz + depth * 0.5 + 0.05 : cz - depth * 0.5 - 0.05;

  parts.foundations.push(
    box(width + 0.4, FOUNDATION_H, depth + 0.4, 0, FOUNDATION_H * 0.5, cz),
  );
  parts.walls.push(box(width, height, depth, 0, y, cz));
  addGableRoof(parts, 0, FOUNDATION_H + height, cz, width, depth, roofH);

  if (options?.door !== false) {
    const doorW = options?.main ? 2.8 : 2.1;
    const doorH = options?.main ? 3.6 : 2.9;
    parts.woodwork.push(
      box(doorW + 0.35, 0.22, 0.28, 0, FOUNDATION_H + doorH + 0.1, doorZ),
    );
    parts.woodwork.push(
      box(0.22, doorH, 0.28, -doorW * 0.5, FOUNDATION_H + doorH * 0.5, doorZ),
    );
    parts.woodwork.push(
      box(0.22, doorH, 0.28, doorW * 0.5, FOUNDATION_H + doorH * 0.5, doorZ),
    );
  }

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
  if (depth < 1.2) return;
  const cz = (z0 + z1) * 0.5;
  const cx = xSign * (COMPOUND_HALF_X - WING_DEPTH * 0.5 - 0.3);
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
    depth * 0.94,
    ROOF_H * 0.85,
    "x",
  );
  const inward = -xSign;
  const winCount = Math.max(1, Math.floor(depth / 4.2));
  for (let i = 0; i < winCount; i += 1) {
    const wz = z0 + ((i + 0.5) / winCount) * (z1 - z0);
    parts.woodwork.push(
      box(
        0.12,
        1.35,
        1.45,
        cx + inward * (WING_DEPTH * 0.5 + 0.02),
        FOUNDATION_H + height * 0.52,
        wz,
      ),
    );
  }
}

function addPerimeter(parts: Parts): void {
  const h = WALL_H;
  const y = FOUNDATION_H + h * 0.5;
  const hx = COMPOUND_HALF_X;
  const hz = COMPOUND_HALF_Z;
  const t = WALL_T;
  const gateW = GATE_OPENING_W;
  const footH = FOUNDATION_H + 0.12;
  const footY = footH * 0.5 - 0.08;
  const footT = t + 0.28;

  // 东 / 西 / 北墙
  parts.walls.push(box(footT, footH, COMPOUND_DEPTH + 0.2, hx - t * 0.5, footY, 0));
  parts.walls.push(box(footT, footH, COMPOUND_DEPTH + 0.2, -(hx - t * 0.5), footY, 0));
  parts.walls.push(box(COMPOUND_WIDTH + 0.2, footH, footT, 0, footY, -(hz - t * 0.5)));
  parts.walls.push(box(t, h, COMPOUND_DEPTH, hx - t * 0.5, y, 0));
  parts.walls.push(box(t, h, COMPOUND_DEPTH, -(hx - t * 0.5), y, 0));
  parts.walls.push(box(COMPOUND_WIDTH, h, t, 0, y, -(hz - t * 0.5)));

  // 南墙：大门两侧
  const sideW = (COMPOUND_WIDTH - gateW) * 0.5;
  const southZ = hz - t * 0.5;
  const southFootX = gateW * 0.5 + sideW * 0.5;
  parts.walls.push(box(sideW + 0.15, footH, footT, -southFootX, footY, southZ));
  parts.walls.push(box(sideW + 0.15, footH, footT, southFootX, footY, southZ));
  parts.walls.push(box(sideW, h, t, -southFootX, y, southZ));
  parts.walls.push(box(sideW, h, t, southFootX, y, southZ));

  // 大气门楼
  const pierW = 1.85;
  const pierD = 3.4;
  const gateH = h + 2.6;
  const pierX = gateW * 0.5 + pierW * 0.35;
  const porchZ = southZ + 1.15;

  parts.walls.push(box(gateW + pierW * 2.2, footH, pierD + 1.2, 0, footY, porchZ - 0.2));
  parts.walls.push(
    box(pierW, gateH, pierD, -pierX, FOUNDATION_H + gateH * 0.5, porchZ),
  );
  parts.walls.push(
    box(pierW, gateH, pierD, pierX, FOUNDATION_H + gateH * 0.5, porchZ),
  );
  parts.walls.push(
    box(pierW + 0.35, 0.28, pierD + 0.35, -pierX, FOUNDATION_H + gateH + 0.05, porchZ),
  );
  parts.walls.push(
    box(pierW + 0.35, 0.28, pierD + 0.35, pierX, FOUNDATION_H + gateH + 0.05, porchZ),
  );
  parts.woodwork.push(
    box(gateW + 0.4, 0.55, 0.55, 0, FOUNDATION_H + gateH - 0.35, porchZ + 0.55),
  );
  parts.accents.push(
    box(gateW * 0.72, 0.85, 0.12, 0, FOUNDATION_H + gateH - 1.05, porchZ + 0.85),
  );
  parts.woodwork.push(
    box(gateW * 0.78, 0.12, 0.18, 0, FOUNDATION_H + gateH - 0.55, porchZ + 0.9),
  );
  parts.woodwork.push(
    box(gateW * 0.78, 0.12, 0.18, 0, FOUNDATION_H + gateH - 1.55, porchZ + 0.9),
  );
  for (const sx of [-1, 1] as const) {
    parts.woodwork.push(
      box(0.32, gateH * 0.92, 0.32, sx * (gateW * 0.38), FOUNDATION_H + gateH * 0.46, porchZ + 1.05),
    );
  }
  addGableRoof(
    parts,
    0,
    FOUNDATION_H + gateH * 0.78,
    porchZ + 0.15,
    gateW + pierW * 2.8,
    pierD + 1.4,
    1.55,
  );
  addGableRoof(
    parts,
    0,
    FOUNDATION_H + gateH + 0.15,
    porchZ,
    gateW + pierW * 1.6,
    pierD * 0.85,
    2.15,
  );

  for (let i = 0; i < 3; i += 1) {
    const stepW = gateW + 1.6 - i * 0.35;
    parts.foundations.push(
      box(
        stepW,
        0.16,
        0.55,
        0,
        0.08 + i * 0.14,
        southZ + pierD * 0.35 + 1.55 + i * 0.48,
      ),
    );
  }
}

function addScreenWall(parts: Parts): void {
  const { x, z } = COMPOUND_LANDMARKS.screenWall;
  parts.foundations.push(box(9.2, FOUNDATION_H, 1.2, x, FOUNDATION_H * 0.5, z));
  parts.walls.push(box(8.8, 3.8, 0.55, x, FOUNDATION_H + 1.9, z));
  parts.accents.push(box(7.8, 2.6, 0.08, x, FOUNDATION_H + 2.0, z + 0.32));
  parts.woodwork.push(box(9.2, 0.22, 0.75, x, FOUNDATION_H + 3.9, z));
  addGableRoof(parts, x, FOUNDATION_H + 3.95, z, 9.6, 1.4, 1.15);
}

/**
 * 拱门隔墙：左右实墙 + 上方过梁，中开干净门洞（无叠块穿模）。
 */
function addArchWall(parts: Parts, cz: number): void {
  const wallWidth = ARCH_WALL_W;
  const wallH = 4.1;
  const wallT = 0.55;
  const y = FOUNDATION_H + wallH * 0.5;
  const openW = 4.8;
  const openH = 3.45;
  const side = (wallWidth - openW) * 0.5;
  const wallTop = FOUNDATION_H + wallH;
  const lintelH = wallH - openH;

  // 左右实墙接到厢房（全高）
  parts.walls.push(box(side, wallH, wallT, -(openW * 0.5 + side * 0.5), y, cz));
  parts.walls.push(box(side, wallH, wallT, openW * 0.5 + side * 0.5, y, cz));

  // 门洞上方过梁（与左右墙齐平对接，不重叠）
  parts.walls.push(
    box(openW, lintelH, wallT, 0, FOUNDATION_H + openH + lintelH * 0.5, cz),
  );

  // 压顶条：整段在墙顶之上
  parts.walls.push(box(wallWidth + 0.2, 0.18, wallT + 0.16, 0, wallTop + 0.1, cz));

  // 木色门楣（贴在过梁南立面外侧，不插入墙体）
  parts.woodwork.push(
    box(openW * 0.9, 0.22, 0.1, 0, FOUNDATION_H + openH + 0.2, cz + wallT * 0.5 + 0.06),
  );
}

function addCourtyardFloors(parts: Parts): void {
  for (const yard of Object.values(COURTYARDS)) {
    const g = new THREE.BoxGeometry(yard.w, 0.06, yard.d);
    g.translate(yard.cx, 0.02, yard.cz);
    parts.courtyards.push(g);
  }
}

function addCorridorPosts(parts: Parts): void {
  const postH = 3.0;
  const skipZs = [
    COMPOUND_LANDMARKS.mainHall.z,
    COMPOUND_LANDMARKS.arch1.z,
    COMPOUND_LANDMARKS.arch2.z,
    COMPOUND_LANDMARKS.arch3.z,
  ];
  // 贴厢房内侧，不占院子中央；南端避开大门
  for (const xSign of [-1, 1] as const) {
    const x = xSign * 16.6;
    const postZ0 = COMPOUND_LANDMARKS.arch1.z - 1.5;
    const postZ1 = COMPOUND_LANDMARKS.mainHall.z + 4;
    for (let z = postZ1; z <= postZ0; z += 3.2) {
      if (skipZs.some((sz) => Math.abs(z - sz) < 2.6)) continue;
      parts.woodwork.push(box(0.24, postH, 0.24, x, FOUNDATION_H + postH * 0.5, z));
      parts.woodwork.push(box(1.8, 0.12, 0.18, x, FOUNDATION_H + postH + 0.04, z));
    }
  }
}

export function buildCompoundLayers(): CompoundLayers {
  const parts = emptyParts();

  addPerimeter(parts);
  addScreenWall(parts);
  addCourtyardFloors(parts);

  // —— 房子：北正房 + 东/西厢；南面只有大门墙，无倒座/厢房 ——
  addHall(
    parts,
    COMPOUND_LANDMARKS.mainHall.z,
    MAIN_H,
    MAIN_ROOF_H,
    MAIN_HALL_SPAN,
    MAIN_HALL_DEPTH,
    { main: true },
  );
  // 厢房：南起第一道拱门，北接到北围墙，与正房围成封闭后进
  const wingSouth = COMPOUND_LANDMARKS.arch1.z - 0.8;
  const wingNorth = -(COMPOUND_HALF_Z - WALL_T - 0.15);
  addWingSegment(parts, 1, wingSouth, wingNorth, HALL_H * 0.95);
  addWingSegment(parts, -1, wingSouth, wingNorth, HALL_H * 0.95);

  // —— 中间：只有拱门墙 ——
  addArchWall(parts, COMPOUND_LANDMARKS.arch1.z);
  addArchWall(parts, COMPOUND_LANDMARKS.arch2.z);
  addArchWall(parts, COMPOUND_LANDMARKS.arch3.z);

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
  const radius = Math.hypot(COMPOUND_HALF_X, COMPOUND_HALF_Z) * 1.05 + MAIN_H;
  return new THREE.Sphere(new THREE.Vector3(0, MAIN_H * 0.4, 0), radius);
}

/** 合院建筑占地障碍（供游荡避障） */
export function buildCompoundObstacles(): readonly {
  kind: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}[] {
  const hx = COMPOUND_HALF_X;
  const hz = COMPOUND_HALF_Z;
  const wingInner = hx - WING_DEPTH - 0.45;
  const hallHalfD = MAIN_HALL_DEPTH * 0.5 + 0.35;
  const mainHalfW = MAIN_HALL_SPAN * 0.5 + 0.2;
  const archHalf = ARCH_WALL_W * 0.5;
  const archOpen = 2.4;

  const archObstacles = (
    [COMPOUND_LANDMARKS.arch1.z, COMPOUND_LANDMARKS.arch2.z, COMPOUND_LANDMARKS.arch3.z] as const
  ).flatMap((z) => [
    {
      kind: "box" as const,
      minX: -archHalf,
      maxX: -archOpen,
      minZ: z - 0.55,
      maxZ: z + 0.55,
    },
    {
      kind: "box" as const,
      minX: archOpen,
      maxX: archHalf,
      minZ: z - 0.55,
      maxZ: z + 0.55,
    },
  ]);

  return [
    { kind: "box", minX: hx - WALL_T - 0.3, maxX: hx, minZ: -hz, maxZ: hz },
    { kind: "box", minX: -hx, maxX: -(hx - WALL_T - 0.3), minZ: -hz, maxZ: hz },
    { kind: "box", minX: -hx, maxX: hx, minZ: -hz, maxZ: -(hz - WALL_T - 0.3) },
    {
      kind: "box",
      minX: -hx,
      maxX: -GATE_OPENING_W * 0.5,
      minZ: hz - WALL_T - 0.3,
      maxZ: hz,
    },
    {
      kind: "box",
      minX: GATE_OPENING_W * 0.5,
      maxX: hx,
      minZ: hz - WALL_T - 0.3,
      maxZ: hz,
    },
    {
      kind: "box",
      minX: COMPOUND_LANDMARKS.gateLions.left.x - 0.9,
      maxX: COMPOUND_LANDMARKS.gateLions.left.x + 0.9,
      minZ: COMPOUND_LANDMARKS.gateLions.left.z - 0.9,
      maxZ: COMPOUND_LANDMARKS.gateLions.left.z + 0.9,
    },
    {
      kind: "box",
      minX: COMPOUND_LANDMARKS.gateLions.right.x - 0.9,
      maxX: COMPOUND_LANDMARKS.gateLions.right.x + 0.9,
      minZ: COMPOUND_LANDMARKS.gateLions.right.z - 0.9,
      maxZ: COMPOUND_LANDMARKS.gateLions.right.z + 0.9,
    },
    {
      kind: "box",
      minX: -mainHalfW,
      maxX: mainHalfW,
      minZ: COMPOUND_LANDMARKS.mainHall.z - hallHalfD - 0.45,
      maxZ: COMPOUND_LANDMARKS.mainHall.z + hallHalfD + 0.45,
    },
    {
      kind: "box",
      minX: wingInner,
      maxX: hx - 0.2,
      minZ: -(hz - WALL_T - 0.1),
      maxZ: COMPOUND_LANDMARKS.arch1.z - 0.8,
    },
    {
      kind: "box",
      minX: -(hx - 0.2),
      maxX: -wingInner,
      minZ: -(hz - WALL_T - 0.1),
      maxZ: COMPOUND_LANDMARKS.arch1.z - 0.8,
    },
    { kind: "box", minX: -4.6, maxX: 4.6, minZ: 27.9, maxZ: 29.2 },
    ...archObstacles,
  ];
}
