"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

type GrassBladeInstanceOptions = {
  bladeHeight: number;
  count: number;
  depth: number;
  groundY: number;
  width: number;
};

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function useGrassBladeInstances({
  bladeHeight,
  count,
  depth,
  groundY,
  width,
}: GrassBladeInstanceOptions) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const random = createSeededRandom(2187);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();

    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let index = 0; index < count; index += 1) {
      const heightScale = 0.72 + random() * 0.68;
      const widthScale = 0.72 + random() * 0.7;

      transform.position.set(
        (random() - 0.5) * width,
        groundY + (bladeHeight * heightScale) / 2,
        (random() - 0.5) * depth,
      );
      transform.rotation.set(
        (random() - 0.5) * 0.22,
        random() * Math.PI * 2,
        (random() - 0.5) * 0.22,
      );
      transform.scale.set(widthScale, heightScale, widthScale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);

      if (random() > 0.965) {
        color.setHSL(0.13 + random() * 0.04, 0.42, 0.28 + random() * 0.08);
      } else {
        color.setHSL(
          0.24 + random() * 0.045,
          0.5 + random() * 0.16,
          0.22 + random() * 0.11,
        );
      }
      mesh.setColorAt(index, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [bladeHeight, count, depth, groundY, width]);

  return meshRef;
}
