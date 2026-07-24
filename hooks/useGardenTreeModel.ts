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

// 阔叶（Leaves_NormalTree）贴图原色偏橄榄绿（约 #587b00），针叶（Leaves_Pine）
// 原色明显更暗更黄（约 #335800，蓝通道恒为 0）。color 是与贴图逐通道相乘的
// 系数，无法给蓝通道为 0 的贴图“乘”出冷色，因此额外叠加 emissive 注入贴图
// 本身缺失的冷色分量，既提亮又让针叶/阔叶的色相自然分化，同时避免阴影处死黑。
const PINE_LEAF_TINT = new THREE.Color("#3f5c3f");
const PINE_LEAF_GLOW = new THREE.Color("#2f5548");
const BROADLEAF_TINT = new THREE.Color("#8aab55");
const BROADLEAF_GLOW = new THREE.Color("#a0b95f");
const BARK_TINT = new THREE.Color("#8a7a68");

function cloneTreeMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  material.metalness = 0;
  const name = material.name.toLowerCase();
  const isPine = name.includes("pine");
  const isLeaf = isPine || name.includes("leaf") || name.includes("leaves");

  if (isLeaf) {
    if (isPine) {
      // 针叶贴图最暗，需要更大提亮倍数，emissive 偏冷（深绿蓝）区别于阔叶
      material.color.multiplyScalar(1.85).lerp(PINE_LEAF_TINT, 0.3);
      material.emissive = PINE_LEAF_GLOW.clone();
      material.emissiveIntensity = 0.16;
      material.roughness = 0.7;
      material.envMapIntensity = 0.5;
    } else {
      // 阔叶贴图本身更亮，提亮幅度小一些，emissive 偏暖黄绿更自然
      material.color.multiplyScalar(1.4).lerp(BROADLEAF_TINT, 0.22);
      material.emissive = BROADLEAF_GLOW.clone();
      material.emissiveIntensity = 0.1;
      material.roughness = 0.78;
      material.envMapIntensity = 0.44;
    }
    // 略降 alphaTest、略提 opacity：边缘保留柔和渐变而非硬切割，
    // 呈现受光透射的层次感，而不是实心色块。
    material.alphaTest = 0.2;
    material.depthWrite = true;
    material.side = THREE.DoubleSide;
    material.transparent = true;
    material.opacity = 0.95;
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(0.75, 0.75);
    }
  } else {
    material.color.multiplyScalar(0.9).lerp(BARK_TINT, 0.15);
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
