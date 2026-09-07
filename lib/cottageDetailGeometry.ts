import * as THREE from "three";

/** 按序号生成稳定的细节变化，重建几何时不改变摆放，也不修改全局随机状态。 */
export function detailNoise(index: number, seed = 0): number {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function tintDetailGeometry(
  geometry: THREE.BufferGeometry,
  tint: string,
  alpha?: number,
): THREE.BufferGeometry {
  const color = new THREE.Color(tint);
  const size = alpha === undefined ? 3 : 4;
  const values = new Float32Array(geometry.getAttribute("position").count * size);
  for (let i = 0; i < values.length; i += size) {
    values[i] = color.r;
    values[i + 1] = color.g;
    values[i + 2] = color.b;
    if (alpha !== undefined) values[i + 3] = alpha;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(values, size));
  return geometry;
}

/** 叶片带轻微折脊；盆栽和墙脚稀疏草复用同一种低面数几何。 */
export function makeDetailLeaf(length: number, width: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0,
    -width * 0.5, length * 0.5, 0,
    0, length * 0.55, width * 0.18,
    width * 0.5, length * 0.5, 0,
    0, length, -width * 0.1,
  ], 3));
  geometry.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 4, 2, 3, 4]);
  geometry.computeVertexNormals();
  return geometry;
}
