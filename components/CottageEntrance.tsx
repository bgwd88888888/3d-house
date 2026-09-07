"use client";

import * as THREE from "three";
import { useCottageEntrance } from "@/hooks/useCottageEntrance";
import type { WeatherKind } from "@/lib/weatherPresets";

const SOIL_NORMAL = new THREE.Vector2(0.45, 0.45);
const STONE_NORMAL = new THREE.Vector2(0.6, 0.6);

/** 入口展示层：壁灯、门牌、盆栽和墙脚细节共用七个材质网格。 */
export function CottageEntrance({ weather }: { weather: WeatherKind }) {
  const { geometry, numberTexture, soilTextures, stoneTextures, layout } = useCottageEntrance();
  const lit = weather === "dusk";
  const layers = [
    {
      key: "metal" as const,
      castShadow: true,
      material: <meshStandardMaterial color="#42443b" roughness={0.72} metalness={0.35} envMapIntensity={0.25} />,
    },
    {
      key: "clay" as const,
      castShadow: true,
      material: <meshStandardMaterial vertexColors roughness={0.94} metalness={0} envMapIntensity={0.14} />,
    },
    {
      key: "foliage" as const,
      castShadow: true,
      material: <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.86} metalness={0} envMapIntensity={0.15} />,
    },
    {
      key: "soil" as const,
      castShadow: false,
      material: <meshStandardMaterial {...soilTextures} vertexColors transparent depthWrite={false} roughness={1} normalScale={SOIL_NORMAL} envMapIntensity={0.12} />,
    },
    {
      key: "stones" as const,
      castShadow: true,
      material: <meshStandardMaterial {...stoneTextures} vertexColors roughness={0.96} normalScale={STONE_NORMAL} envMapIntensity={0.14} />,
    },
    {
      key: "diffuser" as const,
      castShadow: false,
      material: <meshStandardMaterial color="#e0d3b5" emissive="#ffc17b" emissiveIntensity={lit ? 1.2 : 0} roughness={0.55} />,
    },
    {
      key: "plaque" as const,
      castShadow: true,
      material: <meshStandardMaterial map={numberTexture} color="#f2ead4" roughness={0.8} envMapIntensity={0.16} />,
    },
  ];

  return (
    <group>
      {layers.map(({ key, castShadow, material }) => geometry[key] ? (
        <mesh key={key} geometry={geometry[key]} castShadow={castShadow} receiveShadow>
          {material}
        </mesh>
      ) : null)}
      {lit ? (
        <pointLight position={layout.lamp} color="#ffd1a0" intensity={5} distance={4.5} decay={2} />
      ) : null}
    </group>
  );
}
