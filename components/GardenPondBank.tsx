"use client";

import * as THREE from "three";
import { useGardenPondBank } from "@/hooks/useGardenPondBank";
import { GARDEN_POND } from "@/lib/gardenPondLayout";

const STONE_NORMAL = new THREE.Vector2(1.15, 1.15);
const SOIL_NORMAL = new THREE.Vector2(0.75, 0.75);

/** 不规则石岸与淡出的泥岸；沿用已有浅水底，不增加水面渲染通道。 */
export function GardenPondBank() {
  const { geometry, textures } = useGardenPondBank();
  const { waterRx, waterRz } = GARDEN_POND;

  return (
    <>
      <mesh geometry={geometry.stone} receiveShadow>
        <meshStandardMaterial
          {...textures.stone}
          vertexColors
          normalScale={STONE_NORMAL}
          roughness={0.96}
          metalness={0.03}
          envMapIntensity={0.16}
        />
      </mesh>
      <mesh geometry={geometry.soil} receiveShadow>
        <meshStandardMaterial
          {...textures.soil}
          vertexColors
          transparent
          depthWrite={false}
          normalScale={SOIL_NORMAL}
          roughness={1}
          metalness={0.02}
          envMapIntensity={0.12}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0.02, 0]}
        position={[0, -0.068, 0]}
        scale={[waterRx * 0.98, waterRz * 0.98, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          map={textures.soil.map}
          roughnessMap={textures.soil.roughnessMap}
          color="#3a5240"
          roughness={1}
          metalness={0}
          envMapIntensity={0.08}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0.02, 0]}
        position={[0, -0.052, 0]}
        scale={[waterRx * 0.52, waterRz * 0.52, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial
          color="#24362c"
          roughness={1}
          metalness={0}
          envMapIntensity={0.05}
        />
      </mesh>
    </>
  );
}
