"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { prepareKungfuClips } from "@/lib/kungfuAnimation";
import { createKungfuAccessories } from "@/lib/kungfuAccessories";
import { createKungfuReactionClips } from "@/lib/kungfuReactionClips";
import type { KungfuFighterMotion } from "@/lib/kungfuSparring";

/** 独立克隆骨骼和材质，避免影响庭院中复用同一模型的人物。 */
export function useKungfuFighter(scene: THREE.Object3D, json: string) {
  const positionRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Group>(null);
  const activeRef = useRef<THREE.AnimationAction | null>(null);
  const accessoriesRef = useRef<ReturnType<typeof createKungfuAccessories>>(null);
  const footPosition = useMemo(() => new THREE.Vector3(), []);
  const character = useMemo(() => {
    const model = clone(scene);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name === "MaiBodyCollider") object.visible = false;
      object.castShadow = true;
      object.receiveShadow = false;
      object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const copies = materials.map((source) => {
        const material = source.clone();
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = Math.min(material.metalness, 0.08);
          material.roughness = THREE.MathUtils.clamp(material.roughness, 0.4, 0.9);
          material.envMapIntensity = 0.35;
        }
        return material;
      });
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    return model;
  }, [scene]);
  useEffect(() => {
    const accessories = createKungfuAccessories(character);
    accessoriesRef.current = accessories;
    return () => {
      accessoriesRef.current = null;
      accessories?.dispose();
    };
  }, [character]);
  const animation = useMemo(() => {
    const hips = character.getObjectByName("Hips");
    if (!hips) throw new Error("人物模型缺少 Hips 骨骼");
    const clips = prepareKungfuClips(json, hips.position.y);
    clips.push(...createKungfuReactionClips(clips));
    const mixer = new THREE.AnimationMixer(character);
    const actions = Object.fromEntries(clips.map((clip) => {
      const action = mixer.clipAction(clip);
      const repeat = clip.name === "idle" || clip.name === "guard";
      action.setLoop(repeat ? THREE.LoopRepeat : THREE.LoopOnce, repeat ? Infinity : 1);
      action.clampWhenFinished = !repeat;
      return [clip.name, action];
    }));
    const feet = ["LeftToeBase", "RightToeBase"].map((name) => character.getObjectByName(name));
    return { mixer, actions, feet };
  }, [character, json]);

  useEffect(() => () => {
    animation.mixer.stopAllAction();
    // StrictMode 会重跑 Effect；保留与 memoized actions 配套的绑定缓存。
    activeRef.current = null;
  }, [animation]);

  const play = useCallback((motion: KungfuFighterMotion, immediate = false) => {
    const next = animation.actions[motion];
    const previous = activeRef.current;
    if (immediate) animation.mixer.stopAllAction();
    else if (previous && previous !== next) previous.fadeOut(0.12);
    next.reset().setEffectiveWeight(1);
    if (!immediate && previous && previous !== next) next.fadeIn(0.12);
    next.play();
    activeRef.current = next;
    return next;
  }, [animation]);

  const setPosition = useCallback((x: number) => {
    if (positionRef.current) positionRef.current.position.x = x;
  }, []);

  useEffect(() => () => {
    character.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }, [character]);

  const update = useCallback((elapsed: number) => {
    const steps = accessoriesRef.current ? Math.max(1, Math.ceil(elapsed / (1 / 120))) : 1;
    for (let step = 0; step < steps; step++) {
      animation.mixer.update(elapsed / steps);
      accessoriesRef.current?.update(elapsed / steps, step === steps - 1);
    }
    accessoriesRef.current?.render();
    const ground = groundRef.current;
    if (!ground) return;
    ground.position.y = 0;
    ground.updateWorldMatrix(true, true);
    let contactY = Infinity;
    for (const foot of animation.feet) {
      if (!foot) continue;
      foot.getWorldPosition(footPosition);
      contactY = Math.min(contactY, footPosition.y);
    }
    if (Number.isFinite(contactY)) ground.position.y = 0.035 - contactY;
    ground.updateWorldMatrix(true, true);
  }, [animation, footPosition]);

  return useMemo(() => ({ character, positionRef, groundRef, activeRef, play, setPosition, update }), [character, play, setPosition, update]);
}

export type KungfuFighterState = ReturnType<typeof useKungfuFighter>;
