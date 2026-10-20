import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

export function createFlightMountainGeometry(seed: number) {
  let state = seed * 1237 + 97;
  const noise = new SimplexNoise({ random: () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  } });
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const divisions = 64;
  const color = new Color();
  const peaks = [
    [-0.22, 0.04, 0.72, 0.55, 1],
    [0.35, -0.16, 0.48, 0.44, 0.72 + Math.sin(seed) * 0.12],
    [-0.12, 0.4, 0.48, 0.4, 0.52],
  ];
  for (let row = 0; row <= divisions; row += 1) {
    for (let col = 0; col <= divisions; col += 1) {
      const x = col / divisions * 2 - 1;
      const z = row / divisions * 2 - 1;
      const warp = noise.noise(x * 3.2 + seed, z * 3.2) * 0.085;
      let height = 0;
      for (const [cx, cz, rx, rz, amplitude] of peaks) {
        const distance = Math.hypot((x - cx + warp) / rx, (z - cz + warp) / rz);
        height = Math.max(height, Math.max(0, 1 - distance ** 1.3) ** 0.65 * amplitude);
      }
      const ridge = 1 - Math.abs(noise.noise(x * 8 + seed, z * 8));
      const crag = noise.noise(x * 24, z * 24 + seed) * 0.012;
      const y = height * (0.91 + ridge * 0.1 + crag);
      positions.push(x, y, z);
      const greenery = Math.max(0, noise.noise(x * 7, z * 7 + seed)) * 0.35;
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
