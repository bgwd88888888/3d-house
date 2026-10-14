import type * as THREE from "three";
import { createKungfuCollisionWorld } from "./kungfuCollisionWorld";
import { createKungfuCloth } from "./kungfuCloth";
import { createKungfuSash } from "./kungfuSash";

/** All soft accessories share one posed body collision surface. */
export function createKungfuAccessories(character: THREE.Object3D) {
  if (!character.getObjectByName("MaiSash")) return null;
  character.updateWorldMatrix(true, true);
  const collision = createKungfuCollisionWorld(character);
  const cloth = createKungfuCloth(character, collision);
  const sash = createKungfuSash(character, collision);
  const simulations = [cloth, sash];
  return {
    update(delta: number, resolveSurface: boolean) {
      character.updateWorldMatrix(true, true);
      collision.update(resolveSurface);
      for (const simulation of simulations) simulation?.update(delta, resolveSurface);
    },
    render() { for (const simulation of simulations) simulation?.render(); },
    dispose() {
      for (const simulation of simulations) simulation?.dispose();
      collision.dispose();
    },
  };
}
