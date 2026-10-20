"use client";

import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";

const MATERIALS = {
  cliff: "rock_face_03",
  ground: "rocky_terrain_02",
  cloth: "rough_linen",
  mountain: "aerial_rocks_01",
} as const;

function textureUrls(asset: string) {
  return {
    map: `/textures/sword-flight/${asset}_diff.webp`,
    normalMap: `/textures/sword-flight/${asset}_nor_gl.webp`,
    roughnessMap: `/textures/sword-flight/${asset}_rough.webp`,
  };
}

export function useFlightTextures(kind: keyof typeof MATERIALS) {
  const textures = useTexture(textureUrls(MATERIALS[kind]));
  const anisotropy = useThree(({ gl }) => Math.min(8, gl.capabilities.getMaxAnisotropy()));
  useLayoutEffect(() => {
    for (const [slot, texture] of Object.entries(textures)) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.colorSpace = slot === "map" ? SRGBColorSpace : NoColorSpace;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }
  }, [textures, anisotropy]);
  return textures;
}

// This module only loads with the flight route; start all texture requests together.
for (const asset of Object.values(MATERIALS)) useTexture.preload(Object.values(textureUrls(asset)));
