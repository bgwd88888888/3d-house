"use client";

/**
 * 院子草地：以 PBR 草坪贴图为主，形成柔软地毯感。
 * 不再使用尖锥草叶实例（远看像刺）；靠法线/位移表现细草起伏。
 * Y 略低于 0，避免与地基 Z-fighting。
 */
import * as THREE from "three";
import { useGrassTextures } from "@/hooks/useGrassTextures";

const GRASS_WIDTH = 44;
const GRASS_DEPTH = 36;
const GRASS_GROUND_Y = -0.04;
const GRASS_GEOMETRY_ARGS: [number, number, number, number] = [
  GRASS_WIDTH,
  GRASS_DEPTH,
  128,
  104,
];
const GRASS_NORMAL_SCALE = new THREE.Vector2(0.72, 0.72);

export function GrassGround() {
  const textures = useGrassTextures();

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GRASS_GROUND_Y, 0]}
      receiveShadow
    >
      <planeGeometry args={GRASS_GEOMETRY_ARGS} />
      <meshStandardMaterial
        {...textures}
        color="#9db888"
        roughness={0.95}
        metalness={0}
        normalScale={GRASS_NORMAL_SCALE}
        displacementScale={0.045}
        displacementBias={-0.018}
        envMapIntensity={0.22}
      />
    </mesh>
  );
}
