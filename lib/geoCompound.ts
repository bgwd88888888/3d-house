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
/** 门墩宽度（与门楼 pierW 一致） */
const GATE_PIER_W = 2.05;
/** 门墩外缘 |x|（门洞半宽 + 墩偏置 + 半墩宽），石狮须摆在此外侧以免埋进白墙 */
export const GATE_PIER_OUTER_X =
  GATE_OPENING_W * 0.5 + GATE_PIER_W * 0.32 + GATE_PIER_W * 0.5;
/** 南墙中心 Z（门楼相对此点前移） */
export const GATE_SOUTH_WALL_Z = COMPOUND_HALF_Z - WALL_T * 0.5;
/** 门楼门墩中心 Z */
export const GATE_PORCH_Z = GATE_SOUTH_WALL_Z + 1.25;
/** 门墩进深（与 addPerimeter 中 pierD 一致） */
const GATE_PIER_D = 3.7;
/**
 * 朱红大门 / 木门框立柱中心 Z。
 * 贴齐门墩南立面，避免门扇缩进门洞深处、与框错位。
 */
export const GATE_FACE_Z = GATE_PORCH_Z + GATE_PIER_D * 0.5 - 0.2;

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

/** 东西厢房朝院内门位（每进一扇） */
const WING_DOOR_ZS = [
  (COMPOUND_LANDMARKS.arch1.z + COMPOUND_LANDMARKS.arch2.z) * 0.5,
  (COMPOUND_LANDMARKS.arch2.z + COMPOUND_LANDMARKS.arch3.z) * 0.5,
  (COMPOUND_LANDMARKS.arch3.z + COMPOUND_LANDMARKS.mainHall.z) * 0.5,
] as const;

/** 四进地面挖洞半径，略大于 AssetQuest 盆体外缘 */
export const KOI_POND_HOLE_RADIUS = 2.95;

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

function scaleBoxUvs(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  depth: number,
  tile: number,
): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;
  const faceScales: [number, number][] = [
    [depth / tile, height / tile],
    [depth / tile, height / tile],
    [width / tile, depth / tile],
    [width / tile, depth / tile],
    [width / tile, height / tile],
    [width / tile, height / tile],
  ];
  for (let face = 0; face < 6; face += 1) {
    const [uScale, vScale] = faceScales[face];
    const base = face * 4;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = base + vertex;
      uv.setXY(index, uv.getX(index) * uScale, uv.getY(index) * vScale);
    }
  }
  uv.needsUpdate = true;
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  scaleUvs = false,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (scaleUvs) scaleBoxUvs(g, w, h, d, WALL_TEXTURE_TILE);
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

/** 略放大瓦片覆盖米数，减轻明显平铺感 */
const ROOF_TEXTURE_TILE = 4.2;
const WALL_TEXTURE_TILE = 2.8;

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

/**
 * 围墙 / 隔墙压顶瓦：矮双坡瓦顶 + 木色檐口，增加层次。
 * axis "x"：墙沿东西向（脊线平行 X）；"z"：墙沿南北向。
 */
function addWallTileCoping(
  parts: Parts,
  cx: number,
  cz: number,
  length: number,
  wallT: number,
  wallTopY: number,
  axis: "x" | "z" = "x",
): void {
  if (length < 1.2) return;
  const eaves = wallT + 0.38;
  const roofH = 0.62;
  // 木色压檐条，托住瓦顶
  if (axis === "x") {
    parts.woodwork.push(
      box(length + 0.15, 0.14, eaves, cx, wallTopY + 0.07, cz),
    );
    addGableRoof(parts, cx, wallTopY + 0.12, cz, length, eaves, roofH, "z");
  } else {
    parts.woodwork.push(
      box(eaves, 0.14, length + 0.15, cx, wallTopY + 0.07, cz),
    );
    addGableRoof(parts, cx, wallTopY + 0.12, cz, eaves, length, roofH, "x");
  }
}

/**
 * 院内侧木门：门扇 + 门框（正房南立面 / 厢房内立面共用）。
 * widthAxis "x"：门宽沿 X（正房朝南）；"z"：门宽沿 Z（厢房朝院）。
 */
