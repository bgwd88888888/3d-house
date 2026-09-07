import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

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

/** 合并后释放临时几何；返回的几何由使用它的场景负责释放。 */
export function mergeGeometryParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const normalized = normalizeForMerge(parts);
  const merged = mergeGeometries(normalized, false);
  for (const geometry of normalized) geometry.dispose();
  merged.computeBoundingSphere();
  return merged;
}
