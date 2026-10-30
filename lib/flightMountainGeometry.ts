import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from "three";
import { FLIGHT_MOUNTAIN_DIVISIONS, FLIGHT_MOUNTAIN_SHAPES } from "./flightMountainShape";

export function createFlightMountainGeometry(seed: number) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const divisions = FLIGHT_MOUNTAIN_DIVISIONS;
  const color = new Color();
  const samples = FLIGHT_MOUNTAIN_SHAPES[seed - 1];
  for (let row = 0; row <= divisions; row += 1) {
    for (let col = 0; col <= divisions; col += 1) {
      const { x, y, z, ridge, greenery } = samples[row * (divisions + 1) + col];
      positions.push(x, y, z);
      color.set("#d9d9cc").lerp(new Color("#778875"), greenery);
      color.multiplyScalar(0.84 + ridge * 0.16);
      colors.push(color.r, color.g, color.b);
      if (row < divisions && col < divisions) {
        const a = row * (divisions + 1) + col;
        indices.push(a, a + divisions + 1, a + 1, a + 1, a + divisions + 1, a + divisions + 2);
      }
    }
  }
  const source = new BufferGeometry();
  source.setAttribute("position", new Float32BufferAttribute(positions, 3));
  source.setAttribute("color", new Float32BufferAttribute(colors, 3));
  source.setIndex(indices);
  source.computeVertexNormals();
  const geometry = source.toNonIndexed();
  source.dispose();
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  // Box-project each rock face so steep cliffs retain their texture scale.
  for (let index = 0; index < position.count; index += 3) {
    a.fromBufferAttribute(position, index);
    b.fromBufferAttribute(position, index + 1).sub(a);
    c.fromBufferAttribute(position, index + 2).sub(a);
    b.cross(c);
    const axis = Math.abs(b.y) > Math.max(Math.abs(b.x), Math.abs(b.z)) ? "y" : Math.abs(b.x) > Math.abs(b.z) ? "x" : "z";
    for (let vertex = index; vertex < index + 3; vertex += 1) {
      uv[vertex * 2] = (axis === "x" ? position.getZ(vertex) : position.getX(vertex)) * 1.8;
      uv[vertex * 2 + 1] = axis === "y" ? position.getZ(vertex) * 1.8 : position.getY(vertex) * 2.4;
    }
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  return geometry;
}
