"use client";

/**
 * Quaternius 庭院角色：GLB 自带 Idle / Walk / Run。
 * 走动时播 Walk（庭院漫步），静止播 Idle。
 */
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export const GARDEN_CHARACTER_MODELS = {
  beach: "/models/quaternius-characters/beach.glb",
  casual: "/models/quaternius-characters/casual.glb",
  farmer: "/models/quaternius-characters/farmer.glb",
  hoodie: "/models/quaternius-characters/hoodie.glb",
  woman: "/models/quaternius-characters/woman.glb",
  worker: "/models/quaternius-characters/worker.glb",
} as const;

const IDLE_NAMES = [
  "CharacterArmature|Idle",
  "CharacterArmature|Idle_Neutral",
  "Idle",
] as const;

const WALK_NAMES = [
  "CharacterArmature|Walk",
  "Walk",
] as const;

type GardenCharacterOptions = {
  animationOffset: number;
  animationSpeed: number;
  modelUrl: string;
  /** 外部走动状态；true 时播 walk，false 播 idle */
  isMovingRef?: MutableRefObject<boolean>;
};

function pickAction(
  actions: Record<string, THREE.AnimationAction | null>,
  names: readonly string[],
): THREE.AnimationAction | null {
  for (const name of names) {
    const action = actions[name];
    if (action) return action;
  }
  return null;
}

function prepareCharacterMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      // 略压亮、提高粗糙，减少塑料玩具反光
      material.color.multiplyScalar(0.92);
      material.envMapIntensity = 0.3;
      material.roughness = Math.min(0.94, Math.max(0.55, material.roughness + 0.12));
      material.metalness = Math.min(0.05, material.metalness);
    }
  });
}

export function useGardenCharacter({
  animationOffset,
  animationSpeed,
  modelUrl,
  isMovingRef,
}: GardenCharacterOptions): THREE.Group {
  const { scene, animations } = useGLTF(modelUrl);
  const wasMovingRef = useRef(false);

  const character = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    prepareCharacterMaterials(clone);
    return clone;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, character);

  useEffect(() => {
    const idleAction = pickAction(actions, IDLE_NAMES);
    const walkAction = pickAction(actions, WALK_NAMES);
    if (!idleAction) return;

    idleAction.reset().setEffectiveTimeScale(animationSpeed).fadeIn(0.15).play();
    mixer.setTime(idleAction.getClip().duration * animationOffset);
    walkAction?.setEffectiveTimeScale(0.95 * animationSpeed);
    wasMovingRef.current = false;

    return () => {
      idleAction.stop();
      walkAction?.stop();
    };
  }, [actions, animationOffset, animationSpeed, mixer]);

  useFrame(() => {
    if (!isMovingRef) return;
    const moving = isMovingRef.current;
    if (moving === wasMovingRef.current) return;
    wasMovingRef.current = moving;

    const idleAction = pickAction(actions, IDLE_NAMES);
    const walkAction = pickAction(actions, WALK_NAMES);
    if (!idleAction || !walkAction) return;

    if (moving) {
      idleAction.fadeOut(0.2);
      walkAction.reset().fadeIn(0.2).play();
    } else {
      walkAction.fadeOut(0.2);
      idleAction.reset().fadeIn(0.25).play();
    }
  });

  return character;
}

for (const modelUrl of Object.values(GARDEN_CHARACTER_MODELS)) {
  useGLTF.preload(modelUrl);
}
