"use client";

/**
 * Poly Haven 茶几果盘：复用纹理、克隆场景与材质，卸载时只释放克隆材质。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const BOWL_MODEL =
  "/models/polyhaven-room-fruit/wooden_bowl_01/wooden_bowl_01_1k.gltf";
const APPLE_MODEL =
  "/models/polyhaven-room-fruit/food_apple_01/food_apple_01_1k.gltf";
const PEARS_MODEL =
  "/models/polyhaven-room-fruit/food_pears_asian_01/food_pears_asian_01_1k.gltf";
const LIME_MODEL =
  "/models/polyhaven-room-fruit/food_lime_01/food_lime_01_1k.gltf";
const POMEGRANATE_MODEL =
  "/models/polyhaven-room-fruit/food_pomegranate_01/food_pomegranate_01_1k.gltf";

function cloneModel(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const sourceMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const materials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone();
      if (!(material instanceof THREE.MeshStandardMaterial)) return material;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = 8;
        material.map.needsUpdate = true;
      }
      material.side = THREE.FrontSide;
      material.envMapIntensity = 0.34;
      material.normalScale.multiplyScalar(0.8);
      material.needsUpdate = true;
      return material;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });
  return clone;
}

function disposeMaterials(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function useRoomFruitModels(): {
  bowls: THREE.Group[];
  pears: THREE.Group[];
  apples: THREE.Group[];
  limes: THREE.Group[];
  pomegranates: THREE.Group[];
} {
  const bowlSource = useGLTF(BOWL_MODEL).scene;
  const appleSource = useGLTF(APPLE_MODEL).scene;
  const pearsSource = useGLTF(PEARS_MODEL).scene;
  const limeSource = useGLTF(LIME_MODEL).scene;
  const pomegranateSource = useGLTF(POMEGRANATE_MODEL).scene;

  const models = useMemo(
    () => ({
      bowls: Array.from({ length: 3 }, () => cloneModel(bowlSource)),
      pears: Array.from({ length: 2 }, () => cloneModel(pearsSource)),
      apples: Array.from({ length: 4 }, () => cloneModel(appleSource)),
      limes: Array.from({ length: 3 }, () => cloneModel(limeSource)),
      pomegranates: [cloneModel(pomegranateSource)],
    }),
    [appleSource, bowlSource, limeSource, pearsSource, pomegranateSource],
  );

  useEffect(
    () => () => {
      for (const bowl of models.bowls) disposeMaterials(bowl);
      for (const pearGroup of models.pears) disposeMaterials(pearGroup);
      for (const apple of models.apples) disposeMaterials(apple);
      for (const lime of models.limes) disposeMaterials(lime);
      for (const pomegranate of models.pomegranates) {
        disposeMaterials(pomegranate);
      }
    },
    [models],
  );

  return models;
}

useGLTF.preload(BOWL_MODEL);
useGLTF.preload(APPLE_MODEL);
useGLTF.preload(PEARS_MODEL);
useGLTF.preload(LIME_MODEL);
useGLTF.preload(POMEGRANATE_MODEL);
