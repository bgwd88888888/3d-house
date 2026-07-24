"use client";

/**
 * 门窗木作 PBR 贴图（ambientCG Wood049，暖棕色原木纹理）。
 * UV 平铺由 geoBuildings.scaleBoxUvs（WOOD_TEXTURE_TILE）按构件尺寸处理；此处只配置 wrap / colorSpace。
 */
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const WOOD_TEXTURE_URLS = {
  map: "/textures/wood-049/Wood049_1K-JPG_Color.jpg",
  normalMap: "/textures/wood-049/Wood049_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/wood-049/Wood049_1K-JPG_Roughness.jpg",
};

export function useWoodTextures() {
  const textures = useTexture(WOOD_TEXTURE_URLS);
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
