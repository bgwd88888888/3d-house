"use client";

import { useAnimations, useFBX, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const CHARACTER_MODEL_URL =
  "/models/kenney-protagonists/characterMedium.fbx";
const CHARACTER_IDLE_URL = "/models/kenney-protagonists/idle.fbx";
const IDLE_ANIMATION_NAME = "Root|Idle";

export const KENNEY_CHARACTER_SKINS = {
  criminalMale: "/models/kenney-protagonists/skins/criminalMaleA.png",
  cyborgFemale: "/models/kenney-protagonists/skins/cyborgFemaleA.png",
  skaterFemale: "/models/kenney-protagonists/skins/skaterFemaleA.png",
  skaterMale: "/models/kenney-protagonists/skins/skaterMaleA.png",
} as const;

type GardenCharacterOptions = {
  animationOffset: number;
  animationSpeed: number;
  skinUrl: string;
};

function createCharacterMaterial(skin: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: skin,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0,
    envMapIntensity: 0.16,
  });
}

function disposeCharacterMaterials(character: THREE.Group): void {
  character.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}

export function useGardenCharacter({
  animationOffset,
  animationSpeed,
  skinUrl,
}: GardenCharacterOptions): THREE.Group {
  const sourceCharacter = useFBX(CHARACTER_MODEL_URL);
  const idleAnimation = useFBX(CHARACTER_IDLE_URL);
  const skin = useTexture(skinUrl);
  const maxAnisotropy = useThree(({ gl }) =>
    Math.min(gl.capabilities.getMaxAnisotropy(), 8),
  );

  useLayoutEffect(() => {
    for (const texture of [skin]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.needsUpdate = true;
    }
  }, [maxAnisotropy, skin]);

  const character = useMemo(() => {
    const clone = SkeletonUtils.clone(sourceCharacter) as THREE.Group;
    clone.traverse((object) => {
      if (!(object instanceof THREE.SkinnedMesh)) return;
      object.material = createCharacterMaterial(skin);
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [skin, sourceCharacter]);

  const { actions, mixer } = useAnimations(idleAnimation.animations, character);

  useEffect(() => {
    const idleAction = actions[IDLE_ANIMATION_NAME];
    if (!idleAction) return;

    idleAction.reset().setEffectiveTimeScale(animationSpeed).play();
    mixer.setTime(idleAction.getClip().duration * animationOffset);

    return () => {
      idleAction.stop();
    };
  }, [actions, animationOffset, animationSpeed, mixer]);

  useEffect(() => {
    return () => disposeCharacterMaterials(character);
  }, [character]);

  return character;
}

useFBX.preload(CHARACTER_MODEL_URL);
useFBX.preload(CHARACTER_IDLE_URL);
for (const skinUrl of Object.values(KENNEY_CHARACTER_SKINS)) {
  useTexture.preload(skinUrl);
}
