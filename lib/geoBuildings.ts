/**
 * 房子几何建造逻辑（程序化 Mesh，非 GLTF）。
 *
 * 坐标系（房子中心在原点）：
 * - +X 右墙，-X 左墙
 * - +Z 前门墙（门、正窗、台阶），-Z 后墙（目前无窗）
 * - +Y 向上；地面约在 Y=0，墙体从 Y=0 升到 wallHeight
 *
 * 分层 CityLayers（按材质合并，减少 draw call）：
 * - foundations 地基
 * - walls      墙体 + 烟囱身（灰泥贴图）
 * - roofs      人字屋顶 + 烟囱顶盖
 * - woodwork   门扇 / 门框 / 窗框 / 窗台
 * - metalwork  门把手等五金
 * - glass      窗玻璃 / 门上亮窗
 * - steps      门前台阶
 *
 * BuildStage 为教学用渐进建造：base → roof → door → windows → details。
 * 窗户不要对侧墙框做 rotateY 拼装（易穿模）；侧窗用 makeSideWindowFrame 按轴向直接建模。
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const FOUNDATION_HEIGHT = 0.42;
/** 屋顶下沉与墙体重叠，避免屋檐透出背景缝隙 */
const ROOF_BASE_GAP = -0.12;
const ROOF_OVERHANG = 0.42;

export type BuildStage = "base" | "roof" | "door" | "windows" | "details";

export type CityLayers = {
  foundations: THREE.BufferGeometry | null;
  walls: THREE.BufferGeometry | null;
  roofs: THREE.BufferGeometry | null;
  woodwork: THREE.BufferGeometry | null;
  metalwork: THREE.BufferGeometry | null;
  glass: THREE.BufferGeometry | null;
  steps: THREE.BufferGeometry | null;
};

export type HouseSpec = {
  width: number;
  depth: number;
  wallHeight: number;
  roofHeight: number;
  roofOverhang: number;
  foundationHeight: number;
  door: {
    width: number;
    height: number;
    depth: number;
    offsetX: number;
  };
  windows: {
    width: number;
    height: number;
    frameDepth: number;
    sillHeight: number;
    /** 正墙窗的 X 坐标列表 */
    front: number[];
    /** 左墙（-X）窗的 Z 坐标列表 */
    left: number[];
    /** 右墙（+X）窗的 Z 坐标列表；空数组表示该侧无窗 */
    right: number[];
  };
  chimney: {
    width: number;
    depth: number;
    height: number;
    x: number;
    z: number;
  };
  steps: {
    upperWidth: number;
    upperDepth: number;
    upperHeight: number;
    lowerWidth: number;
    lowerDepth: number;
    lowerHeight: number;
  };
};

type LayerParts = {
  foundations: THREE.BufferGeometry[];
  walls: THREE.BufferGeometry[];
  roofs: THREE.BufferGeometry[];
  woodwork: THREE.BufferGeometry[];
  metalwork: THREE.BufferGeometry[];
  glass: THREE.BufferGeometry[];
  steps: THREE.BufferGeometry[];
};

export const BUILD_STAGES: BuildStage[] = [
  "base",
  "roof",
  "door",
  "windows",
  "details",
];

export const BUILD_STAGE_LABELS: Record<BuildStage, string> = {
  base: "1. 长方体",
  roof: "2. 屋顶",
  door: "3. 门",
  windows: "4. 窗户",
  details: "5. 细节",
};

/** 默认单栋小房子尺寸与构件布局 */
export const DEFAULT_HOUSE_SPEC: HouseSpec = {
  width: 11.6,
  depth: 8.8,
  wallHeight: 6.2,
  roofHeight: 3.8,
  roofOverhang: ROOF_OVERHANG,
  foundationHeight: FOUNDATION_HEIGHT,
  door: {
    width: 1.72,
    height: 3.05,
    depth: 0.2,
    offsetX: 2.25,
  },
  windows: {
    width: 1.65,
    height: 2.15,
    frameDepth: 0.16,
    sillHeight: 1.55,
    front: [-2.55],
    left: [-1.75, 2.05],
    right: [],
  },
  chimney: {
    width: 0.82,
    depth: 0.82,
    height: 3.35,
    x: 2.35,
    z: -1.1,
  },
  steps: {
    upperWidth: 2.25,
    upperDepth: 0.95,
    upperHeight: 0.24,
    lowerWidth: 3.2,
    lowerDepth: 1.65,
    lowerHeight: 0.16,
  },
};

