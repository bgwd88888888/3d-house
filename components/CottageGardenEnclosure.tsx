"use client";

/**
 * 西式小院围合：矮木篱 + 半开院门 + 泥坛 / 灌木丘。
 * 木作与灌木各自合并成一网格，控制 draw call。
 */
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useWoodTextures } from "@/hooks/useWoodTextures";
import { COTTAGE_YARD } from "@/lib/cottageYard";

const WOOD_TILE = 0.42;
const WOOD_NORMAL = new THREE.Vector2(0.85, 0.85);
const POST_W = 0.11;
const RAIL_T = 0.055;
const PICKET_W = 0.055;
const PICKET_D = 0.032;
const PICKET_GAP = 0.125;
const POST_SPACING = 2.05;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scaleBoxUvs(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  depth: number,
): void {
  const uv = geometry.getAttribute("uv");
  if (!uv) return;
  const faceScales: [number, number][] = [
    [depth / WOOD_TILE, height / WOOD_TILE],
    [depth / WOOD_TILE, height / WOOD_TILE],
    [width / WOOD_TILE, depth / WOOD_TILE],
    [width / WOOD_TILE, depth / WOOD_TILE],
    [width / WOOD_TILE, height / WOOD_TILE],
    [width / WOOD_TILE, height / WOOD_TILE],
  ];
  for (let face = 0; face < 6; face += 1) {
    const [uScale, vScale] = faceScales[face];
    const base = face * 4;
    for (let i = 0; i < 4; i += 1) {
      const index = base + i;
      uv.setXY(index, uv.getX(index) * uScale, uv.getY(index) * vScale);
    }
  }
  uv.needsUpdate = true;
}

function woodBox(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rotY = 0,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  scaleBoxUvs(geometry, width, height, depth);
  if (rotY !== 0) geometry.rotateY(rotY);
  geometry.translate(x, y, z);
  return geometry;
}

type Segment = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
};

function buildFenceWood(rand: () => number): THREE.BufferGeometry | null {
  const { minX, maxX, minZ, maxZ, gateX, gateHalf, fenceHeight } = COTTAGE_YARD;
  const parts: THREE.BufferGeometry[] = [];
  const postH = fenceHeight + 0.08;
  const picketH = fenceHeight - 0.04;
  const railYs = [0.28, 0.62, 0.94];

  const segments: Segment[] = [
    { ax: minX, az: maxZ, bx: gateX - gateHalf, bz: maxZ },
    { ax: gateX + gateHalf, az: maxZ, bx: maxX, bz: maxZ },
    { ax: minX, az: minZ, bx: maxX, bz: minZ },
    { ax: minX, az: minZ, bx: minX, bz: maxZ },
    { ax: maxX, az: minZ, bx: maxX, bz: maxZ },
  ];

  const addPost = (x: number, z: number, scale = 1) => {
    parts.push(
      woodBox(POST_W * scale, postH, POST_W * scale, x, postH * 0.5 - 0.02, z),
    );
  };

  for (const seg of segments) {
    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const ux = dx / len;
    const uz = dz / len;
    const yaw = Math.atan2(dx, dz);
    const n = Math.max(1, Math.round(len / POST_SPACING));

    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      addPost(seg.ax + ux * len * t, seg.az + uz * len * t, 1);
    }

    for (const railY of railYs) {
      parts.push(
        woodBox(RAIL_T, RAIL_T * 1.15, len, (seg.ax + seg.bx) * 0.5, railY, (seg.az + seg.bz) * 0.5, yaw),
      );
    }

    const picketStep = PICKET_W + PICKET_GAP;
    const count = Math.floor(len / picketStep);
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const x = seg.ax + ux * len * t;
      const z = seg.az + uz * len * t;
      const lean = (rand() - 0.5) * 0.04;
      const h = picketH * (0.94 + rand() * 0.1);
      parts.push(
        woodBox(PICKET_W, h, PICKET_D, x + uz * lean, h * 0.5 - 0.01, z - ux * lean, yaw),
      );
    }
  }

  const gatePostScale = 1.35;
  addPost(gateX - gateHalf, maxZ, gatePostScale);
  addPost(gateX + gateHalf, maxZ, gatePostScale);

  const postHalf = POST_W * gatePostScale * 0.5;
  const leafW = gateHalf - postHalf - 0.04;
  const leafH = fenceHeight - 0.08;
  const leafD = 0.045;
  const open = 0.42;
  const addGateLeaf = (hingeX: number, side: 1 | -1) => {
    const geometry = new THREE.BoxGeometry(leafW, leafH, leafD);
    scaleBoxUvs(geometry, leafW, leafH, leafD);
    geometry.translate(side * leafW * 0.5, 0, 0);
    geometry.rotateY(-side * open);
    geometry.translate(hingeX, leafH * 0.5 - 0.02, maxZ);
    parts.push(geometry);
  };
  addGateLeaf(gateX - gateHalf + postHalf, 1);
  addGateLeaf(gateX + gateHalf - postHalf, -1);

  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged;
}

