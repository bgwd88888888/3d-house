"use client";

/**
 * 房子渲染层：把 geoBuildings 产出的分层几何挂上材质。
 *
 * - stage 变化会重建几何；卸载时 dispose，避免 GPU 泄漏
 * - 默认机位由 CityCanvas 的 CottageCameraRig 负责（院前人视构图）
 * - 墙体用 plaster PBR；屋顶用瓦片 PBR（DoubleSide）
 * - 无卡通描边，靠 PBR 与光照表现体积
 * - woodwork / metalwork / glass / steps 分层换材质
 */
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  buildHouseLayers,
  type BuildStage,
  type CityLayers,
} from "@/lib/geoBuildings";
import { useWallTextures } from "@/hooks/useWallTextures";
import { useRoofTextures } from "@/hooks/useRoofTextures";
import { useWoodTextures } from "@/hooks/useWoodTextures";
import { usePathTextures } from "@/hooks/usePathTextures";
import {
  applyRoofTilingBreaker,
  applyWallWeathering,
  applyWoodEnrichment,
} from "@/lib/materialWeathering";
import { HouseWallMural } from "./HouseWallMural";

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
  const woodTextures = useWoodTextures();
  const pathTextures = usePathTextures();
  const layers = useMemo(() => buildHouseLayers(stage), [stage]);

  useEffect(() => {
    return () => disposeLayers(layers);
  }, [layers]);

  const wallMat = (
    <meshStandardMaterial
      {...wallTextures}
      color="#b8ab97"
      roughness={1}
      metalness={0.01}
      normalScale={new THREE.Vector2(1.35, 1.35)}
      envMapIntensity={0.08}
      onBeforeCompile={applyWallWeathering}
      customProgramCacheKey={() => "cottage-wall-weathered-v5"}
      transparent={false}
      opacity={1}
      depthWrite
    />
  );
  const roofMat = (
    <meshStandardMaterial
      {...roofTextures}
      color="#8a5230"
      roughness={0.95}
      metalness={0.02}
      normalScale={new THREE.Vector2(1.45, 1.45)}
      envMapIntensity={0.16}
      side={THREE.DoubleSide}
      onBeforeCompile={applyRoofTilingBreaker}
      customProgramCacheKey={() => "cottage-roof-tiling-breaker-v4"}
    />
  );
  const woodMat = (
    <meshStandardMaterial
      {...woodTextures}
      color="#6e4a32"
      roughness={0.78}
      metalness={0.015}
      normalScale={new THREE.Vector2(1.15, 1.15)}
      envMapIntensity={0.22}
      onBeforeCompile={applyWoodEnrichment}
      customProgramCacheKey={() => "cottage-wood-enriched-v1"}
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
  // 与门前小路同一套 PavingStones070
  const stepMat = (
    <meshStandardMaterial
      map={pathTextures.secondary.map}
      normalMap={pathTextures.secondary.normalMap}
      roughnessMap={pathTextures.secondary.roughnessMap}
      color="#c4bbb0"
      roughness={1}
      metalness={0.04}
      normalScale={new THREE.Vector2(1.1, 1.1)}
      envMapIntensity={0.22}
    />
  );

  return (
    <>
      {/* 不再画外露地基白条；墙体贴地 */}
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