function emptyLayers(): LayerParts {
  return {
    foundations: [],
    walls: [],
    roofs: [],
    woodwork: [],
    metalwork: [],
    glass: [],
    steps: [],
  };
}

/** 墙体贴图在世界单位中的平铺边长（米） */
const WALL_TEXTURE_TILE = 2.2;
/** 门窗木作贴图在世界单位中的平铺边长（米），略密以体现年轮/木纹 */
const WOOD_TEXTURE_TILE = 0.38;

/** 按盒体各面真实尺寸缩放 UV，避免贴图拉伸不一致；tileSize 决定贴图在世界单位中的重复边长 */
function scaleBoxUvs(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  depth: number,
  tileSize: number = WALL_TEXTURE_TILE,
): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;

  const faceScales: [number, number][] = [
    [depth / tileSize, height / tileSize],
    [depth / tileSize, height / tileSize],
    [width / tileSize, depth / tileSize],
    [width / tileSize, depth / tileSize],
    [width / tileSize, height / tileSize],
    [width / tileSize, height / tileSize],
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

function makeBox(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
  scaleUvs = false,
  tileSize: number = WALL_TEXTURE_TILE,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (scaleUvs) scaleBoxUvs(geometry, width, height, depth, tileSize);
  geometry.translate(center.x, center.y, center.z);
  return geometry;
}

/** 门窗木作专用：按世界单位缩放 UV，使木纹密度与真实尺寸匹配 */
function makeWoodBox(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
): THREE.BufferGeometry {
  return makeBox(width, height, depth, center, true, WOOD_TEXTURE_TILE);
}

/** 正墙 / 后墙窗框：局部 +Z 为外向；可用 rotationY 转到其他朝向 */
function makeWindowFrame(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
  rotationY = 0,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const side = 0.13;
  const rail = 0.12;
  const sillDepth = depth + 0.14;
  const place = (
    geometry: THREE.BufferGeometry,
    w: number,
    h: number,
    d: number,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
  ) => {
    scaleBoxUvs(geometry, w, h, d, WOOD_TEXTURE_TILE);
    geometry.translate(offsetX, offsetY, offsetZ);
    if (rotationY !== 0) geometry.rotateY(rotationY);
    geometry.translate(center.x, center.y, center.z);
    return geometry;
  };

  parts.push(
    place(new THREE.BoxGeometry(side, height, depth), side, height, depth, -(width - side) * 0.5, 0, 0),
  );
  parts.push(
    place(new THREE.BoxGeometry(side, height, depth), side, height, depth, (width - side) * 0.5, 0, 0),
  );
  parts.push(
    place(new THREE.BoxGeometry(width, rail, depth), width, rail, depth, 0, (height - rail) * 0.5, 0),
  );
  parts.push(
    place(new THREE.BoxGeometry(width, rail, depth), width, rail, depth, 0, -(height - rail) * 0.5, 0),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(side, height * 0.9, depth * 0.8),
      side,
      height * 0.9,
      depth * 0.8,
      0,
      0,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(width * 0.72, rail, depth * 0.8),
      width * 0.72,
      rail,
      depth * 0.8,
      0,
      height * 0.08,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(width * 1.04, 0.1, sillDepth),
      width * 1.04,
      0.1,
      sillDepth,
      0,
      -(height * 0.5) - 0.12,
      depth * 0.45,
    ),
  );
  return parts;
}

/**
 * 侧墙窗框：厚度沿 X（墙外法线），宽度沿 Z。
 * outward=+1 右墙，-1 左墙。勿对正墙框 rotateY 复用，否则窗台易穿模。
 */
