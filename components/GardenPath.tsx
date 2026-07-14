"use client";

/**
 * 门前汀步石板：独立圆角石，缝里露草；无整块碎石底床。
 * 坐标对齐 DEFAULT_HOUSE_SPEC.door / steps 与 GardenPickup。
 */
import { RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { usePathTextures } from "@/hooks/usePathTextures";

/** 与 DEFAULT_HOUSE_SPEC.door.offsetX 一致 */
const DOOR_X = 2.25;
/** 下台阶前沿约 z≈6.23，第一块石板略留缝 */
const PATH_START_Z = 6.48;
const STONE_W = 0.98;
const STONE_D = 0.7;
const STONE_H = 0.11;
const STONE_GAP = 0.2;
const PATH_Y = STONE_H * 0.5 - 0.02;
const NORMAL_SCALE = new THREE.Vector2(0.35, 0.35);
const STONE_RADIUS = 0.045;

type StoneSpec = {
  key: string;
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  tint: string;
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STONE_TINTS = ["#c9c6bf", "#c2c0b8", "#d0cdc5", "#bbb8b0"] as const;

function buildStoneLayout(): StoneSpec[] {
  const rand = mulberry32(91);
  const stones: StoneSpec[] = [];

  const frontCount = 6;
  for (let i = 0; i < frontCount; i += 1) {
    const z = PATH_START_Z + i * (STONE_D + STONE_GAP) + STONE_D * 0.5;
    // 左右轻错落，避免一条死板直线
    const stagger = ((i % 2) * 2 - 1) * 0.08 + (rand() - 0.5) * 0.1;
    const rot = (rand() - 0.5) * 0.14;
    const w = STONE_W + (rand() - 0.5) * 0.14;
    const d = STONE_D + (rand() - 0.5) * 0.1;
    stones.push({
      key: `front-${i}`,
      position: [DOOR_X + stagger, PATH_Y, z],
      rotationY: rot,
      size: [w, STONE_H, d],
      tint: STONE_TINTS[i % STONE_TINTS.length],
    });
  }

  // 右侧支路：从第二块附近分叉，步距更大，更像汀步
  const sideCount = 7;
  const sideZ = PATH_START_Z + (STONE_D + STONE_GAP) + STONE_D * 0.15;
  for (let i = 0; i < sideCount; i += 1) {
    const x =
      DOOR_X +
      STONE_W * 0.65 +
      i * (STONE_D + STONE_GAP + 0.04) +
      STONE_D * 0.5;
    const zJitter = ((i % 2) * 2 - 1) * 0.07 + (rand() - 0.5) * 0.08;
    const zPull = i * 0.1;
    const rot = Math.PI * 0.5 + (rand() - 0.5) * 0.12;
    const w = STONE_W * 0.9 + (rand() - 0.5) * 0.12;
    const d = STONE_D + (rand() - 0.5) * 0.08;
    stones.push({
      key: `side-${i}`,
      position: [x, PATH_Y, sideZ + zJitter - zPull],
      rotationY: rot,
      size: [w, STONE_H, d],
      tint: STONE_TINTS[(i + 1) % STONE_TINTS.length],
    });
  }

  return stones;
}

export function GardenPath() {
  const textures = usePathTextures();
  const stones = useMemo(() => buildStoneLayout(), []);

  useLayoutEffect(() => {
    for (const texture of Object.values(textures)) {
      // 单块石面尺度，避免密铺碎石感
      texture.repeat.set(0.55, 0.55);
      texture.needsUpdate = true;
    }
  }, [textures]);

  const sharedMaps = useMemo(
    () => ({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
    }),
    [textures],
  );

  return (
    <group>
      {stones.map((stone) => (
        <RoundedBox
          key={stone.key}
          args={stone.size}
          radius={STONE_RADIUS}
          smoothness={3}
          position={stone.position}
          rotation={[0, stone.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            {...sharedMaps}
            color={stone.tint}
            roughness={0.92}
            metalness={0.02}
            normalScale={NORMAL_SCALE}
            envMapIntensity={0.18}
          />
        </RoundedBox>
      ))}
    </group>
  );
}
