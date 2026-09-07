"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { DEFAULT_HOUSE_SPEC } from "@/lib/geoBuildings";
import { buildCottageEntranceGeometry } from "@/lib/cottageEntranceGeometry";
import { getCottageEntranceLayout } from "@/lib/cottageEntranceLayout";
import { cloneStoneMaps, usePathTextures } from "@/hooks/usePathTextures";

const SOIL_TEXTURE_URLS = {
  map: "/textures/ground-048/Ground048_1K-JPG_Color.jpg",
  normalMap: "/textures/ground-048/Ground048_1K-JPG_NormalGL.jpg",
  roughnessMap: "/textures/ground-048/Ground048_1K-JPG_Roughness.jpg",
};
const LAYOUT = getCottageEntranceLayout(DEFAULT_HOUSE_SPEC);

function createNumberTexture(number: string): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#e5ddc6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#73664d";
  context.lineWidth = 4;
  context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.fillStyle = "#403b30";
  context.font = "bold 112px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(number, canvas.width * 0.5, canvas.height * 0.53);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 管理入口的本地几何和纹理；共享的草地、石材纹理不在这里修改或释放。 */
export function useCottageEntrance() {
  const geometry = useMemo(() => buildCottageEntranceGeometry(DEFAULT_HOUSE_SPEC), []);
  const numberTexture = useMemo(() => createNumberTexture(LAYOUT.houseNumber), []);
  const { map, normalMap, roughnessMap } = useTexture(SOIL_TEXTURE_URLS);
  const stoneTextures = usePathTextures().secondary;
  const soilTextures = useMemo(() => {
    // Ground048 也被大草坪使用；单独克隆，避免它的 repeat 影响入口窄带。
    const textures = cloneStoneMaps({ map, normalMap, roughnessMap }, { repeat: [1, 1] });
    textures.map.colorSpace = THREE.SRGBColorSpace;
    textures.map.needsUpdate = true;
    return textures;
  }, [map, normalMap, roughnessMap]);

  useEffect(() => () => {
    for (const part of Object.values(geometry)) part?.dispose();
  }, [geometry]);
  useEffect(() => () => numberTexture?.dispose(), [numberTexture]);
  useEffect(() => () => {
    for (const texture of Object.values(soilTextures)) texture.dispose();
  }, [soilTextures]);

  return { geometry, numberTexture, soilTextures, stoneTextures, layout: LAYOUT };
}
