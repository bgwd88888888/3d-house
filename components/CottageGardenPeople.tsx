"use client";

/**
 * 西式小院人物：门前草坪一女、门边一男。
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
    id: "front-lawn-woman",
    position: [-4.5, -0.02, 9.5],
    rotation: Math.PI,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.womanAvaturn,
    animationOffset: 0.18,
    animationSpeed: 0.96,
    wanderSeed: 42,
  },
  {
    id: "front-door",
    position: [5.2, -0.02, 8.4],
    rotation: Math.PI,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.man,
    animationOffset: 0.08,
    animationSpeed: 0.88,
    wanderSeed: 11,
  },
];

export function CottageGardenPeople() {
  return (
    <group>
      {GARDEN_PEOPLE.map(({ id, ...person }) => (
        <GardenCharacter key={id} {...person} />
      ))}
    </group>
  );
}
