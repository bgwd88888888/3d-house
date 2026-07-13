"use client";

/**
 * 院子草地：带位移的 PBR 地面 + 实例化草叶（GrassBlades）。
 * 尺寸覆盖房子周围一圈；Y 略低于 0，避免与地基 Z-fighting。
 */
import * as THREE from "three";
import { useGrassTextures } from "@/hooks/useGrassTextures";
import { GrassBlades } from "./GrassBlades";

const GRASS_WIDTH = 44;
const GRASS_DEPTH = 36;
const GRASS_GROUND_Y = -0.04;
const GRASS_GEOMETRY_ARGS: [number, number, number, number] = [
  GRASS_WIDTH,
  GRASS_DEPTH,
  96,
  80,
];
const GRASS_NORMAL_SCALE = new THREE.Vector2(1.18, 1.18);

export function GrassGround() {
  const textures = useGrassTextures();

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GRASS_GROUND_Y, 0]}
        receiveShadow
      >
        <planeGeometry args={GRASS_GEOMETRY_ARGS} />
        <meshStandardMaterial
          {...textures}
          color="#91a77f"
          roughness={1}
          metalness={0}
          normalScale={GRASS_NORMAL_SCALE}
          displacementScale={0.14}
          displacementBias={-0.055}
          envMapIntensity={0.12}
        />
      </mesh>
      <GrassBlades
        width={GRASS_WIDTH}
        depth={GRASS_DEPTH}
        groundY={GRASS_GROUND_Y}
      />
    </>
  );
}
