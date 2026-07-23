"use client";

/**
 * 五亩四进合院主体：粉墙黛瓦、厅堂厢房、月洞门与游廊柱。
 */
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildCompoundLayers,
  estimateCompoundBounds,
  type CompoundLayers,
} from "@/lib/geoCompound";
import { useWallTextures } from "@/hooks/useWallTextures";
import { useRoofTextures } from "@/hooks/useRoofTextures";

function disposeLayers(layers: CompoundLayers | null) {
  if (!layers) return;
  layers.foundations?.dispose();
  layers.walls?.dispose();
  layers.roofs?.dispose();
  layers.woodwork?.dispose();
  layers.courtyards?.dispose();
  layers.accents?.dispose();
}

function FitCamera({ sphere }: { sphere: THREE.Sphere }) {
  const { camera, controls } = useThree();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const orbit = controls as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;

    const target = new THREE.Vector3(0, 1.2, 0);
    orbit?.target?.copy(target);
    // 低俯视：保证视锥上沿越过地平线，能看到白天天空
    camera.position.set(0, 26, 108);
    camera.lookAt(target);
    /* eslint-disable react-hooks/immutability */
    camera.near = 0.2;
    camera.far = Math.max(sphere.radius * 40, 2500);
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();
    orbit?.update?.();
    done.current = true;
  }, [sphere, camera, controls]);

  return null;
}

export function CourtyardCompound() {
  const wallTextures = useWallTextures();
  const roofTextures = useRoofTextures();
  const { layers, bounds } = useMemo(() => {
    return {
      layers: buildCompoundLayers(),
      bounds: estimateCompoundBounds(),
    };
  }, []);

  useEffect(() => {
    return () => disposeLayers(layers);
  }, [layers]);

  return (
    <group>
      <FitCamera sphere={bounds} />
      {layers.foundations ? (
        <mesh geometry={layers.foundations} castShadow receiveShadow>
          <meshStandardMaterial
            color="#6e737a"
            roughness={0.92}
            metalness={0.03}
            envMapIntensity={0.18}
          />
        </mesh>
      ) : null}
      {layers.walls ? (
        <mesh geometry={layers.walls} castShadow receiveShadow>
          <meshStandardMaterial
            {...wallTextures}
            color="#d6cec0"
            roughness={0.98}
            metalness={0.01}
            normalScale={new THREE.Vector2(1.15, 1.15)}
            envMapIntensity={0.18}
          />
        </mesh>
      ) : null}
      {layers.roofs ? (
        <mesh geometry={layers.roofs} castShadow receiveShadow>
          <meshStandardMaterial
            {...roofTextures}
            color="#cfd4da"
            roughness={0.9}
            metalness={0.02}
            normalScale={new THREE.Vector2(1.2, 1.2)}
            envMapIntensity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {layers.woodwork ? (
        <mesh geometry={layers.woodwork} castShadow receiveShadow>
          <meshStandardMaterial
            color="#5c3a22"
            roughness={0.74}
            metalness={0.04}
            envMapIntensity={0.26}
          />
        </mesh>
      ) : null}
      {layers.courtyards ? (
        <mesh geometry={layers.courtyards} receiveShadow>
          <meshStandardMaterial
            color="#cbb89a"
            roughness={0.95}
            metalness={0.02}
            envMapIntensity={0.12}
          />
        </mesh>
      ) : null}
      {layers.accents ? (
        <mesh geometry={layers.accents} castShadow receiveShadow>
          <meshStandardMaterial
            color="#e8e0d0"
            roughness={0.88}
            metalness={0.02}
            envMapIntensity={0.2}
          />
        </mesh>
      ) : null}
    </group>
  );
}
