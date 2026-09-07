import * as THREE from "three";

/** 在立面局部 XY 平面开窗，再沿 Z 挤出墙厚；洞口四周由同一几何形成侧壁。 */
export function makeWindowedWallGeometry(
  outline: THREE.Shape,
  windowCenters: readonly number[],
  window: { width: number; height: number; sillHeight: number },
  thickness: number,
): THREE.ExtrudeGeometry {
  const shape = outline.clone();
  for (const center of windowCenters) {
    const left = center - window.width * 0.5;
    const right = center + window.width * 0.5;
    const bottom = window.sillHeight;
    const top = bottom + window.height;
    const opening = new THREE.Path();
    opening.moveTo(left, bottom);
    opening.lineTo(right, bottom);
    opening.lineTo(right, top);
    opening.lineTo(left, top);
    opening.closePath();
    shape.holes.push(opening);
  }

  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
  });
}
