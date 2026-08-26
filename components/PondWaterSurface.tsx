"use client";

/**
 * 简单池水：滚动法线涟漪，不做场景反射。
 * GardenPond 与 CourtyardKoiPond 共用。
 */
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export type PondWaterSurfaceProps = {
  rx: number;
  rz: number;
  position?: [number, number, number];
  tilt?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  normalRepeat?: number;
  normalScale?: number;
  flowSpeed?: [number, number];
  opacity?: number;
};

const NORMALS_URL = "/textures/waternormals.jpg";

export function PondWaterSurface({
  rx,
  rz,
  position = [0.05, -0.015, -0.05],
  tilt = 0.02,
  color = "#28545a",
  roughness = 0.42,
  metalness = 0.08,
  normalRepeat = 2.2,
  normalScale = 0.45,
  flowSpeed = [0.026, 0.016],
  opacity = 1,
}: PondWaterSurfaceProps) {
  const waterNormals = useTexture(NORMALS_URL);
  const normalScaleVec = useMemo(
    () => new THREE.Vector2(normalScale, normalScale),
    [normalScale],
  );
  const translucent = opacity < 0.999;

  useLayoutEffect(() => {
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    waterNormals.repeat.set(normalRepeat, normalRepeat);
    waterNormals.anisotropy = 4;
    waterNormals.generateMipmaps = true;
    waterNormals.minFilter = THREE.LinearMipmapLinearFilter;
    waterNormals.magFilter = THREE.LinearFilter;
    waterNormals.needsUpdate = true;
  }, [waterNormals, normalRepeat]);

  useFrame((_, delta) => {
    waterNormals.offset.x += delta * flowSpeed[0];
    waterNormals.offset.y += delta * flowSpeed[1];
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, tilt, 0]}
      position={position}
      scale={[rx, rz, 1]}
    >
      <circleGeometry args={[1, 48]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={0}
        normalMap={waterNormals}
        normalScale={normalScaleVec}
        transparent={translucent}
        opacity={opacity}
        depthWrite={!translucent}
      />
    </mesh>
  );
}
