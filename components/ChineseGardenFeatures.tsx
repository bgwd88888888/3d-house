"use client";

/**
 * 中式园林点景：中轴汀步、假山、锦鲤鱼池；各进院落小品。
 */
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COMPOUND_LANDMARKS, COURTYARDS } from "@/lib/geoCompound";
import { CourtyardKoiPond } from "./CourtyardKoiPond";

const ROCK_NORMAL = new THREE.Vector2(1.1, 1.1);

type Stone = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
};

function AxisSteppingStones() {
  const stones = useMemo(() => {
    const list: Stone[] = [];
    // 南门 → 后园中轴
    // 只铺院落空地，避开厅堂实体
    // 中轴汀步：院子空地，避开正房 / 拱门墙 / 影壁
    const zs = [
      31.0, 29.5, 27.0, 25.5, 23.5, 22.0, 20.0, 14.5, 13.0, 11.0, 9.5, 7.5,
      5.5, -1.0, -3.0, -5.0, -7.0, -9.5, -11.0, -15.5, -17.5, -19.5, -22.0, -24.5,
    ];
    zs.forEach((z, i) => {
      const stagger = ((i % 2) * 2 - 1) * 0.12;
      list.push({
        key: `axis-${i}`,
        position: [stagger, 0.05, z],
        size: [0.85 + (i % 3) * 0.06, 0.1, 0.62],
        rotationY: ((i % 5) - 2) * 0.04,
      });
    });
    return list;
  }, []);

  return (
    <group>
      {stones.map((stone) => (
        <mesh
          key={stone.key}
          position={stone.position}
          rotation={[0, stone.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={stone.size} />
          <meshStandardMaterial
            color={stone.key.endsWith("0") || stone.key.endsWith("5") ? "#9a958c" : "#8e8980"}
            roughness={0.9}
            metalness={0.04}
            envMapIntensity={0.16}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rockery() {
  const textures = useTexture({
    map: "/textures/rock-023/Rock023_1K-JPG_Color.jpg",
    normalMap: "/textures/rock-023/Rock023_1K-JPG_NormalGL.jpg",
    roughnessMap: "/textures/rock-023/Rock023_1K-JPG_Roughness.jpg",
  });

  useLayoutEffect(() => {
    for (const [key, texture] of Object.entries(textures)) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.2, 1.2);
      texture.colorSpace =
        key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.needsUpdate = true;
    }
  }, [textures]);

  const { x, z } = COMPOUND_LANDMARKS.rockery;
  const chunks: [number, number, number, number, number, number][] = [
    [0, 0.55, 0, 1.8, 1.1, 1.4],
    [0.9, 1.15, -0.4, 1.2, 1.5, 1.0],
    [-0.85, 0.95, 0.5, 1.1, 1.3, 1.1],
    [0.2, 1.85, 0.15, 0.9, 1.2, 0.85],
    [-0.3, 2.35, -0.2, 0.7, 0.9, 0.65],
    [1.3, 0.45, 0.7, 0.85, 0.7, 0.9],
    [-1.2, 0.4, -0.6, 0.9, 0.65, 0.8],
  ];

  return (
    <group position={[x, 0, z]}>
      {chunks.map(([px, py, pz, sx, sy, sz], i) => (
        <mesh
          key={i}
          position={[px, py, pz]}
          rotation={[0.1 * (i % 3), i * 0.7, 0.08 * (i % 2)]}
          castShadow
          receiveShadow
          scale={[sx, sy, sz]}
        >
          <dodecahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial
            map={textures.map}
            normalMap={textures.normalMap}
            roughnessMap={textures.roughnessMap}
            normalScale={ROCK_NORMAL}
            color="#b9b3a8"
            roughness={1}
            metalness={0.04}
            envMapIntensity={0.18}
          />
        </mesh>
      ))}
      {/* 山脚苔石 */}
      <mesh position={[0.4, 0.12, 1.1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#7a8a5a" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

/** 各进院落小景：石桌、缸、灯 */
function CourtyardVignettes() {
  const spots = [
    { x: -6, z: COURTYARDS.first.cz, kind: "pot" as const },
    { x: 6.5, z: COURTYARDS.first.cz, kind: "pot" as const },
    { x: -8, z: COURTYARDS.second.cz, kind: "table" as const },
    { x: 8, z: COURTYARDS.second.cz, kind: "lantern" as const },
    { x: -10, z: COURTYARDS.third.cz, kind: "table" as const },
    { x: 10, z: COURTYARDS.third.cz + 1.5, kind: "lantern" as const },
    { x: 0, z: COURTYARDS.fourth.cz + 5, kind: "lantern" as const },
  ];

  return (
    <group>
      {spots.map((spot, index) => {
        if (spot.kind === "pot") {
          return (
            <group key={index} position={[spot.x, 0, spot.z]}>
              <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.32, 0.38, 0.7, 12]} />
                <meshStandardMaterial color="#6b4a32" roughness={0.8} metalness={0.05} />
              </mesh>
              <mesh position={[0, 0.78, 0]} castShadow>
                <sphereGeometry args={[0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color="#3f6b3a" roughness={0.9} metalness={0} />
              </mesh>
            </group>
          );
        }
        if (spot.kind === "table") {
          return (
            <group key={index} position={[spot.x, 0, spot.z]}>
              <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.7, 0.75, 0.16, 16]} />
                <meshStandardMaterial color="#9a958c" roughness={0.88} metalness={0.04} />
              </mesh>
              <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.22, 0.28, 0.4, 10]} />
                <meshStandardMaterial color="#8a857c" roughness={0.9} metalness={0.03} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={index} position={[spot.x, 0, spot.z]}>
            <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.14, 0.18, 1.1, 8]} />
              <meshStandardMaterial color="#7a756c" roughness={0.9} metalness={0.04} />
            </mesh>
            <mesh position={[0, 1.2, 0]} castShadow>
              <sphereGeometry args={[0.22, 10, 8]} />
              <meshStandardMaterial
                color="#f0d8a8"
                emissive="#c49a48"
                emissiveIntensity={0.25}
                roughness={0.55}
                metalness={0.1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function ChineseGardenFeatures() {
  return (
    <group>
      <AxisSteppingStones />
      <Rockery />
      <CourtyardKoiPond />
      <CourtyardVignettes />
    </group>
  );
}