function makeSideWindowFrame(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
  outward: 1 | -1,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  // 侧视时主要看到框条外端面，适当加宽加厚
  const post = 0.22;
  const rail = 0.2;
  const frameDepth = Math.max(depth, 0.28);
  const sillOut = frameDepth + 0.22;
  const place = (
    geometry: THREE.BufferGeometry,
    w: number,
    h: number,
    d: number,
    offsetY: number,
    offsetZ: number,
    extraOut = 0,
  ) => {
    scaleBoxUvs(geometry, w, h, d, WOOD_TEXTURE_TILE);
    geometry.translate(center.x + outward * extraOut, center.y + offsetY, center.z + offsetZ);
    return geometry;
  };

  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth, height, post),
      frameDepth,
      height,
      post,
      0,
      -(width - post) * 0.5,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth, height, post),
      frameDepth,
      height,
      post,
      0,
      (width - post) * 0.5,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth, rail, width),
      frameDepth,
      rail,
      width,
      (height - rail) * 0.5,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth, rail, width),
      frameDepth,
      rail,
      width,
      -(height - rail) * 0.5,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth * 0.75, height * 0.9, post),
      frameDepth * 0.75,
      height * 0.9,
      post,
      0,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(frameDepth * 0.75, rail, width * 0.72),
      frameDepth * 0.75,
      rail,
      width * 0.72,
      height * 0.08,
      0,
    ),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(sillOut, 0.12, width * 1.06),
      sillOut,
      0.12,
      width * 1.06,
      -(height * 0.5) - 0.14,
      0,
      frameDepth * 0.35,
    ),
  );
  return parts;
}

function makeGlassPane(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3,
  rotationY = 0,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (rotationY !== 0) geometry.rotateY(rotationY);
  geometry.translate(center.x, center.y, center.z);
  return geometry;
}

/** 屋顶瓦片在世界单位中的平铺边长（米）；略加密以减轻坡面拉伸，再由 shader 打散重复 */
const ROOF_TEXTURE_TILE = 1.7;

/** 人字屋顶：屋脊沿 Z，坡面朝向 ±X；无厚度，材质需 DoubleSide */
function makeGableRoof(spec: HouseSpec): THREE.BufferGeometry {
  const halfW = spec.width * 0.5;
  const halfD = spec.depth * 0.5;
  const roofW = halfW + spec.roofOverhang;
  const roofD = halfD + spec.roofOverhang;
  const baseY = spec.wallHeight + ROOF_BASE_GAP;
  const peakY = spec.wallHeight + spec.roofHeight;
  const slopeLen = Math.hypot(roofW, peakY - baseY);

  // 非索引三角面，便于为每个坡面写入独立 UV
  // U 沿屋脊（Z），V 沿坡面（檐口→屋脊）
  const slopeUv = (x: number, z: number): [number, number] => [
    (z + roofD) / ROOF_TEXTURE_TILE,
    (Math.abs(x) / roofW) * (slopeLen / ROOF_TEXTURE_TILE),
  ];
  const gableUv = (x: number, y: number): [number, number] => [
    (x + roofW) / ROOF_TEXTURE_TILE,
    (y - baseY) / ROOF_TEXTURE_TILE,
  ];

  type Vert = { p: [number, number, number]; uv: [number, number] };
  const verts: Vert[] = [];
  const pushTri = (a: Vert, b: Vert, c: Vert) => {
    verts.push(a, b, c);
  };

  const L0: Vert = { p: [-roofW, baseY, -roofD], uv: slopeUv(-roofW, -roofD) };
  const L1: Vert = { p: [-roofW, baseY, roofD], uv: slopeUv(-roofW, roofD) };
  const R0: Vert = { p: [roofW, baseY, -roofD], uv: slopeUv(roofW, -roofD) };
  const R1: Vert = { p: [roofW, baseY, roofD], uv: slopeUv(roofW, roofD) };
  const P0: Vert = { p: [0, peakY, -roofD], uv: slopeUv(0, -roofD) };
  const P1: Vert = { p: [0, peakY, roofD], uv: slopeUv(0, roofD) };

  // 左坡、右坡
  pushTri(L1, L0, { p: P0.p, uv: slopeUv(0, -roofD) });
  pushTri(L1, { p: P0.p, uv: slopeUv(0, -roofD) }, { p: P1.p, uv: slopeUv(0, roofD) });
  pushTri(R0, R1, { p: P1.p, uv: slopeUv(0, roofD) });
  pushTri(R0, { p: P1.p, uv: slopeUv(0, roofD) }, { p: P0.p, uv: slopeUv(0, -roofD) });

  // 前后山墙三角面（绕序与原索引一致，保证外法线朝外）
  pushTri(
    { p: L0.p, uv: gableUv(-roofW, baseY) },
    { p: R0.p, uv: gableUv(roofW, baseY) },
    { p: P0.p, uv: gableUv(0, peakY) },
  );
  pushTri(
    { p: L1.p, uv: gableUv(-roofW, baseY) },
    { p: P1.p, uv: gableUv(0, peakY) },
    { p: R1.p, uv: gableUv(roofW, baseY) },
  );

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
  return geometry;
}

