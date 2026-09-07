import * as THREE from "three";
import type { HouseSpec } from "@/lib/geoBuildings";
import { detailNoise, makeDetailLeaf, tintDetailGeometry } from "@/lib/cottageDetailGeometry";

/** 局部泥土窄带、半埋碎石与稀疏草；不延伸到台阶或墙角落水口。 */
export function makeCottageFoundationParts(spec: HouseSpec) {
  const soil: THREE.BufferGeometry[] = [];
  const stones: THREE.BufferGeometry[] = [];
  const foliage: THREE.BufferGeometry[] = [];
  const halfWidth = spec.width * 0.5;
  const halfDepth = spec.depth * 0.5;
  const stepHalf = Math.max(spec.steps.lowerWidth, spec.steps.upperWidth) * 0.5;
  const strips = [
    { axis: "x", start: -halfWidth + 0.6, end: spec.door.offsetX - stepHalf - 0.12, edge: halfDepth },
    { axis: "x", start: spec.door.offsetX + stepHalf + 0.12, end: halfWidth - 0.75, edge: halfDepth },
    { axis: "z", start: -halfDepth + 0.8, end: halfDepth - 0.8, edge: halfWidth },
  ] as const;
  const earth = new THREE.Color("#958570");
  const stoneTints = ["#aaa38f", "#817e70", "#b9ac98"];
  const leafTints = ["#556440", "#687448", "#7b8055"];

  for (const [stripIndex, strip] of strips.entries()) {
    if (strip.end <= strip.start) continue;
    const segments = Math.max(2, Math.ceil((strip.end - strip.start) / 0.24));
    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const point = (along: number, outward: number): [number, number] =>
      strip.axis === "x" ? [along, strip.edge + outward] : [strip.edge + outward, along];

    for (let i = 0; i <= segments; i++) {
      const along = THREE.MathUtils.lerp(strip.start, strip.end, i / segments);
      const width = 0.27 + detailNoise(i, stripIndex + 2) * 0.19;
      const fade = Math.min(1, i / 2, (segments - i) / 2);
      for (const [offset, alpha] of [[-0.02, 0.96], [width * 0.66, 0.8], [width, 0]]) {
        const [x, z] = point(along, offset);
        positions.push(x, -0.025, z);
        uvs.push(x / 0.9, z / 0.9);
        colors.push(earth.r, earth.g, earth.b, alpha * fade);
      }
      if (i < segments) {
        for (let lane = 0; lane < 2; lane++) {
          const a = i * 3 + lane;
          const b = a + 3;
          if (strip.axis === "x") indices.push(a, a + 1, b, b, a + 1, b + 1);
          else indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }

      if (i === 0 || i === segments) continue;
      const [x, z] = point(along + (detailNoise(i, stripIndex + 33) - 0.5) * 0.12, 0.1 + detailNoise(i, stripIndex + 8) * 0.14);
      const stone = new THREE.IcosahedronGeometry(1, 0);
      const radius = 0.035 + detailNoise(i, stripIndex + 11) * 0.045;
      stone.scale(radius * 1.4, radius * 0.6, radius);
      stone.rotateY(detailNoise(i, 19) * Math.PI);
      stone.translate(x, -0.018, z);
      stones.push(tintDetailGeometry(stone, stoneTints[i % stoneTints.length]));

      if (i % 3 === 0) {
        for (let blade = 0; blade < 3; blade++) {
          const leaf = makeDetailLeaf(0.1 + detailNoise(i + blade, 21) * 0.12, 0.018);
          leaf.rotateZ((blade - 1) * 0.32);
          leaf.rotateY(detailNoise(i + blade, 24) * Math.PI * 2);
          const [grassX, grassZ] = point(along, width * 0.78);
          leaf.translate(grassX, -0.03, grassZ);
          foliage.push(tintDetailGeometry(leaf, leafTints[blade]));
        }
      }
    }
    const ribbon = new THREE.BufferGeometry();
    ribbon.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    ribbon.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    ribbon.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    ribbon.setIndex(indices);
    ribbon.computeVertexNormals();
    soil.push(ribbon);
  }
  return { soil, stones, foliage };
}
