/**
 * 室内厅堂几何：分格护墙板、分层线脚、细窗套与陈设，按材质合并。
 */
import * as THREE from "three";
import { mergeGeometryParts } from "@/lib/mergeGeometryParts";
import { makeWindowedWallGeometry } from "@/lib/windowedWallGeometry";
import { tintDetailGeometry } from "@/lib/cottageDetailGeometry";
import { ROOM } from "@/lib/roomSpec";

const WALL_TILE = 2.2;
const WOOD_TILE = 0.42;
const FLOOR_TILE = 1.15;

export type RoomLayers = {
  plaster: THREE.BufferGeometry | null;
  floor: THREE.BufferGeometry | null;
  woodwork: THREE.BufferGeometry | null;
  glass: THREE.BufferGeometry | null;
  curtains: THREE.BufferGeometry | null;
  brass: THREE.BufferGeometry | null;
  lampDiffuser: THREE.BufferGeometry | null;
  rug: THREE.BufferGeometry | null;
  hearth: THREE.BufferGeometry | null;
  fire: THREE.BufferGeometry | null;
  clay: THREE.BufferGeometry | null;
  screen: THREE.BufferGeometry | null;
  device: THREE.BufferGeometry | null;
};

function applyProjectedUvs(geometry: THREE.BufferGeometry, tile: number): void {
  geometry.computeVertexNormals();
  const pos = geometry.getAttribute("position");
  const nrm = geometry.getAttribute("normal");
  if (!pos || !nrm) return;
  let uv = geometry.getAttribute("uv");
  if (!uv || uv.count !== pos.count) {
    uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geometry.setAttribute("uv", uv);
  }
  for (let i = 0; i < pos.count; i += 1) {
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const nz = Math.abs(nrm.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ny >= nx && ny >= nz) {
      uv.setXY(i, x / tile, z / tile);
    } else if (nx >= nz) {
      uv.setXY(i, z / tile, y / tile);
    } else {
      uv.setXY(i, x / tile, y / tile);
    }
  }
  uv.needsUpdate = true;
}

function makePlasterPlane(
  width: number,
  height: number,
  position: [number, number, number],
  rotation: [number, number, number],
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateX(rotation[0]);
  geometry.rotateY(rotation[1]);
  geometry.rotateZ(rotation[2]);
  geometry.translate(...position);
  applyProjectedUvs(geometry, WALL_TILE);
  return geometry;
}

function makeScreenQuad(
  width: number,
  height: number,
  center: [number, number, number],
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateY(Math.PI);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) {
    uv.setX(i, 1 - uv.getX(i));
  }
  uv.needsUpdate = true;
  geometry.translate(...center);
  return geometry;
}

function makeBox(
  width: number,
  height: number,
  depth: number,
  center: [number, number, number],
  tile: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(...center);
  applyProjectedUvs(geometry, tile);
  return geometry;
}

function makeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  center: [number, number, number],
  tile: number,
): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    segments,
  );
  geometry.translate(...center);
  applyProjectedUvs(geometry, tile);
  return geometry;
}

function makeSphere(
  radius: number,
  segments: number,
  center: [number, number, number],
  tile: number,
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  geometry.translate(...center);
  applyProjectedUvs(geometry, tile);
  return geometry;
}

function makeWindowWall(): THREE.BufferGeometry {
  const hw = ROOM.innerWidth * 0.5;
  const outline = new THREE.Shape();
  outline.moveTo(-hw, 0);
  outline.lineTo(hw, 0);
  outline.lineTo(hw, ROOM.innerHeight);
  outline.lineTo(-hw, ROOM.innerHeight);
  outline.closePath();
  const geometry = makeWindowedWallGeometry(
    outline,
    ROOM.window.xs,
    ROOM.window,
    ROOM.wallThick,
  );
  geometry.translate(0, 0, ROOM.innerDepth * 0.5);
  applyProjectedUvs(geometry, WALL_TILE);
  return geometry;
}

