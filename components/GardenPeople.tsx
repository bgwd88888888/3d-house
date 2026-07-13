"use client";

import { KENNEY_CHARACTER_SKINS } from "@/hooks/useGardenCharacter";
import { AsianWomanSprite } from "./AsianWomanSprite";
import {
  GardenCharacter,
  type GardenCharacterProps,
} from "./GardenCharacter";

type GardenPerson = GardenCharacterProps & {
  id: string;
};

const GARDEN_PEOPLE: readonly GardenPerson[] = [
  {
    id: "front-door",
    position: [4.7, -0.02, 6.8],
    rotation: Math.PI,
    scale: 0.92,
    skinUrl: KENNEY_CHARACTER_SKINS.criminalMale,
    animationOffset: 0.08,
    animationSpeed: 0.88,
  },
  {
    id: "left-lawn",
    position: [-9, -0.02, 7.5],
    rotation: 0.65,
    scale: 0.84,
    skinUrl: KENNEY_CHARACTER_SKINS.skaterFemale,
    animationOffset: 0.36,
    animationSpeed: 1.04,
  },
  {
    id: "child",
    position: [-10.5, -0.02, -5],
    rotation: 1.4,
    scale: 0.7,
    skinUrl: KENNEY_CHARACTER_SKINS.skaterMale,
    animationOffset: 0.61,
    animationSpeed: 1.12,
  },
  {
    id: "right-lawn",
    position: [10, -0.02, -7.5],
    rotation: -0.75,
    scale: 0.88,
    skinUrl: KENNEY_CHARACTER_SKINS.cyborgFemale,
    animationOffset: 0.82,
    animationSpeed: 0.94,
  },
];

export function GardenPeople() {
  return (
    <group>
      <AsianWomanSprite />
      {GARDEN_PEOPLE.map(({ id, ...person }) => (
        <GardenCharacter key={id} {...person} />
      ))}
    </group>
  );
}
