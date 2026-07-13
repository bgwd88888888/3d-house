import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const FOUNDATION_HEIGHT = 0.42;
const ROOF_BASE_GAP = 0.02;
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
    front: number[];
    left: number[];
    right: number[];
    atticOffsetX: number;
    atticSillHeight: number;
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
    right: [-1.5],
    atticOffsetX: -2.4,
    atticSillHeight: 4.25,
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

const WALL_TEXTURE_TILE = 2.2;

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
  const sillDepth = depth + 0.08;
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
      depth * 0.12,
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
  const x = side === "left" ? -spec.width * 0.5 : spec.width * 0.5;
  const dir = side === "left" ? -1 : 1;
  const rotationY = Math.PI * 0.5;
  const frameCenter = new THREE.Vector3(
    x + dir * (spec.windows.frameDepth * 0.5 + 0.02),
    spec.windows.sillHeight + spec.windows.height * 0.5,
    z,
  );

  for (const part of makeWindowFrame(
    spec.windows.width,
    spec.windows.height,
    spec.windows.frameDepth,
    frameCenter,
    rotationY,
  )) {
    layers.woodwork.push(part);
  }

  layers.glass.push(
    makeGlassPane(
      spec.windows.width * 0.76,
      spec.windows.height * 0.82,
      0.04,
      frameCenter.clone().add(new THREE.Vector3(dir * -0.08, 0, 0)),
      rotationY,
    ),
  );
}

function addAtticWindow(layers: LayerParts, spec: HouseSpec): void {
  const center = new THREE.Vector3(
    spec.windows.atticOffsetX,
    spec.windows.atticSillHeight + spec.windows.height * 0.4,
    -spec.depth * 0.5 + spec.windows.frameDepth * 0.5 + 0.02,
  );
  const width = spec.windows.width * 0.72;
  const height = spec.windows.height * 0.8;

  for (const part of makeWindowFrame(width, height, spec.windows.frameDepth, center, Math.PI)) {
    layers.woodwork.push(part);
  }

  layers.glass.push(
    makeGlassPane(
      width * 0.76,
      height * 0.82,
      0.04,
      center.clone().add(new THREE.Vector3(0, 0, 0.08)),
      Math.PI,
    ),
  );
}

function addWindowsStage(layers: LayerParts, spec: HouseSpec): void {
  for (const x of spec.windows.front) addFrontWindow(layers, spec, x);
  for (const z of spec.windows.left) addSideWindow(layers, spec, "left", z);
  for (const z of spec.windows.right) addSideWindow(layers, spec, "right", z);
  addAtticWindow(layers, spec);
}

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

export function estimateHouseBounds(
  spec: HouseSpec = DEFAULT_HOUSE_SPEC,
): THREE.Sphere {
  const radius = Math.max(spec.width, spec.depth) * 0.92;
  return new THREE.Sphere(
    new THREE.Vector3(0, spec.wallHeight * 0.55, 0),
    radius + spec.roofHeight * 0.9,
  );
}

export function buildCityLayersFromGeoJSON(): CityLayers {
  return buildHouseLayers("details");
}
