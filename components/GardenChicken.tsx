"use client";

/**
 * 庭院鸡实例：随机走动 + Walk 动画，复用庭院避障。
 * 写实鸡模型高度约 12.6 单位，缩到约 0.9m。
 */
import { useGardenChicken } from "@/hooks/useGardenChicken";
import { useWanderMovement } from "@/hooks/useWanderMovement";

export type GardenChickenProps = {
  animationOffset: number;
  animationSpeed: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  /** 随机种子，保证各鸡轨迹不同 */
  wanderSeed?: number;
  homeRadius?: number;
};

export function GardenChicken({
  animationOffset,
  animationSpeed,
  position,
  rotation,
  scale,
  wanderSeed = 1,
  homeRadius = 6,
}: GardenChickenProps) {
  const { groupRef, isMovingRef } = useWanderMovement({
    homeX: position[0],
    homeZ: position[2],
    initialRotation: rotation,
    // 略慢一点，让 Walk 步伐跟得上位移
    speed: 0.42 + (wanderSeed % 7) * 0.04,
    homeRadius,
    agentRadius: 0.28,
    seed: wanderSeed,
  });

  const chicken = useGardenChicken({
    animationOffset,
    animationSpeed,
    isMovingRef,
  });

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={chicken} />
    </group>
  );
}
