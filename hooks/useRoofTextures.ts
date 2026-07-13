"use client";

/**
 * 屋顶瓦片 PBR 贴图（ambientCG RoofingTiles007，暖色陶土瓦）。
 * UV 平铺由 geoBuildings.makeGableRoof 按坡面尺寸写入；此处只配置 wrap / colorSpace。
 */
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const ROOF_TEXTURE_URLS = {
  map: "/textures/roofing-tiles-007/RoofingTiles007_1K-JPG_Color.jpg",
  normalMap: "/textures/roofing-tiles-007/RoofingTiles007_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/roofing-tiles-007/RoofingTiles007_1K-JPG_Roughness.jpg",
};

export function useRoofTextures() {
  const textures = useTexture(ROOF_TEXTURE_URLS);
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
