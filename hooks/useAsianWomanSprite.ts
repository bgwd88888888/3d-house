"use client";

import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const ASIAN_WOMAN_SPRITE_URL = "/sprites/asian-woman-v1-cropped.png";

export function useAsianWomanSprite() {
  const texture = useTexture(ASIAN_WOMAN_SPRITE_URL);
  const maxAnisotropy = useThree(({ gl }) =>
    Math.min(gl.capabilities.getMaxAnisotropy(), 8),
  );

  useLayoutEffect(() => {
    for (const loadedTexture of [texture]) {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.anisotropy = maxAnisotropy;
      loadedTexture.needsUpdate = true;
    }
  }, [maxAnisotropy, texture]);

  return texture;
}

useTexture.preload(ASIAN_WOMAN_SPRITE_URL);