/** 正墙外表面 Z */
function frontY(width: number, depth: number): number {
  void width;
  return depth * 0.5;
}

function addBaseStage(layers: LayerParts, spec: HouseSpec): void {
  layers.foundations.push(
    makeBox(
      spec.width + 0.3,
      spec.foundationHeight,
      spec.depth + 0.3,
      new THREE.Vector3(0, -spec.foundationHeight * 0.5, 0),
    ),
  );
  layers.walls.push(
    makeBox(
      spec.width,
      spec.wallHeight,
      spec.depth,
      new THREE.Vector3(0, spec.wallHeight * 0.5, 0),
      true,
    ),
  );
}

function addRoofStage(layers: LayerParts, spec: HouseSpec): void {
  layers.roofs.push(makeGableRoof(spec));
}

/**
 * 豪华正门：外贴脸框 + 嵌板门扇 + 上亮玻璃 + 铜把手。
 * 门扇略凸出墙面，嵌板凹进，靠体积阴影做出层次。
 */
function addDoorStage(layers: LayerParts, spec: HouseSpec): void {
  const wallZ = frontY(spec.width, spec.depth);
  const W = spec.door.width;
  const H = spec.door.height;
  const D = Math.max(spec.door.depth, 0.22);
  const cx = spec.door.offsetX;

  // —— 门扇：几乎填满洞口，仅留 ~1.5cm reveal ——
  const reveal = 0.015;
  const leafW = W - reveal * 2;
  const leafH = H - reveal * 2;
  const leafD = D;
  const leafBottom = reveal;
  const leafY = leafBottom + leafH * 0.5;
  const leafTop = leafBottom + leafH;
  const leafZ = wallZ + leafD * 0.5 + 0.045;
  const faceZ = leafZ + leafD * 0.5;

  // —— 外框贴脸：厚立柱 + 深凸出墙面 ——
  const caseT = 0.18;
  const caseD = 0.36;
  const caseZ = wallZ + caseD * 0.5 + 0.01;
  const caseInnerW = leafW + reveal * 2;
  const caseInnerH = leafTop + reveal;
  const caseOuterW = caseInnerW + caseT * 2;
  const postY = caseInnerH * 0.5;
  const lintelY = caseInnerH + caseT * 0.5;

  layers.woodwork.push(
    makeWoodBox(
      caseT,
      caseInnerH,
      caseD,
      new THREE.Vector3(cx - caseInnerW * 0.5 - caseT * 0.5, postY, caseZ),
    ),
  );
  layers.woodwork.push(
    makeWoodBox(
      caseT,
      caseInnerH,
      caseD,
      new THREE.Vector3(cx + caseInnerW * 0.5 + caseT * 0.5, postY, caseZ),
    ),
  );
  layers.woodwork.push(
    makeWoodBox(caseOuterW, caseT, caseD, new THREE.Vector3(cx, lintelY, caseZ)),
  );
  // 帽线：再向前一阶，正面剪影更硬
  const capH = 0.08;
  const capD = caseD + 0.08;
  layers.woodwork.push(
    makeWoodBox(
      caseOuterW + 0.08,
      capH,
      capD,
      new THREE.Vector3(cx, lintelY + caseT * 0.5 + capH * 0.35, caseZ + 0.04),
    ),
  );

  // —— 门扇底板 ——
  layers.woodwork.push(
    makeWoodBox(leafW, leafH, leafD, new THREE.Vector3(cx, leafY, leafZ)),
  );

  // 凸起挺/档：≥12cm 朝 +Z，正面光下也要有硬边阴影
  const stile = 0.17;
  const rail = 0.16;
  const raiseD = 0.12;
  const raiseZ = faceZ + raiseD * 0.5;
  const raisedFront = faceZ + raiseD;
  const innerW = leafW - stile * 2;

  layers.woodwork.push(
    makeWoodBox(
      stile,
      leafH,
      raiseD,
      new THREE.Vector3(cx - leafW * 0.5 + stile * 0.5, leafY, raiseZ),
    ),
  );
  layers.woodwork.push(
    makeWoodBox(
      stile,
      leafH,
      raiseD,
      new THREE.Vector3(cx + leafW * 0.5 - stile * 0.5, leafY, raiseZ),
    ),
  );
  layers.woodwork.push(
    makeWoodBox(
      leafW,
      rail,
      raiseD,
      new THREE.Vector3(cx, leafY + leafH * 0.5 - rail * 0.5, raiseZ),
    ),
  );
  layers.woodwork.push(
    makeWoodBox(
      leafW,
      rail,
      raiseD,
      new THREE.Vector3(cx, leafY - leafH * 0.5 + rail * 0.5, raiseZ),
    ),
  );

  // 锁档：分隔上亮窗与下双嵌板（约 58%）
  const lockRailH = rail * 1.25;
  const lockRailY = leafY - leafH * 0.5 + leafH * 0.58;
  layers.woodwork.push(
    makeWoodBox(innerW + stile * 0.25, lockRailH, raiseD, new THREE.Vector3(cx, lockRailY, raiseZ)),
  );

  // —— 上亮：整块清晰玻璃 + 粗棂（无碎格子）——
  const liteBottom = lockRailY + lockRailH * 0.5;
  const liteTop = leafY + leafH * 0.5 - rail;
  const liteH = Math.max(liteTop - liteBottom, 0.22);
  const liteMidY = (liteTop + liteBottom) * 0.5;
  const muntin = 0.075;
  // 粗十字棂：正面可读，但不切成密格
  layers.woodwork.push(
    makeWoodBox(muntin, liteH, raiseD, new THREE.Vector3(cx, liteMidY, raiseZ)),
  );
  layers.woodwork.push(
    makeWoodBox(innerW, muntin, raiseD, new THREE.Vector3(cx, liteMidY, raiseZ)),
  );
  // 玻璃深凹在亮窗井底，粗棂投下清晰剪影
  const glassRecess = 0.1;
  layers.glass.push(
    makeBox(
      innerW * 0.94,
      liteH * 0.9,
      0.045,
      new THREE.Vector3(cx, liteMidY, raisedFront - glassRecess),
    ),
  );

  // —— 下半：经典双嵌板（仅 2 块，极深井）——
  const midStile = 0.14;
  const panelTop = lockRailY - lockRailH * 0.5;
  const panelBottom = leafY - leafH * 0.5 + rail;
  const panelZoneH = panelTop - panelBottom;
  const panelMidY = (panelTop + panelBottom) * 0.5;
  layers.woodwork.push(
    makeWoodBox(midStile, panelZoneH, raiseD, new THREE.Vector3(cx, panelMidY, raiseZ)),
  );

  const gap = 0.035;
  const cellW = (innerW - midStile) * 0.5 - gap;
  const cellH = panelZoneH - gap * 2;
  // 嵌板井底：相对凸起面后退 ≥10cm
  const wellBehind = 0.1;
  const wellFront = raisedFront - wellBehind;
  // 三阶台阶：AO 暗底 → 外凹环 → 内凸心（正面剪影）
  const aoD = 0.035;
  const ringD = 0.05;
  const fieldD = 0.055;
  const ringInset = 0.04;
  const fieldInset = 0.09;
  const aoZ = wellFront - aoD * 0.5;
  const ringZ = wellFront + ringD * 0.5 + 0.012;
  const fieldZ = wellFront + fieldD * 0.5 + 0.038;
  const panelXs = [
    cx - (midStile * 0.5 + gap * 0.5 + cellW * 0.5),
    cx + (midStile * 0.5 + gap * 0.5 + cellW * 0.5),
  ];

  for (const px of panelXs) {
    // AO 暗底：井底最深处，正面光下呈暗矩形
    layers.woodwork.push(
      makeWoodBox(cellW * 0.98, cellH * 0.98, aoD, new THREE.Vector3(px, panelMidY, aoZ)),
    );
    // 外凹环（bevel step）
    layers.woodwork.push(
      makeWoodBox(
        cellW - ringInset * 2,
        cellH - ringInset * 2,
        ringD,
        new THREE.Vector3(px, panelMidY, ringZ),
      ),
    );
    // 内凸心板
    layers.woodwork.push(
      makeWoodBox(
        cellW - fieldInset * 2,
        cellH - fieldInset * 2,
        fieldD,
        new THREE.Vector3(px, panelMidY, fieldZ),
      ),
    );
  }

  // —— 铜把手：厚背板 + 长杠杆，正面剪影更强 ——
  const handleX = cx + leafW * 0.36;
  const handleY = lockRailY - 0.12;
  const plateZ = faceZ + raiseD * 0.55;
  layers.metalwork.push(
    makeBox(0.12, 0.34, 0.045, new THREE.Vector3(handleX, handleY, plateZ)),
  );
  layers.metalwork.push(
    makeBox(0.05, 0.05, 0.09, new THREE.Vector3(handleX, handleY, plateZ + 0.055)),
  );
  const leverZ = plateZ + 0.095;
  layers.metalwork.push(
    makeBox(0.22, 0.042, 0.05, new THREE.Vector3(handleX + 0.06, handleY, leverZ)),
  );
  layers.metalwork.push(
    makeBox(0.06, 0.06, 0.065, new THREE.Vector3(handleX + 0.16, handleY, leverZ + 0.01)),
  );
}