function makeCurtain(width: number, height: number, side: -1 | 1) {
  const panelWidth = width * (side < 0 ? 0.22 : 0.19);
  const geometry = new THREE.PlaneGeometry(panelWidth, height, 22, 8);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const u = position.getX(i) / panelWidth + 0.5;
    const v = position.getY(i) / height + 0.5;
    const fold = Math.cos(u * Math.PI * 9) * (0.7 + v * 0.3);
    const swell = Math.sin(v * Math.PI) * 0.012;
    position.setXYZ(
      i,
      position.getX(i) + side * (width * 0.5 - panelWidth * 0.5 + 0.02),
      position.getY(i) + (1 - v) * 0.01 * fold,
      fold * 0.034 + swell,
    );
  }
  geometry.computeVertexNormals();
  return tintDetailGeometry(geometry, side < 0 ? "#d9c8ae" : "#cfc0a4");
}

function makeWindowFrames(): THREE.BufferGeometry[] {
  const { width, height, sillHeight, frameDepth, recess, xs } = ROOM.window;
  const side = 0.055;
  const rail = 0.05;
  const muntin = 0.028;
  const innerZ = ROOM.innerDepth * 0.5;
  const cz = innerZ + recess + frameDepth * 0.5;
  const cy = sillHeight + height * 0.5;
  const casingZ = innerZ - 0.028;
  const parts: THREE.BufferGeometry[] = [];
  for (const x of xs) {
    parts.push(
      makeBox(side, height, frameDepth, [x - (width - side) * 0.5, cy, cz], WOOD_TILE),
      makeBox(side, height, frameDepth, [x + (width - side) * 0.5, cy, cz], WOOD_TILE),
      makeBox(width, rail, frameDepth, [x, cy + (height - rail) * 0.5, cz], WOOD_TILE),
      makeBox(width, rail, frameDepth, [x, cy - (height - rail) * 0.5, cz], WOOD_TILE),
      makeBox(muntin, height * 0.9, frameDepth * 0.55, [x, cy, cz], WOOD_TILE),
      makeBox(width * 0.78, muntin, frameDepth * 0.55, [x, cy + height * 0.16, cz], WOOD_TILE),
      makeBox(width * 0.78, muntin, frameDepth * 0.55, [x, cy - height * 0.16, cz], WOOD_TILE),
      makeBox(width + 0.22, 0.045, 0.16, [x, sillHeight - 0.008, innerZ - 0.07], WOOD_TILE),
      makeBox(0.07, height + 0.16, 0.04, [x - width * 0.5 - 0.04, cy, casingZ], WOOD_TILE),
      makeBox(0.07, height + 0.16, 0.04, [x + width * 0.5 + 0.04, cy, casingZ], WOOD_TILE),
      makeBox(width + 0.22, 0.07, 0.04, [x, sillHeight + height + 0.06, casingZ], WOOD_TILE),
      makeBox(width + 0.3, 0.11, 0.13, [x, sillHeight + height + 0.16, innerZ - 0.07], WOOD_TILE),
    );
  }
  return parts;
}

/** 分格护墙板：挺柱凸出，心板退入，避免一整块深色。 */
function makePanelRun(
  along: "x" | "z",
  wall: number,
  from: number,
  to: number,
  count: number,
  intoRoom: 1 | -1,
): THREE.BufferGeometry[] {
  const y0 = 0.178;
  const y1 = 1.052;
  const h = y1 - y0;
  const midY = (y0 + y1) * 0.5;
  const stile = 0.048;
  const span = to - from;
  const panel = (span - stile * (count + 1)) / count;
  const frameT = 0.024;
  const fieldT = 0.01;
  const framePos = wall + intoRoom * 0.03;
  const fieldPos = wall + intoRoom * 0.012;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= count; i += 1) {
    const at = from + stile * 0.5 + i * (panel + stile);
    if (along === "z") {
      parts.push(makeBox(frameT, h, stile, [framePos, midY, at], WOOD_TILE));
    } else {
      parts.push(makeBox(stile, h, frameT, [at, midY, framePos], WOOD_TILE));
    }
  }
  for (let i = 0; i < count; i += 1) {
    const at = from + stile + panel * 0.5 + i * (panel + stile);
    if (along === "z") {
      parts.push(
        makeBox(fieldT, h - 0.05, panel - 0.024, [fieldPos, midY, at], WOOD_TILE),
      );
    } else {
      parts.push(
        makeBox(panel - 0.024, h - 0.05, fieldT, [at, midY, fieldPos], WOOD_TILE),
      );
    }
  }
  return parts;
}

