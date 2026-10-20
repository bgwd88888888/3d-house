import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { islandEdge, islandSideRadius, islandTopHeight, pavilionRoofHeight, FLIGHT_PAVILION } from "./flightIslandShape";

function surfaceGeometry(positions: number[], colors: number[], indices: number[], uvs?: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  if (uvs) geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createIslandGeometry(radius: number, height: number, top: boolean) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const segments = 64;
  const rings = top ? 12 : 14;
  const color = new Color();
  for (let ring = 0; ring <= rings; ring += 1) {
    const fraction = ring / rings;
    for (let sector = 0; sector <= segments; sector += 1) {
      const angle = sector / segments * Math.PI * 2;
      const distance = islandEdge(angle, radius) * (top ? fraction : islandSideRadius(fraction));
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = top ? islandTopHeight(x, z, radius) : ring === 0 ? islandTopHeight(x, z, radius) : -height * fraction;
      positions.push(x, y, z);
      if (top) uvs.push(x / 28 + 0.5, z / 28 + 0.5);
      else uvs.push(sector / segments * Math.round(Math.PI * 2 * radius / 5), y / 5);
      const grain = Math.sin(angle * 13 + ring * 2.7) * 0.025 + Math.sin(x * 1.9 + z) * 0.018;
      if (top) {
        const path = Math.abs(x + 3 + Math.sin(z * 0.17) * 1.8) < 1.15;
        color.set(path ? "#f5ecda" : "#dfe4d4");
        color.offsetHSL(0, grain, grain + Math.cos(x * 0.3) * 0.035);
      } else {
        color.set("#d4dcd7");
        color.offsetHSL(0, grain, grain + Math.sin(fraction * 45) * 0.04 - fraction * 0.12);
      }
      colors.push(color.r, color.g, color.b);
      if (ring < rings && sector < segments) {
        const a = ring * (segments + 1) + sector;
        const b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  return surfaceGeometry(positions, colors, indices, uvs);
}

export function createPavilionRoofGeometry() {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const divisions = 32;
  const size = FLIGHT_PAVILION.roofHalfWidth;
  const color = new Color();
  for (let row = 0; row <= divisions; row += 1) {
    for (let col = 0; col <= divisions; col += 1) {
      const x = (col / divisions * 2 - 1) * size;
      const z = (row / divisions * 2 - 1) * size;
      positions.push(x, pavilionRoofHeight(x, z), z);
      uvs.push(x / 2, z / 2);
      color.set(col % 2 ? "#3b6266" : "#466e70");
      colors.push(color.r, color.g, color.b);
      if (row < divisions && col < divisions) {
        const a = row * (divisions + 1) + col;
        indices.push(a, a + divisions + 1, a + 1, a + 1, a + divisions + 1, a + divisions + 2);
      }
    }
  }
  return surfaceGeometry(positions, colors, indices, uvs);
}
