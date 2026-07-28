"use client";

/**
 * 庭院角色实例：随机走动，避开房子/树/皮卡，不离家太远。
 * 写实贴图人体约 1.8m；按脚趾骨贴地。
 */
import { useGardenCharacter } from "@/hooks/useGardenCharacter";
import { useWanderMovement } from "@/hooks/useWanderMovement";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export type GardenCharacterProps = {
  animationOffset: number;
  animationSpeed: number;
  modelUrl: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  /** 随机种子，保证各角色轨迹不同 */
  wanderSeed?: number;
  /** 离家最远距离（合院内可放大） */
  homeRadius?: number;
};

const _footPos = new THREE.Vector3();

/** 只用 ToeBase，避免 Toe_End 虚骨把贴地算歪 */
function footContactY(root: THREE.Object3D): number {
  let minY = Infinity;
  root.traverse((object) => {
    if (!(object instanceof THREE.Bone)) return;
    if (!/ToeBase|Foot$/i.test(object.name)) return;
    if (/Toe_End/i.test(object.name)) return;
    object.getWorldPosition(_footPos);
    minY = Math.min(minY, _footPos.y);
  });
  return minY;
}

function GroundSnap({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  // priority -1：等 useAnimations 的 mixer 更新后再贴地
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    group.position.y = 0;
    group.updateWorldMatrix(true, true);
    const contactY = footContactY(group);
    if (Number.isFinite(contactY)) {
      group.position.y = -contactY + 0.04;
    }
  }, -1);

  return <group ref={ref}>{children}</group>;
}

export function GardenCharacter({
  animationOffset,
  animationSpeed,
  modelUrl,
  position,
  rotation,
  scale,
  wanderSeed = 1,
  homeRadius = 12,
}: GardenCharacterProps) {
  const { groupRef, isMovingRef } = useWanderMovement({
    homeX: position[0],
    homeZ: position[2],
    initialRotation: rotation,
    speed: 1.05 + (wanderSeed % 5) * 0.07,
    homeRadius,
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
      <GroundSnap>
        <primitive object={character} />
      </GroundSnap>
    </group>
  );
}
