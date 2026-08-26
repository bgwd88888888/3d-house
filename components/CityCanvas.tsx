"use client";

/**
 * 3D 场景根 Canvas：共用天空/天气/草地；建筑场景可切换。
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import {
  DEFAULT_WEATHER,
  WEATHER_PRESETS,
  type WeatherKind,
} from "@/lib/weatherPresets";
import {
  DEFAULT_SCENE,
  type SceneKind,
} from "@/lib/sceneKinds";
import { setActiveGardenScene } from "@/lib/gardenNavigation";
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { PrairieSky } from "./PrairieSky";
import { SkyClouds } from "./SkyClouds";
import { GardenPath } from "./GardenPath";
import { GardenPond } from "./GardenPond";
import { GardenPickup } from "./GardenPickup";
import { CottageGardenPeople } from "./CottageGardenPeople";
import { CottageGardenChickens } from "./CottageGardenChickens";
import { CottageGardenTrees } from "./CottageGardenTrees";
import { ChineseGardenFeatures } from "./ChineseGardenFeatures";
import { CourtyardEntrance } from "./CourtyardEntrance";
import { CourtyardWallMurals } from "./CourtyardWallMurals";
import { GardenPeople } from "./GardenPeople";
import { GardenChickens } from "./GardenChickens";
import { GardenTrees } from "./GardenTrees";

type CityCanvasProps = {
  className?: string;
  stage: BuildStage;
  weather?: WeatherKind;
  scene?: SceneKind;
};

function WeatherAtmosphere({ weather }: { weather: WeatherKind }) {
  const preset = WEATHER_PRESETS[weather];
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMappingExposure = preset.exposure;
  }, [gl, preset.exposure]);

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <fog
        attach="fog"
        args={[preset.fogColor, preset.fogNear, preset.fogFar]}
      />

      <PrairieSky weather={weather} />

      <Suspense fallback={null}>
        <SkyClouds preset={preset} />
      </Suspense>

      <hemisphereLight
        intensity={preset.hemiIntensity}
        color={preset.hemiSky}
        groundColor={preset.hemiGround}
      />
      <directionalLight
        castShadow
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        position={preset.sunPosition}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={420}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        // 灯光意图：缩小 PCF 模糊半径，投影边缘更清晰但仍保留柔边，避免生硬锯齿
        shadow-radius={3.5}
        shadow-bias={-0.00012}
        shadow-normalBias={0.04}
      />
      <directionalLight
        intensity={preset.fillIntensity}
        color={preset.fillColor}
        position={[-40, 32, -22]}
      />
      <directionalLight
        intensity={preset.faceFillIntensity}
        color={preset.faceFillColor}
        position={[12, 22, 70]}
      />
    </>
  );
}

function SceneNavSync({ scene }: { scene: SceneKind }) {
  useEffect(() => {
    setActiveGardenScene(scene);
  }, [scene]);
  return null;
}

/** 西式小院默认首屏：院前人视、略侧微仰，前景路径/池 → 中景房 → 背景树天 */
const COTTAGE_CAM_EYE = new THREE.Vector3(12.6, 1.48, 15.1);
const COTTAGE_CAM_TARGET = new THREE.Vector3(1.6, 2.7, 2.4);

function CottageCameraRig({ active }: { active: boolean }) {
  const { camera, controls } = useThree();
  const applied = useRef(false);

  useEffect(() => {
    applied.current = false;
  }, [active]);

  useFrame(() => {
    if (!active || applied.current) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const orbit = controls as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;
    if (!orbit?.target) return;

    orbit.target.copy(COTTAGE_CAM_TARGET);
    camera.position.copy(COTTAGE_CAM_EYE);
    const dist = COTTAGE_CAM_EYE.distanceTo(COTTAGE_CAM_TARGET);
    /* eslint-disable react-hooks/immutability -- PerspectiveCamera 裁剪面 */
    camera.near = Math.max(dist / 800, 0.1);
    camera.far = Math.max(dist * 40, 2000);
    /* eslint-enable react-hooks/immutability */
    camera.updateProjectionMatrix();
    camera.lookAt(COTTAGE_CAM_TARGET);
    orbit.update?.();
    applied.current = true;
  });

  return null;
}

function CottageDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <GardenPath />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPond />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPickup />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenChickens />
      </Suspense>
      <Suspense fallback={null}>
        <CottageGardenTrees />
      </Suspense>
    </>
  );
}

function CourtyardDecor() {
  return (
    <>
      <Suspense fallback={null}>
        <ChineseGardenFeatures />
      </Suspense>
      <Suspense fallback={null}>
        <CourtyardEntrance />
      </Suspense>
      <Suspense fallback={null}>
        <CourtyardWallMurals />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <GardenChickens />
      </Suspense>
      <Suspense fallback={null}>
        <GardenTrees />
      </Suspense>
    </>
  );
}

const DEFAULT_CAMERA = {
  position: [0, 26, 108] as [number, number, number],
  fov: 42,
  near: 0.2,
  far: 2500,
};

export function CityCanvas({
  className,
  stage,
  weather = DEFAULT_WEATHER,
  scene = DEFAULT_SCENE,
}: CityCanvasProps) {
  const preset = WEATHER_PRESETS[weather];
  // 小院瞄墙腰高度，避免默认高位 target 造成俯视沙盘感；合院保持原俯视构图。
  const orbitTarget: [number, number, number] =
    scene === "cottage"
      ? [COTTAGE_CAM_TARGET.x, COTTAGE_CAM_TARGET.y, COTTAGE_CAM_TARGET.z]
      : [0, 1.2, 0];
  const minDistance = scene === "cottage" ? 4 : 10;
  const maxDistance = scene === "cottage" ? 900 : 320;

  return (
    <Canvas
      className={className}
      shadows
      camera={DEFAULT_CAMERA}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: preset.exposure,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <SceneNavSync scene={scene} />
      <CottageCameraRig active={scene === "cottage"} />
      <WeatherAtmosphere weather={weather} />

      <Suspense fallback={null}>
        <Environment
          frames={1}
          preset="park"
          environmentIntensity={preset.envIntensity}
        />
        <CityScene stage={stage} scene={scene} />
      </Suspense>

      <Suspense fallback={null}>
        <GrassGround />
      </Suspense>

      {scene === "cottage" ? <CottageDecor /> : <CourtyardDecor />}

      <OrbitControls
        key={scene}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={minDistance}
        maxDistance={maxDistance}
        target={orbitTarget}
      />
    </Canvas>
  );
}