function addFrontWindow(layers: LayerParts, spec: HouseSpec, x: number): void {
  const z = frontY(spec.width, spec.depth);
  const frameCenter = new THREE.Vector3(
    x,
    spec.windows.sillHeight + spec.windows.height * 0.5,
    z + spec.windows.frameDepth * 0.5 + 0.02,
  );

  for (const part of makeWindowFrame(
    spec.windows.width,
    spec.windows.height,
    spec.windows.frameDepth,
    frameCenter,
  )) {
    layers.woodwork.push(part);
  }

  layers.glass.push(
    makeGlassPane(
      spec.windows.width * 0.76,
      spec.windows.height * 0.82,
      0.04,
      frameCenter.clone().add(new THREE.Vector3(0, 0, -0.08)),
    ),
  );
}

function addSideWindow(
  layers: LayerParts,
  spec: HouseSpec,
  side: "left" | "right",
  z: number,
): void {
  const outward: 1 | -1 = side === "left" ? -1 : 1;
  const wallX = side === "left" ? -spec.width * 0.5 : spec.width * 0.5;
  const frameDepth = Math.max(spec.windows.frameDepth, 0.28);
  const frameCenter = new THREE.Vector3(
    wallX + outward * (frameDepth * 0.5 + 0.08),
    spec.windows.sillHeight + spec.windows.height * 0.5,
    z,
  );

  for (const part of makeSideWindowFrame(
    spec.windows.width,
    spec.windows.height,
    frameDepth,
    frameCenter,
    outward,
  )) {
    layers.woodwork.push(part);
  }

  layers.glass.push(
    makeBox(
      0.04,
      spec.windows.height * 0.82,
      spec.windows.width * 0.76,
      frameCenter.clone().add(new THREE.Vector3(outward * 0.01, 0, 0)),
    ),
  );
}

