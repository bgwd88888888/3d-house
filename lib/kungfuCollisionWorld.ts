import type * as THREE from "three";
import { createKungfuClothColliders } from "./kungfuClothCollision";
import { createKungfuBodySurface } from "./kungfuBodySurface";

export function createKungfuCollisionWorld(character: THREE.Object3D) {
  const colliders = createKungfuClothColliders(character);
  const surface = createKungfuBodySurface(character);
  return {
    colliders,
    surface,
    update(resolveSurface: boolean) {
      colliders.update();
      if (resolveSurface) surface?.update();
    },
    dispose() { surface?.dispose(); },
  };
}

export type KungfuCollisionWorld = ReturnType<typeof createKungfuCollisionWorld>;
