import * as THREE from "three";
import { detailNoise, makeDetailLeaf, tintDetailGeometry } from "@/lib/cottageDetailGeometry";
import type { CottageShrub } from "@/lib/cottageShrubLayout";
import { mergeGeometryParts } from "@/lib/mergeGeometryParts";

const LEAF_COLORS = ["#52623c", "#63764a", "#758353", "#82915f"];
const UP = new THREE.Vector3(0, 1, 0);
const GROUND_Y = -0.06;
// 枝根埋入草坪微起伏以下，避免低处露出悬空的切口。
const ROOT_Y = -0.16;

function makeStem(start: THREE.Vector3, end: THREE.Vector3): THREE.BufferGeometry {
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(0.004, 0.012, direction.length(), 5);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
  geometry.translate(...start.clone().add(end).multiplyScalar(0.5).toArray());
  return tintDetailGeometry(geometry, "#6d6544");
}

function makeShrubParts(shrub: CottageShrub): THREE.BufferGeometry[] {
  const { x, z, radiusX, radiusZ, height, seed } = shrub;
  const parts: THREE.BufferGeometry[] = [];
  const phase = detailNoise(6, seed) * Math.PI * 2;

  for (let shoot = 0; shoot < 7; shoot++) {
    const angle = phase + shoot * 2.399;
    const spread = shoot === 0 ? 0.12 : 0.5 + detailNoise(shoot, seed + 1) * 0.22;
    const start = new THREE.Vector3(
      x + Math.cos(angle) * radiusX * 0.14,
      ROOT_Y,
      z + Math.sin(angle) * radiusZ * 0.14,
    );
    const end = new THREE.Vector3(
      x + Math.cos(angle) * radiusX * spread,
      GROUND_Y + height * (0.66 + detailNoise(shoot, seed + 2) * 0.28),
      z + Math.sin(angle) * radiusZ * spread,
    );
    parts.push(makeStem(start, end));

    // 叶片沿枝条成对错生，末端收小；透空轮廓代替封闭的球形冠体。
    for (let node = 0; node < 7; node++) {
      const t = 0.2 + node * 0.115;
      for (const side of [-1, 1]) {
        const leafIndex = shoot * 14 + node * 2 + (side + 1) * 0.5;
        const length = (0.13 + detailNoise(leafIndex, seed + 3) * 0.07)
          * (0.78 + height * 0.35) * (1 - t * 0.22);
        const leaf = makeDetailLeaf(length, length * 0.52);
        leaf.rotateY((detailNoise(leafIndex, seed + 4) - 0.5) * 0.75);
        leaf.rotateZ(side * (0.85 + detailNoise(leafIndex, seed + 5) * 0.55));
        leaf.rotateY(angle + node * 0.65);
        const position = start.clone().lerp(end, t + (side === 1 ? 0.025 : 0));
        leaf.translate(...position.toArray());
        const tint = Math.min(LEAF_COLORS.length - 1, Math.floor(
          t * 1.8 + detailNoise(leafIndex, seed + 6) * 2,
        ));
        parts.push(tintDetailGeometry(leaf, LEAF_COLORS[tint]));
      }
    }
  }

  return parts;
}

/** 枝叶共用顶点色材质并合并成一网格；临时叶片、枝条由合并工具统一释放。 */
export function buildCottageShrubGeometry(shrubs: CottageShrub[]): THREE.BufferGeometry | null {
  return mergeGeometryParts(shrubs.flatMap(makeShrubParts));
}
