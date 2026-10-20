"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh } from "three";

const MODELS = {
  pine: "/models/sword-flight/pine.glb",
  rock: "/models/sword-flight/moss-rock.glb",
  rider: "/models/sword-flight/rider-anatomy.glb",
} as const;

export function useFlightModel(kind: keyof typeof MODELS) {
  const { scene } = useGLTF(MODELS[kind]);
  // Clone only transforms; buffers, maps and materials stay shared in the loader cache.
  return useMemo(() => {
    const model = scene.clone(true);
    model.traverse((object) => {
      if (object instanceof Mesh && kind !== "rider") {
        object.castShadow = object.receiveShadow = true;
      }
    });
    return model;
  }, [scene, kind]);
}

for (const url of Object.values(MODELS)) useGLTF.preload(url);
