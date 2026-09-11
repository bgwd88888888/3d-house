"use client";

/**
 * Poly Haven sofa_03：皮革主材保留贴图，流苏改 alphaTest 避免透明排序。
 */
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const ROOM_SOFA_MODEL = "/models/polyhaven-sofa/sofa_03_2k.gltf";

function cloneSofaMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  material.metalness = 0;
  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  const fringe = /fringe/i.test(material.name);
  if (fringe) {
    material.transparent = false;
    material.alphaTest = 0.38;
    material.depthWrite = true;
    material.side = THREE.DoubleSide;
    material.roughness = Math.max(material.roughness, 0.82);
    material.envMapIntensity = 0.16;
    return material;
  }

  material.side = THREE.FrontSide;
  material.roughness = Math.min(Math.max(material.roughness, 0.42), 0.78);
  material.envMapIntensity = 0.28;
  return material;
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

export function useRoomSofaModel(modelUrl: string): THREE.Group {
  const { scene } = useGLTF(modelUrl);

  const sofa = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneSofaMaterial)
        : cloneSofaMaterial(object.material);
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    return () => disposeMaterials(sofa);
  }, [sofa]);

  return sofa;
}

useGLTF.preload(ROOM_SOFA_MODEL);
