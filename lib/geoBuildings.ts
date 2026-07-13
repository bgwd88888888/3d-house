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
 * - woodwork   门框 / 窗框 / 窗台
 * - glass      窗玻璃
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
    glass: [],
    steps: [],
  };
}

/** 墙体贴图在世界单位中的平铺边长（米） */
const WALL_TEXTURE_TILE = 2.2;

/** 按盒体各面真实尺寸缩放 UV，避免墙面贴图拉伸不一致 */
function scaleBoxUvs(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  depth: number,
): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;

  const faceScales: [number, number][] = [
    [depth / WALL_TEXTURE_TILE, height / WALL_TEXTURE_TILE],
    [depth / WALL_TEXTURE_TILE, height / WALL_TEXTURE_TILE],
    [width / WALL_TEXTURE_TILE, depth / WALL_TEXTURE_TILE],
    [width / WALL_TEXTURE_TILE, depth / WALL_TEXTURE_TILE],
    [width / WALL_TEXTURE_TILE, height / WALL_TEXTURE_TILE],
    [width / WALL_TEXTURE_TILE, height / WALL_TEXTURE_TILE],
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
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (scaleUvs) scaleBoxUvs(geometry, width, height, depth);
  geometry.translate(center.x, center.y, center.z);
  return geometry;
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
    offsetX: number,
    offsetY: number,
    offsetZ: number,
  ) => {
    geometry.translate(offsetX, offsetY, offsetZ);
    if (rotationY !== 0) geometry.rotateY(rotationY);
    geometry.translate(center.x, center.y, center.z);
    return geometry;
  };

  parts.push(place(new THREE.BoxGeometry(side, height, depth), -(width - side) * 0.5, 0, 0));
  parts.push(place(new THREE.BoxGeometry(side, height, depth), (width - side) * 0.5, 0, 0));
  parts.push(place(new THREE.BoxGeometry(width, rail, depth), 0, (height - rail) * 0.5, 0));
  parts.push(place(new THREE.BoxGeometry(width, rail, depth), 0, -(height - rail) * 0.5, 0));
  parts.push(place(new THREE.BoxGeometry(side, height * 0.9, depth * 0.8), 0, 0, 0));
  parts.push(place(new THREE.BoxGeometry(width * 0.72, rail, depth * 0.8), 0, height * 0.08, 0));
  parts.push(
    place(
      new THREE.BoxGeometry(width * 1.04, 0.1, sillDepth),
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
    offsetY: number,
    offsetZ: number,
    extraOut = 0,
  ) => {
    geometry.translate(center.x + outward * extraOut, center.y + offsetY, center.z + offsetZ);
    return geometry;
  };

  parts.push(
    place(new THREE.BoxGeometry(frameDepth, height, post), 0, -(width - post) * 0.5),
  );
  parts.push(
    place(new THREE.BoxGeometry(frameDepth, height, post), 0, (width - post) * 0.5),
  );
  parts.push(
    place(new THREE.BoxGeometry(frameDepth, rail, width), (height - rail) * 0.5, 0),
  );
  parts.push(
    place(new THREE.BoxGeometry(frameDepth, rail, width), -(height - rail) * 0.5, 0),
  );
  parts.push(place(new THREE.BoxGeometry(frameDepth * 0.75, height * 0.9, post), 0, 0));
  parts.push(
    place(new THREE.BoxGeometry(frameDepth * 0.75, rail, width * 0.72), height * 0.08, 0),
  );
  parts.push(
    place(
      new THREE.BoxGeometry(sillOut, 0.12, width * 1.06),
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

/** 人字屋顶：屋脊沿 Z，坡面朝向 ±X；无厚度，材质需 DoubleSide */
function makeGableRoof(spec: HouseSpec): THREE.BufferGeometry {
  const halfW = spec.width * 0.5;
  const halfD = spec.depth * 0.5;
  const roofW = halfW + spec.roofOverhang;
  const roofD = halfD + spec.roofOverhang;
  const baseY = spec.wallHeight + ROOF_BASE_GAP;
  const peakY = spec.wallHeight + spec.roofHeight;

  const vertices = [
    -roofW, baseY, -roofD,
    roofW, baseY, -roofD,
    roofW, baseY, roofD,
    -roofW, baseY, roofD,
    0, peakY, -roofD,
    0, peakY, roofD,
  ];
  const indices = [
    0, 1, 4,
    3, 5, 2,
    1, 2, 5,
    1, 5, 4,
    3, 0, 4,
    3, 4, 5,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
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

function addDoorStage(layers: LayerParts, spec: HouseSpec): void {
  const z = frontY(spec.width, spec.depth);
  const center = new THREE.Vector3(
    spec.door.offsetX,
    spec.door.height * 0.5,
    z + spec.door.depth * 0.5 + 0.03,
  );

  layers.woodwork.push(
    makeBox(spec.door.width, spec.door.height, spec.door.depth, center),
  );
  layers.woodwork.push(
    makeBox(
      spec.door.width + 0.28,
      spec.door.height + 0.24,
      0.12,
      center.clone().add(new THREE.Vector3(0, 0.05, -0.04)),
    ),
  );
  layers.woodwork.push(
    makeBox(
      0.12,
      0.12,
      0.08,
      center.clone().add(new THREE.Vector3(spec.door.width * 0.28, -0.12, -0.08)),
    ),
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
