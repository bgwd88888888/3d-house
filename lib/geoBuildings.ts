/**
 * 房子几何建造逻辑（程序化 Mesh，非 GLTF）。
 *
 * 坐标系（房子中心在原点）：
 * - +X 右墙，-X 左墙
 * - +Z 前门墙（门、正窗、台阶），-Z 后墙（目前无窗）
 * - +Y 向上；左右是整面五边形山墙（地面到屋脊），前后墙收到檐口
 * - 屋顶只覆盖前后两坡（人字顶，斜坡朝门），左右是竖向三角山墙，不铺瓦
 *
 * 分层 CityLayers（按材质合并，减少 draw call）：
 * - foundations 地基
 * - walls      墙体 + 左右三角山墙 + 烟囱身（灰泥贴图）
 * - roofs      前后坡筒瓦 + 屋脊压顶 + 烟囱顶盖
 * - woodwork   门扇 / 门框 / 窗框 / 窗台 / 檐口椽头
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
const ROOF_OVERHANG = 0.42;
/** 山墙方向只略出檐，避免看起来像四面都铺瓦 */
const GABLE_OVERHANG = 0.16;
/** 山墙与前后墙厚度，左右整面挤出，避免再叠一层长方体 */
const WALL_THICK = 0.36;
const WALL_FACE_OVERLAP = 0.01;

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
    height: 4.05,
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

