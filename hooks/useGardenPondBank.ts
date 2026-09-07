"use client";

import { useLayoutEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { cloneStoneMaps } from "@/hooks/usePathTextures";
import { buildGardenPondBankGeometry } from "@/lib/gardenPondBankGeometry";

const STONE_URLS = {
  map: "/textures/rock-023/Rock023_1K-JPG_Color.jpg",
  normalMap: "/textures/rock-023/Rock023_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/rock-023/Rock023_1K-JPG_Roughness.jpg",
};
const SOIL_URLS = {
  map: "/textures/ground-048/Ground048_1K-JPG_Color.jpg",
  normalMap: "/textures/ground-048/Ground048_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/ground-048/Ground048_1K-JPG_Roughness.jpg",
};

/** 岸线几何和贴图参数独立管理，避免修改草坪与石块共用贴图的 repeat。 */
export function useGardenPondBank() {
  const { map: stoneMap, normalMap: stoneNormalMap, roughnessMap: stoneRoughnessMap } = useTexture(STONE_URLS);
  const { map: soilMap, normalMap: soilNormalMap, roughnessMap: soilRoughnessMap } = useTexture(SOIL_URLS);
  const geometry = useMemo(() => buildGardenPondBankGeometry(), []);
  const textures = useMemo(() => {
    const stone = cloneStoneMaps({ map: stoneMap, normalMap: stoneNormalMap, roughnessMap: stoneRoughnessMap }, { repeat: [1, 1] });
    const soil = cloneStoneMaps({ map: soilMap, normalMap: soilNormalMap, roughnessMap: soilRoughnessMap }, { repeat: [1, 1] });
    for (const set of [stone, soil]) {
      set.map.colorSpace = THREE.SRGBColorSpace;
      set.normalMap.colorSpace = THREE.NoColorSpace;
      set.roughnessMap.colorSpace = THREE.NoColorSpace;
    }
    return { stone, soil };
  }, [stoneMap, stoneNormalMap, stoneRoughnessMap, soilMap, soilNormalMap, soilRoughnessMap]);

  useLayoutEffect(() => () => {
    geometry.stone.dispose();
    geometry.soil.dispose();
  }, [geometry]);
  useLayoutEffect(() => () => {
    for (const set of Object.values(textures)) {
      for (const texture of Object.values(set)) texture.dispose();
    }
  }, [textures]);

  return { geometry, textures };
}