function makeMillwork(): THREE.BufferGeometry[] {
  const w = ROOM.innerWidth;
  const d = ROOM.innerDepth;
  const h = ROOM.innerHeight;
  const halfW = w * 0.5;
  const halfD = d * 0.5;
  const parts: THREE.BufferGeometry[] = [];

  const base = [
    { t: 0.042, h: 0.11, inset: 0 },
    { t: 0.028, h: 0.04, inset: 0.018 },
  ];
  let baseY = 0;
  for (const step of base) {
    const y = baseY + step.h * 0.5;
    parts.push(
      makeBox(w, step.h, step.t, [0, y, halfD - step.inset - step.t * 0.5], WOOD_TILE),
      makeBox(w, step.h, step.t, [0, y, -halfD + step.inset + step.t * 0.5], WOOD_TILE),
      makeBox(step.t, step.h, d - step.inset * 2, [-halfW + step.inset + step.t * 0.5, y, 0], WOOD_TILE),
      makeBox(step.t, step.h, d - step.inset * 2, [halfW - step.inset - step.t * 0.5, y, 0], WOOD_TILE),
    );
    baseY += step.h;
  }

  const railY = 1.078;
  const rail = [
    { t: 0.04, h: 0.032, inset: 0 },
    { t: 0.026, h: 0.022, inset: 0.016 },
  ];
  let ry = railY;
  for (const step of rail) {
    const y = ry + step.h * 0.5;
    parts.push(
      makeBox(step.t, step.h, d, [-halfW + step.inset + step.t * 0.5, y, 0], WOOD_TILE),
      makeBox(step.t, step.h, d, [halfW - step.inset - step.t * 0.5, y, 0], WOOD_TILE),
      makeBox(w, step.h, step.t, [0, y, -halfD + step.inset + step.t * 0.5], WOOD_TILE),
    );
    ry += step.h;
  }

  const crown = [
    { t: 0.042, drop: 0.03, inset: 0 },
    { t: 0.068, drop: 0.024, inset: 0.03 },
    { t: 0.036, drop: 0.018, inset: 0.058 },
  ];
  let cy = h;
  for (const step of crown) {
    cy -= step.drop * 0.5;
    parts.push(
      makeBox(w, step.drop, step.t, [0, cy, halfD - step.inset - step.t * 0.5], WOOD_TILE),
      makeBox(w, step.drop, step.t, [0, cy, -halfD + step.inset + step.t * 0.5], WOOD_TILE),
      makeBox(step.t, step.drop, d, [-halfW + step.inset + step.t * 0.5, cy, 0], WOOD_TILE),
      makeBox(step.t, step.drop, d, [halfW - step.inset - step.t * 0.5, cy, 0], WOOD_TILE),
    );
    cy -= step.drop * 0.5;
  }

  parts.push(
    ...makePanelRun("z", halfW, -halfD + 0.1, halfD - 0.1, 6, -1),
    ...makePanelRun("z", -halfW, -halfD + 0.1, halfD - 0.1, 6, 1),
    ...makePanelRun("x", -halfD, -halfW + 0.1, -1.02, 3, 1),
    ...makePanelRun("x", -halfD, 1.02, halfW - 0.1, 3, 1),
  );
  return parts;
}