function addWindowsStage(layers: LayerParts, spec: HouseSpec): void {
  for (const x of spec.windows.front) addFrontWindow(layers, spec, x);
  for (const z of spec.windows.left) addSideWindow(layers, spec, "left", z);
  for (const z of spec.windows.right) addSideWindow(layers, spec, "right", z);
}

/** 烟囱 + 门前两级台阶 */
function addDetailsStage(layers: LayerParts, spec: HouseSpec): void {
  const chimneyY = spec.wallHeight + spec.chimney.height * 0.5 + 0.35;
  layers.walls.push(
    makeBox(
      spec.chimney.width,
      spec.chimney.height,
      spec.chimney.depth,
      new THREE.Vector3(spec.chimney.x, chimneyY, spec.chimney.z),
      true,
    ),
  );
  layers.roofs.push(
    makeBox(
      spec.chimney.width + 0.16,
      0.16,
      spec.chimney.depth + 0.16,
      new THREE.Vector3(
        spec.chimney.x,
        spec.wallHeight + spec.chimney.height + 0.43,
        spec.chimney.z,
      ),
      true,
    ),
  );

  const frontZ = spec.depth * 0.5;
  const stepCenterX = spec.door.offsetX;
  layers.steps.push(
    makeBox(
      spec.steps.upperWidth,
      spec.steps.upperHeight,
      spec.steps.upperDepth,
      new THREE.Vector3(
        stepCenterX,
        spec.steps.upperHeight * 0.5,
        frontZ + spec.steps.upperDepth * 0.5,
      ),
    ),
  );
  layers.steps.push(
    makeBox(
      spec.steps.lowerWidth,
      spec.steps.lowerHeight,
      spec.steps.lowerDepth,
      new THREE.Vector3(
        stepCenterX,
        spec.steps.lowerHeight * 0.5,
        frontZ + spec.steps.lowerDepth * 0.5 + 0.18,
      ),
    ),
  );
}

