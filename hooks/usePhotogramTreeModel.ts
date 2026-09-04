"use client";

/**
 * Poly Haven 扫描树：叶卡走 alphaTest，叶子不投影。
 * 仅西式小院两棵大树使用；合院仍走 Quaternius。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const PHOTOGRAM_TREE_MODELS = {
  islandOne: "/models/polyhaven-trees/island-tree-01.glb",
  islandTwo: "/models/polyhaven-trees/island-tree-02.glb",
} as const;

function isLeafMaterial(material: THREE.Material): boolean {
  if (/leaf/i.test(material.name)) return true;
  return (
    material instanceof THREE.MeshStandardMaterial &&
    (material.alphaTest > 0 || material.transparent)
  );
}

function cloneScanMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  material.metalness = 0;
  if (isLeafMaterial(material)) {
    material.transparent = false;
    material.alphaTest = 0.28;
    material.depthWrite = true;
    material.side = THREE.DoubleSide;
    material.color.multiplyScalar(1.08);
    material.roughness = Math.max(material.roughness, 0.7);
    material.envMapIntensity = 0.34;
  } else {
    material.roughness = Math.max(material.roughness, 0.86);
    material.envMapIntensity = 0.14;
  }
  return material;
}

function disposeMaterials(tree: THREE.Group): void {
  tree.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function usePhotogramTreeModel(modelUrl: string): THREE.Group {
  const { scene } = useGLTF(modelUrl);

  const tree = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneScanMaterial)
        : cloneScanMaterial(object.material);
      const leaf =
        /leaf/i.test(object.name) ||
        (Array.isArray(object.material)
          ? object.material.some(isLeafMaterial)
          : isLeafMaterial(object.material));
      object.castShadow = !leaf;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => disposeMaterials(tree);
  }, [tree]);

  return tree;
}

for (const modelUrl of Object.values(PHOTOGRAM_TREE_MODELS)) {
  useGLTF.preload(modelUrl);
}
