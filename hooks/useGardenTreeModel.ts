"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const GARDEN_TREE_MODELS = {
  birchOne: "/models/quaternius-birch/BirchTree_1.gltf",
  birchThree: "/models/quaternius-birch/BirchTree_3.gltf",
  birchFive: "/models/quaternius-birch/BirchTree_5.gltf",
} as const;

function cloneTreeMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  material.metalness = 0;
  if (material.name.includes("Leaves")) {
    material.alphaTest = 0.35;
    material.depthWrite = true;
    material.envMapIntensity = 0.08;
    material.roughness = 0.92;
    material.side = THREE.DoubleSide;
    material.transparent = false;
  } else {
    material.envMapIntensity = 0.12;
    material.roughness = 0.86;
  }
  return material;
}

function disposeTreeMaterials(tree: THREE.Group): void {
  tree.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function useGardenTreeModel(modelUrl: string): THREE.Group {
  const { scene } = useGLTF(modelUrl);

  const tree = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneTreeMaterial)
        : cloneTreeMaterial(object.material);
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => disposeTreeMaterials(tree);
  }, [tree]);

  return tree;
}

for (const modelUrl of Object.values(GARDEN_TREE_MODELS)) {
  useGLTF.preload(modelUrl);
}
