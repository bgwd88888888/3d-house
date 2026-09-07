import * as THREE from "three";

const GUTTER_WIDTH = 0.28;
const GUTTER_HEIGHT = 0.17;
const GUTTER_THICKNESS = 0.025;
const PIPE_RADIUS = 0.075;

/** 开口朝上的 U 形槽沿 X 挤出，保留槽底、内壁和外壁的真实厚度。 */
function makeGutter(length: number): THREE.BufferGeometry {
  const half = GUTTER_WIDTH * 0.5;
  const inner = half - GUTTER_THICKNESS;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, -GUTTER_HEIGHT);
  shape.lineTo(half, -GUTTER_HEIGHT);
  shape.lineTo(half, 0);
  shape.lineTo(inner, 0);
  shape.lineTo(inner, -GUTTER_HEIGHT + GUTTER_THICKNESS);
  shape.lineTo(-inner, -GUTTER_HEIGHT + GUTTER_THICKNESS);
  shape.lineTo(-inner, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateY(Math.PI * 0.5);
  geometry.translate(-length * 0.5, 0, 0);
  return geometry;
}

/** 用短圆角连接直管，避免长立管参与样条插值后向墙内鼓出。 */
function makeDownpipe(points: THREE.Vector3[]): THREE.BufferGeometry {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let previous = points[0];
  for (let i = 1; i < points.length - 1; i += 1) {
    const corner = points[i];
    const radius = Math.min(
      0.1,
      corner.distanceTo(points[i - 1]) * 0.25,
      corner.distanceTo(points[i + 1]) * 0.25,
    );
    const entry = corner.clone().add(
      points[i - 1].clone().sub(corner).normalize().multiplyScalar(radius),
    );
    const exit = corner.clone().add(
      points[i + 1].clone().sub(corner).normalize().multiplyScalar(radius),
    );
    path.add(new THREE.LineCurve3(previous, entry));
    path.add(new THREE.QuadraticBezierCurve3(entry, corner, exit));
    previous = exit;
  }
  path.add(new THREE.LineCurve3(previous, points[points.length - 1]));
  return new THREE.TubeGeometry(path, 40, PIPE_RADIUS, 8, false);
}

/** 前后檐各一条排水槽，落水管仅保留在后檐右墙角。 */
export function makeRoofDrainageParts({
  ridgeHalf,
  slopeHalf,
  baseY,
  wallHalfWidth,
  wallHalfDepth,
}: {
  ridgeHalf: number;
  slopeHalf: number;
  baseY: number;
  wallHalfWidth: number;
  wallHalfDepth: number;
}): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const gutterTop = baseY - 0.035;
  const pipeX = wallHalfWidth - 0.32;

  for (const side of [-1, 1] as const) {
    const gutterZ = side * (slopeHalf + 0.11);
    const pipeZ = side * (wallHalfDepth + 0.13);
    const gutter = makeGutter(ridgeHalf * 2);
    gutter.translate(0, gutterTop, gutterZ);
    parts.push(gutter);

    for (const end of [-1, 1] as const) {
      const cap = new THREE.BoxGeometry(
        GUTTER_THICKNESS, GUTTER_HEIGHT, GUTTER_WIDTH,
      );
      cap.translate(
        end * (ridgeHalf - GUTTER_THICKNESS * 0.5),
        gutterTop - GUTTER_HEIGHT * 0.5,
        gutterZ,
      );
      parts.push(cap);
    }

    // +Z 为门所在的正立面，不生成落水管及其固定件。
    if (side === 1) continue;

    parts.push(makeDownpipe([
      new THREE.Vector3(pipeX, gutterTop - GUTTER_HEIGHT + 0.015, gutterZ),
      new THREE.Vector3(pipeX, baseY - 0.38, gutterZ),
      new THREE.Vector3(pipeX, baseY - 0.72, pipeZ),
      new THREE.Vector3(pipeX, 0.38, pipeZ),
      new THREE.Vector3(pipeX, 0.2, pipeZ + side * 0.3),
    ]));

    for (const y of [0.8, baseY - 1.05]) {
      const collar = new THREE.CylinderGeometry(0.09, 0.09, 0.065, 8, 1, true);
      collar.translate(pipeX, y, pipeZ);
      parts.push(collar);
      const bracket = new THREE.BoxGeometry(0.1, 0.065, 0.13);
      bracket.translate(pipeX, y, side * (wallHalfDepth + 0.065));
      parts.push(bracket);
    }
  }
  return parts;
}
