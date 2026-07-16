"use client";

/**
 * 庭院人物摆放：Quaternius 模块化角色（日常造型，避免赛博等玩具感皮肤）。
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
    modelUrl: GARDEN_CHARACTER_MODELS.woman,
    animationOffset: 0.18,
    animationSpeed: 0.96,
    wanderSeed: 42,
  },
  {
    id: "front-door",
    position: [5.2, -0.02, 8.4],
    rotation: Math.PI,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.casual,
    animationOffset: 0.08,
    animationSpeed: 0.88,
    wanderSeed: 11,
  },
  {
    id: "left-lawn",
    position: [-9, -0.02, 7.5],
    rotation: 0.65,
    scale: 0.98,
    modelUrl: GARDEN_CHARACTER_MODELS.hoodie,
    animationOffset: 0.36,
    animationSpeed: 1.04,
    wanderSeed: 23,
  },
  {
    id: "side-yard",
    position: [-10.5, -0.02, -5],
    rotation: 1.4,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.farmer,
    animationOffset: 0.61,
    animationSpeed: 1.0,
    wanderSeed: 37,
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