function makeFireplaceWood(): THREE.BufferGeometry[] {
  const halfD = ROOM.innerDepth * 0.5;
  const z = -halfD + 0.11;
  const { width, openingW, openingH } = ROOM.fireplace;
  const pillarW = (width - openingW) * 0.5;
  const pillarX = openingW * 0.5 + pillarW * 0.5;
  const surroundH = openingH + 0.34;
  return [
    makeBox(pillarW, surroundH, 0.2, [-pillarX, surroundH * 0.5, z], WOOD_TILE),
    makeBox(pillarW, surroundH, 0.2, [pillarX, surroundH * 0.5, z], WOOD_TILE),
    makeBox(width, 0.16, 0.2, [0, openingH + 0.22, z], WOOD_TILE),
    makeBox(openingW + 0.1, 0.035, 0.04, [0, openingH + 0.02, z + 0.1], WOOD_TILE),
    makeBox(0.035, openingH + 0.04, 0.04, [-(openingW * 0.5 + 0.01), 0.52, z + 0.1], WOOD_TILE),
    makeBox(0.035, openingH + 0.04, 0.04, [openingW * 0.5 + 0.01, 0.52, z + 0.1], WOOD_TILE),
    makeBox(width, 0.1, 0.26, [0, 0.05, z + 0.03], WOOD_TILE),
    makeBox(width + 0.16, 0.04, 0.3, [0, openingH + 0.34, z + 0.04], WOOD_TILE),
    makeBox(width + 0.28, 0.055, 0.34, [0, openingH + 0.4, z + 0.06], WOOD_TILE),
    makeBox(width + 0.12, 0.025, 0.28, [0, openingH + 0.44, z + 0.04], WOOD_TILE),
    makeBox(0.08, 0.86, 0.04, [-0.54, 2.42, -halfD + 0.03], WOOD_TILE),
    makeBox(0.08, 0.86, 0.04, [0.54, 2.42, -halfD + 0.03], WOOD_TILE),
    makeBox(1.16, 0.08, 0.04, [0, 2.81, -halfD + 0.03], WOOD_TILE),
    makeBox(1.16, 0.08, 0.04, [0, 2.03, -halfD + 0.03], WOOD_TILE),
  ];
}

function makeTables(): THREE.BufferGeometry[] {
  const c = ROOM.console;
  const k = ROOM.coffee;
  const parts: THREE.BufferGeometry[] = [];
  const addTable = (
    width: number,
    depth: number,
    height: number,
    z: number,
    topT: number,
  ) => {
    const topY = height - topT * 0.5;
    const apronH = 0.045;
    const legTop = 0.042;
    const legBot = 0.028;
    const insetX = width * 0.5 - 0.055;
    const insetZ = depth * 0.5 - 0.05;
    parts.push(
      makeBox(width, topT, depth, [0, topY, z], WOOD_TILE),
      makeBox(width - 0.06, apronH, depth - 0.06, [0, height - topT - apronH * 0.5, z], WOOD_TILE),
    );
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * insetX;
        const lz = z + sz * insetZ;
        const legH = height - topT - apronH;
        parts.push(
          makeCylinder(legTop * 0.5, legBot * 0.5, legH, 8, [lx, legH * 0.5, lz], WOOD_TILE),
        );
      }
    }
  };
  addTable(c.width, c.depth, c.height, c.z, 0.032);
  addTable(k.width, k.depth, k.height, k.z, 0.028);
  return parts;
}

