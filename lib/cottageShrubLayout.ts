import { COTTAGE_YARD } from "@/lib/cottageYard";
import { detailNoise } from "@/lib/cottageDetailGeometry";

export type CottageShrub = {
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
  height: number;
  seed: number;
};

/** 栅栏内侧的疏密种植带；留出院门，并使叶片轮廓保持在木篱以内。 */
export function getCottageShrubLayout(): CottageShrub[] {
  const { minX, maxX, minZ, maxZ, gateX, gateHalf } = COTTAGE_YARD;
  const shrubs: CottageShrub[] = [];
  const strips = [
    { axis: "x", start: minX + 1.2, end: maxX - 1.8, edge: maxZ - 0.78 },
    { axis: "z", start: minZ + 1.4, end: maxZ - 1.3, edge: maxX - 0.8 },
  ] as const;

  for (const [stripIndex, strip] of strips.entries()) {
    let along = strip.start;
    for (let index = 0; along < strip.end; index++) {
      const seed = 1203 + stripIndex * 113 + index * 17;
      const inset = (detailNoise(0, seed) - 0.5) * 0.16;
      const x = strip.axis === "x" ? along : strip.edge + inset;
      const z = strip.axis === "z" ? along : strip.edge + inset;
      // 成组之间留较大空隙，小株穿插其间，避免等距圆球排成一条线。
      const size = index % 4 === 2 ? 0.7 : 0.88 + detailNoise(1, seed) * 0.2;
      if (strip.axis !== "x" || Math.abs(x - gateX) > gateHalf + 0.95) {
        shrubs.push({
          x,
          z,
          radiusX: (0.42 + detailNoise(2, seed) * 0.14) * size,
          radiusZ: (0.32 + detailNoise(3, seed) * 0.14) * size,
          height: (0.5 + detailNoise(4, seed) * 0.24) * size,
          seed,
        });
      }
      along += 1.25 + detailNoise(5, seed) * 0.85 + (index % 4 === 2 ? 0.55 : 0);
    }
  }

  return shrubs;
}
