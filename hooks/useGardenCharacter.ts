"use client";

/**
 * 庭院写实角色：贴图人体 GLB + Mixamo FBX 步态。
 * 使用直立 Mixamo 动画（非 Soldier.glb，避免髋骨 -90° 导致趴地）。
 */
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export const GARDEN_CHARACTER_MODELS = {
  /** Ready Player Me 写实女性（贴图） */
  womanRpm: "/models/realistic-characters/woman-rpm.glb",
  /** Avaturn 照片级女性 */
  womanAvaturn: "/models/realistic-characters/woman-avaturn.glb",
  /** AvatarSDK 写实男性 */
  man: "/models/realistic-characters/man-avatarsdk.glb",
} as const;

/** Mixamo 步行（TalkingHead / Mixamo，厘米制、髋骨直立） */
const WALK_FBX_URL = "/models/realistic-characters/walking.fbx";

const IDLE_NAMES = ["Idle", "idle"] as const;
const WALK_NAMES = ["Walk", "walk", "mixamo.com"] as const;

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

/**
 * Mixamo FBX → 米制、去 mixamorig 前缀；清掉 Hips XZ（位移由 wander 驱动）。
 */
function prepareMixamoClip(
  clip: THREE.AnimationClip,
  name: string,
  options?: { freeze?: boolean; duration?: number },
): THREE.AnimationClip {
  const freeze = options?.freeze ?? false;
  const holdDuration = options?.duration ?? 2.5;

  const tracks = clip.tracks.map((track) => {
    const nextName = track.name.replace(/^mixamorig/, "");
    let times = Array.from(track.times);
    let values = Array.from(track.values);

    if (nextName.endsWith(".position")) {
      for (let i = 0; i < values.length; i += 1) values[i] *= 0.01;
    }

    if (nextName === "Hips.position") {
      for (let i = 0; i < values.length; i += 3) {
        values[i] = 0;
        values[i + 2] = 0;
      }
    }

    if (freeze) {
      const size = track.getValueSize();
      const first = values.slice(0, size);
      times = [0, holdDuration];
      values = [...first, ...first];
    }

    const Ctor = track.constructor as new (
      name: string,
      times: number[],
      values: number[],
    ) => THREE.KeyframeTrack;
    return new Ctor(nextName, times, values);
  });

  return new THREE.AnimationClip(
    name,
    freeze ? holdDuration : clip.duration,
    tracks,
  );
}

function prepareCharacterMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    // 不接收地面/树影，避免小人在阴影里糊成剪影
    object.receiveShadow = false;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.metalness = Math.min(material.metalness, 0.08);
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.35, 0.92);
      material.envMapIntensity =
        material.envMapIntensity > 0 ? material.envMapIntensity : 0.55;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.needsUpdate = true;
      }
      material.needsUpdate = true;
    }
  });
}

export function useGardenCharacter({
  animationOffset,
  animationSpeed,
  modelUrl,
  isMovingRef,
}: GardenCharacterOptions): THREE.Group {
  const { scene } = useGLTF(modelUrl);
  const walkFbx = useFBX(WALK_FBX_URL);
  const wasMovingRef = useRef(false);

  const clips = useMemo(() => {
    const source = walkFbx.animations[0];
    if (!source) return [];
    return [
      prepareMixamoClip(source, "Idle", { freeze: true, duration: 2.5 }),
      prepareMixamoClip(source, "Walk"),
    ];
  }, [walkFbx.animations]);

  const character = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    prepareCharacterMaterials(clone);
    return clone;
  }, [scene]);

  const { actions, mixer } = useAnimations(clips, character);

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
useFBX.preload(WALK_FBX_URL);
