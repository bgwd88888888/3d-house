"use client";

/**
 * 庭院人物：写实贴图角色（Ready Player Me / Avaturn / AvatarSDK）。
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
  {
    id: "left-lawn",
    // 原 [-9,7.5] 紧贴房角/树，容易顶障卡住；挪到左侧开阔草坪
    position: [-11.5, 0, 10.5],
    rotation: 0.65,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.womanRpm,
    animationOffset: 0.36,
    animationSpeed: 1.04,
    wanderSeed: 23,
    homeRadius: 8,
  },
  {
    id: "side-yard",
    position: [-10.5, -0.02, -5],
    rotation: 1.4,
    scale: 1,
    modelUrl: GARDEN_CHARACTER_MODELS.womanRpm,
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
