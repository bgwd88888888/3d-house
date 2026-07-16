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
    const orbit = controls as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    orbit?.target?.set(0, 3.5, 2);
    const dist = sphere.radius / Math.sin(((camera.fov * Math.PI) / 180) / 2);
    const eye = new THREE.Vector3(0.85, 0.55, 1.05)
      .normalize()
      .multiplyScalar(dist * 0.95);
    camera.position.copy(new THREE.Vector3(0, 3.5, 2).add(eye));
    /* eslint-disable react-hooks/immutability */
    camera.near = Math.max(dist / 600, 0.2);
    camera.far = Math.max(dist * 30, 2500);
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
            color="#f3eee4"
            roughness={0.9}
            metalness={0.02}
            normalScale={new THREE.Vector2(0.55, 0.55)}
            envMapIntensity={0.28}
          />
        </mesh>
      ) : null}
      {layers.roofs ? (
        <mesh geometry={layers.roofs} castShadow receiveShadow>
          <meshStandardMaterial
            {...roofTextures}
            color="#4a4e54"
            roughness={0.86}
            metalness={0.05}
            normalScale={new THREE.Vector2(0.7, 0.7)}
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
