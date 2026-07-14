"use client";

/**
 * 庭院角色实例：随机走动，避开房子/树/皮卡，不离家太远。
 * Quaternius 模块化人体约 1.8m，直接按场景单位摆放。
 */
import { useGardenCharacter } from "@/hooks/useGardenCharacter";
import { useWanderMovement } from "@/hooks/useWanderMovement";

export type GardenCharacterProps = {
  animationOffset: number;
  animationSpeed: number;
  modelUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  /** 随机种子，保证各角色轨迹不同 */
  wanderSeed?: number;
};

export function GardenCharacter({
  animationOffset,
  animationSpeed,
  modelUrl,
  position,
  rotation,
  scale,
  wanderSeed = 1,
}: GardenCharacterProps) {
  const { groupRef, isMovingRef } = useWanderMovement({
    home: position,
    initialRotation: rotation,
    speed: 1.05 + (wanderSeed % 5) * 0.07,
    homeRadius: 7.2,
    seed: wanderSeed,
  });

  const character = useGardenCharacter({
    animationOffset,
    animationSpeed,
    modelUrl,
    isMovingRef,
  });

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={character} />
    </group>
  );
}