function addCourtyardDoor(
  parts: Parts,
  cx: number,
  cz: number,
  widthAxis: "x" | "z",
  outward: 1 | -1,
): void {
  const doorW = 1.7;
  const doorH = 2.75;
  const leafT = 0.12;
  const y = FOUNDATION_H + doorH * 0.5;

  if (widthAxis === "x") {
    // 门扇朝 ±Z
    parts.woodwork.push(box(doorW, doorH, leafT, cx, y, cz));
    parts.woodwork.push(
      box(doorW + 0.28, 0.18, 0.14, cx, FOUNDATION_H + doorH + 0.08, cz + outward * 0.02),
    );
    parts.woodwork.push(
      box(0.16, doorH, 0.14, cx - doorW * 0.5, y, cz + outward * 0.02),
    );
    parts.woodwork.push(
      box(0.16, doorH, 0.14, cx + doorW * 0.5, y, cz + outward * 0.02),
    );
  } else {
    // 门扇朝 ±X
    parts.woodwork.push(box(leafT, doorH, doorW, cx, y, cz));
    parts.woodwork.push(
      box(0.14, 0.18, doorW + 0.28, cx + outward * 0.02, FOUNDATION_H + doorH + 0.08, cz),
    );
    parts.woodwork.push(
      box(0.14, doorH, 0.16, cx + outward * 0.02, y, cz - doorW * 0.5),
    );
    parts.woodwork.push(
      box(0.14, doorH, 0.16, cx + outward * 0.02, y, cz + doorW * 0.5),
    );
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
  const outward: 1 | -1 = doorFace === "south" ? 1 : -1;

  parts.foundations.push(
    box(width + 0.4, FOUNDATION_H, depth + 0.4, 0, FOUNDATION_H * 0.5, cz),
  );
  parts.walls.push(box(width, height, depth, 0, y, cz, true));
  addGableRoof(parts, 0, FOUNDATION_H + height, cz, width, depth, roofH);

  if (options?.door !== false) {
    // 与东西厢房同款木门（不再用空门框）
    addCourtyardDoor(parts, 0, doorZ, "x", outward);
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
  parts.walls.push(box(WING_DEPTH, height, depth, cx, y, cz, true));
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
  const inward = -xSign as 1 | -1;
  const faceX = cx + inward * (WING_DEPTH * 0.5 + 0.02);
  const doorClear = 2.0;
  for (const wz of WING_DOOR_ZS) {
    if (wz <= Math.min(z0, z1) + 1.2 || wz >= Math.max(z0, z1) - 1.2) continue;
    addCourtyardDoor(parts, faceX, wz, "z", inward);
  }

  // 窗：避开门洞
  const winCount = Math.max(1, Math.floor(depth / 4.2));
  for (let i = 0; i < winCount; i += 1) {
    const wz = z0 + ((i + 0.5) / winCount) * (z1 - z0);
    if (WING_DOOR_ZS.some((dz) => Math.abs(wz - dz) < doorClear)) continue;
    parts.woodwork.push(
      box(0.12, 1.35, 1.45, faceX, FOUNDATION_H + height * 0.52, wz),
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
  parts.walls.push(box(t, h, COMPOUND_DEPTH, hx - t * 0.5, y, 0, true));
  parts.walls.push(box(t, h, COMPOUND_DEPTH, -(hx - t * 0.5), y, 0, true));
  parts.walls.push(box(COMPOUND_WIDTH, h, t, 0, y, -(hz - t * 0.5), true));

  // 南墙：大门两侧
  const sideW = (COMPOUND_WIDTH - gateW) * 0.5;
  const southZ = GATE_SOUTH_WALL_Z;
  const southFootX = gateW * 0.5 + sideW * 0.5;
  parts.walls.push(box(sideW + 0.15, footH, footT, -southFootX, footY, southZ));
  parts.walls.push(box(sideW + 0.15, footH, footT, southFootX, footY, southZ));
  parts.walls.push(box(sideW, h, t, -southFootX, y, southZ, true));
  parts.walls.push(box(sideW, h, t, southFootX, y, southZ, true));

  // 南墙两侧压顶瓦（门楼已有屋顶，不覆盖）
  const wallTopY = FOUNDATION_H + h;
  addWallTileCoping(parts, -southFootX, southZ, sideW, t, wallTopY, "x");
  addWallTileCoping(parts, southFootX, southZ, sideW, t, wallTopY, "x");

  // 大气门楼（加高加厚，给匾额与斗拱留位）
  const pierW = GATE_PIER_W;
  const pierD = GATE_PIER_D;
  const gateH = h + 3.2;
  const pierX = gateW * 0.5 + pierW * 0.32;
  const porchZ = GATE_PORCH_Z;

  parts.walls.push(box(gateW + pierW * 2.35, footH, pierD + 1.35, 0, footY, porchZ - 0.15));
  parts.walls.push(
    box(pierW, gateH, pierD, -pierX, FOUNDATION_H + gateH * 0.5, porchZ),
  );
  parts.walls.push(
    box(pierW, gateH, pierD, pierX, FOUNDATION_H + gateH * 0.5, porchZ),
  );
  // 门墩压顶石
  parts.walls.push(
    box(pierW + 0.4, 0.32, pierD + 0.4, -pierX, FOUNDATION_H + gateH + 0.08, porchZ),
  );
  parts.walls.push(
    box(pierW + 0.4, 0.32, pierD + 0.4, pierX, FOUNDATION_H + gateH + 0.08, porchZ),
  );

  // 檐下主梁 / 次梁（与门框同立面略后，勿挡门扇）
  parts.woodwork.push(
    box(gateW + 1.1, 0.62, 0.62, 0, FOUNDATION_H + gateH - 0.28, GATE_FACE_Z - 0.15),
  );
  parts.woodwork.push(
    box(gateW + 0.85, 0.28, 0.42, 0, FOUNDATION_H + gateH - 0.72, GATE_FACE_Z - 0.08),
  );
  // 匾额上下金线木框位（匾本体在 CourtyardEntrance）
  parts.woodwork.push(
    box(gateW * 0.92, 0.14, 0.2, 0, FOUNDATION_H + gateH - 1.05, GATE_FACE_Z),
  );
  parts.woodwork.push(
    box(gateW * 0.92, 0.14, 0.2, 0, FOUNDATION_H + gateH - 2.05, GATE_FACE_Z),
  );
  // 门框立柱 / 门楣改由 CourtyardEntrance 与朱红大门同立面绘制，此处不再放立柱
  for (const sx of [-1, 1] as const) {
    // 简易斗拱示意
    parts.woodwork.push(
      box(0.55, 0.22, 0.7, sx * (gateW * 0.28), FOUNDATION_H + gateH - 0.55, GATE_FACE_Z - 0.05),
    );
    parts.woodwork.push(
      box(0.28, 0.45, 0.28, sx * (gateW * 0.28), FOUNDATION_H + gateH - 0.9, GATE_FACE_Z),
    );
  }
  // 单层门楼瓦顶（宽度收在门墩内，勿盖住两侧围墙压檐）
  addGableRoof(
    parts,
    0,
    FOUNDATION_H + gateH + 0.05,
    porchZ + 0.05,
    gateW + pierW * 2.15,
    pierD + 1.25,
    1.95,
  );

  for (let i = 0; i < 3; i += 1) {
    const stepW = gateW + 1.8 - i * 0.35;
    parts.foundations.push(
      box(
        stepW,
        0.16,
        0.58,
        0,
        0.08 + i * 0.14,
        southZ + pierD * 0.35 + 1.65 + i * 0.5,
      ),
    );
  }
}

function addScreenWall(parts: Parts): void {
  const { x, z } = COMPOUND_LANDMARKS.screenWall;
  parts.foundations.push(box(9.2, FOUNDATION_H, 1.2, x, FOUNDATION_H * 0.5, z));
  parts.walls.push(box(8.8, 3.8, 0.55, x, FOUNDATION_H + 1.9, z, true));
  parts.accents.push(box(7.8, 2.6, 0.08, x, FOUNDATION_H + 2.0, z + 0.32));
  parts.woodwork.push(box(9.2, 0.22, 0.75, x, FOUNDATION_H + 3.9, z));
  addGableRoof(parts, x, FOUNDATION_H + 3.95, z, 9.6, 1.4, 1.15);
}

/** 隔墙拱门净宽（与障碍/导航共用）；拱顶须低于墙顶压檐 */
const ARCH_OPEN_W = 3.4;
/** 起拱线高度；半圆拱半径 = 净宽/2，总高约 3.3，墙顶留白约 0.8 */
const ARCH_SPRING_H = 1.6;

/**
 * 拱门隔墙：整墙挤出 + 半圆拱门洞（拱顶低于压檐瓦）。
 */
function addArchWall(parts: Parts, cz: number): void {
  const wallWidth = ARCH_WALL_W;
  const wallH = 4.1;
  const wallT = 0.55;
  const openW = ARCH_OPEN_W;
  const archR = openW * 0.5;
  const springH = ARCH_SPRING_H;
  // 拱顶点到墙顶至少留 0.55，避免压檐瓦穿模
  const maxPeak = wallH - 0.55;
  const peak = springH + archR;
  const scale = peak > maxPeak ? maxPeak / peak : 1;
  const r = archR * scale;
  const spring = springH * scale;
  const wallTop = FOUNDATION_H + wallH;
  const hw = wallWidth * 0.5;
  const oh = openW * 0.5 * scale;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, wallH);
  shape.lineTo(-hw, wallH);
  shape.closePath();

  // 门洞：竖框 + 半圆拱（孔洞反向绕序）
  const hole = new THREE.Path();
  hole.moveTo(-oh, 0);
  hole.lineTo(oh, 0);
  hole.lineTo(oh, spring);
  hole.absarc(0, spring, r, 0, Math.PI, false);
  hole.lineTo(-oh, 0);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: wallT,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geo.translate(0, FOUNDATION_H, cz - wallT * 0.5);
  geo.computeVertexNormals();
  parts.walls.push(geo);

  // 木色门框：两侧立柱 + 半圆拱券
  const faceZ = cz + wallT * 0.5 + 0.05;
  const postH = spring + 0.06;
  parts.woodwork.push(
    box(0.18, postH, 0.12, -oh, FOUNDATION_H + postH * 0.5, faceZ),
  );
  parts.woodwork.push(
    box(0.18, postH, 0.12, oh, FOUNDATION_H + postH * 0.5, faceZ),
  );
  {
    const torus = new THREE.TorusGeometry(r, 0.08, 6, 28, Math.PI);
    torus.translate(0, FOUNDATION_H + spring, faceZ);
    parts.woodwork.push(torus);
  }

  // 隔墙顶压檐瓦
  addWallTileCoping(parts, 0, cz, wallWidth + 0.25, wallT, wallTop, "x");
}

function addCourtyardFloors(parts: Parts): void {
  const pond = COMPOUND_LANDMARKS.koiPond;
  for (const yard of Object.values(COURTYARDS)) {
    const inYard =
      Math.abs(pond.x - yard.cx) < yard.w * 0.5 - 1 &&
      Math.abs(pond.z - yard.cz) < yard.d * 0.5 - 1;

    if (!inYard) {
      const g = new THREE.BoxGeometry(yard.w, 0.06, yard.d);
      g.translate(yard.cx, 0.02, yard.cz);
      parts.courtyards.push(g);
      continue;
    }

    // 四进：地面挖圆洞，露出锦鲤池
    const hw = yard.w * 0.5;
    const hd = yard.d * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
    const hole = new THREE.Path();
    // Shape 在 XY；rotateX(-π/2) 后 shapeY → -worldZ，故此处对 Z 取反
    hole.absarc(
      pond.x - yard.cx,
      -(pond.z - yard.cz),
      KOI_POND_HOLE_RADIUS,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: false,
      curveSegments: 40,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(yard.cx, -0.01, yard.cz);
    g.computeVertexNormals();
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

  // 一进两侧无厢房的围墙段：补压顶瓦（厢房 / 正房处不动）
  {
    const t = WALL_T;
    const southZ = COMPOUND_HALF_Z - t * 0.5;
    const bareLen = southZ - wingSouth - 0.35;
    const bareCz = (southZ + wingSouth) * 0.5;
    const wallTopY = FOUNDATION_H + WALL_H;
    if (bareLen > 2) {
      addWallTileCoping(
        parts,
        COMPOUND_HALF_X - t * 0.5,
        bareCz,
        bareLen,
        t,
        wallTopY,
        "z",
      );
      addWallTileCoping(
        parts,
        -(COMPOUND_HALF_X - t * 0.5),
        bareCz,
        bareLen,
        t,
        wallTopY,
        "z",
      );
    }
  }

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
  const archOpen = ARCH_OPEN_W * 0.5;

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
