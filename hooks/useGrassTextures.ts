"use client";

/**
 * 草地 PBR 贴图（ambientCG Grass008）。
 * wrap / colorSpace / 各向异性在此配置；repeat 由 GrassGround 按地面尺寸写入。
 * 高 anisotropy + 完整 mip 链：近景斑块磨损边缘与中景草甸层次都不被过早抹平。
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
  // 掠射角下各向异性过低会把草纹/磨损边抹成纯色；尽量吃满 GPU 上限（封顶 16）。
  const maxAnisotropy = useThree(({ gl }) =>
    Math.min(gl.capabilities.getMaxAnisotropy(), 16),
  );

  useLayoutEffect(() => {
    for (const [mapType, texture] of Object.entries(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = maxAnisotropy;
      // 三线性 mip：近景清晰，外围草甸大块色差仍能在中距读出
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      // 法线/粗糙保持线性；颜色走 sRGB，避免外围发灰发脏
      texture.colorSpace =
        mapType === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [maxAnisotropy, textures]);

  return textures;
}
