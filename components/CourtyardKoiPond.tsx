"use client";

/**
 * 合院锦鲤池：复用西式小院同款 AssetQuest 盆体 / 岩石 / 睡莲 + 动态水面，
 * 并加上游动锦鲤。位置对齐四进地面挖洞。
 */
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGardenPondAssets } from "@/hooks/useGardenPondAssets";
import {
  COMPOUND_LANDMARKS,
  KOI_POND_HOLE_RADIUS,
} from "@/lib/geoCompound";
import { PondWaterSurface } from "./PondWaterSurface";

const WATER_RX = 1.9;
const WATER_RZ = 1.55;
const BANK_PAD = 0.85;
const BANK_NORMAL = new THREE.Vector2(0.65, 0.65);

type Placed = {
  object: THREE.Object3D;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
};

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

  const bankRx = WATER_RX + BANK_PAD;
  const bankRz = WATER_RZ + BANK_PAD;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0.02, 0]}
        position={[0, -0.02, 0]}
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
      <mesh
        rotation={[-Math.PI / 2, 0.02, 0]}
        position={[0, -0.04, 0]}
        scale={[WATER_RX * 0.98, WATER_RZ * 0.98, 1]}
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

function KoiFish({
  color,
  radius,
  speed,
  phase,
}: {
  color: string;
  radius: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    const t = clock.elapsedTime * speed + phase;
    group.position.x = Math.cos(t) * radius;
    group.position.z = Math.sin(t) * radius * 0.72;
    group.position.y = 0.04 + Math.sin(t * 2.2) * 0.02;
    group.rotation.y = -t + Math.PI * 0.5;
  });

  return (
    <group ref={ref}>
      <mesh castShadow rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
          envMapIntensity={0.45}
        />
      </mesh>
      <mesh position={[0.12, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.045, 0.09, 5]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.08} />
      </mesh>
    </group>
  );
}

export function CourtyardKoiPond() {
  const assets = useGardenPondAssets();
  const { x, z } = COMPOUND_LANDMARKS.koiPond;

  const placements = useMemo(() => {
    const rocks: Placed[] = [
      {
        object: assets.rocks[0],
        position: [2.35, 0, 0.35],
        rotationY: 0.6,
      },
      {
        object: assets.rocks[1],
        position: [-2.15, 0, -0.7],
        rotationY: -0.9,
        scale: 1.05,
      },
      {
        object: assets.rocks[2],
        position: [0.4, 0, -2.05],
        rotationY: 1.2,
        scale: 0.92,
      },
    ];

    const pebbles: Placed[] = [
      {
        object: assets.pebbles[0],
        position: [1.25, 0, 1.5],
        rotationY: 0.4,
      },
      {
        object: assets.pebbles[1],
        position: [-1.0, 0, -1.65],
        rotationY: 1.1,
        scale: 1.1,
      },
    ];

    const lilies: Placed[] = [
      {
        object: assets.lilyLeaves[0],
        position: [-0.45, 0.025, 0.25],
        rotationY: 0.3,
      },
      {
        object: assets.lilyLeaves[1],
        position: [0.6, 0.025, -0.45],
        rotationY: 1.4,
        scale: 0.9,
      },
      {
        object: assets.lilyLeaves[2],
        position: [0.15, 0.025, 0.7],
        rotationY: -0.8,
        scale: 0.85,
      },
      {
        object: assets.lilyBlossom,
        position: [0.55, 0.04, -0.35],
        rotationY: 0.5,
      },
    ];

    return { rocks, pebbles, lilies };
  }, [assets]);

  const fish = useMemo(
    () => [
      { color: "#e85d2a", radius: 1.15, speed: 0.55, phase: 0.2 },
      { color: "#f2f0ea", radius: 0.9, speed: 0.7, phase: 1.4 },
      { color: "#d43b2f", radius: 1.3, speed: 0.42, phase: 2.6 },
      { color: "#f0c45a", radius: 0.8, speed: 0.85, phase: 3.5 },
      { color: "#f5f5f2", radius: 1.05, speed: 0.6, phase: 4.8 },
    ],
    [],
  );

  return (
    <group position={[x, 0.04, z]}>
      {/* 堵住院洞，避免透出草皮 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[KOI_POND_HOLE_RADIUS + 0.05, 48]} />
        <meshStandardMaterial color="#3a342c" roughness={1} metalness={0} />
      </mesh>
      <BankRing />
      <group position={[0, -0.02, 0]} scale={1.08}>
        <primitive object={assets.basin} />
      </group>
      <PondWaterSurface
        rx={WATER_RX}
        rz={WATER_RZ}
        position={[0.05, 0.06, -0.05]}
        tilt={0.02}
        color="#2f5f56"
        roughness={0.48}
        metalness={0.08}
        normalRepeat={1.8}
        normalScale={0.4}
      />
      {placements.rocks.map((item, index) => (
        <PlacedAsset key={`rock-${index}`} {...item} />
      ))}
      {placements.pebbles.map((item, index) => (
        <PlacedAsset key={`pebble-${index}`} {...item} />
      ))}
      {placements.lilies.map((item, index) => (
        <PlacedAsset key={`lily-${index}`} {...item} />
      ))}
      <group>
        {fish.map((f) => (
          <KoiFish key={f.phase} {...f} />
        ))}
      </group>
    </group>
  );
}
