"use client";

/**
 * 草地 PBR 贴图（ambientCG Grass008）。
 * wrap / colorSpace 在此配置；repeat 由 GrassGround 按地面尺寸写入。
 */
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const GRASS_TEXTURE_URLS = {
  map: "/textures/grass-008/Grass008_1K-JPG_Color.jpg",
  normalMap: "/textures/grass-008/Grass008_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/grass-008/Grass008_1K-JPG_Roughness.jpg",
};

export function useGrassTextures() {
  const textures = useTexture(GRASS_TEXTURE_URLS);
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
