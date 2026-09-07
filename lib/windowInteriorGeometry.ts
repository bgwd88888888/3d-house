import * as THREE from "three";
import { tintDetailGeometry } from "@/lib/cottageDetailGeometry";

function interiorBox(
  size: [number, number, number],
  position: [number, number, number],
  color: string,
) {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.translate(...position);
  return tintDetailGeometry(geometry, color);
}

/** 局部 +Z 朝窗外；褶皱由几何形成，远看仍能辨认窗帘的明暗层次。 */
function makeCurtain(width: number, height: number, side: -1 | 1, z: number) {
  const panelWidth = width * (side < 0 ? 0.26 : 0.22);
  const geometry = new THREE.PlaneGeometry(panelWidth, height * 0.9, 16, 4);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / panelWidth + 0.5;
    const v = position.getY(i) / (height * 0.9) + 0.5;
    const fold = Math.cos(u * Math.PI * 6);
    position.setXYZ(
      i,
      position.getX(i) + side * (width * 0.5 - panelWidth * 0.5 - 0.035),
      position.getY(i) + height * 0.025 + (1 - v) * 0.012 * fold,
      z + fold * 0.027,
    );
  }
  geometry.computeVertexNormals();
  return tintDetailGeometry(geometry, side < 0 ? "#d3c8ad" : "#c6baa0");
}

/** 窗后独立浅空间，封住五面；玻璃、窗帘与背墙之间保留真实间距。 */
export function makeWindowInteriorParts(
  width: number,
  height: number,
  frameDepth: number,
  center: THREE.Vector3,
  rotationY = 0,
) {
  const frontZ = -frameDepth * 0.5 - 0.055;
  const depth = 0.9;
  const innerWidth = width + 0.22;
  const innerHeight = height + 0.18;
  const thickness = 0.045;
  const backZ = frontZ - depth;
  const midZ = (frontZ + backZ) * 0.5;
  const room = [
    interiorBox([innerWidth, innerHeight, thickness], [0, 0, backZ], "#504a40"),
    interiorBox([innerWidth, thickness, depth], [0, -innerHeight * 0.5, midZ], "#675743"),
    interiorBox([innerWidth, thickness, depth], [0, innerHeight * 0.5, midZ], "#423e37"),
    ...([-1, 1] as const).map((side) => interiorBox(
      [thickness, innerHeight, depth],
      [side * innerWidth * 0.5, 0, midZ],
      "#5c5548",
    )),
  ];
  const curtains = ([-1, 1] as const).map((side) =>
    makeCurtain(width, height, side, frontZ - 0.095),
  );
  for (const geometry of [...room, ...curtains]) {
    geometry.rotateY(rotationY);
    geometry.translate(center.x, center.y, center.z);
  }
  return { room, curtains };
}
