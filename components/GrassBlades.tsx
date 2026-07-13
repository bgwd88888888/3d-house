"use client";

import * as THREE from "three";
import { useGrassBladeInstances } from "@/hooks/useGrassBladeInstances";

const BLADE_COUNT = 32000;
const BLADE_HEIGHT = 0.28;
const BLADE_RADIUS = 0.026;

type GrassBladesProps = {
  depth: number;
  groundY: number;
  width: number;
};

export function GrassBlades({ depth, groundY, width }: GrassBladesProps) {
  const meshRef = useGrassBladeInstances({
    bladeHeight: BLADE_HEIGHT,
    count: BLADE_COUNT,
    depth,
    groundY,
    width,
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BLADE_COUNT]}>
      <coneGeometry args={[BLADE_RADIUS, BLADE_HEIGHT, 3, 1, true]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.92}
        metalness={0}
        envMapIntensity={0.12}
        side={THREE.DoubleSide}
        dithering
      />
    </instancedMesh>
  );
}
