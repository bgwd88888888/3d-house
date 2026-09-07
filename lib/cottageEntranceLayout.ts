import type { HouseSpec } from "@/lib/geoBuildings";

export type DetailPosition = [number, number, number];

/** 随门与台阶定位；盆栽留在房屋现有寻路障碍范围内。 */
export function getCottageEntranceLayout(spec: HouseSpec) {
  const frontZ = spec.depth * 0.5;
  const stepHalf = Math.max(spec.steps.lowerWidth, spec.steps.upperWidth) * 0.5;
  return {
    lamp: [spec.door.offsetX + spec.door.width * 0.5 + 0.5, spec.door.height - 0.4, frontZ + 0.4] as DetailPosition,
    plaque: [spec.door.offsetX - spec.door.width * 0.5 - 0.75, spec.door.height * 0.7, frontZ + 0.035] as DetailPosition,
    houseNumber: "07",
    planters: [
      { x: spec.door.offsetX - stepHalf - 0.56, z: frontZ + 0.42, radius: 0.34, height: 0.72, plantHeight: 0.82, tint: "#b27650" },
      { x: spec.door.offsetX + stepHalf + 0.5, z: frontZ + 0.36, radius: 0.29, height: 0.46, plantHeight: 0.5, tint: "#976044" },
    ],
  };
}
