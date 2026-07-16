"use client";

/**
 * 合院人物：各进院落走动点景。
 */
import { GARDEN_CHARACTER_MODELS } from "@/hooks/useGardenCharacter";
import {
  GardenCharacter,
  type GardenCharacterProps,
} from "./GardenCharacter";

type GardenPerson = GardenCharacterProps & {
  id: string;
};

const GARDEN_PEOPLE: readonly GardenPerson[] = [
  {
    id: "first-court",
    position: [-3.5, -0.02, 24],
    rotation: Math.PI,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.woman,
    animationOffset: 0.18,
    animationSpeed: 0.96,
    wanderSeed: 42,
    homeRadius: 10,
  },
  {
    id: "second-court",
    position: [4, -0.02, 15],
    rotation: Math.PI * 0.9,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.casual,
    animationOffset: 0.08,
    animationSpeed: 0.88,
    wanderSeed: 11,
    homeRadius: 12,
  },
  {
    id: "third-court",
    position: [-6, -0.02, 4],
    rotation: 0.4,
    scale: 0.98,
    modelUrl: GARDEN_CHARACTER_MODELS.hoodie,
    animationOffset: 0.36,
    animationSpeed: 1.04,
    wanderSeed: 23,
    homeRadius: 12,
  },
  {
    id: "rear-garden",
    position: [2, -0.02, -12],
    rotation: 1.1,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.farmer,
    animationOffset: 0.61,
    animationSpeed: 1.0,
    wanderSeed: 37,
    homeRadius: 14,
  },
];

export function GardenPeople() {
  return (
    <group>
      {GARDEN_PEOPLE.map(({ id, ...person }) => (
        <GardenCharacter key={id} {...person} />
      ))}
    </group>
  );
}
