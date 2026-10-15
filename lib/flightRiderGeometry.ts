import { ExtrudeGeometry, LatheGeometry, Shape, Vector2 } from "three";

export function createFlightRobeGeometry() {
  const geometry = new LatheGeometry([
    new Vector2(0.48, 0.4), new Vector2(0.47, 0.47), new Vector2(0.4, 0.74),
    new Vector2(0.3, 1.1), new Vector2(0.22, 1.4), new Vector2(0.25, 1.63),
    new Vector2(0.34, 1.86), new Vector2(0.3, 1.94), new Vector2(0.12, 2.03),
  ], 48);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const angle = Math.atan2(z, x);
    const fold = 1 + Math.sin(angle * 12) * 0.045 * Math.max(0, 1.5 - y);
    position.setXYZ(index, x * fold, y + Math.cos(angle * 6) * 0.015, z * fold * 0.75 + Math.max(0, 1.3 - y) * 0.2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createFlightSwordGeometry() {
  const blade = new Shape();
  blade.moveTo(-0.18, 0);
  blade.lineTo(-0.24, 0.45);
  blade.lineTo(-0.16, 4.6);
  blade.lineTo(0, 5.35);
  blade.lineTo(0.16, 4.6);
  blade.lineTo(0.24, 0.45);
  blade.lineTo(0.18, 0);
  blade.closePath();
  const geometry = new ExtrudeGeometry(blade, { depth: 0.045, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.035, bevelThickness: 0.025 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
