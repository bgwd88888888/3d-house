"use client";

/**
 * 石板小路 PBR 贴图：ambientCG Concrete033（偏平整石面）+ PavingStones070
 * （偏天然石材纹理），两套贴图交替用于相邻石板，制造真实的石材色差/质感差异，
 * 而不只是同一张图上色调乘算。wrap / colorSpace 在此配置；
 * 单块石板用 cloneStoneMaps 写入独立 repeat / offset，避免共享纹理互相污染。
 */
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

const PRIMARY_URLS = {
  map: "/textures/concrete-033/Concrete033_1K-JPG_Color.jpg",
  normalMap: "/textures/concrete-033/Concrete033_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/concrete-033/Concrete033_1K-JPG_Roughness.jpg",
};

const SECONDARY_URLS = {
  map: "/textures/paving-stones-070/PavingStones070_1K-JPG_Color.jpg",
  normalMap: "/textures/paving-stones-070/PavingStones070_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/paving-stones-070/PavingStones070_1K-JPG_Roughness.jpg",
};

export type PathTextureSet = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
};

function configureSet(
  textures: Record<string, THREE.Texture>,
  maxAnisotropy: number,
) {
  for (const [mapType, texture] of Object.entries(textures)) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = maxAnisotropy;
    // 近景石板：mip + 各向异性，避免贴脸发糊/锯齿
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace =
      mapType === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.needsUpdate = true;
  }
}

/** 为单块石板克隆贴图并写入独立 UV，避免共享 offset/repeat */
export function cloneStoneMaps(
  source: PathTextureSet,
  options: {
    repeat: [number, number];
    offset?: [number, number];
    rotation?: number;
  },
): PathTextureSet {
  const cloneOne = (texture: THREE.Texture) => {
    const next = texture.clone();
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.RepeatWrapping;
    next.anisotropy = texture.anisotropy;
    next.colorSpace = texture.colorSpace;
    next.repeat.set(options.repeat[0], options.repeat[1]);
    if (options.offset) {
      next.offset.set(options.offset[0], options.offset[1]);
    }
    if (options.rotation != null) {
      next.center.set(0.5, 0.5);
      next.rotation = options.rotation;
    }
    next.needsUpdate = true;
    return next;
  };

  return {
    map: cloneOne(source.map),
    normalMap: cloneOne(source.normalMap),
    roughnessMap: cloneOne(source.roughnessMap),
  };
}

export function usePathTextures() {
  const primary = useTexture(PRIMARY_URLS);
  const secondary = useTexture(SECONDARY_URLS);
  const maxAnisotropy = useThree(({ gl }) =>
    Math.min(gl.capabilities.getMaxAnisotropy(), 8),
  );

  useLayoutEffect(() => {
    configureSet(primary, maxAnisotropy);
    configureSet(secondary, maxAnisotropy);
  }, [maxAnisotropy, primary, secondary]);

  return {
    primary: primary as PathTextureSet,
    secondary: secondary as PathTextureSet,
  };
}