function makeChandelier(): { brass: THREE.BufferGeometry[]; diffusers: THREE.BufferGeometry[] } {
  const [lx, ly, lz] = ROOM.chandelier;
  const brass: THREE.BufferGeometry[] = [
    makeCylinder(0.08, 0.08, 0.028, 14, [lx, ROOM.innerHeight - 0.016, lz], WOOD_TILE),
    makeCylinder(0.045, 0.045, 0.016, 14, [lx, ROOM.innerHeight - 0.038, lz], WOOD_TILE),
    makeCylinder(0.01, 0.01, 0.48, 8, [lx, ly + 0.32, lz], WOOD_TILE),
    makeCylinder(0.055, 0.16, 0.04, 16, [lx, ly + 0.08, lz], WOOD_TILE),
    makeCylinder(0.038, 0.038, 0.03, 14, [lx, ly - 0.01, lz], WOOD_TILE),
  ];
  const ring = new THREE.TorusGeometry(0.17, 0.008, 8, 24);
  ring.rotateX(Math.PI * 0.5);
  ring.translate(lx, ly + 0.05, lz);
  applyProjectedUvs(ring, WOOD_TILE);
  brass.push(ring);
  const diffusers: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const reach = 0.4;
    const ax = lx + Math.cos(angle) * reach;
    const az = lz + Math.sin(angle) * reach;
    const arm = new THREE.CylinderGeometry(0.009, 0.009, reach, 8);
    arm.rotateZ(Math.PI * 0.5);
    arm.translate(reach * 0.5, 0, 0);
    arm.rotateY(-angle);
    arm.translate(lx, ly + 0.01, lz);
    applyProjectedUvs(arm, WOOD_TILE);
    brass.push(arm);
    brass.push(makeSphere(0.016, 8, [ax, ly + 0.01, az], WOOD_TILE));
    brass.push(makeCylinder(0.02, 0.026, 0.022, 10, [ax, ly - 0.018, az], WOOD_TILE));
    const shade = new THREE.CylinderGeometry(0.048, 0.07, 0.085, 12, 1, true);
    shade.translate(ax, ly - 0.072, az);
    diffusers.push(shade);
  }
  return { brass, diffusers };
}

function makeSconceBrass(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (const [sx, sy, sz] of ROOM.sconces) {
    const arm = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 8);
    arm.rotateX(Math.PI * 0.5);
    arm.translate(sx, sy + 0.018, sz + 0.1);
    applyProjectedUvs(arm, WOOD_TILE);
    parts.push(
      makeBox(0.08, 0.1, 0.016, [sx, sy, sz], WOOD_TILE),
      makeSphere(0.015, 8, [sx, sy + 0.02, sz + 0.04], WOOD_TILE),
      arm,
      makeCylinder(0.018, 0.028, 0.05, 10, [sx, sy - 0.028, sz + 0.18], WOOD_TILE),
    );
  }
  return parts;
}

function makeSconceDiffusers(): THREE.BufferGeometry[] {
  return ROOM.sconces.map(
    ([sx, sy, sz]) =>
      new THREE.CylinderGeometry(0.036, 0.048, 0.065, 12, 1, true).translate(
        sx,
        sy - 0.03,
        sz + 0.18,
      ),
  );
}

function makeCurtainRods(): THREE.BufferGeometry[] {
  const { width, height, sillHeight, xs } = ROOM.window;
  const y = sillHeight + height + 0.09;
  const z = ROOM.innerDepth * 0.5 - 0.055;
  const parts: THREE.BufferGeometry[] = [];
  for (const x of xs) {
    const len = width + 0.34;
    const rod = new THREE.CylinderGeometry(0.012, 0.012, len, 10);
    rod.rotateZ(Math.PI * 0.5);
    rod.translate(x, y, z);
    applyProjectedUvs(rod, WOOD_TILE);
    parts.push(rod);
    parts.push(makeSphere(0.02, 10, [x - len * 0.5, y, z], WOOD_TILE));
    parts.push(makeSphere(0.02, 10, [x + len * 0.5, y, z], WOOD_TILE));
  }
  return parts;
}

function makeCandlesticks(): THREE.BufferGeometry[] {
  const z = -ROOM.innerDepth * 0.5 + 0.24;
  const y = ROOM.fireplace.openingH + 0.47;
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.52, 0.52]) {
    parts.push(
      makeCylinder(0.028, 0.032, 0.012, 10, [x, y, z], WOOD_TILE),
      makeCylinder(0.01, 0.014, 0.15, 8, [x, y + 0.085, z], WOOD_TILE),
      makeCylinder(0.016, 0.016, 0.012, 8, [x, y + 0.16, z], WOOD_TILE),
    );
  }
  return parts;
}

