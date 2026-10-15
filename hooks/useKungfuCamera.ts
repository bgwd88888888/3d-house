"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import type { KungfuMode } from "@/lib/kungfuSpec";

export const KUNGFU_CAMERA_TARGET: [number, number, number] = [0, 0.93, 0];

/** 按练习模式和画布宽高取景，窄屏也能容纳完整的人物。 */
export function useKungfuCamera(mode: KungfuMode) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(state.size.height, 1));
  const distance = Math.max(mode === "solo" ? 3.8 : 4.2, (mode === "solo" ? 1.1 : 1.7) / (Math.tan(THREE.MathUtils.degToRad(19)) * Math.max(aspect, 0.3)));

  useLayoutEffect(() => {
    const target = new THREE.Vector3(...KUNGFU_CAMERA_TARGET);
    const direction = camera.position.clone().sub(target).normalize();
    camera.position.copy(direction.multiplyScalar(distance).add(target));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, distance]);

  return { minDistance: distance * 0.85, maxDistance: Math.max(8.5, distance * 1.6) };
}