function tintedIco(
  rx: number,
  ry: number,
  rz: number,
  x: number,
  y: number,
  z: number,
  color: THREE.Color,
  rand: () => number,
): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  geometry.scale(rx, ry, rz);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const n = 0.78 + rand() * 0.34;
    colors[i * 3] = color.r * n;
    colors[i * 3 + 1] = color.g * n;
    colors[i * 3 + 2] = color.b * n;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.rotateY(rand() * Math.PI * 2);
  geometry.translate(x, y, z);
  return geometry;
}

type Planting = {
  foliage: THREE.BufferGeometry | null;
};

function buildPlanting(rand: () => number): Planting {
  const hedges: THREE.BufferGeometry[] = [];
  const olive = new THREE.Color("#4f5c38");
  const moss = new THREE.Color("#6a7348");
  const sage = new THREE.Color("#5c6844");

  const clumps: Array<{
    x: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    color: THREE.Color;
  }> = [];

  const { minX, maxX, minZ, maxZ, gateX, gateHalf } = COTTAGE_YARD;
  const frontZs = 14.55;
  for (let x = minX + 1.2; x < maxX - 0.8; x += 1.55 + rand() * 0.35) {
    if (Math.abs(x - gateX) < gateHalf + 0.7) continue;
    clumps.push({
      x: x + (rand() - 0.5) * 0.25,
      z: frontZs + (rand() - 0.5) * 0.18,
      rx: 0.42 + rand() * 0.28,
      ry: 0.28 + rand() * 0.14,
      rz: 0.32 + rand() * 0.16,
      color: rand() > 0.5 ? olive : sage,
    });
  }
  for (let z = minZ + 1.4; z < maxZ - 1.2; z += 2.1 + rand() * 0.4) {
    clumps.push({
      x: maxX - 0.7 + (rand() - 0.5) * 0.15,
      z,
      rx: 0.38 + rand() * 0.2,
      ry: 0.26 + rand() * 0.12,
      rz: 0.34 + rand() * 0.16,
      color: moss,
    });
  }

  for (const clump of clumps) {
    hedges.push(
      tintedIco(
        clump.rx,
        clump.ry,
        clump.rz,
        clump.x,
        clump.ry * 0.72,
        clump.z,
        clump.color,
        rand,
      ),
    );
    hedges.push(
      tintedIco(
        clump.rx * (0.55 + rand() * 0.25),
        clump.ry * (0.7 + rand() * 0.25),
        clump.rz * (0.55 + rand() * 0.25),
        clump.x + (rand() - 0.5) * clump.rx * 0.7,
        clump.ry * 0.55,
        clump.z + (rand() - 0.5) * clump.rz * 0.7,
        clump.color,
        rand,
      ),
    );
  }

  return {
    foliage: mergeGeometries(hedges, false),
  };
}

export function CottageGardenEnclosure() {
  const woodTextures = useWoodTextures();
  const fence = useMemo(() => buildFenceWood(mulberry32(904)), []);
  const planting = useMemo(() => buildPlanting(mulberry32(1203)), []);

  useLayoutEffect(() => {
    return () => {
      fence?.dispose();
      planting.foliage?.dispose();
    };
  }, [fence, planting]);

  return (
    <group>
      {fence ? (
        <mesh geometry={fence} castShadow receiveShadow>
          <meshStandardMaterial
            {...woodTextures}
            color="#7a5a3c"
            roughness={0.86}
            metalness={0.02}
            normalScale={WOOD_NORMAL}
            envMapIntensity={0.16}
          />
        </mesh>
      ) : null}
      {planting.foliage ? (
        <mesh geometry={planting.foliage} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            color="#d8d4c4"
            roughness={0.94}
            metalness={0}
            envMapIntensity={0.12}
          />
        </mesh>
      ) : null}
    </group>
  );
}
