"use client";

import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const WALL_TEXTURE_URLS = {
  map: "/textures/plaster-001/Plaster001_1K-JPG_Color.jpg",
  normalMap: "/textures/plaster-001/Plaster001_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/plaster-001/Plaster001_1K-JPG_Roughness.jpg",
};

export function useWallTextures() {
  const textures = useTexture(WALL_TEXTURE_URLS);
  const maxAnisotropy = useThree(({ gl }) =>
    Math.min(gl.capabilities.getMaxAnisotropy(), 8),
  );

  useLayoutEffect(() => {
    for (const [mapType, texture] of Object.entries(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = maxAnisotropy;
      texture.colorSpace =
        mapType === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [maxAnisotropy, textures]);

  return textures;
}
