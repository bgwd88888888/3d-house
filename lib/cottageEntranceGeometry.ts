import * as THREE from "three";
import type { HouseSpec } from "@/lib/geoBuildings";
import { getCottageEntranceLayout, type DetailPosition } from "@/lib/cottageEntranceLayout";
import { detailNoise, makeDetailLeaf, tintDetailGeometry } from "@/lib/cottageDetailGeometry";
import { makeCottageFoundationParts } from "@/lib/cottageFoundationGeometry";
import { mergeGeometryParts } from "@/lib/mergeGeometryParts";

function box(size: DetailPosition, position: DetailPosition) {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.translate(...position);
  return geometry;
}

function makePlanterParts(planter: ReturnType<typeof getCottageEntranceLayout>["planters"][number], seed: number) {
  const { x, z, radius: r, height: h, plantHeight } = planter;
  const baseY = -0.025;
  // 连续剖面包含外壁、圆唇、内壁与盆底，斜看时仍能读出陶盆厚度。
  const profile = [
    [0, 0], [r * 0.65, 0], [r * 0.68, h * 0.08],
    [r * 0.92, h * 0.86], [r, h * 0.9], [r, h * 0.97],
    [r * 0.94, h], [r * 0.84, h * 0.97], [r * 0.83, h * 0.88],
    [r * 0.6, h * 0.12], [0, h * 0.12],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const clay = new THREE.LatheGeometry(profile, 20);
  clay.translate(x, baseY, z);
  tintDetailGeometry(clay, planter.tint);
  const soil = new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.035, 20);
  const soilY = baseY + h * 0.85;
  soil.translate(x, soilY, z);
  tintDetailGeometry(soil, "#76604a", 1);

  const foliage: THREE.BufferGeometry[] = [];
  const colors = ["#536343", "#718057", "#84906b"];
  for (let stemIndex = 0; stemIndex < 7; stemIndex++) {
    const angle = stemIndex * 2.399;
    const spread = r * (stemIndex === 0 ? 0 : 0.42);
    const stemX = x + Math.cos(angle) * spread;
    const stemZ = z + Math.sin(angle) * spread;
    const stemH = plantHeight * (0.58 + detailNoise(stemIndex, seed) * 0.35);
    const stem = new THREE.CylinderGeometry(0.008, 0.012, stemH, 5);
    stem.translate(stemX, soilY + stemH * 0.5, stemZ);
    foliage.push(tintDetailGeometry(stem, "#6e6945"));
    for (let leafIndex = 0; leafIndex < 6; leafIndex++) {
      const leaf = makeDetailLeaf(r * 0.5, r * 0.28);
      leaf.rotateZ((leafIndex % 2 ? 1 : -1) * 0.85);
      leaf.rotateY(angle + leafIndex * 1.7);
      leaf.translate(stemX, soilY + stemH * (0.22 + leafIndex * 0.13), stemZ);
      foliage.push(tintDetailGeometry(leaf, colors[(stemIndex + leafIndex) % colors.length]));
    }
  }
  return { clay, soil, foliage };
}

/** 入口与贴墙地面细节按材质合并；原房屋几何及现有材质层保持独立。 */
export function buildCottageEntranceGeometry(spec: HouseSpec) {
  const layout = getCottageEntranceLayout(spec);
  const foundation = makeCottageFoundationParts(spec);
  const clay: THREE.BufferGeometry[] = [];
  for (const [index, planter] of layout.planters.entries()) {
    const parts = makePlanterParts(planter, 51 + index);
    clay.push(parts.clay);
    foundation.soil.push(parts.soil);
    foundation.foliage.push(...parts.foliage);
  }

  const [lx, ly, lz] = layout.lamp;
  const frontZ = spec.depth * 0.5;
  const metal: THREE.BufferGeometry[] = [
    box([0.2, 0.44, 0.055], [lx, ly + 0.14, frontZ + 0.035]),
    box([0.055, 0.055, 0.37], [lx, ly + 0.36, frontZ + 0.2]),
    box([0.34, 0.065, 0.3], [lx, ly - 0.27, lz]),
    box([0.34, 0.045, 0.3], [lx, ly + 0.27, lz]),
  ];
  for (const dx of [-0.135, 0.135]) {
    for (const dz of [-0.115, 0.115]) metal.push(box([0.027, 0.5, 0.027], [lx + dx, ly, lz + dz]));
  }
  const cap = new THREE.ConeGeometry(0.265, 0.16, 4);
  cap.rotateY(Math.PI * 0.25);
  cap.translate(lx, ly + 0.37, lz);
  metal.push(cap);
  const [px, py, pz] = layout.plaque;
  metal.push(box([0.44, 0.29, 0.055], layout.plaque));

  return {
    metal: mergeGeometryParts(metal),
    clay: mergeGeometryParts(clay),
    foliage: mergeGeometryParts(foundation.foliage),
    soil: mergeGeometryParts(foundation.soil),
    stones: mergeGeometryParts(foundation.stones),
    diffuser: box([0.245, 0.46, 0.205], layout.lamp),
    plaque: box([0.395, 0.245, 0.012], [px, py, pz + 0.034]),
  };
}
