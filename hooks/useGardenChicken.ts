"use client";

/**
 * 庭院写实鸡：OpenGameArt CC0，自带 Idle / Walk 骨骼动画。
 * 走动时播 Walk，静止播 Idle。
 */
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export const GARDEN_CHICKEN_MODEL = "/models/garden-animals/chicken.glb";

const IDLE_NAMES = ["Idle", "Idle1", "Idle2", "Stand"] as const;
const WALK_NAMES = ["Walk"] as const;

type GardenChickenOptions = {
  animationOffset: number;
  animationSpeed: number;
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

function prepareChickenMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.envMapIntensity = 0.4;
      material.roughness = Math.min(0.9, Math.max(0.5, material.roughness));
      material.metalness = 0;
      material.side = THREE.DoubleSide;
    }
  });
}

export function useGardenChicken({
  animationOffset,
  animationSpeed,
  isMovingRef,
}: GardenChickenOptions): THREE.Group {
  const { scene, animations } = useGLTF(GARDEN_CHICKEN_MODEL);
  const wasMovingRef = useRef(false);

  const chicken = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    prepareChickenMaterials(clone);
    return clone;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, chicken);

  useEffect(() => {
    const idleAction = pickAction(actions, IDLE_NAMES);
    const walkAction = pickAction(actions, WALK_NAMES);
    if (!idleAction) return;

    idleAction.reset().setEffectiveTimeScale(animationSpeed).fadeIn(0.12).play();
    mixer.setTime(idleAction.getClip().duration * animationOffset);
    // Walk 略加快，避免相对位移显得“滑”
    walkAction?.setEffectiveTimeScale(1.45 * animationSpeed);
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
      idleAction.fadeOut(0.12);
      walkAction.reset().fadeIn(0.12).play();
    } else {
      walkAction.fadeOut(0.12);
      idleAction.reset().fadeIn(0.18).play();
    }
  });

  return chicken;
}

useGLTF.preload(GARDEN_CHICKEN_MODEL);
