"use client";

/**
 * 庭院鸡群：前草坪三只写实鸡，随机走动并避障。
 */
import {
  GardenChicken,
  type GardenChickenProps,
} from "./GardenChicken";

type GardenHen = GardenChickenProps & {
  id: string;
};

/** 模型高度约 12.6；scale≈0.07 → 约 0.9m */
const GARDEN_CHICKENS: readonly GardenHen[] = [
  {
    id: "front-lawn-a",
    position: [-6.8, -0.02, 10.2],
    rotation: 0.4,
    scale: 0.075,
    animationOffset: 0.12,
    animationSpeed: 1.05,
    wanderSeed: 71,
  },
  {
    id: "front-lawn-b",
    position: [-3.2, -0.02, 11.4],
    rotation: -1.1,
    scale: 0.07,
    animationOffset: 0.48,
    animationSpeed: 0.95,
    wanderSeed: 88,
  },
  {
    id: "path-edge",
    position: [3.6, -0.02, 10.8],
    rotation: Math.PI * 0.7,
    scale: 0.072,
    animationOffset: 0.22,
    animationSpeed: 1.08,
    wanderSeed: 64,
  },
];

export function CottageGardenChickens() {
  return (
    <group>
      {GARDEN_CHICKENS.map(({ id, ...hen }) => (
        <GardenChicken key={id} {...hen} />
      ))}
    </group>
  );
}
