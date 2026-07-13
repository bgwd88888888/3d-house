"use client";

import { useAsianWomanSprite } from "@/hooks/useAsianWomanSprite";

const SPRITE_HEIGHT = 2.02;
const SPRITE_WIDTH = 0.75;

export function AsianWomanSprite() {
  const texture = useAsianWomanSprite();

  return (
    <sprite
      position={[-4.5, SPRITE_HEIGHT * 0.5 - 0.02, 9.5]}
      scale={[SPRITE_WIDTH, SPRITE_HEIGHT, 1]}
      renderOrder={2}
    >
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