function stageIndex(stage: BuildStage): number {
  return BUILD_STAGES.indexOf(stage);
}

function normalizeForMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  const normalized: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    let geometry = part;
    if (geometry.index !== null) {
      const expanded = geometry.toNonIndexed();
      geometry.dispose();
      geometry = expanded;
    }
    const position = geometry.getAttribute("position");
    // mergeGeometries 要求各部分属性一致；缺 UV 时补空 UV
    if (position && !geometry.getAttribute("uv")) {
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(position.count * 2), 2),
      );
    }
    normalized.push(geometry);
  }
  return normalized;
}

function mergeLayer(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const normalized = normalizeForMerge(parts);
  const merged = mergeGeometries(normalized, false);
  for (const geometry of normalized) geometry.dispose();
  merged.computeBoundingSphere();
  return merged;
}

/** 按 stage 累计建造并合并为可直接挂到 mesh 的分层几何 */
export function buildHouseLayers(
  stage: BuildStage,
  spec: HouseSpec = DEFAULT_HOUSE_SPEC,
): CityLayers {
  const layers = emptyLayers();
  const current = stageIndex(stage);

  addBaseStage(layers, spec);
  if (current >= stageIndex("roof")) addRoofStage(layers, spec);
  if (current >= stageIndex("door")) addDoorStage(layers, spec);
  if (current >= stageIndex("windows")) addWindowsStage(layers, spec);
  if (current >= stageIndex("details")) addDetailsStage(layers, spec);

  return {
    foundations: mergeLayer(layers.foundations),
    walls: mergeLayer(layers.walls),
    roofs: mergeLayer(layers.roofs),
    woodwork: mergeLayer(layers.woodwork),
    metalwork: mergeLayer(layers.metalwork),
    glass: mergeLayer(layers.glass),
    steps: mergeLayer(layers.steps),
  };
}

/** 供首帧相机框住整栋房子 */
export function estimateHouseBounds(
  spec: HouseSpec = DEFAULT_HOUSE_SPEC,
): THREE.Sphere {
  const radius = Math.max(spec.width, spec.depth) * 0.92;
  return new THREE.Sphere(
    new THREE.Vector3(0, spec.wallHeight * 0.55, 0),
    radius + spec.roofHeight * 0.9,
  );
}

/** 预留：后续可从 GeoJSON 批量生成街区；当前仍返回单栋完成态 */
export function buildCityLayersFromGeoJSON(): CityLayers {
  return buildHouseLayers("details");
}