function makeVases(): THREE.BufferGeometry[] {
  const tall = [
    [0, 0],
    [0.038, 0],
    [0.046, 0.018],
    [0.032, 0.12],
    [0.022, 0.16],
    [0.03, 0.22],
    [0.02, 0.26],
    [0, 0.26],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const wide = [
    [0, 0],
    [0.048, 0],
    [0.055, 0.02],
    [0.042, 0.1],
    [0.03, 0.13],
    [0.036, 0.17],
    [0.022, 0.19],
    [0, 0.19],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const mantel = new THREE.LatheGeometry(tall, 20);
  mantel.translate(0, ROOM.fireplace.openingH + 0.47, -ROOM.innerDepth * 0.5 + 0.22);
  const consoleA = new THREE.LatheGeometry(wide, 20);
  consoleA.translate(1.48, ROOM.console.height, ROOM.console.z);
  const consoleB = new THREE.LatheGeometry(tall, 18);
  consoleB.scale(0.78, 0.78, 0.78);
  consoleB.translate(-1.46, ROOM.console.height, ROOM.console.z);
  return [
    tintDetailGeometry(mantel, "#9a6a4e"),
    tintDetailGeometry(consoleA, "#8a5a44"),
    tintDetailGeometry(consoleB, "#7e5340"),
  ];
}

function makeTelevision(): {
  chassis: THREE.BufferGeometry[];
  screen: THREE.BufferGeometry[];
} {
  const { width, height, depth, standH } = ROOM.tv;
  const x = 0;
  const z = ROOM.console.z - 0.02;
  const tableY = ROOM.console.height;
  const panelY = tableY + standH + height * 0.5;
  const frontZ = z - depth * 0.5;
  const bezel = 0.012;
  const screenW = width - bezel * 2;
  const screenH = height - bezel * 2;
  const screenZ = frontZ - 0.008;
  const chassis = [
    makeBox(width, height, depth, [x, panelY, z], WOOD_TILE),
    makeBox(width * 0.9, height * 0.26, 0.03, [x, panelY - height * 0.3, z + depth * 0.5 + 0.012], WOOD_TILE),
    makeBox(0.022, standH, 0.1, [x - 0.2, tableY + standH * 0.5, z + 0.01], WOOD_TILE),
    makeBox(0.022, standH, 0.1, [x + 0.2, tableY + standH * 0.5, z + 0.01], WOOD_TILE),
    makeBox(0.09, 0.008, 0.15, [x - 0.2, tableY + 0.004, z + 0.012], WOOD_TILE),
    makeBox(0.09, 0.008, 0.15, [x + 0.2, tableY + 0.004, z + 0.012], WOOD_TILE),
  ];
  return {
    chassis,
    screen: [makeScreenQuad(screenW, screenH, [x, panelY, screenZ])],
  };
}

function makePainting(): { frame: THREE.BufferGeometry[]; canvas: THREE.BufferGeometry[] } {
  const z = ROOM.innerDepth * 0.5 - 0.03;
  const y = 2.22;
  const frame = [
    makeBox(1.18, 0.055, 0.04, [0, y + 0.4, z], WOOD_TILE),
    makeBox(1.18, 0.055, 0.04, [0, y - 0.4, z], WOOD_TILE),
    makeBox(0.055, 0.8, 0.04, [-0.56, y, z], WOOD_TILE),
    makeBox(0.055, 0.8, 0.04, [0.56, y, z], WOOD_TILE),
  ];
  const mat = tintDetailGeometry(
    makeBox(1.04, 0.72, 0.008, [0, y, z - 0.008], WOOD_TILE),
    "#cbb79a",
  );
  const innerW = 0.88;
  const band = 0.3;
  const sky = tintDetailGeometry(
    makeBox(innerW, band, 0.006, [0, y + band * 0.5 + 0.002, z - 0.018], WOOD_TILE),
    "#6a5648",
  );
  const land = tintDetailGeometry(
    makeBox(innerW, band, 0.006, [0, y - band * 0.5 - 0.002, z - 0.024], WOOD_TILE),
    "#3c3228",
  );
  return { frame, canvas: [mat, sky, land] };
}

export function buildRoomLayers(): RoomLayers {
  const w = ROOM.innerWidth;
  const d = ROOM.innerDepth;
  const h = ROOM.innerHeight;
  const halfW = w * 0.5;
  const halfD = d * 0.5;
  const halfH = h * 0.5;
  const { width: ww, height: wh, sillHeight, xs } = ROOM.window;
  const innerZ = halfD;
  const glassZ = innerZ + ROOM.wallThick - 0.045;
  const cy = sillHeight + wh * 0.5;
  const chandelier = makeChandelier();
  const painting = makePainting();
  const television = makeTelevision();

  const plaster = mergeGeometryParts([
    makeWindowWall(),
    makePlasterPlane(w, h, [0, halfH, -halfD], [0, 0, 0]),
    makePlasterPlane(d, h, [-halfW, halfH, 0], [0, Math.PI * 0.5, 0]),
    makePlasterPlane(d, h, [halfW, halfH, 0], [0, -Math.PI * 0.5, 0]),
    makePlasterPlane(w, d, [0, h, 0], [Math.PI * 0.5, 0, 0]),
  ]);

  const floor = makePlasterPlane(w, d, [0, 0, 0], [-Math.PI * 0.5, 0, 0]);
  applyProjectedUvs(floor, FLOOR_TILE);

  const glassParts = xs.map((x) => {
    const pane = new THREE.BoxGeometry(ww - 0.12, wh - 0.12, 0.01);
    pane.translate(x, cy, glassZ);
    return pane;
  });
  const mirror = new THREE.BoxGeometry(0.98, 0.7, 0.01);
  mirror.translate(0, 2.42, -halfD + 0.05);
  glassParts.push(mirror);

  const curtainH = sillHeight + wh + 0.02;
  const curtains = mergeGeometryParts(
    xs.flatMap((x) =>
      ([-1, 1] as const).map((side) => {
        const panel = makeCurtain(ww + 0.06, curtainH, side);
        panel.translate(x, curtainH * 0.5 + 0.03, innerZ - 0.09);
        return panel;
      }),
    ),
  );

  const rugOuter = tintDetailGeometry(
    makeBox(3.78, 0.016, 2.92, [0.15, 0.008, 0.18], WOOD_TILE),
    "#5a382c",
  );
  const rugInner = tintDetailGeometry(
    makeBox(3.28, 0.018, 2.46, [0.15, 0.012, 0.18], WOOD_TILE),
    "#6a4334",
  );

  const openingZ = -halfD + 0.16;
  const hearth = makeBox(
    ROOM.fireplace.openingW,
    ROOM.fireplace.openingH,
    0.18,
    [0, 0.54, openingZ],
    WOOD_TILE,
  );
  const fire = new THREE.BoxGeometry(0.68, 0.24, 0.035);
  fire.translate(0, 0.26, openingZ + 0.02);
  const flames = [-0.52, 0.52].map(
    (x) => new THREE.SphereGeometry(0.012, 8, 8).translate(
      x,
      ROOM.fireplace.openingH + 0.65,
      -halfD + 0.24,
    ),
  );

  return {
    plaster,
    floor,
    woodwork: mergeGeometryParts([
      ...makeWindowFrames(),
      ...makeMillwork(),
      ...makeFireplaceWood(),
      ...makeTables(),
      ...painting.frame,
    ]),
    glass: mergeGeometryParts(glassParts),
    curtains,
    brass: mergeGeometryParts([
      ...chandelier.brass,
      ...makeSconceBrass(),
      ...makeCurtainRods(),
      ...makeCandlesticks(),
    ]),
    lampDiffuser: mergeGeometryParts([
      ...chandelier.diffusers,
      ...makeSconceDiffusers(),
      ...flames,
    ]),
    rug: mergeGeometryParts([rugOuter, rugInner]),
    hearth,
    fire,
    clay: mergeGeometryParts([...makeVases(), ...painting.canvas]),
    screen: mergeGeometryParts(television.screen),
    device: mergeGeometryParts(television.chassis),
  };
}

export function disposeRoomLayers(layers: RoomLayers | null): void {
  if (!layers) return;
  for (const geometry of Object.values(layers)) {
    geometry?.dispose();
  }
}
