"use client";

/**
 * 石板小路 PBR 贴图（ambientCG Concrete033，偏平整石面）。
 * wrap / colorSpace 在此配置；repeat 由 GardenPath 按石板尺寸写入。
 */
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const PATH_TEXTURE_URLS = {
  map: "/textures/concrete-033/Concrete033_1K-JPG_Color.jpg",
  normalMap: "/textures/concrete-033/Concrete033_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/concrete-033/Concrete033_1K-JPG_Roughness.jpg",
};

export function usePathTextures() {
  const textures = useTexture(PATH_TEXTURE_URLS);
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
