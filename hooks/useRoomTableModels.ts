"use client";

/**
 * Poly Haven 厅堂桌几：克隆材质，避免修改 useGLTF 的全局缓存。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const ROOM_COFFEE_TABLE_MODEL =
  "/models/polyhaven-room-tables/gothic-coffee-table/gothic_coffee_table_1k.gltf";
export const ROOM_CONSOLE_TABLE_MODEL =
  "/models/polyhaven-room-tables/classic-console/ClassicConsole_01_1k.gltf";

function cloneFurniture(source: THREE.Group): THREE.Group {
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
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.38, 0.78);
      material.envMapIntensity = 0.3;
      material.normalScale.multiplyScalar(0.82);
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

export function useRoomTableModels(): {
  coffeeTable: THREE.Group;
  consoleTable: THREE.Group;
} {
  const coffeeSource = useGLTF(ROOM_COFFEE_TABLE_MODEL).scene;
  const consoleSource = useGLTF(ROOM_CONSOLE_TABLE_MODEL).scene;

  const models = useMemo(
    () => ({
      coffeeTable: cloneFurniture(coffeeSource),
      consoleTable: cloneFurniture(consoleSource),
    }),
    [coffeeSource, consoleSource],
  );

  useEffect(
    () => () => {
      disposeMaterials(models.coffeeTable);
      disposeMaterials(models.consoleTable);
    },
    [models],
  );

  return models;
}

useGLTF.preload(ROOM_COFFEE_TABLE_MODEL);
useGLTF.preload(ROOM_CONSOLE_TABLE_MODEL);