function applyWorldWallUvs(
  geometry: THREE.BufferGeometry,
  mode: "xy" | "zy",
  spec: HouseSpec,
): void {
  const pos = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  if (!pos || !uv) return;
  const hw = spec.width * 0.5;
  const hd = spec.depth * 0.5;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (mode === "xy") {
      uv.setXY(i, (pos.getX(i) + hw) / WALL_TEXTURE_TILE, y / WALL_TEXTURE_TILE);
    } else {
      uv.setXY(i, (pos.getZ(i) + hd) / WALL_TEXTURE_TILE, y / WALL_TEXTURE_TILE);
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

/** 屋顶瓦片在世界单位中的平铺边长（米）；略大于瓦垄，让贴图当风化而不是再套一层瓦 */
const ROOF_TEXTURE_TILE = 5.6;
/** 筒瓦中心距（米），沿屋脊方向起伏 */
const BARREL_PITCH = 0.5;
const BARREL_AMP = 0.085;

type RoofVert = { p: [number, number, number]; uv: [number, number] };

function roofExtent(spec: HouseSpec) {
  const ridgeHalf = spec.width * 0.5 + GABLE_OVERHANG;
  const wallSlopeHalf = spec.depth * 0.5;
  const slopeHalf = spec.depth * 0.5 + spec.roofOverhang;
  const peakY = spec.wallHeight + spec.roofHeight;
  // 出檐沿山墙坡线继续向下延伸，保证屋面与山墙同坡
  const baseY = peakY - (spec.roofHeight / wallSlopeHalf) * slopeHalf;
  return { ridgeHalf, slopeHalf, baseY, peakY };
}

/** 地中海筒瓦人字顶：坡面朝前后（门一侧），瓦垄沿左右屋脊起波 */
function makeGableRoof(spec: HouseSpec): THREE.BufferGeometry {
  const { ridgeHalf, slopeHalf, baseY, peakY } = roofExtent(spec);
  const slopeLen = Math.hypot(slopeHalf, peakY - baseY);
  const tilesX = Math.max(8, Math.round((2 * ridgeHalf) / BARREL_PITCH));
  const segsX = tilesX * 4;
  const segsS = 12;
  const nS = segsS + 1;
  const nX = segsX + 1;

  const slopeUv = (t: number, x: number): [number, number] => [
    (x + ridgeHalf) / ROOF_TEXTURE_TILE,
    t * (slopeLen / ROOF_TEXTURE_TILE),
  ];

  const point = (side: 1 | -1, t: number, x: number): RoofVert => {
    const dirZ = side * slopeHalf;
    const dirY = baseY - peakY;
    const nZ = (-dirY * side) / slopeLen;
    const nY = slopeHalf / slopeLen;
    const eaveWaveFade = Math.min(1, (1 - t) * 6);
    const wave =
      BARREL_AMP *
      Math.pow(
        0.5 + 0.5 * Math.cos((x * Math.PI * 2) / BARREL_PITCH),
        1.12,
      ) *
      eaveWaveFade;
    return {
      p: [
        x,
        peakY + t * (baseY - peakY) + nY * wave,
        side * t * slopeHalf + nZ * wave,
      ],
      uv: slopeUv(t, x),
    };
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const indexOf = (sideIdx: number, is: number, ix: number) =>
    sideIdx * nS * nX + is * nX + ix;

  for (const side of [-1, 1] as const) {
    for (let is = 0; is <= segsS; is += 1) {
      const t = is / segsS;
      for (let ix = 0; ix <= segsX; ix += 1) {
        const x = -ridgeHalf + (2 * ridgeHalf * ix) / segsX;
        const vert = point(side, t, x);
        positions.push(vert.p[0], vert.p[1], vert.p[2]);
        uvs.push(vert.uv[0], vert.uv[1]);
      }
    }
  }

  for (let sideIdx = 0; sideIdx < 2; sideIdx += 1) {
    const side = sideIdx === 0 ? -1 : 1;
    for (let is = 0; is < segsS; is += 1) {
      for (let ix = 0; ix < segsX; ix += 1) {
        const i00 = indexOf(sideIdx, is, ix);
        const i10 = indexOf(sideIdx, is + 1, ix);
        const i01 = indexOf(sideIdx, is, ix + 1);
        const i11 = indexOf(sideIdx, is + 1, ix + 1);
        if (side === 1) {
          indices.push(i00, i10, i01, i01, i10, i11);
        } else {
          indices.push(i00, i01, i10, i10, i01, i11);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 屋脊筒瓦压顶（沿 X，左右走向） */
function makeRidgeCap(spec: HouseSpec): THREE.BufferGeometry {
  const { ridgeHalf, peakY } = roofExtent(spec);
  const geometry = new THREE.CylinderGeometry(
    0.13,
    0.13,
    ridgeHalf * 2 + 0.32,
    12,
    1,
  );
  geometry.rotateZ(Math.PI * 0.5);
  geometry.translate(0, peakY + 0.08, 0);
  return geometry;
}

/** 前后墙：矩形到檐口，UV 按世界 Y 连续；+Z 是门所在正立面 */
function makeFrontWall(
  spec: HouseSpec,
  zSign: 1 | -1,
): THREE.BufferGeometry {
  const hz = spec.depth * 0.5;
  const geometry = makeBox(
    spec.width - WALL_FACE_OVERLAP * 2,
    spec.wallHeight,
    WALL_THICK,
    new THREE.Vector3(
      0,
      spec.wallHeight * 0.5,
      zSign * (hz - WALL_THICK * 0.5 + WALL_FACE_OVERLAP),
    ),
  );
  applyWorldWallUvs(geometry, "xy", spec);
  return geometry;
}

/** 左右整面山墙：一块五边形灰泥从地面挤到屋脊，世界 UV 连续 */
function makeGableFacade(
  spec: HouseSpec,
  xSign: 1 | -1,
): THREE.BufferGeometry {
  const hw = spec.width * 0.5;
  const hd = spec.depth * 0.5;
  const wallH = spec.wallHeight;
  const peakY = wallH + spec.roofHeight;

  const shape = new THREE.Shape();
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(hd, wallH);
  shape.lineTo(0, peakY);
  shape.lineTo(-hd, wallH);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WALL_THICK,
    bevelEnabled: false,
    steps: 1,
  });
  if (xSign > 0) {
    geometry.rotateY(Math.PI * 0.5);
    geometry.translate(hw - WALL_THICK, 0, 0);
  } else {
    geometry.rotateY(-Math.PI * 0.5);
    geometry.translate(-hw + WALL_THICK, 0, 0);
  }
  const facade = geometry.index ? geometry.toNonIndexed() : geometry;
  if (facade !== geometry) geometry.dispose();
  for (const name of Object.keys(facade.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") {
      facade.deleteAttribute(name);
    }
  }
  applyWorldWallUvs(facade, "zy", spec);
  facade.computeVertexNormals();
  return facade;
}

/** 山墙斜边木封檐，压住左右瓦沿 */
function addGableBargeboards(layers: LayerParts, spec: HouseSpec): void {
  const hw = spec.width * 0.5;
  const hd = spec.depth * 0.5;
  const y0 = spec.wallHeight;
  const y1 = spec.wallHeight + spec.roofHeight;
  const rakeLen = Math.hypot(hd, y1 - y0);
  const pitch = Math.atan2(y1 - y0, hd);
  const boardW = 0.11;
  const boardH = 0.16;

  for (const xSign of [-1, 1] as const) {
    for (const zSign of [-1, 1] as const) {
      const board = new THREE.BoxGeometry(boardW, boardH, rakeLen + 0.08);
      scaleBoxUvs(board, boardW, boardH, rakeLen + 0.08, WOOD_TEXTURE_TILE);
      board.translate(0, -boardH * 0.55, 0);
      board.rotateX(zSign > 0 ? pitch : -pitch);
      const midZ = zSign * hd * 0.5;
      const midY = (y0 + y1) * 0.5;
      board.translate(xSign * (hw + boardW * 0.45), midY, midZ);
      layers.woodwork.push(board);
    }
  }
}

/** 檐口木压条 + 斜向椽头，门前能看到一排木榫 */
function addRoofRafters(layers: LayerParts, spec: HouseSpec): void {
  const { ridgeHalf, slopeHalf, baseY, peakY } = roofExtent(spec);
  const pitch = Math.atan2(peakY - baseY, slopeHalf);
  const spacing = 0.56;
  const len = 0.44;
  const ht = 0.12;
  const thk = 0.09;

  for (const side of [-1, 1] as const) {
    const slopeRotation = side > 0 ? pitch : -pitch;
    const fascia = new THREE.BoxGeometry(ridgeHalf * 2 + 0.12, 0.16, 0.08);
    scaleBoxUvs(fascia, ridgeHalf * 2 + 0.12, 0.16, 0.08, WOOD_TEXTURE_TILE);
    fascia.rotateX(slopeRotation);
    fascia.translate(0, baseY - 0.02, side * slopeHalf);
    layers.woodwork.push(fascia);

    if (side < 0) continue;

    for (let x = -ridgeHalf + 0.3; x <= ridgeHalf - 0.3; x += spacing) {
      const rafter = new THREE.BoxGeometry(thk, ht, len);
      scaleBoxUvs(rafter, thk, ht, len, WOOD_TEXTURE_TILE);
      rafter.translate(0, -ht, -side * (len * 0.5));
      rafter.rotateX(slopeRotation);
      rafter.translate(x, baseY, side * slopeHalf);
      layers.woodwork.push(rafter);
    }
  }
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
  layers.walls.push(makeFrontWall(spec, 1));
  layers.walls.push(makeFrontWall(spec, -1));
  layers.walls.push(
    makeBox(
      spec.width - WALL_THICK * 2,
      0.12,
      spec.depth - WALL_THICK * 2,
      new THREE.Vector3(0, spec.wallHeight - 0.06, 0),
    ),
  );
  layers.walls.push(makeGableFacade(spec, 1));
  layers.walls.push(makeGableFacade(spec, -1));
}

function addRoofStage(layers: LayerParts, spec: HouseSpec): void {
  layers.roofs.push(makeGableRoof(spec));
  layers.roofs.push(makeRidgeCap(spec));
  addRoofRafters(layers, spec);
  addGableBargeboards(layers, spec);
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
  // 与小路石板同量级 UV，便于铺 PavingStones 贴图
  const stepTile = 0.55;
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
      true,
      stepTile,
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
      true,
      stepTile,
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
