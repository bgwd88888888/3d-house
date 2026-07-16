"use client";

/**
 * 3D 场景根 Canvas：灯光 / 环境 / 地面 / 房子 / 庭院装饰 / 轨道相机。
 * 晴空用 PrairieSky 蓝穹；含小路、人物、树、皮卡与池塘。
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
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { GardenPath } from "./GardenPath";
import { GardenPeople } from "./GardenPeople";
import { GardenTrees } from "./GardenTrees";
import { GardenPickup } from "./GardenPickup";
import { GardenPond } from "./GardenPond";
import { PrairieSky } from "./PrairieSky";
import { SkyClouds } from "./SkyClouds";

type CityCanvasProps = {
  className?: string;
  stage: BuildStage;
  weather?: WeatherKind;
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
        shadow-camera-far={360}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
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

export function CityCanvas({
  className,
  stage,
  weather = DEFAULT_WEATHER,
}: CityCanvasProps) {
  const preset = WEATHER_PRESETS[weather];

  return (
    <Canvas
      className={className}
      shadows
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
      <WeatherAtmosphere weather={weather} />

      <Suspense fallback={null}>
        <Environment
          preset="park"
          environmentIntensity={preset.envIntensity}
        />
        <CityScene stage={stage} />
      </Suspense>

      <Suspense fallback={null}>
        <GrassGround />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPath />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPeople />
      </Suspense>
      <Suspense fallback={null}>
        <GardenTrees />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPickup />
      </Suspense>
      <Suspense fallback={null}>
        <GardenPond />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={18}
        maxDistance={900}
        target={[0, 14, 0]}
      />
    </Canvas>
  );
}
