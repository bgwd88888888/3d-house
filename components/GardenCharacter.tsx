"use client";

import { useGardenCharacter } from "@/hooks/useGardenCharacter";

const CHARACTER_MODEL_SCALE = 0.0048;

export type GardenCharacterProps = {
  animationOffset: number;
  animationSpeed: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  skinUrl: string;
};

export function GardenCharacter({
  animationOffset,
  animationSpeed,
  position,
  rotation,
  scale,
  skinUrl,
}: GardenCharacterProps) {
  const character = useGardenCharacter({
    animationOffset,
    animationSpeed,
    skinUrl,
  });

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      scale={CHARACTER_MODEL_SCALE * scale}
    >
      <primitive object={character} />
    </group>
  );
}
