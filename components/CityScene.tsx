"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildHouseLayers,
  estimateHouseBounds,
  type BuildStage,
  type CityLayers,
} from "@/lib/geoBuildings";

function FitCamera({ sphere }: { sphere: THREE.Sphere | null }) {
  const { camera, controls } = useThree();
  const done = useRef(false);

  useEffect(() => {
    if (!sphere || done.current) return;
    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    orbit?.target?.copy(sphere.center);

    const dist =
      sphere.radius / Math.sin(((camera.fov * Math.PI) / 180) / 2);
    const eyeOffset = new THREE.Vector3(1, 0.5, 1)
      .normalize()
      .multiplyScalar(dist * 1.12);
    camera.position.copy(sphere.center.clone().add(eyeOffset));
    /* R3F 透视相机需在运行时写 near/far，见 https://docs.pmnd.rs/react-three-fiber/api/hooks#usetthree */
    /* eslint-disable react-hooks/immutability -- PerspectiveCamera 裁剪面 */
    camera.near = Math.max(dist / 800, 0.1);
    camera.far = Math.max(dist * 40, 2000);
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();
    orbit?.update?.();
    done.current = true;
  }, [sphere, camera, controls]);

  return null;
}

function disposeLayers(l: CityLayers | null) {
  if (!l) return;
  l.foundations?.dispose();
  l.walls?.dispose();
  l.roofs?.dispose();
  l.woodwork?.dispose();
  l.glass?.dispose();
  l.steps?.dispose();
}

type CitySceneProps = {
  stage: BuildStage;
};

export function CityScene({ stage }: CitySceneProps) {
  const { layers, bounds } = useMemo(() => {
    const lyr = buildHouseLayers(stage);
    const sphere = estimateHouseBounds();
    return { layers: lyr, bounds: sphere };
  }, [stage]);

  useEffect(() => {
    return () => disposeLayers(layers);
  }, [layers]);

  const wallMat = (
    <meshStandardMaterial
      color="#f5f3eb"
      roughness={0.42}
      metalness={0.02}
      envMapIntensity={0.85}
    />
  );
  const roofMat = (
    <meshStandardMaterial
      color="#cf4b15"
      roughness={0.6}
      metalness={0.03}
      envMapIntensity={0.65}
      side={THREE.DoubleSide}
    />
  );
  const baseMat = (
    <meshStandardMaterial
      color="#8b9199"
      roughness={0.78}
      metalness={0.04}
      envMapIntensity={0.35}
    />
  );
  const woodMat = (
    <meshStandardMaterial
      color="#7c431f"
      roughness={0.56}
      metalness={0.05}
      envMapIntensity={0.7}
    />
  );
  const glassMat = (
    <meshPhysicalMaterial
      color="#9eb3bf"
      roughness={0.08}
      metalness={0.02}
      transmission={0.55}
      thickness={0.2}
      transparent
      opacity={0.58}
      envMapIntensity={1}
    />
  );
  const stepMat = (
    <meshStandardMaterial
      color="#c2c5ca"
      roughness={0.86}
      metalness={0.01}
      envMapIntensity={0.35}
    />
  );

  return (
    <>
      <FitCamera sphere={bounds} />
      {layers.foundations ? (
        <mesh geometry={layers.foundations} castShadow receiveShadow>
          {baseMat}
        </mesh>
      ) : null}
      {layers.walls ? (
        <mesh geometry={layers.walls} castShadow receiveShadow>
          {wallMat}
        </mesh>
      ) : null}
      {layers.roofs ? (
        <mesh geometry={layers.roofs} castShadow receiveShadow>
          {roofMat}
        </mesh>
      ) : null}
      {layers.woodwork ? (
        <mesh geometry={layers.woodwork} castShadow receiveShadow>
          {woodMat}
        </mesh>
      ) : null}
      {layers.glass ? (
        <mesh geometry={layers.glass} castShadow receiveShadow>
          {glassMat}
        </mesh>
      ) : null}
      {layers.steps ? (
        <mesh geometry={layers.steps} castShadow receiveShadow>
          {stepMat}
        </mesh>
      ) : null}
    </>
  );
}
