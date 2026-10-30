import { ExtrudeGeometry, Shape } from "three";

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
