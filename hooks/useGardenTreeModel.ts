"use client";

/**
 * Quaternius 庭院树：Common / Pine（带树皮法线）。
 * 材质压饱和、提高粗糙度，减轻低模卡通感。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const GARDEN_TREE_MODELS = {
  commonOne: "/models/quaternius-trees/common1.glb",
  commonTwo: "/models/quaternius-trees/common2.glb",
  commonThree: "/models/quaternius-trees/common3.glb",
  pineOne: "/models/quaternius-trees/pine1.glb",
  pineTwo: "/models/quaternius-trees/pine2.glb",
  pineThree: "/models/quaternius-trees/pine3.glb",
} as const;

function cloneTreeMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  material.metalness = 0;
  const name = material.name.toLowerCase();
  if (name.includes("leaf") || name.includes("leaves") || name.includes("pine")) {
    material.color.multiplyScalar(0.78).lerp(new THREE.Color("#5c6b3e"), 0.35);
    material.alphaTest = 0.4;
    material.depthWrite = true;
    material.envMapIntensity = 0.18;
    material.roughness = 0.96;
    material.side = THREE.DoubleSide;
    material.transparent = false;
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(0.7, 0.7);
    }
  } else {
    material.color.multiplyScalar(0.9).lerp(new THREE.Color("#8a7a68"), 0.15);
    material.envMapIntensity = 0.16;
    material.roughness = 0.92;
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(1.15, 1.15);
    }
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
