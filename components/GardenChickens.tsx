"use client";

/**
 * 合院鸡群：一进 / 后园散养。
 */
import {
  GardenChicken,
  type GardenChickenProps,
} from "./GardenChicken";

type GardenHen = GardenChickenProps & {
  id: string;
};

const GARDEN_CHICKENS: readonly GardenHen[] = [
  {
    id: "first-a",
    position: [-5, -0.02, 23.5],
    rotation: 0.4,
    scale: 0.075,
    animationOffset: 0.12,
    animationSpeed: 1.05,
    wanderSeed: 71,
    homeRadius: 6,
  },
  {
    id: "first-b",
    position: [4.5, -0.02, 23],
    rotation: -1.1,
    scale: 0.07,
    animationOffset: 0.48,
    animationSpeed: 0.95,
    wanderSeed: 88,
    homeRadius: 6,
  },
  {
    id: "rear-garden",
    position: [-2, -0.02, -11],
    rotation: Math.PI * 0.7,
    scale: 0.072,
    animationOffset: 0.22,
    animationSpeed: 1.08,
    wanderSeed: 64,
    homeRadius: 8,
  },
];

export function GardenChickens() {
  return (
    <group>
      {GARDEN_CHICKENS.map(({ id, ...hen }) => (
        <GardenChicken key={id} {...hen} />
      ))}
    </group>
  );
}
