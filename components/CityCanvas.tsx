"use client";

/**
 * 3D 场景根 Canvas：共用天空/天气/草地；建筑场景可切换。
 */
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect } from "react";
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
        shadow-radius={8}
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
  const orbitTarget: [number, number, number] =
    scene === "cottage" ? [0, 14, 0] : [0, 1.2, 0];
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
      <WeatherAtmosphere weather={weather} />

      <Suspense fallback={null}>
        <Environment
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
