import * as THREE from "three";
import { GARDEN_POND, getPondBankProfile, getPondWaterHeight, POND_WATER_POSITION, POND_WATER_TILT } from "@/lib/gardenPondLayout";

const SEGMENTS = 72;

function makeBankBand(kind: "stone" | "soil"): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const lanes = kind === "stone" ? 3 : 4;
  const tints = (kind === "stone" ? ["#797560", "#a39a80", "#8d8068"] : ["#958268", "#8e7d60", "#837655", "#837655"])
    .map((tint) => new THREE.Color(tint));

  for (let segment = 0; segment <= SEGMENTS; segment++) {
    const angle = segment / SEGMENTS * Math.PI * 2;
    const profile = getPondBankProfile(angle);
    const inner = kind === "stone" ? profile.inner : profile.stone.map((radius) => radius - 0.025);
    const outer = kind === "stone" ? profile.stone : profile.soil;
    for (let lane = 0; lane < lanes; lane++) {
      const t = lane / (lanes - 1);
      const x = POND_WATER_POSITION[0] + Math.cos(angle) * THREE.MathUtils.lerp(inner[0], outer[0], t) * Math.cos(POND_WATER_TILT);
      const z = POND_WATER_POSITION[2] + Math.sin(angle) * THREE.MathUtils.lerp(inner[1], outer[1], t);
      const waterY = getPondWaterHeight(x);
      const y = kind === "stone"
        ? waterY + [0.012, 0.028, 0.005][lane]
        : THREE.MathUtils.lerp(waterY + 0.003, -0.06, t);
      positions.push(x, y, z);
      uvs.push((x + GARDEN_POND.x) * 1.4, (z + GARDEN_POND.z) * 1.4);
      const tint = tints[lane];
      colors.push(tint.r, tint.g, tint.b);
      // 泥岸外缘淡出到已有草坪，不再用封闭的实色圆环描边。
      if (kind === "soil") colors.push([0.9, 0.68, 0.26, 0][lane]);
      if (segment < SEGMENTS && lane < lanes - 1) {
        const a = segment * lanes + lane;
        const b = a + lanes;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, kind === "soil" ? 4 : 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 替换原来三层规则圆环，保留石岸与泥岸两个材质层。 */
export function buildGardenPondBankGeometry() {
  return { stone: makeBankBand("stone"), soil: makeBankBand("soil") };
}
