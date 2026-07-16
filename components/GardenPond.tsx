"use client";

/**
 * 庭院池塘：AssetQuest 盆体/植物 + ambientCG 泥岸/岩石 + 动态水面。
 */
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGardenPondAssets } from "@/hooks/useGardenPondAssets";

/** 东南侧空地：房子右前方、皮卡偏南 */
export const GARDEN_POND = {
  x: 11.2,
  z: 10.4,
  waterRx: 1.7,
  waterRz: 1.4,
  bankPad: 0.7,
} as const;

const BANK_NORMAL = new THREE.Vector2(0.6, 0.6);
const WATER_NORMAL = new THREE.Vector2(0.35, 0.35);

type Placed = {
  object: THREE.Object3D;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
};

function PondWater() {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const waterNormals = useTexture("/textures/waternormals.jpg");

  useLayoutEffect(() => {
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    waterNormals.repeat.set(1.6, 1.6);
    waterNormals.needsUpdate = true;
  }, [waterNormals]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material?.normalMap) return;
    material.normalMap.offset.x += delta * 0.03;
    material.normalMap.offset.y += delta * 0.018;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0.1, 0]}
      position={[0.05, -0.015, -0.05]}
      scale={[GARDEN_POND.waterRx, GARDEN_POND.waterRz, 1]}
      receiveShadow
    >
      <circleGeometry args={[1, 64]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#1a4f5c"
        roughness={0.08}
        metalness={0.02}
        transmission={0.55}
        thickness={0.7}
        ior={1.33}
        transparent
        opacity={0.92}
        envMapIntensity={1.35}
        attenuationColor="#0d3540"
        attenuationDistance={1.4}
        normalMap={waterNormals}
        normalScale={WATER_NORMAL}
      />
    </mesh>
  );
}

function BankRing() {
  const textures = useTexture({
    map: "/textures/ground-048/Ground048_1K-JPG_Color.jpg",
    normalMap: "/textures/ground-048/Ground048_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/ground-048/Ground048_1K-JPG_Roughness.jpg",
  });

  useLayoutEffect(() => {
    for (const [key, texture] of Object.entries(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.4, 2.4);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [textures]);

  const bankRx = GARDEN_POND.waterRx + GARDEN_POND.bankPad;
  const bankRz = GARDEN_POND.waterRz + GARDEN_POND.bankPad;

  return (
    <>
      {/* 泥岸外圈，衔接草地 */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.038, 0]}
        scale={[bankRx, bankRz, 1]}
        receiveShadow
      >
        <ringGeometry args={[0.62, 1, 64]} />
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          roughnessMap={textures.roughnessMap}
          normalScale={BANK_NORMAL}
          roughness={1}
          metalness={0.02}
          envMapIntensity={0.14}
          color="#9a8a72"
        />
      </mesh>
      {/* 浅水底，透过水面可见一点 */}
      <mesh
        rotation={[-Math.PI / 2, 0.1, 0]}
        position={[0, -0.05, 0]}
        scale={[GARDEN_POND.waterRx * 0.98, GARDEN_POND.waterRz * 0.98, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          map={textures.map}
          roughnessMap={textures.roughnessMap}
          color="#4a5a38"
          roughness={1}
          metalness={0}
          envMapIntensity={0.08}
        />
      </mesh>
    </>
  );
}

function PlacedAsset({ object, position, rotationY = 0, scale = 1 }: Placed) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

export function GardenPond() {
  const assets = useGardenPondAssets();

  const placements = useMemo(() => {
    const rocks: Placed[] = [
      {
        object: assets.rocks[0],
        position: [2.25, 0, 0.4],
        rotationY: 0.6,
      },
      {
        object: assets.rocks[1],
        position: [-2.05, 0, -0.75],
        rotationY: -0.9,
        scale: 1.05,
      },
      {
        object: assets.rocks[2],
        position: [0.45, 0, -1.95],
        rotationY: 1.2,
        scale: 0.92,
      },
    ];

    const pebbles: Placed[] = [
      {
        object: assets.pebbles[0],
        position: [1.2, 0, 1.45],
        rotationY: 0.4,
      },
      {
        object: assets.pebbles[1],
        position: [-0.95, 0, -1.6],
        rotationY: 1.1,
        scale: 1.1,
      },
    ];

    const lilies: Placed[] = [
      {
        object: assets.lilyLeaves[0],
        position: [-0.4, -0.005, 0.2],
        rotationY: 0.3,
      },
      {
        object: assets.lilyLeaves[1],
        position: [0.55, -0.005, -0.4],
        rotationY: 1.4,
        scale: 0.9,
      },
      {
        object: assets.lilyLeaves[2],
        position: [0.1, -0.005, 0.65],
        rotationY: -0.8,
        scale: 0.85,
      },
      {
        object: assets.lilyBlossom,
        position: [0.5, 0.01, -0.32],
        rotationY: 0.5,
      },
    ];

    return { rocks, pebbles, lilies };
  }, [assets]);

  return (
    <group position={[GARDEN_POND.x, 0, GARDEN_POND.z]}>
      <BankRing />

      <group position={[0, -0.045, 0]}>
        <primitive object={assets.basin} />
      </group>

      <PondWater />

      {placements.rocks.map((item, index) => (
        <PlacedAsset key={`rock-${index}`} {...item} />
      ))}
      {placements.pebbles.map((item, index) => (
        <PlacedAsset key={`pebble-${index}`} {...item} />
      ))}
      {placements.lilies.map((item, index) => (
        <PlacedAsset key={`lily-${index}`} {...item} />
      ))}
    </group>
  );
}
