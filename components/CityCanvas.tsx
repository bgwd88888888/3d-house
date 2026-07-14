"use client";

/**
 * 3D 场景根 Canvas：灯光 / 环境 / 地面 / 房子 / 庭院装饰 / 轨道相机。
 *
 * 写实倾向：软阴影、降饱和天空、偏自然雾色；弱化玩具感硬光对比。
 */
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Sky } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import type { BuildStage } from "@/lib/geoBuildings";
import { CityScene } from "./CityScene";
import { GrassGround } from "./GrassGround";
import { GardenPath } from "./GardenPath";
import { GardenPeople } from "./GardenPeople";
import { GardenTrees } from "./GardenTrees";
import { GardenPickup } from "./GardenPickup";

/** 偏高斜阳：照亮门脸，阴影不拖太长 */
const SUN_POSITION: [number, number, number] = [62, 68, 48];

type CityCanvasProps = {
  className?: string;
  stage: BuildStage;
};

export function CityCanvas({ className, stage }: CityCanvasProps) {
  return (
    <Canvas
      className={className}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={["#c9d8e8"]} />
      <fog attach="fog" args={["#c9d8e8", 110, 480]} />

      <Sky
        sunPosition={SUN_POSITION}
        turbidity={3.8}
        rayleigh={1.05}
        mieCoefficient={0.0045}
        mieDirectionalG={0.8}
      />

      <hemisphereLight intensity={0.82} color="#d4e2f0" groundColor="#8a9870" />
      <directionalLight
        castShadow
        intensity={1.5}
        color="#fff0d8"
        position={SUN_POSITION}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={280}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-radius={6}
        shadow-bias={-0.00012}
        shadow-normalBias={0.04}
      />
      <directionalLight
        intensity={0.48}
        color="#b8cce0"
        position={[-40, 32, -22]}
      />
      {/* 门脸补光，避免正墙死黑 */}
      <directionalLight
        intensity={0.32}
        color="#e8f0fa"
        position={[12, 22, 70]}
      />

      <Suspense fallback={null}>
        <Environment preset="park" environmentIntensity={0.62} />
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
