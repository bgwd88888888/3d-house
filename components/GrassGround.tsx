"use client";

/**
 * 院子草地：大范围 PBR 草坪，铺满视野直至雾效远处，像连续地面。
 * 靠法线表现细草起伏；大平面关闭强位移，避免远距离网格起伏失真。
 * Y 略低于 0，避免与地基 Z-fighting。
 */
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useGrassTextures } from "@/hooks/useGrassTextures";

/** 覆盖到雾效之外，旋转拉远时也看不到灰边 */
const GRASS_SIZE = 1100;
/** 贴图在世界中的平铺边长（米） */
const GRASS_TILE_METERS = 3.4;
const GRASS_GROUND_Y = -0.04;
const GRASS_SEGMENTS = 96;
const GRASS_NORMAL_SCALE = new THREE.Vector2(0.85, 0.85);

export function GrassGround() {
  const textures = useGrassTextures();
  const repeat = GRASS_SIZE / GRASS_TILE_METERS;

  useLayoutEffect(() => {
    for (const texture of Object.values(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.needsUpdate = true;
    }
  }, [repeat, textures]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GRASS_GROUND_Y, 0]}
      receiveShadow
    >
      <planeGeometry args={[GRASS_SIZE, GRASS_SIZE, GRASS_SEGMENTS, GRASS_SEGMENTS]} />
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        roughnessMap={textures.roughnessMap}
        color="#7f9268"
        roughness={0.97}
        metalness={0}
        normalScale={GRASS_NORMAL_SCALE}
        envMapIntensity={0.14}
      />
    </mesh>
  );
}
