"use client";

/**
 * Kenney Car Kit 车辆模型加载。
 * truck.glb 已含车身、四轮与内嵌 colormap；克隆后开阴影并保留贴图色彩。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const GARDEN_VEHICLE_MODELS = {
  pickup: "/models/kenney-car-kit/truck.glb",
} as const;

function cloneVehicleMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (
    !(material instanceof THREE.MeshStandardMaterial) ||
    !(source instanceof THREE.MeshStandardMaterial)
  ) {
    return material;
  }
  material.map = source.map;
  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }
  material.color.copy(source.color);
  material.metalness = 0.05;
  material.roughness = 0.62;
  material.envMapIntensity = 0.4;
  material.side = THREE.FrontSide;
  return material;
}

function disposeVehicleMaterials(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function useGardenVehicleModel(modelUrl: string): THREE.Group {
  const { scene } = useGLTF(modelUrl);

  const vehicle = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneVehicleMaterial)
        : cloneVehicleMaterial(object.material);
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => disposeVehicleMaterials(vehicle);
  }, [vehicle]);

  return vehicle;
}

useGLTF.preload(GARDEN_VEHICLE_MODELS.pickup);
