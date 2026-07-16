"use client";

/**
 * 房子渲染层：把 geoBuildings 产出的分层几何挂上材质。
 *
 * - stage 变化会重建几何；卸载时 dispose，避免 GPU 泄漏
 * - FitCamera 仅首帧根据房子包围球对准轨道目标
 * - 墙体用 plaster PBR；屋顶用瓦片 PBR（DoubleSide）
 * - 无卡通描边，靠 PBR 与光照表现体积
 * - woodwork / metalwork / glass / steps 分层换材质
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildHouseLayers,
  estimateHouseBounds,
  type BuildStage,
  type CityLayers,
} from "@/lib/geoBuildings";
import { useWallTextures } from "@/hooks/useWallTextures";
import { useRoofTextures } from "@/hooks/useRoofTextures";
import { HouseWallMural } from "./HouseWallMural";

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
  l.metalwork?.dispose();
  l.glass?.dispose();
  l.steps?.dispose();
}

type CottageSceneProps = {
  stage: BuildStage;
};

/** 西式单栋小院（可与四进合院场景切换） */
export function CottageScene({ stage }: CottageSceneProps) {
  const wallTextures = useWallTextures();
  const roofTextures = useRoofTextures();
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
      {...wallTextures}
      color="#ebe6dc"
      roughness={0.88}
      metalness={0.02}
      normalScale={new THREE.Vector2(0.75, 0.75)}
      envMapIntensity={0.32}
    />
  );
  const roofMat = (
    <meshStandardMaterial
      {...roofTextures}
      color="#b86a42"
      roughness={0.82}
      metalness={0.04}
      normalScale={new THREE.Vector2(0.85, 0.85)}
      envMapIntensity={0.35}
      side={THREE.DoubleSide}
    />
  );
  const baseMat = (
    <meshStandardMaterial
      color="#7a818a"
      roughness={0.9}
      metalness={0.03}
      envMapIntensity={0.2}
    />
  );
  const woodMat = (
    <meshStandardMaterial
      color="#5a3a24"
      roughness={0.72}
      metalness={0.04}
      envMapIntensity={0.28}
    />
  );
  const metalMat = (
    <meshStandardMaterial
      color="#b08d3a"
      roughness={0.35}
      metalness={0.88}
      envMapIntensity={0.75}
    />
  );
  const glassMat = (
    <meshPhysicalMaterial
      color="#8fa8b5"
      roughness={0.05}
      metalness={0}
      transmission={0.82}
      thickness={0.35}
      ior={1.45}
      transparent
      opacity={1}
      envMapIntensity={1.1}
      reflectivity={0.55}
    />
  );
  const stepMat = (
    <meshStandardMaterial
      color="#aeb3b8"
      roughness={0.92}
      metalness={0.02}
      envMapIntensity={0.18}
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
      {layers.metalwork ? (
        <mesh geometry={layers.metalwork} castShadow receiveShadow>
          {metalMat}
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
      {layers.walls ? (
        <Suspense fallback={null}>
          <HouseWallMural />
        </Suspense>
      ) : null}
    </>
  );
}
